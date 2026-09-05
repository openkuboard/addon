<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElAlert, ElButton, ElMessage } from 'element-plus'
import ParamRow from './components/ParamRow.vue'
import AlertConfigView from './components/AlertConfigView.vue'
import AlertEventsView from './components/AlertEventsView.vue'
import AlertRulesView from './components/AlertRulesView.vue'
import { buildRenderModel, collectHostReadKeys, type RenderSection } from './utils/params'
import { fetchHostData, loadSDK } from './sdk'

// 配置页分四个主区块：参数配置（原 ParamRow 渲染，保留） + 告警配置（SDK 驱动的
// AlertConfigView，含 interface/contacts/routes/inhibit/templates 五 tab）+ 告警规则（SDK 经
// PrometheusRule CRD 读写的规则编辑器 AlertRulesView）+ 告警事件只读 iframe。

const activeMainTab = ref('params')

// ---------- 参数配置区块（原 App.vue 逻辑原样保留） ----------
const sections = ref<RenderSection[]>([])
// 可编辑模型：只包含 user-editable + enum-from-hostReads（host-derived 不入 payload）
const values = ref<Record<string, string>>({})
const clusterCode = ref('')
const loading = ref(true)
const saving = ref(false)
const errorMsg = ref('')

let sdk: AddonSDK | null = null

async function reload() {
  loading.value = true
  errorMsg.value = ''
  sections.value = []
  try {
    const sd = await loadSDK()
    sdk = sd
    clusterCode.value = sd.cluster.code || sd.cluster.name || ''
    const [defs, params] = await Promise.all([
      sd.config.getParameterDefs(),
      sd.config.getParameters(),
    ])
    const hostData = await fetchHostData(sd, collectHostReadKeys(defs))
    const secs = buildRenderModel(defs, params, hostData)
    sections.value = secs

    const init: Record<string, string> = {}
    for (const sec of secs)
      for (const row of sec.rows)
        if (row.def.category !== 'host-derived') init[row.def.name] = row.value
    values.value = init
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function onRowChange(name: string, v: string) {
  values.value[name] = v
}

function rowDisplayValue(name: string, fallback: string) {
  return values.value[name] ?? fallback
}

async function save() {
  if (!sdk || saving.value) return
  saving.value = true
  try {
    await sdk.config.updateParameters({ ...values.value })
    ElMessage.success('参数已保存')
  } catch (e) {
    ElMessage.error(`保存失败：${e instanceof Error ? e.message : String(e)}`)
  } finally {
    saving.value = false
  }
}
onMounted(reload)
</script>

<template>
  <div class="config-page">
    <div class="config-page__toolbar">
      <el-button text @click="reload" :loading="loading">重新加载参数</el-button>
    </div>

    <el-tabs v-model="activeMainTab" class="config-main-tabs">
      <!-- 参数配置 -->
      <el-tab-pane label="参数配置" name="params">
        <div class="config-page__sections">
          <el-alert
            v-if="errorMsg"
            class="config-page__err"
            type="error"
            :closable="false"
            show-icon
            title="配置加载失败"
            :description="errorMsg"
          />

          <template v-if="!errorMsg && sections.length">
            <section v-for="sec in sections" :key="sec.category" class="config-sec">
              <div class="config-sec__head">
                <span class="config-sec__title">{{ sec.title }}</span>
                <span class="config-sec__count">{{ sec.rows.length }} 项</span>
              </div>
              <ParamRow
                v-for="row in sec.rows"
                :key="row.def.name"
                :def="row.def"
                :options="row.options"
                :value="rowDisplayValue(row.def.name, row.value)"
                @update:value="(v) => onRowChange(row.def.name, v)"
              />
            </section>

            <div class="config-param-actions">
              <div class="config-page__hint">保存后新参数将在下一次组件重装 / 重新调度时生效。</div>
              <div class="config-page__actions">
                <el-button :disabled="saving" @click="reload">放弃更改</el-button>
                <el-button type="primary" :loading="saving" @click="save">保存参数</el-button>
              </div>
            </div>
          </template>

          <el-alert
            v-else-if="!errorMsg && !loading"
            title="该套件当前没有可配置参数"
            type="info"
            :closable="false"
            show-icon
          />
        </div>
      </el-tab-pane>

      <!-- 告警配置 -->
      <el-tab-pane label="告警配置" name="alert-config">
        <AlertConfigView />
      </el-tab-pane>

      <!-- 告警规则（PrometheusRule CRD 规则编辑器） -->
      <el-tab-pane label="告警规则" name="alert-rules">
        <AlertRulesView />
      </el-tab-pane>

      <!-- 告警事件（Prometheus Alerts 只读） -->
      <el-tab-pane label="告警事件" name="alert-events">
        <AlertEventsView />
      </el-tab-pane>
    </el-tabs>
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
.config-page {
  padding: 12px 20px 40px;
  min-height: 100vh;
}
.config-page__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 4px;
}
.config-page__err {
  margin-bottom: 14px;
}
.config-main-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: var(--el-border-color-lighter);
}
.config-sec + .config-sec {
  margin-top: 22px;
}
.config-sec__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}
.config-sec__title {
  font-size: 15px;
  font-weight: 600;
}
.config-sec__count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.config-param-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
  padding: 12px 4px 4px;
  border-top: 1px solid var(--el-border-color-lighter);
}
.config-page__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.config-page__actions {
  display: flex;
  gap: 10px;
}
</style>
