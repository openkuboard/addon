// addon-sdk 运行时加载 + hostRead 数据拉取 + addon_id 解析（config / usage 两页共用）。
//
// SDK 由 host 在 /addon-sdk/index.js 静态挂载：执行该 ES module 后把自身挂到
// window.addonSDK。这里用运行时动态 import('/addon-sdk/index.js') 加载（@vite-ignore
// 让 Vite 保持该绝对路径原样、不去构建期解析），并把模块级 Promise 缓存避免重复加载。

const SDK_ENTRY = '/addon-sdk/index.js'

let sdkPromise: Promise<AddonSDK> | null = null

/** 幂等获取 window.addonSDK；失败抛错（供 UI 展示友好错误） */
export function loadSDK(): Promise<AddonSDK> {
  if (!sdkPromise) {
    sdkPromise = (async () => {
      if (window.addonSDK) return window.addonSDK
      await import(/* @vite-ignore */ SDK_ENTRY)
      if (!window.addonSDK) {
        throw new Error('无法从 host 加载 addon-sdk（/addon-sdk/index.js 不可达）')
      }
      return window.addonSDK
    })()
    sdkPromise.catch(() => {
      sdkPromise = null
    })
  }
  return sdkPromise
}

/** 读取当前套件 addon_id：SDK 用 window.__ADDON_ID__ 或 URL query addon_id 静默注入。 */
export function getAddonId(): string {
  if (window.__ADDON_ID__) return window.__ADDON_ID__
  return new URLSearchParams(window.location.search).get('addon_id') || ''
}

/** 与 addon.json hostReads 白名单 key → host 读取方法的映射（settings 走 getSetting 单值） */
const HOST_READ_K8S: Record<string, (sdk: AddonSDK) => Promise<string[]>> = {
  storageclasses: (sdk) => sdk.host.listStorageClasses(),
  namespaces: (sdk) => sdk.host.listNamespaces(),
}

/**
 * 批量拉取渲染所需 hostRead 数据源。
 * 返回 Record<hostRead key, 值数组>；k8s 列表直接用，settings 单值包装成数组。
 * 任一数据源读取失败仅记警告并给空数组，不阻断整页渲染。
 */
export async function fetchHostData(
  sdk: AddonSDK,
  keys: string[],
): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {}
  for (const key of keys) {
    try {
      const k8s = HOST_READ_K8S[key]
      out[key] = k8s ? await k8s(sdk) : wrapSetting(await sdk.host.getSetting(key))
    } catch (e) {
      console.warn(`[velero] hostRead 数据源读取失败: ${key}`, e)
      out[key] = []
    }
  }
  return out
}

function wrapSetting(value: string): string[] {
  return value && value.trim() !== '' ? [value] : []
}