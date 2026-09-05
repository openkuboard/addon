<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElAlert, ElMessage } from 'element-plus'
import AddonAlertConfigPanel from './AddonAlertConfigPanel.vue'
import type { AddonAlertConfigDefs } from '../types'
import { applySchemaDefaults, cloneConfig } from '../utils/addonSchemaForm'
import { loadSDK } from '../sdk'

// 告警配置视图（SDK 驱动）：加载 getAlertConfig() → 应用 schema 默认值 → 交给
// AddonAlertConfigPanel 编辑；保存时调 updateAlertConfig(整份模型) 覆盖写。
const loading = ref(true)
const saving = ref(false)
const errorMsg = ref('')
const schema = ref<AddonAlertConfigDefs>({ tabs: [] })
const model = ref<Record<string, unknown>>({})

let sdk: AddonSDK | null = null

async function reload() {
  loading.value = true
  errorMsg.value = ''
  sdk = null
  try {
    const sd = await loadSDK()
    sdk = sd
    const { config, schema: rawSchema } = await sd.config.getAlertConfig()
    const raw = (rawSchema ?? {}) as Partial<AddonAlertConfigDefs>
    const defs: AddonAlertConfigDefs = { ...raw, tabs: raw.tabs ?? [] }
    schema.value = defs
    // 与 host 行为一致：schema 有 tabs 时补齐缺失项默认值，否则原样克隆
    model.value = defs.tabs.length
      ? applySchemaDefaults(defs, config)
      : cloneConfig(config)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!sdk || saving.value) return
  saving.value = true
  try {
    await sdk.config.updateAlertConfig(cloneConfig(model.value))
    ElMessage.success('告警配置已保存')
  } catch (e) {
    ElMessage.error(`保存失败：${e instanceof Error ? e.message : String(e)}`)
  } finally {
    saving.value = false
  }
}

onMounted(reload)
</script>

<template>
  <div class="alert-config-view" v-loading="loading">
    <el-alert
      v-if="errorMsg"
      class="view-error"
      type="error"
      :closable="false"
      show-icon
      title="告警配置加载失败"
      :description="errorMsg"
    >
      <template #default>
        <div class="view-error-actions">
          <span>{{ errorMsg }}</span>
          <el-button size="small" type="primary" plain @click="reload">重试</el-button>
        </div>
      </template>
    </el-alert>

    <template v-else-if="!loading">
      <AddonAlertConfigPanel
        v-if="schema.tabs.length"
        v-model="model"
        :schema="schema"
        :saving="saving"
        @save="save"
      />
      <el-alert
        v-else
        title="该套件未提供告警配置 schema"
        type="info"
        :closable="false"
        show-icon
      />
    </template>
  </div>
</template>

<style scoped>
.alert-config-view {
  min-height: 200px;
}
.view-error {
  margin-bottom: 12px;
}
.view-error-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
