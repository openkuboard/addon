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
  // 去掉可选的 "#" 与前导 "/"，容忍 "#config" 与 "#/config" 两种写法
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase()
  return hash.startsWith('config') ? 'config' : 'usage'
}

// 暗黑模式同步（FR-9 / 仓库暗黑适配约定）：
// host 用单一 dark class 驱动全局主题；这里把 SDK 的 theme.current 订阅镜像到
// 本应用 <html> 的 dark class，Element Plus 暗色变量（css-vars.css）即自动跟随。
// SDK 未就绪（如本地 vite dev 无 host）时退回亮色，不阻塞渲染。
async function syncTheme() {
  try {
    const sdk = await loadSDK()
    sdk.theme.subscribe((current) => {
      document.documentElement.classList.toggle('dark', current === 'dark')
    })
  } catch (e) {
    console.warn('[system-monitor] addon-sdk 主题同步失败：', e)
  }
}

// 按当前 hash 动态 import 对应根组件后挂载（code-split：只加载所选子页的 chunk 与样式）。
// 与 App.vue 自身通过 window.addonSDK 全局类型直接消费的类型不同，子页根组件为异步 chunk，
// 必须在拿到模块后取其 .default 作为 createApp 的根组件。
async function bootstrap() {
  const route = routeFromHash()
  let root: Component
  if (route === 'config') {
    root = (await import('./config/App.vue')).default
    document.title = 'K8S 资源监控套件 · 参数配置'
  } else {
    root = (await import('./usage/App.vue')).default
    document.title = '资源层监控套件'
  }
  createApp(root).use(ElementPlus, { locale: zhCn }).mount('#app')
}

void syncTheme()
void bootstrap()
