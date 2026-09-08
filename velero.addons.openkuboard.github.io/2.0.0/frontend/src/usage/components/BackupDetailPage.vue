<script setup lang="ts">
// 独立备份详情页（URL：#usage/backup/<name>）：按名称读取 Backup CR，展示
// 摘要 + 基本信息/备份范围/状态 + 原始 JSON，可返回列表页。
import { computed, onMounted, ref } from 'vue'
import { ElButton, ElTabs, ElTabPane, ElTag, ElDescriptions, ElDescriptionsItem, ElAlert, ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { describeBackup, phaseTagType, backupSummary } from '../utils/velero'

const props = defineProps<{
  name: string
  sdk: AddonSDK
  namespace: string
}>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const GRP = 'velero.io'
const VER = 'v1'

const backup = ref<Record<string, any> | null>(null)
const loading = ref(true)
const errorMsg = ref('')
const activeTab = ref('detail')

const detail = computed(() => (backup.value ? describeBackup(backup.value) : null))
const summary = computed(() => (backup.value ? backupSummary(backup.value) : null))

async function load() {
  loading.value = true
  errorMsg.value = ''
  backup.value = null
  try {
    backup.value = (await props.sdk.resource.get({
      group: GRP,
      version: VER,
      resource: 'backups',
      name: props.name,
      namespace: props.namespace,
    })) as Record<string, any>
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function goBack() {
  emit('back')
}

function copyRaw() {
  if (!detail.value) return
  navigator.clipboard?.writeText(detail.value.raw).then(
    () => ElMessage.success('已复制 JSON'),
    () => ElMessage.warning('复制失败'),
  )
}

onMounted(load)
</script>

<template>
  <div class="detail-page">
    <header class="detail-header">
      <div class="detail-header__left">
        <el-button :icon="ArrowLeft" link type="primary" @click="goBack">返回备份历史</el-button>
        <h1 class="detail-title">备份详情 · {{ props.name }}</h1>
      </div>
      <div class="detail-header__actions">
        <el-button text :loading="loading" @click="load">刷新</el-button>
        <el-button v-if="detail" text @click="copyRaw">复制 JSON</el-button>
      </div>
    </header>

    <el-alert
      v-if="errorMsg"
      type="error"
      :closable="false"
      show-icon
      title="备份读取失败"
      :description="errorMsg"
    />

    <template v-if="detail && summary">
      <div class="detail-summary">
        <el-tag :type="phaseTagType(summary.phase) as any" effect="dark" size="large">{{ summary.phase }}</el-tag>
        <el-tag type="info" effect="plain" size="large">数据项 {{ summary.items }}</el-tag>
        <el-tag :type="summary.errors ? 'danger' : 'success'" effect="plain" size="large">错误 {{ summary.errors }}</el-tag>
        <el-tag :type="summary.warnings ? 'warning' : 'success'" effect="plain" size="large">警告 {{ summary.warnings }}</el-tag>
        <el-tag type="info" effect="plain" size="large">过期 {{ summary.expired }}</el-tag>
      </div>

      <el-tabs v-model="activeTab" class="detail-tabs">
        <el-tab-pane label="详情" name="detail">
          <section v-for="sec in detail.sections" :key="sec.title" class="detail-sec">
            <div class="detail-sec__head">{{ sec.title }}</div>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item v-for="f in sec.fields" :key="f.key" :label="f.label">
                <span class="detail-value">{{ f.value }}</span>
              </el-descriptions-item>
            </el-descriptions>
          </section>
        </el-tab-pane>
        <el-tab-pane label="JSON" name="json">
          <pre class="detail-json">{{ detail.raw }}</pre>
        </el-tab-pane>
      </el-tabs>
    </template>

    <el-empty v-else-if="!loading" description="未找到该备份" />
  </div>
</template>

<style scoped>
.detail-page {
  width: 100%;
  padding: 20px 24px 60px;
  box-sizing: border-box;
  min-height: 100vh;
}
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.detail-header__left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.detail-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.detail-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.detail-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.detail-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: var(--el-border-color-lighter);
}
.detail-sec + .detail-sec {
  margin-top: 18px;
}
.detail-sec__head {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.detail-value {
  word-break: break-all;
  font-size: 13px;
}
.detail-json {
  margin: 0;
  padding: 12px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  overflow-x: auto;
}
</style>