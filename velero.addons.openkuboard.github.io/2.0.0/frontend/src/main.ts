import type { Component } from 'vue'
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import { loadSDK } from './sdk'

// config / usage 两个子页合并进同一个构建产物（一个 index.html + assets），用 URL 锚区分：
//   #config / #/config…（含前缀）→ 挂载 config 配置页
//   其它（#usage / 空 hash / 未知）→ 挂载 usage 使用页
function routeFromHash(): 'config' | 'usage' {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase()
  return hash.startsWith('config') ? 'config' : 'usage'
}

// 暗黑模式同步：host 用单一 dark class 驱动全局主题。addon 以 iframe 挂载，
// 与 host 同源（host 通过静态路径 /addons/... 提供本产物），因此优先直接监听
// window.parent 根元素的 dark class 并镜像到本应用 <html>；同源不可达（如跨域）
// 时退回 addonSDK.theme.subscribe。
async function syncTheme() {
  const apply = (dark: boolean) =>
    document.documentElement.classList.toggle('dark', !!dark)
  try {
    const sdk = await loadSDK()
    apply(sdk.theme.current === 'dark')
    let parentDoc: Document | null = null
    try {
      parentDoc = window.parent?.document ?? null
    } catch {
      parentDoc = null
    }
    if (parentDoc) {
      const observer = new MutationObserver(() => {
        apply(parentDoc!.documentElement.classList.contains('dark'))
      })
      observer.observe(parentDoc.documentElement, { attributes: true, attributeFilter: ['class'] })
      return
    }
    sdk.theme.subscribe((current) => apply(current === 'dark'))
  } catch (e) {
    console.warn('[velero] addon-sdk 主题同步失败：', e)
  }
}

async function bootstrap() {
  const route = routeFromHash()
  let root: Component
  if (route === 'config') {
    root = (await import('./config/App.vue')).default
    document.title = 'Velero 备份套件 · 参数配置'
  } else {
    root = (await import('./usage/App.vue')).default
    document.title = 'Velero 备份套件'
  }
  createApp(root).use(ElementPlus, { locale: zhCn }).mount('#app')
}

void syncTheme()
void bootstrap()