<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'
import type { AddonAlertConfigDefs, AddonAlertConfigTab } from '../types'
import { resolveSchemaTabComponent } from '../schemaKindRegistry'
import AddonSchemaForm from './AddonSchemaForm.vue'
import JsonEditor from './JsonEditor.vue'
import { cloneConfig, firstTabId, jsonTabValue, setJsonTabValue } from '../utils/addonSchemaForm'

// 告警配置面板（还原自 host AddonAlertConfigPanel.vue）：左侧菜单 5 tab + 右侧内容 + 保存。
// 数据流改为 SDK 驱动：父级（AlertConfigView）提供 schema 与 model（v-model），save 时父级调 updateAlertConfig。
const props = defineProps<{
  schema: AddonAlertConfigDefs
  modelValue: Record<string, unknown>
  readonly?: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
  save: []
}>()

const activeTab = ref(firstTabId(props.schema))

watch(
  () => props.schema,
  (schema) => {
    activeTab.value = firstTabId(schema)
  },
)

const tabs = computed(() => props.schema.tabs ?? [])

const activeTabDef = computed(() =>
  tabs.value.find((tab) => tab.id === activeTab.value) ?? tabs.value[0] ?? null,
)

function effectiveKind(tab: AddonAlertConfigTab | null): string {
  if (!tab) return 'json'
  return resolveSchemaTabComponent(tab.kind) ? tab.kind : 'json'
}

const activeJsonText = computed(() =>
  activeTabDef.value && effectiveKind(activeTabDef.value) === 'json'
    ? jsonTabValue(props.modelValue, activeTabDef.value)
    : '',
)

function onJsonTabUpdate(raw: string) {
  if (!activeTabDef.value || effectiveKind(activeTabDef.value) !== 'json') return
  const next = cloneConfig(props.modelValue) as Record<string, unknown>
  setJsonTabValue(next, activeTabDef.value, raw)
  emit('update:modelValue', next)
}

function onSave() {
  emit('save')
}

// 「设置接口参数」等场景由子编辑器发出 goto-tab：在本面板内直接切换左侧 tab，避免依赖父级
function onGotoTab(tabId: string) {
  if (tabs.value.some((tab) => tab.id === tabId)) activeTab.value = tabId
}
</script>

<template>
  <div class="alert-config-panel">
    <div class="alert-config-header">
      <a
        v-if="schema.helpUrl"
        class="alert-config-help"
        :href="schema.helpUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        <el-icon><QuestionFilled /></el-icon>
        {{ schema.helpLabel || '如何配置告警参数？' }}
      </a>
      <span v-else />
      <el-button
        v-if="!readonly"
        type="primary"
        :loading="saving"
        @click="onSave"
      >
        保存
      </el-button>
    </div>

    <div class="alert-config-body">
      <el-menu
        :default-active="activeTab"
        class="alert-config-menu"
        @select="(key: string) => { activeTab = key }"
      >
        <el-menu-item
          v-for="tab in tabs"
          :key="tab.id"
          :index="tab.id"
        >
          {{ tab.label }}
        </el-menu-item>
      </el-menu>

      <div class="alert-config-content">
        <template v-if="activeTabDef?.kind === 'form'">
          <AddonSchemaForm
            :sections="activeTabDef.sections ?? []"
            :model="modelValue"
            :editable="!readonly"
          />
        </template>

        <template v-else-if="activeTabDef && resolveSchemaTabComponent(activeTabDef.kind)">
          <component
            :is="resolveSchemaTabComponent(activeTabDef.kind)"
            :tab="activeTabDef"
            :model="modelValue"
            :editable="!readonly"
            @goto-tab="onGotoTab"
          />
        </template>

        <template v-else-if="activeTabDef">
          <p v-if="activeTabDef.hint" class="params-hint">{{ activeTabDef.hint }}</p>
          <p v-else-if="activeTabDef.kind !== 'json'" class="params-hint">
            未识别的 schema kind「{{ activeTabDef.kind }}」，已降级为 JSON 编辑。
          </p>
          <JsonEditor
            v-if="!readonly"
            :model-value="activeJsonText"
            height="420px"
            @update:model-value="onJsonTabUpdate"
          />
          <JsonEditor
            v-else
            :model-value="activeJsonText"
            readonly
            height="420px"
          />
        </template>
      </div>
    </div>

    <p v-if="schema.footnote && !readonly" class="alert-config-footnote">
      {{ schema.footnote }}
    </p>
  </div>
</template>

<style scoped>
.alert-config-panel {
  padding: 4px 0 8px;
}
.alert-config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.alert-config-help {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--el-color-primary);
  text-decoration: none;
}
.alert-config-help:hover {
  text-decoration: underline;
}
.alert-config-body {
  display: flex;
  gap: 0;
  min-height: 420px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  overflow: hidden;
}
.alert-config-menu {
  width: 132px;
  flex-shrink: 0;
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
}
.alert-config-menu :deep(.el-menu-item) {
  height: 44px;
  line-height: 44px;
  font-size: 13px;
}
.alert-config-menu :deep(.el-menu-item.is-active) {
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
}
.alert-config-content {
  flex: 1;
  padding: 16px 20px;
  overflow: auto;
  max-height: 560px;
}
.alert-config-footnote {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.params-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
