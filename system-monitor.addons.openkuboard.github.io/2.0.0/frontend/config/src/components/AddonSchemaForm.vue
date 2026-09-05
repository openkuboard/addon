<script setup lang="ts">
import type { AddonAlertConfigSection } from '../types'
import AddonSchemaFormField from './AddonSchemaFormField.vue'

// form kind tab 的渲染器（还原自 host frontend-vue/src/components/AddonSchemaForm.vue）：
// 按 section 分组，逐 field 交给 AddonSchemaFormField。
defineProps<{
  sections: AddonAlertConfigSection[]
  model: Record<string, unknown>
  editable?: boolean
}>()
</script>

<template>
  <section
    v-for="(section, idx) in sections"
    :key="section.title || idx"
    class="schema-section"
  >
    <h4 v-if="section.title" class="schema-section-title">{{ section.title }}</h4>
    <AddonSchemaFormField
      v-for="field in section.fields"
      :key="field.path"
      :field="field"
      :model="model"
      :editable="editable"
    />
  </section>
</template>

<style scoped>
.schema-section {
  margin-bottom: 24px;
}
.schema-section-title {
  margin: 0 0 12px;
  padding-left: 10px;
  border-left: 3px solid var(--el-color-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}
</style>
