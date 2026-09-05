<script setup lang="ts">
// 简易 JSON/YAML/文本编辑器（替代 host 的 YamlCodeEditor——CodeMirror 组件）：
// 用 el-input type=textarea + 等宽字体实现，接 host 同款 modelValue / height / readonly 协议，
// 便于 AddonAlertConfigPanel（JSON 兜底 tab）与 AddonSchemaMessageTemplates 直接复用。
import { computed } from 'vue'
import { ElInput } from 'element-plus'

const props = defineProps<{
  modelValue: string
  /** 内容是否只读 */
  readonly?: boolean
  /** 高度（形如 '420px'）；用于折算 textarea 行数，省略用默认 12 行 */
  height?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function onInput(v: string | number) {
  emit('update:modelValue', v === null || v === undefined ? '' : String(v))
}

const rows = computed(() => {
  const px = Number.parseInt(props.height ?? '', 10)
  if (!Number.isFinite(px) || px <= 0) return 12
  return Math.max(6, Math.floor(px / 20))
})
</script>

<template>
  <el-input
    class="json-editor"
    :model-value="modelValue"
    :readonly="readonly"
    type="textarea"
    :rows="rows"
    spellcheck="false"
    @update:model-value="onInput"
  />
</template>

<style scoped>
.json-editor {
  width: 100%;
}
.json-editor :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 20px;
  background: var(--el-fill-color-blank);
}
</style>
