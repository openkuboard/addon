<script setup lang="ts">
// 存储状态只读面板：读取 Velero 命名空间下的 BackupStorageLocation / BackupRepository，
// 展示对象存储连通性与文件级备份仓库状态。需要套件已安装（CRD 存在），未就绪时给出提示。
import { onMounted, ref } from 'vue'
import { ElAlert, ElButton, ElTable, ElTableColumn, ElTag } from 'element-plus'
import { loadSDK } from '../../sdk'

interface BSLItem {
  metadata?: { name?: string; namespace?: string; creationTimestamp?: string }
  spec?: {
    provider?: string
    objectStorage?: { bucket?: string }
    config?: Record<string, string>
    default?: boolean
  }
  status?: {
    phase?: string
    lastValidationTime?: string
    lastSyncedTime?: string
    message?: string
  }
}

interface RepoItem {
  metadata?: { name?: string; creationTimestamp?: string }
  spec?: {
    type?: string
    backupStorageLocation?: string
  }
  status?: { phase?: string; message?: string; lastMaintenanceTime?: string }
}

const GRP = 'velero.io'
const VER = 'v1'
const NAMESPACE_KEY = 'VELERO_NAMESPACE'

const bsls = ref<BSLItem[]>([])
const repos = ref<RepoItem[]>([])
const loading = ref(false)
const errorMsg = ref('')
const veleroNamespace = ref('velero')

function phaseType(phase?: string) {
  const map: Record<string, string> = {
    Available: 'success',
    Unavailable: 'danger',
    Ready: 'success',
    NotReady: 'warning',
  }
  return (phase && map[phase]) || 'info'
}

async function reload() {
  loading.value = true
  errorMsg.value = ''
  try {
    const sdk = await loadSDK()
    const params = await sdk.config.getParameters()
    veleroNamespace.value = params[NAMESPACE_KEY] || 'velero'
    const ns = veleroNamespace.value
    const [b, r] = await Promise.all([
      sdk.resource.list({ group: GRP, version: VER, resource: 'backupstoragelocations', namespace: ns }),
      sdk.resource.list({ group: GRP, version: VER, resource: 'backuprepositories', namespace: ns }),
    ])
    bsls.value = (b as BSLItem[]) ?? []
    repos.value = (r as RepoItem[]) ?? []
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

onMounted(reload)
</script>

<template>
  <div class="storage-status">
    <div class="storage-status__toolbar">
      <p class="storage-status__hint">
        当前命名空间：<code>{{ veleroNamespace }}</code> · 参数变更后请在套件详情页重新应用安装脚本
      </p>
      <el-button text :loading="loading" @click="reload">刷新</el-button>
    </div>

    <el-alert
      v-if="errorMsg"
      class="storage-status__error"
      type="warning"
      :closable="false"
      show-icon
      title="存储状态读取失败（可能尚未安装套件）"
      :description="errorMsg"
    />

    <section class="storage-sec">
      <div class="storage-sec__head">
        <span class="storage-sec__title">备份存储位置（BackupStorageLocation）</span>
        <span class="storage-sec__count">{{ bsls.length }} 项</span>
      </div>
      <el-table :data="bsls" size="small" stripe :empty-text="'无存储位置'">
        <el-table-column prop="metadata.name" label="名称" min-width="120" />
        <el-table-column prop="spec.provider" label="Provider" width="90" />
        <el-table-column prop="spec.objectStorage.bucket" label="Bucket" min-width="120" />
        <el-table-column label="S3 地址" min-width="180">
          <template #default="{ row }">{{ row.spec?.config?.s3Url || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="phaseType(row.status?.phase) as any" effect="plain">
              {{ row.status?.phase || 'Unknown' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最近校验" width="180">
          <template #default="{ row }">{{ row.status?.lastValidationTime || '—' }}</template>
        </el-table-column>
        <el-table-column prop="status.message" label="消息" min-width="200" show-overflow-tooltip />
      </el-table>
    </section>

    <section class="storage-sec">
      <div class="storage-sec__head">
        <span class="storage-sec__title">备份仓库（BackupRepository / kopia）</span>
        <span class="storage-sec__count">{{ repos.length }} 项</span>
      </div>
      <el-table :data="repos" size="small" stripe :empty-text="'暂无仓库（创建包含 PVC 的备份后自动生成）'">
        <el-table-column prop="metadata.name" label="名称" min-width="140" />
        <el-table-column prop="spec.type" label="类型" width="90" />
        <el-table-column prop="spec.backupStorageLocation" label="存储位置" min-width="120" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="phaseType(row.status?.phase) as any" effect="plain">
              {{ row.status?.phase || 'Unknown' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status.message" label="消息" min-width="200" show-overflow-tooltip />
      </el-table>
    </section>
  </div>
</template>

<style scoped>
.storage-status__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.storage-status__hint {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.storage-status__hint code {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}
.storage-status__error {
  margin-bottom: 14px;
}
.storage-sec + .storage-sec {
  margin-top: 20px;
}
.storage-sec__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}
.storage-sec__title {
  font-size: 15px;
  font-weight: 600;
}
.storage-sec__count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>