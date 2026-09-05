<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AddonAlertConfigTab, AddonContactGroup, AlertRouteNode } from '../types'
import {
  addChildRoute,
  cloneRouteTree,
  defaultRouteTree,
  deleteRouteNode,
  entriesToMatch,
  getRouteNode,
  getRouteSiblings,
  matchEntries,
  moveRouteNode,
  normalizeRouteRoot,
  routePathKey,
  routeTreeData,
  type RoutePath,
  updateRouteNode,
} from '../utils/alertRouteTree'
import { getByPath, setByPath } from '../utils/addonSchemaForm'

// 告警路由树编辑器（alert_routes kind，还原自 host AddonSchemaAlertRoutes.vue）：
// 左树（receiver 节点）+ 右侧选中节点详情编辑；改动经 patchSelected 写回 model 路径（= routes）。
const props = defineProps<{
  tab: AddonAlertConfigTab
  model: Record<string, unknown>
  editable?: boolean
}>()

const pathKey = computed(() => props.tab.path || 'routes')
const docsExpanded = ref(['docs'])
const selectedPath = ref<RoutePath | null>(null)
const matchRows = ref<Array<{ key: string; value: string }>>([])

const rootRoute = computed({
  get: () => {
    const raw = getByPath(props.model, pathKey.value)
    return normalizeRouteRoot(raw) ?? defaultRouteTree()
  },
  set: (value: AlertRouteNode) => {
    setByPath(props.model, pathKey.value, value)
  },
})

const treeData = computed(() => routeTreeData(rootRoute.value))

const selectedNode = computed(() =>
  selectedPath.value == null ? null : getRouteNode(rootRoute.value, selectedPath.value),
)

const receiverOptions = computed(() => {
  const fromPath = props.tab.receiverPath || 'contact_groups'
  const groups = getByPath(props.model, fromPath)
  if (!Array.isArray(groups)) return []
  return (groups as AddonContactGroup[])
    .map((g) => g.name)
    .filter((name): name is string => Boolean(name))
})

const canMoveUp = computed(() => {
  if (selectedPath.value == null || !selectedPath.value.length || !props.editable) return false
  const siblings = getRouteSiblings(rootRoute.value, selectedPath.value)
  return !!siblings && siblings.index > 0
})

const canMoveDown = computed(() => {
  if (selectedPath.value == null || !selectedPath.value.length || !props.editable) return false
  const siblings = getRouteSiblings(rootRoute.value, selectedPath.value)
  return !!siblings && siblings.index < siblings.list.length - 1
})

const canDelete = computed(() => props.editable && selectedPath.value != null && selectedPath.value.length > 0)

function syncMatchRows() {
  matchRows.value = matchEntries(selectedNode.value?.match)
  if (!matchRows.value.length) {
    matchRows.value = [{ key: '', value: '' }]
  }
}

watch(selectedNode, syncMatchRows, { immediate: true })

function onTreeSelect(data: { path: RoutePath }) {
  selectedPath.value = data.path
}

function commitRoot(next: AlertRouteNode) {
  rootRoute.value = cloneRouteTree(next)
}

function patchSelected(patch: Partial<AlertRouteNode>) {
  if (selectedPath.value == null) return
  const next = cloneRouteTree(rootRoute.value)
  updateRouteNode(next, selectedPath.value, patch)
  commitRoot(next)
}

function saveMatchRows() {
  patchSelected({ match: entriesToMatch(matchRows.value) })
}

function addMatchRow() {
  matchRows.value = [...matchRows.value, { key: '', value: '' }]
}

function removeMatchRow(index: number) {
  matchRows.value = matchRows.value.filter((_, i) => i !== index)
  if (!matchRows.value.length) matchRows.value = [{ key: '', value: '' }]
  saveMatchRows()
}

function onMove(direction: -1 | 1) {
  if (selectedPath.value == null) return
  const next = cloneRouteTree(rootRoute.value)
  const moved = moveRouteNode(next, selectedPath.value, direction)
  if (moved) {
    commitRoot(next)
    selectedPath.value = moved
  }
}

function onAddChild() {
  if (selectedPath.value == null) return
  const next = cloneRouteTree(rootRoute.value)
  addChildRoute(next, selectedPath.value)
  commitRoot(next)
  const parent = getRouteNode(next, selectedPath.value)
  const childIndex = (parent?.routes?.length ?? 1) - 1
  selectedPath.value = [...selectedPath.value, childIndex]
}

function onDelete() {
  if (selectedPath.value == null) return
  const next = cloneRouteTree(rootRoute.value)
  if (!deleteRouteNode(next, selectedPath.value)) return
  commitRoot(next)
  selectedPath.value = selectedPath.value.slice(0, -1)
  if (selectedPath.value.length === 0) {
    selectedPath.value = []
  }
}
</script>

<template>
  <div class="alert-routes-panel">
    <el-collapse v-if="tab.docsTitle" v-model="docsExpanded" class="route-docs">
      <el-collapse-item :title="tab.docsTitle" name="docs">
        <pre class="route-docs-body">{{ tab.docsContent }}</pre>
      </el-collapse-item>
    </el-collapse>

    <h4 class="section-title">告警路由规则</h4>

    <div class="route-layout">
      <div class="route-tree-pane">
        <el-tree
          :data="treeData"
          :props="{ label: 'label', children: 'children' }"
          node-key="pathKey"
          default-expand-all
          highlight-current
          :expand-on-click-node="false"
          @node-click="onTreeSelect"
        >
          <template #default="{ data }">
            <span :class="{ 'is-selected': selectedPath != null && routePathKey(data.path) === routePathKey(selectedPath) }">
              {{ data.label }}
            </span>
          </template>
        </el-tree>

        <div v-if="editable && selectedNode" class="route-tree-actions">
          <el-button link type="primary" disabled>编辑</el-button>
          <el-button link type="primary" :disabled="!canMoveUp" @click="onMove(-1)">向上</el-button>
          <el-button link type="primary" :disabled="!canMoveDown" @click="onMove(1)">向下</el-button>
          <el-button link type="primary" @click="onAddChild">+ 子节点</el-button>
          <el-button link type="danger" :disabled="!canDelete" @click="onDelete">删除</el-button>
        </div>
      </div>

      <div class="route-detail-pane">
        <template v-if="selectedNode">
          <div class="detail-field">
            <label>接收者 (receiver)</label>
            <el-select
              v-if="editable"
              :model-value="selectedNode.receiver"
              filterable
              allow-create
              default-first-option
              class="detail-input"
              @update:model-value="(v: string) => patchSelected({ receiver: v })"
            >
              <el-option v-for="name in receiverOptions" :key="name" :label="name" :value="name" />
            </el-select>
            <span v-else>{{ selectedNode.receiver || '—' }}</span>
          </div>

          <div v-if="selectedPath != null && !selectedPath.length" class="detail-field">
            <label>group_by</label>
            <el-select
              v-if="editable"
              :model-value="selectedNode.group_by ?? []"
              multiple
              filterable
              allow-create
              default-first-option
              class="detail-input"
              @update:model-value="(v: string[]) => patchSelected({ group_by: v })"
            />
            <span v-else>{{ (selectedNode.group_by ?? []).join(', ') || '—' }}</span>
          </div>

          <div v-if="selectedPath != null && !selectedPath.length" class="detail-grid">
            <div class="detail-field">
              <label>group_wait</label>
              <el-input
                v-if="editable"
                :model-value="selectedNode.group_wait ?? ''"
                @update:model-value="(v: string) => patchSelected({ group_wait: v })"
              />
              <span v-else>{{ selectedNode.group_wait || '—' }}</span>
            </div>
            <div class="detail-field">
              <label>group_interval</label>
              <el-input
                v-if="editable"
                :model-value="selectedNode.group_interval ?? ''"
                @update:model-value="(v: string) => patchSelected({ group_interval: v })"
              />
              <span v-else>{{ selectedNode.group_interval || '—' }}</span>
            </div>
            <div class="detail-field">
              <label>repeat_interval</label>
              <el-input
                v-if="editable"
                :model-value="selectedNode.repeat_interval ?? ''"
                @update:model-value="(v: string) => patchSelected({ repeat_interval: v })"
              />
              <span v-else>{{ selectedNode.repeat_interval || '—' }}</span>
            </div>
          </div>

          <div v-if="selectedPath != null && selectedPath.length" class="detail-field">
            <label>continue</label>
            <el-switch
              v-if="editable"
              :model-value="!!selectedNode.continue"
              @update:model-value="(v: boolean | string | number) => patchSelected({ continue: Boolean(v) })"
            />
            <span v-else>{{ selectedNode.continue ? '是' : '否' }}</span>
          </div>

          <div class="detail-field">
            <label>match 标签</label>
            <div v-for="(row, index) in matchRows" :key="index" class="match-row">
              <el-input
                v-if="editable"
                v-model="row.key"
                placeholder="label"
                @change="saveMatchRows"
              />
              <el-input
                v-if="editable"
                v-model="row.value"
                placeholder="value"
                @change="saveMatchRows"
              />
              <el-button
                v-if="editable"
                link
                type="danger"
                @click="removeMatchRow(index)"
              >
                删除
              </el-button>
              <span v-if="!editable" class="mono">{{ row.key }}={{ row.value }}</span>
            </div>
            <el-button v-if="editable" link type="primary" @click="addMatchRow">+ 添加 match</el-button>
          </div>
        </template>

        <div v-else class="route-empty">
          <p class="route-empty-title">未选择</p>
          <p class="route-empty-hint">请选择左侧路由规则树中的一个节点。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alert-routes-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.route-docs :deep(.el-collapse-item__header) {
  font-weight: 600;
}
.route-docs-body {
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
.route-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 12px;
  min-height: 360px;
}
.route-tree-pane {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 8px;
}
.route-tree-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-extra-light);
}
.route-detail-pane {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 14px;
  min-height: 360px;
}
.detail-field {
  margin-bottom: 14px;
}
.detail-field label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.detail-input {
  width: 100%;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.match-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.match-row .el-input {
  flex: 1;
}
.route-empty {
  height: 100%;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--el-color-warning-light-9);
  border-radius: 4px;
  color: var(--el-text-color-secondary);
}
.route-empty-title {
  margin: 0 0 6px;
  font-size: 16px;
  color: var(--el-text-color-primary);
}
.route-empty-hint {
  margin: 0;
  font-size: 13px;
}
.is-selected {
  color: var(--el-color-primary);
  font-weight: 600;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
