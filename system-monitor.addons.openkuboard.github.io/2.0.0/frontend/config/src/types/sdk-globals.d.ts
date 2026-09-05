// 与 addon-dev/sdk/index.d.ts 对齐的运行时类型镜像（仅本应用用到的最小公共子集）。
//
// host 将 SDK 在 /addon-sdk/index.js 挂载到 window.addonSDK（同时支持 `import { addonSDK } from ...`）。
// 本文件作为全局 script 声明（无 import/export），使 AddonParamDef / AddonSDK 等类型
// 在本小应用内可直接引用，无需逐文件 import —— 这是 vue-tsc / vite build 最简单可靠的写法。
// 若 addon-dev/sdk 的公共类型演进，保持此处字段一致即可；本应用只消费这些字段。

/** 参数分类（parameterDefs v2 schema，见 addon.json parameterDefs） */
type AddonParamCategory = 'user-editable' | 'host-derived' | 'enum-from-hostReads'

/** 参数定义：name + category + 可选 hostRead / required / default / description / allowCreate */
interface AddonParamDef {
  name: string
  category: AddonParamCategory
  /** enum-from-hostReads 数据源 key：对应 addon.json hostReads 白名单 key（storageclasses / base_image_registry 等） */
  hostRead?: string
  required?: boolean
  default?: string
  description?: string
  /** enum-from-hostReads 允许输入自定义值（combobox，如 MONITOR_NAMESPACE 可选已有或输入新值） */
  allowCreate?: boolean
}

/** 主题同步：current 初始值 + subscribe 订阅变更（cb 立即回调一次） */
interface AddonTheme {
  current: 'light' | 'dark'
  subscribe(cb: (current: 'light' | 'dark') => void): () => void
}

/** host 侧只读数据：K8s 元数据 / host 设置（FR-6） */
interface AddonHost {
  listStorageClasses(): Promise<string[]>
  listNamespaces(): Promise<string[]>
  getSetting(key: string): Promise<string>
}

/** 配置数据访问（FR-7 / 告警配置）：参数 + 告警配置读写 */
interface AddonConfig {
  getParameters(): Promise<Record<string, string>>
  getParameterDefs(): Promise<AddonParamDef[]>
  updateParameters(p: Record<string, string>): Promise<unknown>
  /** 读取套件告警配置：config=alert_sending_config，schema=alert_config_defs（= alert-config-schema.json） */
  getAlertConfig(): Promise<{ config: Record<string, unknown>; schema: unknown }>
  /** 保存告警配置（整份 alert_sending_config 覆盖写） */
  updateAlertConfig(config: Record<string, unknown>): Promise<unknown>
}

/** K8s 资源引用（resource 接口入参）；group '' = core 组 */
interface AddonResourceRef {
  group: string
  version: string
  resource: string
  name?: string
  namespace?: string
  object?: Record<string, unknown>
}

/** K8s 资源 CRUD（FR-2，供告警规则编辑器等使用） */
interface AddonResource {
  list(ref: AddonResourceRef): Promise<unknown[]>
  get(ref: AddonResourceRef): Promise<unknown>
  create(ref: AddonResourceRef): Promise<unknown>
  update(ref: AddonResourceRef): Promise<unknown>
  delete(ref: AddonResourceRef): Promise<void>
}

/** 套件内置 UI 代理（FR-13）：proxy 拉数据，open 打开页面/拿 iframe URL */
interface AddonServiceUI {
  proxy(id: string, path?: string): Promise<Response>
  open(id: string, opts?: { target?: 'blank' | 'iframe' }): string | void
}

/** 运行时 SDK 形态（window.addonSDK） */
interface AddonSDK {
  cluster: { code: string; name: string }
  theme: AddonTheme
  config: AddonConfig
  host: AddonHost
  resource: AddonResource
  serviceUI: AddonServiceUI
}

interface Window {
  addonSDK?: AddonSDK
}
