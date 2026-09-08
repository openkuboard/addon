<script setup lang="ts">
// Velero 备份套件 usage 使用页：备份历史 / 定时备份 / 恢复 / 存储位置 / 备份仓库。
// 数据全部经 addonSDK.resource 读取（resourceAccess 白名单 + RBAC 权限校验）。
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox, ElTable, ElTableColumn, ElTag } from 'element-plus'
import { loadSDK, getAddonId } from '../sdk'
import { VeleroApi } from './api/velero'
import {
  backupStatus,
  formatTime,
  phaseTagType,
  progressText,
  parseTTLHours,
} from './utils/velero'
import { parseUsageRoute, backupDetailHash, listHash, type UsageRoute } from './utils/route'
import CreateBackupDialog from './components/CreateBackupDialog.vue'
import CreateScheduleDialog from './components/CreateScheduleDialog.vue'
import CreateRestoreDialog from './components/CreateRestoreDialog.vue'
import BackupDetailPage from './components/BackupDetailPage.vue'

const sdk = ref<AddonSDK | null>(null)
const api = ref<VeleroApi | null>(null)
const clusterCode = ref('')
const addonId = ref('')
const namespace = ref('velero')
const loading = ref(true)
const errorMsg = ref('')

const backups = ref<Record<string, any>[]>([])
const schedules = ref<Record<string, any>[]>([])
const restores = ref<Record<string, any>[]>([])
const storageLocations = ref<Record<string, any>[]>([])
const repositories = ref<Record<string, any>[]>([])

const activeTab = ref('backups')

// 权限门控（RBAC；超管/通配符天然通过）
const perm = ref<{ can: (code: string) => boolean }>({ can: () => false })

const canCreateBackup = computed(() => perm.value.can('velero:backup:create'))
const canDeleteBackup = computed(() => perm.value.can('velero:backup:delete'))
const canCreateRestore = computed(() => perm.value.can('velero:restore:create'))
const canCreateSchedule = computed(() => perm.value.can('velero:schedule:create'))
const canDeleteSchedule = computed(() => perm.value.can('velero:schedule:delete'))

const dialog = ref({ backup: false, schedule: false, restore: false })
const restorePresetBackup = ref('')

// 内部 hash 路由：列表页 ↔ 独立备份详情页（#usage / #usage/backup/<name>）
const currentRoute = ref<UsageRoute>({ page: 'list' })

function syncRoute() {
  currentRoute.value = parseUsageRoute(window.location.hash)
}

function goDetail(b: Record<string, any>) {
  window.location.hash = backupDetailHash(b.metadata?.name || '')
}

function goList() {
  window.location.hash = listHash()
}

async function reload() {
  loading.value = true
  errorMsg.value = ''
  try {
    const sd = await loadSDK()
    sdk.value = sd
    addonId.value = getAddonId()
    clusterCode.value = sd.cluster.code || sd.cluster.name || ''
    const params = await sd.config.getParameters()
    namespace.value = params['VELERO_NAMESPACE'] || 'velero'
    api.value = new VeleroApi(sd, namespace.value)
    try {
      await sd.permissions.load()
      perm.value = sd.permissions
    } catch {
      perm.value = { can: () => false }
    }
    await loadAll()
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function loadAll() {
  if (!api.value) return
  const [b, s, r, sl, repo] = await Promise.all([
    api.value.listBackups(),
    api.value.listSchedules(),
    api.value.listRestores(),
    api.value.listStorageLocations(),
    api.value.listRepositories(),
  ])
  backups.value = b
  schedules.value = s
  restores.value = r
  storageLocations.value = sl
  repositories.value = repo
}

function statusOf(b: Record<string, any>) {
  return backupStatus(b)
}

// ─── 操作 ───
async function onDeleteBackup(b: Record<string, any>) {
  const name = b.metadata?.name
  if (!name) return
  try {
    await ElMessageBox.confirm(
      `确定删除备份 ${name} 吗？将同时删除对象存储中的备份数据，此操作不可恢复。`,
      '删除备份',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await api.value!.deleteBackup(name)
    ElMessage.success('已提交删除请求（DeleteBackupRequest）')
    await reload()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  }
}

async function onTogglePause(sch: Record<string, any>) {
  const name = sch.metadata?.name
  const paused = !!sch.spec?.paused
  try {
    await api.value!.setSchedulePaused(sch, !paused)
    ElMessage.success(`${name} 已${paused ? '恢复' : '暂停'}`)
    await reload()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  }
}

async function onDeleteSchedule(sch: Record<string, any>) {
  const name = sch.metadata?.name
  if (!name) return
  try {
    await ElMessageBox.confirm(`确定删除定时备份 ${name} 吗？`, '删除计划', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await api.value!.remove('schedules', name)
    ElMessage.success('计划已删除')
    await reload()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  }
}

function openRestoreFor(backupName: string) {
  if (!canCreateRestore.value) {
    ElMessage.warning('无创建恢复权限')
    return
  }
  restorePresetBackup.value = backupName
  dialog.value.restore = true
}

onMounted(() => {
  syncRoute()
  window.addEventListener('hashchange', syncRoute)
  void reload()
})

onUnmounted(() => {
  window.removeEventListener('hashchange', syncRoute)
})
</script>

<template>
  <!-- 独立备份详情页（#usage/backup/<name>） -->
  <BackupDetailPage
    v-if="currentRoute.page === 'backup'"
    :name="currentRoute.name"
    :sdk="sdk!"
    :namespace="namespace"
    @back="goList"
  />

  <div v-else class="usage-page">
    <header class="usage-header">
      <div class="usage-header__title">
        <h1 class="usage-title">Velero 备份套件</h1>
        <p class="usage-sub">
          velero · Kubernetes 集群备份 / 恢复 · 命名空间
          <code class="usage-ns">{{ namespace }}</code>
        </p>
      </div>
      <div class="usage-header__actions">
        <span v-if="clusterCode" class="cluster-pill">集群：{{ clusterCode }}</span>
        <el-button text :loading="loading" @click="reload">刷新</el-button>
      </div>
    </header>

    <el-alert
      v-if="errorMsg && !backups.length"
      class="usage-page__error"
      type="error"
      :closable="false"
      show-icon
      title="Velero 数据加载失败"
      :description="errorMsg"
    />

    <el-tabs v-model="activeTab" class="usage-tabs">
      <!-- 备份历史 -->
      <el-tab-pane :label="`备份历史（${backups.length}）`" name="backups">
        <div class="tab-toolbar">
          <el-button v-if="canCreateBackup" type="primary" @click="dialog.backup = true">
            创建备份
          </el-button>
          <span v-else class="tab-perm-tip">当前角色无「创建备份」权限</span>
        </div>
        <el-table :data="backups" size="small" stripe>
          <el-table-column prop="metadata.name" label="名称" min-width="140" fixed />
          <el-table-column label="阶段" width="120">
            <template #default="{ row }">
              <el-tag :type="phaseTagType(statusOf(row).phase) as any" effect="plain">
                {{ statusOf(row).phase }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="错误/警告" width="100">
            <template #default="{ row }">
              <span v-if="statusOf(row).errors || statusOf(row).warnings" class="err-cell">
                {{ statusOf(row).errors }}E / {{ statusOf(row).warnings }}W
              </span>
              <span v-else class="ok-cell">0 / 0</span>
            </template>
          </el-table-column>
          <el-table-column label="进度" width="90">
            <template #default="{ row }">{{ progressText(row.status) }}</template>
          </el-table-column>
          <el-table-column label="包含命名空间" min-width="140">
            <template #default="{ row }">
              <span v-if="row.spec?.includedNamespaces?.length">
                {{ row.spec.includedNamespaces.join(', ') }}
              </span>
              <span v-else class="muted">全部</span>
            </template>
          </el-table-column>
          <el-table-column label="TTL" width="80">
            <template #default="{ row }">
              {{ parseTTLHours(row.spec?.ttl) ? `${parseTTLHours(row.spec?.ttl)}h` : '—' }}
            </template>
          </el-table-column>
          <el-table-column label="开始时间" width="150">
            <template #default="{ row }">{{ formatTime(statusOf(row).startedAt) }}</template>
          </el-table-column>
          <el-table-column label="完成时间" width="150">
            <template #default="{ row }">{{ formatTime(statusOf(row).completedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="goDetail(row)">
                详情
              </el-button>
              <el-button
                v-if="canCreateRestore"
                link
                type="primary"
                :disabled="statusOf(row).phase !== 'Completed'"
                @click="openRestoreFor(row.metadata?.name)"
              >
                恢复
              </el-button>
              <el-button
                v-if="canDeleteBackup"
                link
                type="danger"
                :disabled="statusOf(row).phase === 'Deleting'"
                @click="onDeleteBackup(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 定时备份 -->
      <el-tab-pane :label="`定时备份（${schedules.length}）`" name="schedules">
        <div class="tab-toolbar">
          <el-button v-if="canCreateSchedule" type="primary" @click="dialog.schedule = true">
            创建定时备份
          </el-button>
          <span v-else class="tab-perm-tip">当前角色无「创建计划」权限</span>
        </div>
        <el-table :data="schedules" size="small" stripe>
          <el-table-column prop="metadata.name" label="名称" min-width="140" fixed />
          <el-table-column prop="spec.schedule" label="Cron" width="120" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.spec?.paused ? 'warning' : 'success'" effect="plain">
                {{ row.spec?.paused ? '已暂停' : '启用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status.lastBackup" label="上次备份" width="170">
            <template #default="{ row }">{{ formatTime(row.status?.lastBackup) }}</template>
          </el-table-column>
          <el-table-column prop="status.nextBackup" label="下次备份" width="170">
            <template #default="{ row }">{{ formatTime(row.status?.nextBackup) }}</template>
          </el-table-column>
          <el-table-column label="包含命名空间" min-width="140">
            <template #default="{ row }">
              <span v-if="row.spec?.template?.includedNamespaces?.length">
                {{ row.spec.template.includedNamespaces.join(', ') }}
              </span>
              <span v-else class="muted">全部</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="onTogglePause(row)">
                {{ row.spec?.paused ? '恢复' : '暂停' }}
              </el-button>
              <el-button
                v-if="canDeleteSchedule"
                link
                type="danger"
                @click="onDeleteSchedule(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 恢复 -->
      <el-tab-pane :label="`恢复（${restores.length}）`" name="restores">
        <el-table :data="restores" size="small" stripe>
          <el-table-column prop="metadata.name" label="名称" min-width="140" fixed />
          <el-table-column prop="spec.backupName" label="来源备份" min-width="140" />
          <el-table-column label="阶段" width="120">
            <template #default="{ row }">
              <el-tag :type="phaseTagType(row.status?.phase) as any" effect="plain">
                {{ row.status?.phase || 'Unknown' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="错误/警告" width="100">
            <template #default="{ row }">
              <span :class="row.status?.errors ? 'err-cell' : 'ok-cell'">
                {{ row.status?.errors ?? 0 }}E / {{ row.status?.warnings ?? 0 }}W
              </span>
            </template>
          </el-table-column>
          <el-table-column label="开始时间" width="150">
            <template #default="{ row }">{{ formatTime(row.status?.startTimestamp) }}</template>
          </el-table-column>
          <el-table-column label="完成时间" width="150">
            <template #default="{ row }">{{ formatTime(row.status?.completionTimestamp) }}</template>
          </el-table-column>
          <el-table-column prop="status.message" label="消息" min-width="200" show-overflow-tooltip />
        </el-table>
      </el-tab-pane>

      <!-- 存储位置 -->
      <el-tab-pane :label="`存储位置（${storageLocations.length}）`" name="storage">
        <el-table :data="storageLocations" size="small" stripe>
          <el-table-column prop="metadata.name" label="名称" min-width="120" fixed />
          <el-table-column prop="spec.provider" label="Provider" width="90" />
          <el-table-column prop="spec.objectStorage.bucket" label="Bucket" min-width="120" />
          <el-table-column label="S3 地址" min-width="180">
            <template #default="{ row }">{{ row.spec?.config?.s3Url || '—' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="phaseTagType(row.status?.phase) as any" effect="plain">
                {{ row.status?.phase || 'Unknown' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="最近校验" width="170">
            <template #default="{ row }">{{ formatTime(row.status?.lastValidationTime) }}</template>
          </el-table-column>
          <el-table-column prop="status.message" label="消息" min-width="220" show-overflow-tooltip />
        </el-table>
      </el-tab-pane>

      <!-- 备份仓库 -->
      <el-tab-pane :label="`备份仓库（${repositories.length}）`" name="repos">
        <el-table :data="repositories" size="small" stripe>
          <el-table-column prop="metadata.name" label="名称" min-width="140" fixed />
          <el-table-column prop="spec.type" label="类型" width="90" />
          <el-table-column prop="spec.backupStorageLocation" label="存储位置" min-width="120" />
          <el-table-column label="阶段" width="120">
            <template #default="{ row }">
              <el-tag :type="phaseTagType(row.status?.phase) as any" effect="plain">
                {{ row.status?.phase || 'Unknown' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status.message" label="消息" min-width="220" show-overflow-tooltip />
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <footer class="usage-footer">
      数据经 OpenKuboard 受控接口读取（resourceAccess 白名单）；创建备份 / 恢复 / 计划由 Velero
      控制器异步执行，请稍后刷新查看。
    </footer>

    <CreateBackupDialog
      v-model:visible="dialog.backup"
      :sdk="sdk!"
      :namespace="namespace"
      @success="reload"
    />
    <CreateScheduleDialog
      v-model:visible="dialog.schedule"
      :sdk="sdk!"
      :namespace="namespace"
      @success="reload"
    />
    <CreateRestoreDialog
      v-model:visible="dialog.restore"
      :sdk="sdk!"
      :namespace="namespace"
      :backups="backups"
      :preset-backup-name="restorePresetBackup"
      @success="reload"
    />
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
</style>

<style scoped>
.usage-page {
  width: 100%;
  padding: 22px 24px 60px;
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
  margin-bottom: 20px;
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
.usage-ns {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
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
.tab-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}
.tab-perm-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.err-cell {
  color: var(--el-color-danger);
}
.ok-cell {
  color: var(--el-color-success);
}
.muted {
  color: var(--el-text-color-secondary);
}
.usage-footer {
  margin-top: 28px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
}
</style>