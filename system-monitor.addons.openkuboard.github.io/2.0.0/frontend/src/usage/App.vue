<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import QuickLinkCards from './components/QuickLinkCards.vue'
import ClusterEntryGrid from './components/ClusterEntryGrid.vue'
import { loadSDK, getAddonId } from '../sdk'
import { fetchClusterEntries } from './api/entries'
import { buildProxyUrl, resolveTemplate, isRouteObject } from './utils/entries'
import type { AddonClusterEntry } from './types/entries'

// 「资源层监控套件」usage 使用页（entry.nav 入口）：
//   ① 快捷入口 —— SDK serviceUI.open 打开 grafana-home / prometheus / alertmanager；
//   ② 集群监控入口 —— host GET /api/addon/entries/?level=cluster&cluster=... 读取本套件
//      entry.context 的 cluster 级视图（Grafana 大盘），object route → 受控代理 URL 打开。

const sdk = ref<AddonSDK | null>(null)
const clusterCode = ref('')
const addonId = ref('')
const entries = ref<AddonClusterEntry[]>([])
const loading = ref(true)
const errorMsg = ref('')

// 只展示「当前套件自己声明」的 cluster 级 object route 入口（addon_id 由 host 静默注入；
// 无法解析 addon_id 时退回展示全部返回项，保证页面不空）。
const clusterEntries = computed(() => {
  const own = addonId.value
    ? entries.value.filter((e) => e.addon_id === addonId.value)
    : entries.value
  return own.filter((e) => isRouteObject(e.route))
})

async function init() {
  loading.value = true
  errorMsg.value = ''
  try {
    const sd = await loadSDK()
    sdk.value = sd
    addonId.value = getAddonId()
    clusterCode.value = sd.cluster.code || sd.cluster.name || ''
    entries.value = await fetchClusterEntries(clusterCode.value)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function openEntry(entry: AddonClusterEntry) {
  const route = entry.route
  if (!isRouteObject(route)) {
    ElMessage.info('该入口为套件内部路由，暂不支持在此页面打开')
    return
  }
  // cluster 级路径基本无 {{...}} 占位；resolveTemplate 保守兜底（空上下文 → 占位替换为空）
  const path = resolveTemplate(route.path || '/', {})
  const url = buildProxyUrl(entry.addon_id, route.serviceUI, path, clusterCode.value)
  const win = window.open(url, '_blank')
  if (!win) ElMessage.warning('新窗口被浏览器拦截，请允许弹窗后重试')
}

onMounted(init)
</script>

<template>
  <div class="usage-page">
    <header class="usage-header">
      <div class="usage-header__title">
        <h1 class="usage-title">资源层监控套件</h1>
        <p class="usage-sub">system-monitor · 基于 Prometheus / Grafana 的集群资源层监控</p>
      </div>
      <div class="usage-header__actions">
        <span v-if="clusterCode" class="cluster-pill">集群：{{ clusterCode }}</span>
        <el-button text :loading="loading" @click="init">刷新</el-button>
      </div>
    </header>

    <el-alert
      v-if="errorMsg && clusterEntries.length === 0"
      class="usage-page__error"
      type="error"
      :closable="false"
      show-icon
      title="监控入口加载失败"
      :description="errorMsg"
    />

    <QuickLinkCards :sdk="sdk" :loading="loading" />

    <ClusterEntryGrid
      :entries="clusterEntries"
      :loading="loading"
      :error="errorMsg"
      @open="openEntry"
    />

    <footer class="usage-footer">
      入口经 OpenKuboard 受控代理打开（需套件处于 ready 且当前用户具备 monitor:view 权限）。
    </footer>
  </div>
</template>

<style>
html,
body,
#app {
  min-height: 100%;
  margin: 0;
  padding: 0;
  background: var(--el-bg-color-page);
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', sans-serif;
  color: var(--el-text-color-primary);
  -webkit-font-smoothing: antialiased;
}

/* 页面区块通用标题（供快捷入口 / 集群入口两个子组件复用；唯一命名避免泄漏） */
.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}
.section-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.section-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>

<style scoped>
.usage-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 22px 22px 60px;
  min-height: 100vh;
  box-sizing: border-box;
}
.usage-page__error {
  margin-bottom: 16px;
}

.usage-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
}
.usage-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.3;
}
.usage-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.usage-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cluster-pill {
  padding: 3px 12px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
}

.usage-footer {
  margin-top: 28px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
}
</style>
