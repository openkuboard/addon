<script setup lang="ts">
// 创建定时备份对话框：cron 表达式 + 备份模板（复用创建备份的字段）。
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { VeleroApi } from '../api/velero'

const props = defineProps<{
  visible: boolean
  sdk: AddonSDK
  namespace: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'success'): void
}>()

const api = () => new VeleroApi(props.sdk, props.namespace)

const name = ref('')
const cron = ref('0 2 * * *')
const paused = ref(false)
const includedNamespaces = ref<string[]>([])
const excludedNamespaces = ref<string[]>([])
const includeClusterResources = ref(true)
const snapshotVolumes = ref(true)
const labelSelector = ref('')
const ttlHours = ref(720)
const storageLocation = ref('default')

const nsOptions = ref<string[]>([])
const submitting = ref(false)

function defaultName() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `schedule-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

onMounted(() => {
  if (!name.value) name.value = defaultName()
  props.sdk.host.listNamespaces().then((ns) => (nsOptions.value = ns)).catch(() => (nsOptions.value = []))
})

async function submit() {
  submitting.value = true
  try {
    await api().createSchedule(
      name.value,
      cron.value,
      {
        includedNamespaces: includedNamespaces.value,
        excludedNamespaces: excludedNamespaces.value,
        includeClusterResources: includeClusterResources.value,
        snapshotVolumes: snapshotVolumes.value,
        labelSelector: labelSelector.value,
        ttlHours: ttlHours.value,
        storageLocation: storageLocation.value,
      },
      paused.value,
    )
    ElMessage.success(`定时备份 ${name.value} 已创建`)
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
    :title="`创建定时备份 · 命名空间 ${namespace}`"
    width="640px"
    :close-on-click-modal="false"
    @update:model-value="(v: boolean) => emit('update:visible', v)"
    @closed="close"
  >
    <el-form label-width="150px" label-position="left">
      <el-form-item label="计划名称" required>
        <el-input v-model="name" placeholder="schedule-xxx" />
      </el-form-item>
      <el-form-item label="Cron 表达式" required>
        <el-input v-model="cron" placeholder="0 2 * * *" />
      </el-form-item>
      <el-form-item label="创建后暂停">
        <el-switch v-model="paused" />
      </el-form-item>
      <el-divider content-position="left">备份模板</el-divider>
      <el-form-item label="包含命名空间">
        <el-select
          v-model="includedNamespaces"
          multiple
          filterable
          clearable
          placeholder="留空 = 全部命名空间"
          style="width: 100%"
        >
          <el-option v-for="n in nsOptions" :key="n" :label="n" :value="n" />
        </el-select>
      </el-form-item>
      <el-form-item label="排除命名空间">
        <el-select
          v-model="excludedNamespaces"
          multiple
          filterable
          clearable
          placeholder="可选"
          style="width: 100%"
        >
          <el-option v-for="n in nsOptions" :key="n" :label="n" :value="n" />
        </el-select>
      </el-form-item>
      <el-form-item label="包含集群资源">
        <el-switch v-model="includeClusterResources" />
      </el-form-item>
      <el-form-item label="快照卷">
        <el-switch v-model="snapshotVolumes" />
      </el-form-item>
      <el-form-item label="标签选择器">
        <el-input v-model="labelSelector" placeholder="app=nginx,env=prod" />
      </el-form-item>
      <el-form-item label="TTL（小时）">
        <el-input-number v-model="ttlHours" :min="1" :max="87600" />
      </el-form-item>
      <el-form-item label="存储位置">
        <el-input v-model="storageLocation" placeholder="default" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">创建计划</el-button>
    </template>
  </el-dialog>
</template>