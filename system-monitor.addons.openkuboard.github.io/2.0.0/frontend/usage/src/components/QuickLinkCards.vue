<script setup lang="ts">
// 快捷入口：经 SDK serviceUI.open 打开套件内置 UI（grafana-home / prometheus / alertmanager），
// target: 'blank' 新窗口（走 host 受控代理 /api/addon/{id}/proxy/{serviceUI}）。
// SDK 尚未就绪（loading / 加载失败）时禁用点击。

interface QuickLinkMeta {
  id: string
  label: string
  labelEn: string
  hint: string
}

const props = defineProps<{ sdk: AddonSDK | null; loading: boolean }>()

const links: QuickLinkMeta[] = [
  {
    id: 'grafana-home',
    label: 'Grafana 主页',
    labelEn: 'Grafana Home',
    hint: '可视化监控大盘 · 检索集群资源视图',
  },
  {
    id: 'prometheus',
    label: 'Prometheus 主页',
    labelEn: 'Prometheus',
    hint: '指标查询（PromQL）· 告警规则浏览',
  },
  {
    id: 'alertmanager',
    label: '告警管理主页',
    labelEn: 'Alertmanager',
    hint: '告警路由 · 静默抑制 · 通知渠道',
  },
]

function open(id: string) {
  if (!props.sdk) return
  try {
    props.sdk.serviceUI.open(id, { target: 'blank' })
  } catch (e) {
    // open 内部 window.open 极少抛错；防御即可
    console.warn(`[system-monitor-usage] 打开快捷入口 ${id} 失败：`, e)
  }
}

function glyph(id: string): string {
  return id === 'grafana-home' ? 'G' : id === 'prometheus' ? 'P' : 'A'
}
</script>

<template>
  <section class="quick-links">
    <div class="section-head">
      <div>
        <h2 class="section-title">快捷入口</h2>
        <p class="section-sub">打开监控套件的核心 UI，均在新窗口加载</p>
      </div>
    </div>

    <div class="quick-links__grid">
      <button
        v-for="(link, i) in links"
        :key="link.id"
        class="usage-card quick-card"
        type="button"
        :disabled="!sdk || loading"
        @click="open(link.id)"
      >
        <span class="quick-card__badge" :class="`quick-card__badge--${i}`">{{ glyph(link.id) }}</span>
        <span class="quick-card__body">
          <span class="quick-card__title">
            {{ link.label }}
            <span class="quick-card__open">↗</span>
          </span>
          <span class="quick-card__label-en">{{ link.labelEn }}</span>
          <span class="quick-card__hint">{{ link.hint }}</span>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.quick-links__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.quick-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px;
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
.quick-card:hover:not(:disabled) {
  border-color: var(--el-color-primary);
  box-shadow: var(--el-box-shadow-light);
  transform: translateY(-1px);
}
.quick-card:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
.quick-card:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.quick-card__badge {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}
.quick-card__badge--0 {
  background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-3));
}
.quick-card__badge--1 {
  background: linear-gradient(135deg, var(--el-color-warning), var(--el-color-warning-light-3));
}
.quick-card__badge--2 {
  background: linear-gradient(135deg, var(--el-color-danger), var(--el-color-danger-light-3));
}

.quick-card__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.quick-card__title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}
.quick-card__open {
  margin-left: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.quick-card__label-en {
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.quick-card__hint {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
}
</style>
