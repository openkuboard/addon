// addon-sdk 运行时加载。
//
// SDK 由 host 在 /addon-sdk/index.js 静态挂载（FR-5）：执行该 ES module 后把自身挂到
// window.addonSDK。这里用运行时动态 import('/addon-sdk/index.js') 加载（@vite-ignore 让 Vite
// 保持该绝对路径原样、不去构建期解析），并把模块级 Promise 缓存，避免重复加载。

const SDK_ENTRY = '/addon-sdk/index.js'

let sdkPromise: Promise<AddonSDK> | null = null

/** 幂等获取 window.addonSDK；失败抛错（供 UI 展示友好错误） */
export function loadSDK(): Promise<AddonSDK> {
  if (!sdkPromise) {
    sdkPromise = (async () => {
      if (window.addonSDK) return window.addonSDK
      // 仅当尚未就绪时才动态加载 host 挂载的 SDK 模块（其副作用是写 window.addonSDK）
      await import(/* @vite-ignore */ SDK_ENTRY)
      if (!window.addonSDK) {
        throw new Error('无法从 host 加载 addon-sdk（/addon-sdk/index.js 不可达）')
      }
      return window.addonSDK
    })()
    sdkPromise.catch(() => {
      // 失败后允许下次重试
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
