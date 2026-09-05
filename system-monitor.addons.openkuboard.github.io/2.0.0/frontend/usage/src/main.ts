import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './App.vue'
import { loadSDK } from './sdk'

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
    console.warn('[system-monitor-usage] addon-sdk 主题同步失败：', e)
  }
}

void syncTheme()

createApp(App).use(ElementPlus, { locale: zhCn }).mount('#app')
