<script setup lang="ts">
// 集群监控入口：渲染宿主 /api/addon/entries/?level=cluster 返回的本套件 cluster 级入口，
// 点击卡片经 @open 事件上抛，由父组件按 object route 拼 host 受控代理 URL 打开。
// 仅展示 v2 声明式 object route（route 为对象的）入口。

import { ElAlert, ElEmpty, ElSkeleton } from 'element-plus'
import type { AddonClusterEntry, AddonRouteObject } from '../types/entries'

const props = defineProps<{
  entries: AddonClusterEntry[]
  loading: boolean
  error: string
}>()

const emit = defineEmits<{ (e: 'open', entry: AddonClusterEntry): void }>()

function routeOf(entry: AddonClusterEntry): AddonRouteObject | null {
  const r = entry.route
  return r && typeof r === 'object' ? r : null
}
</script>

<template>
  <section class="cluster-entries">
    <div class="section-head">
      <div>
        <h2 class="section-title">集群监控入口</h2>
        <p class="section-sub">按套件 entry.context 声明的 cluster 级监控视图跳转（Grafana 大盘）</p>
      </div>
      <span class="section-count">{{ props.entries.length }} 项</span>
    </div>

    <el-alert
      v-if="error"
      class="cluster-entries__error"
      type="error"
      :closable="false"
      show-icon
      title="入口加载失败"
      :description="error"
    />

    <el-skeleton v-else-if="loading" :rows="3" animated class="cluster-entries__skeleton" />

    <el-empty
      v-else-if="props.entries.length === 0"
      description="当前套件没有可用的集群级监控入口"
    />

    <div v-else class="cluster-entries__grid">
      <button
        v-for="entry in props.entries"
        :key="entry.addon_id + ':' + entry.id"
        type="button"
        class="usage-card entry-card"
        @click="emit('open', entry)"
      >
        <span class="entry-card__icon">▦</span>
        <span class="entry-card__body">
          <span class="entry-card__title">
            {{ entry.label }}
            <span class="entry-card__open">↗</span>
          </span>
          <span v-if="entry.label_en" class="entry-card__label-en">{{ entry.label_en }}</span>
          <span class="entry-card__meta">
            <span v-if="routeOf(entry)" class="entry-card__tag">{{ routeOf(entry)!.serviceUI }}</span>
            <span class="entry-card__id">{{ entry.id }}</span>
          </span>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.cluster-entries__error {
  margin-bottom: 14px;
}
.cluster-entries__skeleton {
  padding: 6px 2px;
}
.cluster-entries__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.entry-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  text-align: left;
  font: inherit;
  cursor: pointer;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}
.entry-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: var(--el-box-shadow-light);
  transform: translateY(-1px);
}
.entry-card:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.entry-card__icon {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  font-size: 17px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.entry-card__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.entry-card__title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}
.entry-card__open {
  margin-left: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.entry-card__label-en {
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.entry-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  min-width: 0;
}
.entry-card__tag {
  flex: none;
  padding: 1px 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 4px;
}
.entry-card__id {
  overflow: hidden;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
