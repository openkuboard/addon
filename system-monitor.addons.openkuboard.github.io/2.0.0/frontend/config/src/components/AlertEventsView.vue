<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElAlert } from 'element-plus'
import { loadSDK } from '../sdk'

// Prometheus 告警事件（只读 iframe，轻量还原 host AddonAlertEventsPanel 的展示层）：
// 经 addonSDK.serviceUI.open('prometheus', { target: 'iframe' }) 拿代理 URL，拼 /alerts 后内嵌 iframe。
// 若 host SDK 不可达（本地 vite dev）或拿不到 URL，给出提示而非崩溃。
const PROXY_ID = 'prometheus'

const loading = ref(true)
const ready = ref(false)
const errorMsg = ref('')
const iframeKey = ref(0)
const iframeSrc = ref('')

function withAlertsPath(base: string): string {
  const qIdx = base.indexOf('?')
  const path = (qIdx === -1 ? base : base.slice(0, qIdx)).replace(/\/+$/, '')
  const query = qIdx === -1 ? '' : base.slice(qIdx)
  if (path.endsWith('/alerts')) return base
  return `${path}/alerts${query}`
}

async function open() {
  loading.value = true
  errorMsg.value = ''
  try {
    const sd = await loadSDK()
    const url = sd.serviceUI.open(PROXY_ID, { target: 'iframe' })
    if (!url) {
      errorMsg.value = `未取得 ${PROXY_ID} 代理地址，请确认套件服务已就绪。`
      return
    }
    iframeSrc.value = withAlertsPath(url as string)
    ready.value = true
    iframeKey.value += 1 // 每次打开强制刷新 iframe
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

onMounted(open)
</script>

<template>
  <div class="alert-events-view">
    <div class="alert-events-toolbar">
      <strong class="alert-events-title">Prometheus 告警事件</strong>
      <el-button v-if="ready" text :loading="loading" @click="open">刷新</el-button>
    </div>

    <el-alert
      v-if="errorMsg"
      type="warning"
      :closable="false"
      show-icon
      class="events-banner"
    >
      <div class="events-banner-body">
        <p class="events-banner-text">{{ errorMsg }}</p>
        <p class="events-banner-text">请确认已在「告警配置 → 接口参数」填好 prometheus_url 并保存，且套件服务已运行。</p>
        <el-button size="small" type="primary" plain @click="open">重试</el-button>
      </div>
    </el-alert>

    <div v-else-if="loading" v-loading="true" class="events-loading">
      <p>正在加载 Prometheus 告警页面…</p>
    </div>

    <iframe
      v-else-if="ready"
      :key="iframeKey"
      :src="iframeSrc"
      class="events-iframe"
      title="Prometheus Alerts"
      @load="loading = false"
    />
  </div>
</template>

<style scoped>
.alert-events-view {
  min-height: 320px;
}
.alert-events-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.alert-events-title {
  font-size: 15px;
  font-weight: 600;
}
.events-banner-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.events-banner-text {
  margin: 2px 0;
  font-size: 13px;
  line-height: 1.6;
}
.events-loading {
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
}
.events-loading p {
  margin: 34px 0 0;
}
.events-iframe {
  width: 100%;
  height: 70vh;
  min-height: 560px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-bg-color);
}
</style>
