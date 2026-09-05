<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AddonAlertConfigTab } from '../types'
import JsonEditor from './JsonEditor.vue'
import { getByPath, setByPath } from '../utils/addonSchemaForm'
import { normalizeMessageTemplates } from '../utils/alertMessageTemplates'

// 消息模板编辑器（message_templates kind，还原自 host AddonSchemaMessageTemplates.vue）：
// 按渠道（email/wechat/dingtalk）分 tab，编辑 Go template 内容（原 CodeMirror 处改用 JsonEditor 文本域）。
const props = defineProps<{
  tab: AddonAlertConfigTab
  model: Record<string, unknown>
  editable?: boolean
}>()

const pathKey = computed(() => props.tab.path || 'message_templates')

const channelIds = computed(() =>
  (props.tab.templateChannels ?? []).map((channel) => channel.id),
)

const activeChannel = ref(props.tab.templateChannels?.[0]?.id ?? 'email')

const templates = computed({
  get: () => normalizeMessageTemplates(getByPath(props.model, pathKey.value), channelIds.value),
  set: (value: Record<string, string>) => {
    setByPath(props.model, pathKey.value, value)
  },
})

function updateChannel(channelId: string, content: string) {
  templates.value = { ...templates.value, [channelId]: content }
}
</script>

<template>
  <div class="message-templates">
    <el-tabs v-model="activeChannel" class="message-template-tabs">
      <el-tab-pane
        v-for="channel in tab.templateChannels ?? []"
        :key="channel.id"
        :label="channel.label"
        :name="channel.id"
      >
        <JsonEditor
          v-if="editable"
          :model-value="templates[channel.id] ?? ''"
          height="460px"
          @update:model-value="(value: string) => updateChannel(channel.id, value)"
        />
        <JsonEditor
          v-else
          :model-value="templates[channel.id] ?? ''"
          readonly
          height="460px"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.message-templates {
  min-height: 480px;
}
.message-template-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}
.message-template-tabs :deep(.el-tabs__item) {
  font-size: 13px;
}
</style>
