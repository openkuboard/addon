<script setup lang="ts">
import { computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import type {
  AddonAlertConfigTab,
  AddonContactGroup,
  AddonContactGroupChannelDef,
} from '../types'
import { getByPath, setByPath } from '../utils/addonSchemaForm'

// 联系人组编辑器（contact_groups kind，还原自 host AddonSchemaContactGroups.vue）：
// 按 tab.contactGroupChannels 渲染各类联系人（tags 邮件/微信 + webhook_list 钉钉机器人/webhook），
// 改动就地写回 model.path（= contact_groups）。
const props = defineProps<{
  tab: AddonAlertConfigTab
  model: Record<string, unknown>
  editable?: boolean
}>()

const emit = defineEmits<{
  'goto-tab': [tabId: string]
}>()

const path = computed(() => props.tab.path || 'contact_groups')

const groups = computed({
  get: () => {
    const raw = getByPath(props.model, path.value)
    return Array.isArray(raw) ? (raw as AddonContactGroup[]) : []
  },
  set: (value: AddonContactGroup[]) => {
    setByPath(props.model, path.value, value)
  },
})

const channels = computed(() => {
  const defs = props.tab.contactGroupChannels ?? {}
  return Object.entries(defs) as Array<[string, AddonContactGroupChannelDef]>
})

function emptyGroup(name = ''): AddonContactGroup {
  return {
    name,
    email_contacts: [],
    wechat_contacts: [],
    dingtalk_robots: [],
    webhooks: [],
  }
}

function ensureGroupShape(group: AddonContactGroup): AddonContactGroup {
  return {
    ...emptyGroup(group.name),
    ...group,
    email_contacts: group.email_contacts ?? [],
    wechat_contacts: group.wechat_contacts ?? [],
    dingtalk_robots: group.dingtalk_robots ?? [],
    webhooks: group.webhooks ?? [],
  }
}

function interfaceReady(requiresPath?: string) {
  if (!requiresPath) return true
  const val = getByPath(props.model, requiresPath)
  return val != null && String(val).trim() !== ''
}

function addGroup() {
  const next = [...groups.value.map(ensureGroupShape), emptyGroup(`Group-${groups.value.length + 1}`)]
  groups.value = next
}

function removeGroup(index: number) {
  groups.value = groups.value.filter((_, i) => i !== index)
}

function updateGroup(index: number, patch: Partial<AddonContactGroup>) {
  const next = groups.value.map(ensureGroupShape)
  next[index] = { ...next[index], ...patch }
  groups.value = next
}

function addWebhookItem(groupIndex: number, field: 'dingtalk_robots' | 'webhooks') {
  const next = groups.value.map(ensureGroupShape)
  const group = next[groupIndex]
  if (field === 'dingtalk_robots') {
    group.dingtalk_robots = [...(group.dingtalk_robots ?? []), { name: '', webhook_url: '' }]
  } else {
    group.webhooks = [...(group.webhooks ?? []), { name: '', url: '' }]
  }
  groups.value = next
}

function removeWebhookItem(
  groupIndex: number,
  field: 'dingtalk_robots' | 'webhooks',
  itemIndex: number,
) {
  const next = groups.value.map(ensureGroupShape)
  const group = next[groupIndex]
  if (field === 'dingtalk_robots') {
    group.dingtalk_robots = (group.dingtalk_robots ?? []).filter((_, i) => i !== itemIndex)
  } else {
    group.webhooks = (group.webhooks ?? []).filter((_, i) => i !== itemIndex)
  }
  groups.value = next
}

function updateWebhookItem(
  groupIndex: number,
  field: 'dingtalk_robots' | 'webhooks',
  itemIndex: number,
  patch: Record<string, string>,
) {
  const next = groups.value.map(ensureGroupShape)
  const group = next[groupIndex]
  if (field === 'dingtalk_robots') {
    const items = [...(group.dingtalk_robots ?? [])]
    items[itemIndex] = { ...items[itemIndex], ...patch }
    group.dingtalk_robots = items
  } else {
    const items = [...(group.webhooks ?? [])]
    items[itemIndex] = { ...items[itemIndex], ...patch }
    group.webhooks = items
  }
  groups.value = next
}

function gotoInterface(tabId?: string) {
  if (tabId) emit('goto-tab', tabId)
}
</script>

<template>
  <div class="contact-groups-panel">
    <p v-if="tab.hint" class="params-hint">{{ tab.hint }}</p>

    <div v-if="!groups.length" class="contact-groups-empty">
      <el-empty description="暂无联系人组" :image-size="64" />
      <el-button v-if="editable" type="primary" plain @click="addGroup">
        {{ tab.addGroupLabel || '+ 添加联系人分组' }}
      </el-button>
    </div>

    <div
      v-for="(group, groupIndex) in groups"
      :key="`${group.name}-${groupIndex}`"
      class="contact-group-card"
    >
      <div class="contact-group-head">
        <div class="contact-group-name">
          <label class="field-label">联系人分组名称</label>
          <el-input
            v-if="editable"
            :model-value="group.name"
            placeholder="Default"
            @update:model-value="(v: string) => updateGroup(groupIndex, { name: v })"
          />
          <span v-else class="field-value">{{ group.name || '—' }}</span>
        </div>
        <el-button
          v-if="editable"
          type="danger"
          link
          @click="removeGroup(groupIndex)"
          >
            删除
          </el-button>
      </div>

      <div
        v-for="[channelKey, channel] in channels"
        :key="channelKey"
        class="contact-channel-row"
      >
        <div class="channel-label">{{ channel.label }}</div>
        <div class="channel-body">
          <template v-if="channel.type === 'tags'">
            <div
              v-if="!interfaceReady(channel.requiresInterface)"
              class="channel-setup-hint"
            >
              <span>{{ channel.setupHint || '请先完成接口参数配置' }}</span>
              <el-button
                v-if="editable && channel.setupTab"
                link
                type="primary"
                @click="gotoInterface(channel.setupTab)"
              >
                {{ channel.setupActionLabel || '设置接口参数' }}
              </el-button>
            </div>
            <el-select
              v-else-if="editable"
              :model-value="(group[channel.field as 'email_contacts' | 'wechat_contacts'] ?? [])"
              multiple
              filterable
              allow-create
              default-first-option
              :placeholder="channel.label"
              class="channel-tags"
              @update:model-value="(v: string[]) => updateGroup(groupIndex, { [channel.field]: v })"
            />
            <span v-else class="field-value">
              {{ (group[channel.field as keyof AddonContactGroup] as string[] | undefined)?.join(', ') || '—' }}
            </span>
          </template>

          <template v-else-if="channel.type === 'webhook_list'">
            <div
              v-for="(item, itemIndex) in (group[channel.field as 'dingtalk_robots' | 'webhooks'] as Array<Record<string, string>> | undefined) ?? []"
              :key="`${channelKey}-${itemIndex}`"
              class="webhook-item"
            >
              <el-input
                v-if="editable"
                :model-value="item.name || ''"
                :placeholder="channel.namePlaceholder || '名称（可选）'"
                class="webhook-name"
                @update:model-value="(v: string) => updateWebhookItem(groupIndex, channel.field as 'dingtalk_robots' | 'webhooks', itemIndex, { name: v })"
              />
              <el-input
                v-if="editable"
                :model-value="item.webhook_url || item.url || ''"
                :placeholder="channel.urlPlaceholder || 'https://...'"
                class="webhook-url"
                @update:model-value="(v: string) => updateWebhookItem(
                  groupIndex,
                  channel.field as 'dingtalk_robots' | 'webhooks',
                  itemIndex,
                  channel.field === 'dingtalk_robots' ? { webhook_url: v } : { url: v },
                )"
              />
              <el-button
                v-if="editable"
                link
                type="danger"
                @click="removeWebhookItem(groupIndex, channel.field as 'dingtalk_robots' | 'webhooks', itemIndex)"
                >
                  删除
                </el-button>
              <div v-if="!editable" class="field-value mono">
                {{ item.name ? `${item.name}: ` : '' }}{{ item.webhook_url || item.url || '—' }}
              </div>
            </div>
            <el-button
              v-if="editable"
              plain
              type="primary"
              size="small"
              @click="addWebhookItem(groupIndex, channel.field as 'dingtalk_robots' | 'webhooks')"
            >
              <el-icon><Plus /></el-icon>
              {{ channel.addLabel || '+ 添加' }}
            </el-button>
          </template>
        </div>
      </div>
    </div>

    <el-button
      v-if="editable && groups.length"
      plain
      type="primary"
      class="add-group-btn"
      @click="addGroup"
    >
      <el-icon><Plus /></el-icon>
      {{ tab.addGroupLabel || '+ 添加联系人分组' }}
    </el-button>
  </div>
</template>

<style scoped>
.contact-groups-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.params-hint {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}
.contact-groups-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.contact-group-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 14px 16px;
  background: var(--el-fill-color-blank);
}
.contact-group-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.contact-group-name {
  flex: 1;
  max-width: 420px;
}
.field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.contact-channel-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--el-border-color-extra-light);
}
.channel-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
  padding-top: 8px;
}
.channel-setup-hint {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.channel-tags {
  width: 100%;
}
.webhook-item {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.webhook-name {
  width: 180px;
}
.webhook-url {
  flex: 1;
  min-width: 220px;
}
.add-group-btn {
  align-self: flex-start;
}
.field-value.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  word-break: break-all;
}
</style>
