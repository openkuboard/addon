<script setup lang="ts">
// 告警规则（PrometheusRule 分组）编辑器 —— 还原自 host frontend-vue/src/components/AddonAlertRulesPanel.vue
// (v1 迁移时已删除)。数据流 host 驱动 → SDK 驱动由外层 AlertRulesView 承接：
// 本组件只消费 props.groups 并回吐 buildSavePayload 结果，不感知 CRD/文件差异。
import { computed, ref, watch } from 'vue'
import { Plus, RefreshRight } from '@element-plus/icons-vue'
import type { AddonAlertRuleGroup } from '../types'
import {
  buildSavePayload,
  cloneAlertRuleGroups,
  emptyAlertRule,
  getGroupAlertRules,
  groupByRuleSet,
  groupHasAlertRules,
  kvPairs,
  kvRecord,
  patchGroupAlertRules,
  type AlertKvPair,
  type PrometheusAlertRule,
} from '../utils/alertPrometheusRules'

const props = defineProps<{
  groups: AddonAlertRuleGroup[]
  readonly?: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  save: [payload: AddonAlertRuleGroup[]]
  reload: []
}>()

const localGroups = ref<AddonAlertRuleGroup[]>([])
const activeRuleSetKey = ref('')
const activeGroupName = ref('')

watch(
  () => props.groups,
  (groups) => {
    localGroups.value = cloneAlertRuleGroups(groups)
    syncSelection()
  },
  { immediate: true, deep: true },
)

const ruleSets = computed(() => groupByRuleSet(localGroups.value))

const activeRuleSet = computed(() =>
  ruleSets.value.find((item) => `${item.file}::${item.rule_set}` === activeRuleSetKey.value)
  ?? ruleSets.value[0]
  ?? null,
)

const visibleGroups = computed(() =>
  (activeRuleSet.value?.groups ?? []).filter(groupHasAlertRules),
)

const activeGroup = computed(() =>
  visibleGroups.value.find((group) => group.group === activeGroupName.value)
  ?? visibleGroups.value[0]
  ?? null,
)

const alertRules = computed(() =>
  activeGroup.value ? getGroupAlertRules(activeGroup.value) : [],
)

const groupInterval = computed({
  get: () => activeGroup.value?.interval ?? '',
  set: (value: string) => {
    if (!activeGroup.value || !activeRuleSet.value) return
    localGroups.value = patchGroupAlertRules(
      localGroups.value,
      activeRuleSet.value.file,
      activeRuleSet.value.rule_set,
      activeGroup.value.group,
      { interval: value },
    )
  },
})

const dirty = computed(() =>
  JSON.stringify(buildSavePayload(localGroups.value))
  !== JSON.stringify(buildSavePayload(props.groups)),
)

function syncSelection() {
  const sets = groupByRuleSet(localGroups.value)
  if (!sets.length) {
    activeRuleSetKey.value = ''
    activeGroupName.value = ''
    return
  }
  const setKey = `${sets[0].file}::${sets[0].rule_set}`
  if (!sets.some((item) => `${item.file}::${item.rule_set}` === activeRuleSetKey.value)) {
    activeRuleSetKey.value = setKey
  }
  const currentSet = sets.find((item) => `${item.file}::${item.rule_set}` === activeRuleSetKey.value) ?? sets[0]
  const groups = currentSet.groups.filter(groupHasAlertRules)
  if (!groups.some((group) => group.group === activeGroupName.value)) {
    activeGroupName.value = groups[0]?.group ?? ''
  }
}

function updateAlertRules(rules: PrometheusAlertRule[]) {
  if (!activeGroup.value || !activeRuleSet.value) return
  localGroups.value = patchGroupAlertRules(
    localGroups.value,
    activeRuleSet.value.file,
    activeRuleSet.value.rule_set,
    activeGroup.value.group,
    {
      rules: rules.map((rule) => ({
        alert: rule.alert,
        expr: rule.expr,
        for: rule.for,
        labels: rule.labels,
        annotations: rule.annotations,
      })),
    },
  )
}

function patchRule(index: number, patch: Partial<PrometheusAlertRule>) {
  const next = alertRules.value.map((rule, i) => (i === index ? { ...rule, ...patch } : rule))
  updateAlertRules(next)
}

function patchKv(
  index: number,
  field: 'labels' | 'annotations',
  pairs: AlertKvPair[],
) {
  patchRule(index, { [field]: kvRecord(pairs) })
}

function addRule() {
  updateAlertRules([...alertRules.value, emptyAlertRule()])
}

function removeRule(index: number) {
  updateAlertRules(alertRules.value.filter((_, i) => i !== index))
}

function onReload() {
  localGroups.value = cloneAlertRuleGroups(props.groups)
  syncSelection()
  emit('reload')
}

function onSave() {
  emit('save', buildSavePayload(localGroups.value))
}

watch(ruleSets, () => syncSelection())
</script>

<template>
  <div class="alert-rules-panel">
    <div class="alert-rules-header">
      <h4 class="panel-title">Prometheus 告警触发规则</h4>
      <div v-if="!readonly" class="alert-rules-actions">
        <el-button :icon="RefreshRight" @click="onReload">重新加载</el-button>
        <el-button type="primary" :loading="saving" :disabled="!dirty" @click="onSave">
          保存
        </el-button>
      </div>
    </div>

    <div v-if="ruleSets.length" class="alert-rules-body">
      <el-menu
        :default-active="activeRuleSetKey"
        class="rule-set-menu"
        @select="(key: string) => { activeRuleSetKey = key; syncSelection() }"
      >
        <el-menu-item
          v-for="item in ruleSets"
          :key="`${item.file}::${item.rule_set}`"
          :index="`${item.file}::${item.rule_set}`"
        >
          {{ item.rule_set }}
        </el-menu-item>
      </el-menu>

      <div class="rule-set-content">
        <el-tabs
          v-model="activeGroupName"
          class="rule-group-tabs"
        >
          <el-tab-pane
            v-for="group in visibleGroups"
            :key="group.group"
            :label="group.group"
            :name="group.group"
          />
        </el-tabs>

        <template v-if="activeGroup">
          <div class="interval-row">
            <label>interval</label>
            <el-input
              v-if="!readonly"
              v-model="groupInterval"
              placeholder="默认为 global.evaluation_interval 参数的值，通常此处不填写。"
            />
            <span v-else class="mono">{{ groupInterval || '—' }}</span>
          </div>

          <div
            v-for="(rule, index) in alertRules"
            :key="`${activeGroup.group}-${index}`"
            class="alert-rule-card"
          >
            <div class="rule-card-head">
              <span class="rule-index">{{ index + 1 }}</span>
              <el-button
                v-if="!readonly"
                link
                type="danger"
                @click="removeRule(index)"
              >
                删除
              </el-button>
            </div>

            <div class="field-row required">
              <label>告警名称</label>
              <el-input
                v-if="!readonly"
                :model-value="rule.alert"
                @update:model-value="(v: string) => patchRule(index, { alert: v })"
              />
              <span v-else>{{ rule.alert }}</span>
            </div>

            <div class="field-row required">
              <label>告警条件</label>
              <el-input
                v-if="!readonly"
                :model-value="rule.expr"
                type="textarea"
                :rows="5"
                @update:model-value="(v: string) => patchRule(index, { expr: v })"
              />
              <pre v-else class="expr-readonly">{{ rule.expr }}</pre>
            </div>

            <div class="field-row required">
              <label>持续时间</label>
              <el-input
                v-if="!readonly"
                :model-value="rule.for ?? ''"
                placeholder="10m"
                @update:model-value="(v: string) => patchRule(index, { for: v })"
              />
              <span v-else>{{ rule.for || '—' }}</span>
            </div>

            <section class="kv-section">
              <h5>告警标签</h5>
              <div
                v-for="(pair, pairIndex) in kvPairs(rule.labels)"
                :key="`label-${pairIndex}`"
                class="kv-row"
              >
                <el-input
                  v-if="!readonly"
                  :model-value="pair.key"
                  placeholder="key"
                  @update:model-value="(v: string) => patchKv(index, 'labels', kvPairs(rule.labels).map((row, i) => i === pairIndex ? { ...row, key: v } : row))"
                />
                <span v-else class="mono">{{ pair.key }}</span>
                <span class="kv-eq">=</span>
                <el-input
                  v-if="!readonly"
                  :model-value="pair.value"
                  placeholder="value"
                  @update:model-value="(v: string) => patchKv(index, 'labels', kvPairs(rule.labels).map((row, i) => i === pairIndex ? { ...row, value: v } : row))"
                />
                <span v-else class="mono">{{ pair.value }}</span>
                <el-button
                  v-if="!readonly"
                  link
                  type="danger"
                  @click="patchKv(index, 'labels', kvPairs(rule.labels).filter((_, i) => i !== pairIndex))"
                >
                  删除
                </el-button>
              </div>
              <el-button
                v-if="!readonly"
                link
                type="primary"
                :icon="Plus"
                @click="patchKv(index, 'labels', [...kvPairs(rule.labels), { key: '', value: '' }])"
              >
                添加
              </el-button>
            </section>

            <section class="kv-section">
              <h5>告警详情</h5>
              <div
                v-for="(pair, pairIndex) in kvPairs(rule.annotations)"
                :key="`anno-${pairIndex}`"
                class="kv-row"
              >
                <el-input
                  v-if="!readonly"
                  :model-value="pair.key"
                  placeholder="key"
                  @update:model-value="(v: string) => patchKv(index, 'annotations', kvPairs(rule.annotations).map((row, i) => i === pairIndex ? { ...row, key: v } : row))"
                />
                <span v-else class="mono">{{ pair.key }}</span>
                <span class="kv-eq">=</span>
                <el-input
                  v-if="!readonly"
                  :model-value="pair.value"
                  placeholder="value"
                  @update:model-value="(v: string) => patchKv(index, 'annotations', kvPairs(rule.annotations).map((row, i) => i === pairIndex ? { ...row, value: v } : row))"
                />
                <span v-else class="mono">{{ pair.value }}</span>
                <el-button
                  v-if="!readonly"
                  link
                  type="danger"
                  @click="patchKv(index, 'annotations', kvPairs(rule.annotations).filter((_, i) => i !== pairIndex))"
                >
                  删除
                </el-button>
              </div>
              <el-button
                v-if="!readonly"
                link
                type="primary"
                :icon="Plus"
                @click="patchKv(index, 'annotations', [...kvPairs(rule.annotations), { key: '', value: '' }])"
              >
                添加
              </el-button>
            </section>
          </div>

          <el-button
            v-if="!readonly"
            link
            type="primary"
            :icon="Plus"
            class="add-rule-btn"
            @click="addRule"
          >
            添加告警规则
          </el-button>
        </template>
      </div>
    </div>

    <p v-else class="params-hint">当前套件未包含可编辑的 Prometheus 告警规则。</p>
  </div>
</template>

<style scoped>
.alert-rules-panel {
  padding: 4px 0 8px;
}
.alert-rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.alert-rules-actions {
  display: flex;
  gap: 8px;
}
.alert-rules-body {
  display: flex;
  min-height: 480px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  overflow: hidden;
}
.rule-set-menu {
  width: 180px;
  flex-shrink: 0;
  border-right: 1px solid var(--el-border-color-lighter);
}
.rule-set-menu :deep(.el-menu-item) {
  height: 44px;
  line-height: 44px;
  font-size: 13px;
}
.rule-set-menu :deep(.el-menu-item.is-active) {
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
}
.rule-set-content {
  flex: 1;
  padding: 12px 16px 16px;
  overflow: auto;
  max-height: 640px;
}
.rule-group-tabs :deep(.el-tabs__item.is-active) {
  color: var(--el-color-warning);
}
.interval-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0 16px;
  font-size: 13px;
}
.interval-row label {
  width: 64px;
  color: var(--el-text-color-secondary);
}
.interval-row .el-input {
  max-width: 520px;
}
.alert-rule-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 12px 14px 16px;
  margin-bottom: 14px;
}
.rule-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.rule-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}
.field-row {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 13px;
  align-items: start;
}
.field-row.required label::before {
  content: '*';
  color: var(--el-color-danger);
  margin-right: 4px;
}
.expr-readonly {
  margin: 0;
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
}
.kv-section {
  margin-top: 8px;
}
.kv-section h5 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
}
.kv-row {
  display: grid;
  grid-template-columns: 1fr 24px 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.kv-eq {
  text-align: center;
  color: var(--el-text-color-secondary);
}
.add-rule-btn {
  margin-top: 4px;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.params-hint {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
