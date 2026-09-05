<script setup lang="ts">
// 单条参数的分类渲染组件（纯展示 + 派发 update:value）：
//   user-editable        → ElInput 文本输入
//   enum-from-hostReads → ElSelect 下拉（options 由父级 buildOptions 提供）
//   host-derived        → 只读展示（emit 一个 never 更新，父级不把它并入保存 payload）
import { ElInput, ElOption, ElSelect, ElTag } from 'element-plus'
import type { ParamOption } from '../utils/params'

const props = defineProps<{
  def: AddonParamDef
  value: string
  options?: ParamOption[]
}>()

const emit = defineEmits<{
  (e: 'update:value', value: string): void
}>()

function onInput(v: string | number) {
  emit('update:value', v === null || v === undefined ? '' : String(v))
}

function onSelect(v: string | number | undefined) {
  emit('update:value', v === null || v === undefined ? '' : String(v))
}

const isHostDerived = () => props.def.category === 'host-derived'
const isEnum = () => props.def.category === 'enum-from-hostReads'
const isAllowCreate = () => isEnum() && !!props.def.allowCreate
const hasOptions = () => (props.options ?? []).length > 0
</script>

<template>
  <div class="param-row" :data-category="def.category">
    <div class="param-row__label">
      <code class="param-row__name">{{ def.name }}</code>
      <el-tag v-if="def.required" size="small" type="danger" effect="plain">必填</el-tag>
      <el-tag v-else-if="isHostDerived()" size="small" type="info" effect="plain">host 推导</el-tag>
      <el-tag v-else-if="isEnum()" size="small" type="primary" effect="plain">下拉</el-tag>
    </div>

    <!-- user-editable：文本输入 -->
    <el-input
      v-if="!isHostDerived() && !isEnum()"
      data-kind="text"
      :model-value="value"
      :placeholder="`请输入 ${def.name}`"
      clearable
      @update:model-value="onInput"
    />

    <!-- enum-from-hostReads：下拉选择；allowCreate 时支持输入自定义值（combobox） -->
    <el-select
      v-else-if="isEnum()"
      data-kind="select"
      :model-value="value"
      :disabled="!isAllowCreate() && !hasOptions()"
      :placeholder="isAllowCreate() ? '选择或输入' : hasOptions() ? '请选择' : '当前集群无可用选项（不可编辑）'"
      filterable
      clearable
      :allow-create="isAllowCreate()"
      :default-first-option="isAllowCreate()"
      class="param-row__select"
      @update:model-value="onSelect"
    >
      <el-option v-for="opt in options" :key="opt.value" :label="opt.label" :value="opt.value" />
    </el-select>

    <!-- host-derived：只读展示（不做成可聚焦输入框） -->
    <div v-else data-kind="readonly" class="param-row__derived">
      <span class="param-row__derived-value">{{ value || '—' }}</span>
      <span class="param-row__badge">只读</span>
    </div>

    <p v-if="def.description" class="param-row__desc">{{ def.description }}</p>
  </div>
</template>

<style scoped>
.param-row {
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
  transition: border-color 0.2s;
}
.param-row:hover {
  border-color: var(--el-border-color);
}
.param-row + .param-row {
  margin-top: 10px;
}
.param-row__label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.param-row__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  background: var(--el-fill-color-light);
  border-radius: 4px;
  padding: 1px 6px;
}
.param-row__desc {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.param-row__select {
  width: 100%;
  max-width: 520px;
}
/* host-derived 只读态 */
.param-row__derived {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
}
.param-row__derived-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--el-text-color-regular);
}
.param-row__badge {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  border: 1px solid var(--el-border-color);
  border-radius: 3px;
  padding: 0 5px;
}
</style>
