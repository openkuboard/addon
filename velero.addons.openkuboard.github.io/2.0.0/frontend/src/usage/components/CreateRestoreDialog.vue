<script setup lang="ts">
// 创建恢复对话框：从历史备份（backups 列表）选择，可选命名空间覆盖。
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { VeleroApi } from '../api/velero'

const props = defineProps<{
  visible: boolean
  sdk: AddonSDK
  namespace: string
  backups: Record<string, any>[]
  presetBackupName?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'success'): void
}>()

const api = () => new VeleroApi(props.sdk, props.namespace)

const name = ref('')
const backupName = ref('')
const includedNamespaces = ref<string[]>([])
const restorePVs = ref(true)

const nsOptions = ref<string[]>([])
const submitting = ref(false)

// 只允许从已完成备份恢复
const restorableBackups = computed(() =>
  props.backups.filter((b) => b.status?.phase === 'Completed'),
)

onMounted(() => {
  if (!name.value) {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    name.value = `restore-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  }
  props.sdk.host.listNamespaces().then((ns) => (nsOptions.value = ns)).catch(() => (nsOptions.value = []))
})

// 从备份行点击「恢复」时预选来源备份
watch(
  () => props.presetBackupName,
  (v) => {
    if (v) backupName.value = v
  },
  { immediate: true },
)

async function submit() {
  if (!backupName.value) {
    ElMessage.warning('请选择要恢复的备份')
    return
  }
  submitting.value = true
  try {
    await api().createRestore(name.value, backupName.value, {
      includedNamespaces: includedNamespaces.value,
      restorePVs: restorePVs.value,
    })
    ElMessage.success(`恢复 ${name.value} 已创建`)
    emit('update:visible', false)
    emit('success')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e))
  } finally {
    submitting.value = false
  }
}

function close() {
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="`从备份恢复 · 命名空间 ${namespace}`"
    width="620px"
    :close-on-click-modal="false"
    @update:model-value="(v: boolean) => emit('update:visible', v)"
    @closed="close"
  >
    <el-form label-width="150px" label-position="left">
      <el-form-item label="恢复名称" required>
        <el-input v-model="name" placeholder="restore-xxx" />
      </el-form-item>
      <el-form-item label="来源备份" required>
        <el-select v-model="backupName" filterable placeholder="选择备份" style="width: 100%">
          <el-option
            v-for="b in restorableBackups"
            :key="b.metadata?.name"
            :label="`${b.metadata?.name}（${(b.status?.startTimestamp || '').slice(0, 19)}）`"
            :value="b.metadata?.name"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="恢复命名空间">
        <el-select
          v-model="includedNamespaces"
          multiple
          filterable
          clearable
          placeholder="留空 = 恢复全部命名空间"
          style="width: 100%"
        >
          <el-option v-for="n in nsOptions" :key="n" :label="n" :value="n" />
        </el-select>
      </el-form-item>
      <el-form-item label="恢复 PVC">
        <el-switch v-model="restorePVs" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">创建恢复</el-button>
    </template>
  </el-dialog>
</template>