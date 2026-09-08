// 与 addon-dev/sdk/index.d.ts 对齐的运行时类型镜像 —— config / usage 两页全局声明的并集。
// 本文件作为全局 script 声明（无 import/export），使 AddonParamDef / AddonSDK 等类型
// 在两个子页（src/config、src/usage）内可直接引用。

type AddonParamCategory = 'user-editable' | 'host-derived' | 'enum-from-hostReads'

interface AddonParamDef {
  name: string
  category: AddonParamCategory
  hostRead?: string
  required?: boolean
  default?: string
  description?: string
  allowCreate?: boolean
}

interface AddonTheme {
  current: 'light' | 'dark'
  subscribe(cb: (current: 'light' | 'dark') => void): () => void
}

interface AddonHost {
  listStorageClasses(): Promise<string[]>
  listNamespaces(): Promise<string[]>
  getSetting(key: string): Promise<string>
}

interface AddonConfig {
  getParameters(): Promise<Record<string, string>>
  getParameterDefs(): Promise<AddonParamDef[]>
  updateParameters(p: Record<string, string>): Promise<unknown>
  getAlertConfig(): Promise<{ config: Record<string, unknown>; schema: unknown }>
  updateAlertConfig(config: Record<string, unknown>): Promise<unknown>
}

interface AddonResourceRef {
  group: string
  version: string
  resource: string
  name?: string
  namespace?: string
  object?: Record<string, unknown>
}

interface AddonResource {
  list(ref: AddonResourceRef): Promise<unknown[]>
  get(ref: AddonResourceRef): Promise<unknown>
  create(ref: AddonResourceRef): Promise<unknown>
  update(ref: AddonResourceRef): Promise<unknown>
  delete(ref: AddonResourceRef): Promise<void>
}

interface AddonServiceUI {
  proxy(id: string, path?: string): Promise<Response>
  open(id: string, opts?: { target?: 'blank' | 'iframe' }): string | void
}

interface AddonPermissionNode {
  code: string
  label: string
  labelEn?: string
  granted: boolean
  children?: AddonPermissionNode[]
}

interface AddonPermissions {
  load(): Promise<AddonPermissionNode[]>
  can(code: string): boolean
  granted(): string[]
  tree(): AddonPermissionNode[]
}

interface AddonSDK {
  cluster: { code: string; name: string }
  theme: AddonTheme
  config: AddonConfig
  host: AddonHost
  resource: AddonResource
  serviceUI: AddonServiceUI
  permissions: AddonPermissions
}

interface Window {
  addonSDK?: AddonSDK
  __ADDON_ID__?: string
  __ADDON_CLUSTER_CODE__?: string
  __DEVOPSS_BASE__?: string
}