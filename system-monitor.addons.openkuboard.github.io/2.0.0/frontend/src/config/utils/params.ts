// 参数分类渲染的纯逻辑：分桶排序 / 取值 / hostRead 数据源 → 下拉选项。
//
// 分类契约（parameterDefs v2 schema，addon.json parameterDefs / FR-7）：
//   - user-editable       用户可改           → 渲染输入框
//   - enum-from-hostReads 数据源来自 hostReads → 渲染下拉（hostRead 白名单 key 见 addon.json hostReads）
//   - host-derived        host 推导禁止改      → 只读展示（保存 payload 不含）
// 本模块保持纯函数、无 DOM / SDK 依赖，便于 vitest 直接覆盖（TDD）。

/** 展示顺序（enums 优先展示用户最关心的可选集群来源，derived 只读放最后） */
export const CATEGORY_ORDER: readonly AddonParamCategory[] = [
  'enum-from-hostReads',
  'user-editable',
  'host-derived',
]

/** 分类分区标题（中文 UI） */
export const CATEGORY_TITLES: Record<AddonParamCategory, string> = {
  'enum-from-hostReads': '从集群读取（下拉选择）',
  'user-editable': '可编辑参数',
  'host-derived': '系统推导参数（只读）',
}

/** 可进入保存 payload 的分类（host-derived 除外） */
export const SAVEABLE_CATEGORIES: readonly AddonParamCategory[] = [
  'enum-from-hostReads',
  'user-editable',
]

/** 空值选项的通用文案 */
const EMPTY_LABEL = '（留空 / 使用默认）'

export interface ParamOption {
  value: string
  label: string
}

/** 单行渲染模型：def + 已解析取值 + （enum 行）下拉选项 */
export interface RenderRow {
  def: AddonParamDef
  value: string
  options: ParamOption[]
}

/** 按分类聚合的分区渲染模型 */
export interface RenderSection {
  category: AddonParamCategory
  title: string
  rows: RenderRow[]
}

/**
 * 按 CATEGORY_ORDER 排序（同分类内保持声明相对顺序）。
 * 用分组过滤而非 sort 比较器，避免依赖引擎排序稳定性。
 */
export function sortDefsByCategory(defs: AddonParamDef[]): AddonParamDef[] {
  const ordered = CATEGORY_ORDER.flatMap((category) => defs.filter((d) => d.category === category))
  const rest = defs.filter((d) => !CATEGORY_ORDER.includes(d.category)) // 防御未知分类
  return [...ordered, ...rest]
}

/**
 * 解析某参数当前应显示的值：
 * 参数里显式存在（含空串，如镜像仓库留空 = 官方源）优先取参数值，缺失才回退 def.default。
 */
export function resolveParamValue(def: AddonParamDef, params: Record<string, string> | undefined): string {
  const raw = params && params[def.name]
  if (raw !== undefined) return raw
  return def.default ?? ''
}

/** 收集渲染所需 hostRead 数据源 key（按声明顺序去重），交给 host 只读接口批量拉取 */
export function collectHostReadKeys(defs: AddonParamDef[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const d of defs) {
    if (d.category !== 'enum-from-hostReads' || !d.hostRead) continue
    if (!seen.has(d.hostRead)) {
      seen.add(d.hostRead)
      out.push(d.hostRead)
    }
  }
  return out
}

/**
 * 由 hostRead 数据源构造下拉选项。
 * hostData：Record<hostRead key, 值列表>（k8s 列表来自 listStorageClasses/listNamespaces；
 * settings 单值如 base_image_registry 由拉取层包成单元素数组）。
 * 规则：
 *  1. 可选参数 或 default 为空 → 提供「留空/默认」选项（如镜像仓库官方源）；
 *  2. 追加数据源各项；
 *  3. 当前已保存值不在选项内（如占位哨兵 / 数据源暂不可达）→ 补一条「当前已保存值」防丢。
 */
export function buildOptions(
  def: AddonParamDef,
  hostData: Record<string, string[]>,
  currentValue: string,
): ParamOption[] {
  const items = dedupe((hostData && def.hostRead ? hostData[def.hostRead] : undefined) || [])
  const opts: ParamOption[] = []
  if (!def.required || def.default === '') {
    opts.push({ value: '', label: EMPTY_LABEL })
  }
  for (const item of items) opts.push({ value: item, label: item })
  if (currentValue && !opts.some((o) => o.value === currentValue)) {
    opts.push({ value: currentValue, label: `${currentValue}（当前已保存值）` })
  }
  return opts
}

/**
 * 组合渲染模型：排序 → 分桶 → 每行解析取值 + 生成选项。
 * 这是「按 category 渲染」的单一事实来源，App.vue / ParamRow.vue 只消费结果。
 */
export function buildRenderModel(
  defs: AddonParamDef[],
  params: Record<string, string>,
  hostData: Record<string, string[]>,
): RenderSection[] {
  const sorted = sortDefsByCategory(defs)
  const sections: RenderSection[] = []
  for (const category of CATEGORY_ORDER) {
    const rows: RenderRow[] = []
    for (const def of sorted) {
      if (def.category !== category) continue
      const value = resolveParamValue(def, params)
      const options = def.category === 'enum-from-hostReads' ? buildOptions(def, hostData, value) : []
      rows.push({ def, value, options })
    }
    if (rows.length) sections.push({ category, title: CATEGORY_TITLES[category], rows })
  }
  return sections
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)]
}
