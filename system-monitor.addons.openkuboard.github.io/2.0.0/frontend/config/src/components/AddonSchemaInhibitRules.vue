<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import type { AddonAlertConfigTab, AlertInhibitRule } from '../types'
import {
  emptyInhibitRuleForm,
  formToRule,
  normalizeInhibitRules,
  ruleToForm,
  type InhibitRuleForm,
} from '../utils/alertInhibitRules'
import { getByPath, setByPath } from '../utils/addonSchemaForm'

// 抑制规则编辑器（inhibit_rules kind，还原自 host AddonSchemaInhibitRules.vue）：
// 源/目标匹配器（key=value+regex）与 Equal 标签列表，编辑后 formToRule 写回 model 路径（= inhibit_rules）。
const props = defineProps<{
  tab: AddonAlertConfigTab
  model: Record<string, unknown>
  editable?: boolean
}>()

const docsExpanded = ref(['docs'])
const pathKey = computed(() => props.tab.path || 'inhibit_rules')

const rules = computed({
  get: () => normalizeInhibitRules(getByPath(props.model, pathKey.value)),
  set: (value: AlertInhibitRule[]) => {
    setByPath(props.model, pathKey.value, value)
  },
})

const ruleForms = computed(() => rules.value.map((rule) => ruleToForm(rule)))

function commitForms(forms: InhibitRuleForm[]) {
  rules.value = forms.map((form) => formToRule(form))
}

function updateRule(index: number, form: InhibitRuleForm) {
  const next = ruleForms.value.map((item, i) => (i === index ? form : item))
  commitForms(next)
}

function addRule() {
  commitForms([...ruleForms.value, emptyInhibitRuleForm()])
}

function removeRule(index: number) {
  commitForms(ruleForms.value.filter((_, i) => i !== index))
}

function patchMatchers(
  index: number,
  side: 'sourceMatchers' | 'targetMatchers',
  rows: InhibitRuleForm['sourceMatchers'],
) {
  const form = { ...ruleForms.value[index], [side]: rows }
  updateRule(index, form)
}

function addMatcher(index: number, side: 'sourceMatchers' | 'targetMatchers', regex = false) {
  const form = ruleForms.value[index]
  const rows = [...form[side], { key: '', value: '', regex }]
  patchMatchers(index, side, rows)
}

function updateMatcher(
  index: number,
  side: 'sourceMatchers' | 'targetMatchers',
  rowIndex: number,
  patch: Partial<InhibitRuleForm['sourceMatchers'][number]>,
) {
  const form = ruleForms.value[index]
  const rows = form[side].map((row, i) => (i === rowIndex ? { ...row, ...patch } : row))
  patchMatchers(index, side, rows)
}

function removeMatcher(
  index: number,
  side: 'sourceMatchers' | 'targetMatchers',
  rowIndex: number,
) {
  const form = ruleForms.value[index]
  const rows = form[side].filter((_, i) => i !== rowIndex)
  patchMatchers(index, side, rows.length ? rows : [{ key: '', value: '', regex: side === 'targetMatchers' }])
}

function updateEqual(index: number, equal: string[]) {
  updateRule(index, { ...ruleForms.value[index], equal })
}
</script>

<template>
  <div class="inhibit-rules-panel">
    <el-collapse v-if="tab.docsTitle" v-model="docsExpanded" class="inhibit-docs">
      <el-collapse-item :title="tab.docsTitle" name="docs">
        <pre class="inhibit-docs-body">{{ tab.docsContent }}</pre>
      </el-collapse-item>
    </el-collapse>

    <h4 class="section-title">抑制规则列表</h4>

    <div
      v-for="(form, index) in ruleForms"
      :key="index"
      class="inhibit-rule-card"
    >
      <div class="rule-card-head">
        <strong>抑制规则 {{ index + 1 }}</strong>
        <el-button
          v-if="editable"
          link
          type="danger"
          @click="removeRule(index)"
        >
          删除
        </el-button>
      </div>

      <section class="rule-section">
        <h5>源告警事件匹配器</h5>
        <div
          v-for="(row, rowIndex) in form.sourceMatchers"
          :key="`source-${rowIndex}`"
          class="matcher-row"
        >
          <el-input
            v-if="editable"
            :model-value="row.key"
            placeholder="label"
            @update:model-value="(v: string) => updateMatcher(index, 'sourceMatchers', rowIndex, { key: v })"
          />
          <span v-else class="mono">{{ row.key }}</span>
          <span class="matcher-eq">=</span>
          <el-input
            v-if="editable"
            :model-value="row.value"
            placeholder="value"
            @update:model-value="(v: string) => updateMatcher(index, 'sourceMatchers', rowIndex, { value: v })"
          />
          <span v-else class="mono">{{ row.value }}</span>
          <el-checkbox
            v-if="editable"
            :model-value="!!row.regex"
            @update:model-value="(v) => updateMatcher(index, 'sourceMatchers', rowIndex, { regex: Boolean(v) })"
          >
            正则
          </el-checkbox>
          <el-button
            v-if="editable"
            link
            type="danger"
            @click="removeMatcher(index, 'sourceMatchers', rowIndex)"
          >
            删除
          </el-button>
        </div>
        <el-button
          v-if="editable"
          link
          type="primary"
          @click="addMatcher(index, 'sourceMatchers', false)"
        >
          + 添加源告警事件匹配器
        </el-button>
      </section>

      <section class="rule-section">
        <h5>Equal 标签列表</h5>
        <el-select
          v-if="editable"
          :model-value="form.equal"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="+ 添加 Equal 标签"
          class="equal-tags"
          @update:model-value="(v: string[]) => updateEqual(index, v)"
        />
        <span v-else>{{ form.equal.join(', ') || '—' }}</span>
      </section>

      <section class="rule-section">
        <h5>目标告警事件匹配器</h5>
        <div
          v-for="(row, rowIndex) in form.targetMatchers"
          :key="`target-${rowIndex}`"
          class="matcher-row"
        >
          <el-input
            v-if="editable"
            :model-value="row.key"
            placeholder="label / label_re"
            @update:model-value="(v: string) => updateMatcher(index, 'targetMatchers', rowIndex, { key: v })"
          />
          <span v-else class="mono">{{ row.key }}</span>
          <span class="matcher-eq">=</span>
          <el-input
            v-if="editable"
            :model-value="row.value"
            placeholder="value"
            @update:model-value="(v: string) => updateMatcher(index, 'targetMatchers', rowIndex, { value: v })"
          />
          <span v-else class="mono">{{ row.value }}</span>
          <el-checkbox
            v-if="editable"
            :model-value="!!row.regex"
            @update:model-value="(v) => updateMatcher(index, 'targetMatchers', rowIndex, { regex: Boolean(v) })"
          >
            正则
          </el-checkbox>
          <el-button
            v-if="editable"
            link
            type="danger"
            @click="removeMatcher(index, 'targetMatchers', rowIndex)"
          >
            删除
          </el-button>
        </div>
        <el-button
          v-if="editable"
          link
          type="primary"
          @click="addMatcher(index, 'targetMatchers', true)"
        >
          + 添加目标告警事件匹配器
        </el-button>
      </section>
    </div>

    <el-button
      v-if="editable"
      plain
      type="primary"
      class="add-rule-btn"
      @click="addRule"
    >
      <el-icon><Plus /></el-icon>
      {{ tab.addRuleLabel || '+ 添加抑制规则' }}
    </el-button>
  </div>
</template>

<style scoped>
.inhibit-rules-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.inhibit-docs :deep(.el-collapse-item__header) {
  font-weight: 600;
}
.inhibit-docs-body {
  margin: 0;
  white-space: pre-wrap;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  font-family: inherit;
}
.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.inhibit-rule-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 14px 16px;
  background: var(--el-fill-color-blank);
}
.rule-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.rule-section {
  margin-bottom: 14px;
  padding-top: 10px;
  border-top: 1px solid var(--el-border-color-extra-light);
}
.rule-section h5 {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
}
.matcher-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.matcher-row .el-input {
  width: 160px;
}
.matcher-eq {
  color: var(--el-text-color-secondary);
}
.equal-tags {
  width: 100%;
  max-width: 480px;
}
.add-rule-btn {
  align-self: flex-start;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
