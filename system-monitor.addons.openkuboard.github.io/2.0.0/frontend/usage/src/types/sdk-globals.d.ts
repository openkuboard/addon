// 与 addon-dev/sdk/index.d.ts 对齐的运行时类型镜像（仅本页面用到的最小公共子集）。
//
// host 将 SDK 在 /addon-sdk/index.js 挂载到 window.addonSDK（同时支持 `import { addonSDK } from ...`）。
// 本文件作为全局 script 声明（无 import/export），使 AddonSDK 等类型在本小应用内可直接引用，
// 无需逐文件 import —— 这是 vue-tsc / vite build 最简单可靠的写法。
// 若 addon-dev/sdk 的公共类型演进，保持此处字段一致即可；本页面只消费这些字段。

/** 主题同步：current 初始值 + subscribe 订阅变更（cb 立即回调一次） */
interface AddonTheme {
  current: 'light' | 'dark'
  subscribe(cb: (current: 'light' | 'dark') => void): () => void
}

/** 套件内置 UI 代理（FR-13）：open 在新窗口/iframe 打开受控代理页面 */
interface AddonServiceUI {
  proxy(id: string, path?: string): Promise<Response>
  open(id: string, opts?: { target?: 'blank' | 'iframe' }): string | void
}

/** 运行时 SDK 形态（window.addonSDK）：本页面只用 cluster / theme / serviceUI */
interface AddonSDK {
  cluster: { code: string; name: string }
  theme: AddonTheme
  serviceUI: AddonServiceUI
}

interface Window {
  addonSDK?: AddonSDK
  /** host 静默注入（与 /addon-sdk/index.js getAddonId 相同的注入模式） */
  __ADDON_ID__?: string
  __ADDON_CLUSTER_CODE__?: string
  __DEVOPSS_BASE__?: string
}
