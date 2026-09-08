import { describe, expect, it } from 'vitest'
import {
  CATEGORY_TITLES,
  buildOptions,
  buildRenderModel,
  collectHostReadKeys,
  resolveParamValue,
  sortDefsByCategory,
} from '../src/config/utils/params'

// 参考 addon.json 的真实 parameterDefs（order 乱序，便于验证排序）
const REAL_DEFS: AddonParamDef[] = [
  {
    name: 'PROMETHEUS_STORAGE_CLASS',
    category: 'enum-from-hostReads',
    hostRead: 'storageclasses',
    required: true,
    default: 'please-provide-a-valid-storage-class-name',
    description: '为 Prometheus 提供持久化存储的 StorageClass 名称。',
  },
  {
    name: 'MONITOR_IMAGE_REGISTRY',
    category: 'enum-from-hostReads',
    hostRead: 'base_image_registry',
    required: false,
    default: '',
    description: '镜像仓库主机覆盖（默认留空，使用官方公共源）。',
  },
  {
    name: 'KUBERNETES_CLUSTER',
    category: 'host-derived',
    required: true,
    default: 'default',
    description: 'Kubernetes 集群在平台中的名称标识。',
  },
  {
    name: 'NODE_EXPORTER_PORT',
    category: 'user-editable',
    required: true,
    default: '9100',
    description: 'Node Exporter 监听端口（hostPort）。',
  },
  {
    name: 'PROMETHEUS_REPLICAS',
    category: 'user-editable',
    required: true,
    default: '1',
  },
]

describe('sortDefsByCategory', () => {
  it('按 enum-from-hostReads → user-editable → host-derived 顺序排序', () => {
    const sorted = sortDefsByCategory(REAL_DEFS)
    expect(sorted.map((d) => d.category)).toEqual([
      'enum-from-hostReads',
      'enum-from-hostReads',
      'user-editable',
      'user-editable',
      'host-derived',
    ])
  })

  it('同分类内保持原始相对顺序（稳定），且不改写入参数组', () => {
    const sorted = sortDefsByCategory(REAL_DEFS)
    // 两个 user-editable 顺序仍为 NODE_EXPORTER_PORT → PROMETHEUS_REPLICAS
    const editable = sorted.filter((d) => d.category === 'user-editable')
    expect(editable.map((d) => d.name)).toEqual(['NODE_EXPORTER_PORT', 'PROMETHEUS_REPLICAS'])
    // 原数组未被就地修改
    expect(REAL_DEFS[0].name).toBe('PROMETHEUS_STORAGE_CLASS')
  })
})

describe('resolveParamValue', () => {
  it('参数缺失时回退到 default', () => {
    const def: AddonParamDef = { name: 'PROMETHEUS_REPLICAS', category: 'user-editable', default: '1' }
    expect(resolveParamValue(def, {})).toBe('1')
  })

  it('显式空串被保留（registry 留空 = 使用默认源），不回退 default', () => {
    const def: AddonParamDef = { name: 'MONITOR_IMAGE_REGISTRY', category: 'enum-from-hostReads', default: 'fallback' }
    expect(resolveParamValue(def, { MONITOR_IMAGE_REGISTRY: '' })).toBe('')
  })

  it('参数非空时优先取参数值', () => {
    const def: AddonParamDef = { name: 'NODE_EXPORTER_PORT', category: 'user-editable', default: '9100' }
    expect(resolveParamValue(def, { NODE_EXPORTER_PORT: '9101' })).toBe('9101')
  })

  it('既无参数也无 default 时返回空串', () => {
    const def: AddonParamDef = { name: 'X', category: 'user-editable' }
    expect(resolveParamValue(def, {})).toBe('')
  })
})

describe('collectHostReadKeys', () => {
  it('按声明顺序去重收集 hostRead key', () => {
    const defs: AddonParamDef[] = [
      { name: 'A', category: 'enum-from-hostReads', hostRead: 'storageclasses' },
      { name: 'B', category: 'user-editable' },
      { name: 'C', category: 'enum-from-hostReads', hostRead: 'base_image_registry' },
      { name: 'D', category: 'enum-from-hostReads', hostRead: 'storageclasses' },
    ]
    expect(collectHostReadKeys(defs)).toEqual(['storageclasses', 'base_image_registry'])
  })

  it('无 enum 参数时返回空数组', () => {
    const defs: AddonParamDef[] = [{ name: 'A', category: 'host-derived' }]
    expect(collectHostReadKeys(defs)).toEqual([])
  })
})

describe('buildOptions', () => {
  const hostData: Record<string, string[]> = {
    storageclasses: ['local-path', 'csi-fast'],
    base_image_registry: ['registry.internal.example'],
  }

  it('storageclass：必填且 default 非空时不提供空选项，当前已保存的哨兵值补到末尾', () => {
    const def: AddonParamDef = {
      name: 'PROMETHEUS_STORAGE_CLASS',
      category: 'enum-from-hostReads',
      hostRead: 'storageclasses',
      required: true,
      default: 'please-provide-a-valid-storage-class-name',
    }
    const opts = buildOptions(def, hostData, def.default!)
    expect(opts).toEqual([
      { value: 'local-path', label: 'local-path' },
      { value: 'csi-fast', label: 'csi-fast' },
      { value: 'please-provide-a-valid-storage-class-name', label: 'please-provide-a-valid-storage-class-name（当前已保存值）' },
    ])
  })

  it('镜像仓库：可选且 default 为空 → 提供空选项（官方源），数据源值作为另一选项', () => {
    const def: AddonParamDef = {
      name: 'MONITOR_IMAGE_REGISTRY',
      category: 'enum-from-hostReads',
      hostRead: 'base_image_registry',
      required: false,
      default: '',
    }
    const opts = buildOptions(def, hostData, '')
    expect(opts).toEqual([
      { value: '', label: '（留空 / 使用默认）' },
      { value: 'registry.internal.example', label: 'registry.internal.example' },
    ])
  })

  it('当前值已在选项里时不会重复追加', () => {
    const def: AddonParamDef = {
      name: 'PROMETHEUS_STORAGE_CLASS',
      category: 'enum-from-hostReads',
      hostRead: 'storageclasses',
      required: true,
    }
    const opts = buildOptions(def, hostData, 'csi-fast')
    expect(opts.filter((o) => o.value === 'csi-fast')).toHaveLength(1)
  })

  it('hostData 无该数据源或为空时降级为空选项/当前值', () => {
    const def: AddonParamDef = {
      name: 'X',
      category: 'enum-from-hostReads',
      hostRead: 'namespaces',
      required: false,
      default: '',
    }
    expect(buildOptions(def, {}, '')).toEqual([{ value: '', label: '（留空 / 使用默认）' }])
    // 无法连到 host 数据源但已保存过某值 → 保留该值可回选
    expect(buildOptions(def, {}, 'saved-ns')).toEqual([
      { value: '', label: '（留空 / 使用默认）' },
      { value: 'saved-ns', label: 'saved-ns（当前已保存值）' },
    ])
  })
})

describe('buildRenderModel', () => {
  it('产出按分类排序的分区；enum 行带 options，user/host-derived 行为空 options', () => {
    const params: Record<string, string> = {
      MONITOR_IMAGE_REGISTRY: 'registry.internal.example',
      NODE_EXPORTER_PORT: '9101',
    }
    const hostData: Record<string, string[]> = { storageclasses: ['local-path'] }
    const sections = buildRenderModel(REAL_DEFS, params, hostData)

    expect(sections.map((s) => s.category)).toEqual([
      'enum-from-hostReads',
      'user-editable',
      'host-derived',
    ])
    // 每个分区标题已按分类配置
    for (const s of sections) expect(s.title).toBe(CATEGORY_TITLES[s.category])

    const enumRows = sections[0].rows
    expect(enumRows).toHaveLength(2)
    // enum 行 options 非空
    expect(enumRows.every((r) => r.options.length > 0)).toBe(true)
    // registry 读取到已保存值 → options 内包含该值（不回退 default 空串语义被 resolve 保留）
    const registry = enumRows.find((r) => r.def.name === 'MONITOR_IMAGE_REGISTRY')!
    expect(registry.value).toBe('registry.internal.example')

    const editable = sections[1].rows
    expect(editable).toHaveLength(2)
    expect(editable[0].value).toBe('9101') // 参数覆盖 default
    expect(editable[0].options).toEqual([])

    const derived = sections[2].rows
    expect(derived).toHaveLength(1)
    expect(derived[0].def.name).toBe('KUBERNETES_CLUSTER')
    expect(derived[0].value).toBe('default')
    expect(derived[0].options).toEqual([])
  })
})
