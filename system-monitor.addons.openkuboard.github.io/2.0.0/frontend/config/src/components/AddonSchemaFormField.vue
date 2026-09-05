<script setup lang="ts">
import { computed } from 'vue'
import type { AddonAlertConfigField } from '../types'
import { fieldVisible, formatReadonlyValue, getByPath, setByPath } from '../utils/addonSchemaForm'

// form 单字段渲染器（还原自 host frontend-vue/src/components/AddonSchemaFormField.vue）：
// 支持 text / password / textarea / switch，showWhen 条件显隐；只读态展示格式化文本。
const props = defineProps<{
  field: AddonAlertConfigField
  model: Record<string, unknown>
  editable?: boolean
}>()

const visible = computed(() => fieldVisible(props.field, props.model))

const switchValue = computed({
  get: () => Boolean(getByPath(props.model, props.field.path)),
  // el-switch 的 update:modelValue 可能带 string|number|boolean，这里统一转布尔再落库
  set: (value: boolean | string | number) =>
    setByPath(props.model, props.field.path, Boolean(value)),
})

const textValue = computed({
  get: () => {
    const raw = getByPath(props.model, props.field.path)
    return raw == null ? '' : String(raw)
  },
  set: (value: string) => setByPath(props.model, props.field.path, value),
})

const readonlyText = computed(() =>
  formatReadonlyValue(props.field, getByPath(props.model, props.field.path)),
)
</script>

<template>
  <div
    v-if="visible"
    class="schema-field"
    :class="{ 'schema-field-inline': field.inline }"
  >
    <label class="schema-field-label">{{ field.label }}</label>
    <template v-if="editable">
      <el-switch
        v-if="field.type === 'switch'"
        v-model="switchValue"
        :inline-prompt="!!(field.activeText || field.inactiveText)"
        :active-text="field.activeText"
        :inactive-text="field.inactiveText"
      />
      <el-input
        v-else-if="field.type === 'password'"
        v-model="textValue"
        type="password"
        show-password
        :placeholder="field.placeholder"
      />
      <el-input
        v-else-if="field.type === 'textarea'"
        v-model="textValue"
        type="textarea"
        :rows="field.rows ?? 3"
        :placeholder="field.placeholder"
      />
      <el-input
        v-else
        v-model="textValue"
        :placeholder="field.placeholder"
      />
    </template>
    <span v-else class="field-value" :class="{ mono: field.type !== 'switch' }">{{ readonlyText }}</span>
  </div>
</template>

<style scoped>
.schema-field {
  margin-bottom: 14px;
  max-width: 640px;
}
.schema-field-inline {
  display: flex;
  align-items: center;
  gap: 12px;
}
.schema-field-inline .schema-field-label {
  margin-bottom: 0;
  min-width: 120px;
}
.schema-field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.field-value.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  word-break: break-all;
}
</style>
