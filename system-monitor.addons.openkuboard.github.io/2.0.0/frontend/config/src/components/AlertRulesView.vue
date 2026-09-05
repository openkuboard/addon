<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElAlert, ElMessage } from 'element-plus'
import AddonAlertRulesPanel from './AddonAlertRulesPanel.vue'
import type { AddonAlertRuleGroup } from '../types'
import {
  crdToGroups,
  groupsToCrds,
  type PrometheusRuleCrd,
} from '../utils/prometheusRuleCrud'
import { loadSDK } from '../sdk'

// 告警规则视图（SDK 驱动，v2 CRD 数据流）：resource.list 读 PrometheusRule CRD → crdToGroups
// 交给 AddonAlertRulesPanel 编辑 → onSave 收到 buildSavePayload 结果，groupsToCrds 按 rule_set
// 聚合回各自 CRD（保留 metadata/resourceVersion）→ 逐个 resource.update 整对象替换。
// 对应 manifest resourceAccess：{ group: monitoring.coreos.com, version: v1, resource: prometheusrules }。

const RESOURCE = {
  group: 'monitoring.coreos.com',
  version: 'v1',
  resource: 'prometheusrules',
}

const loading = ref(true)
const saving = ref(false)
const errorMsg = ref('')
const crds = ref<PrometheusRuleCrd[]>([])
const groups = ref<AddonAlertRuleGroup[]>([])

let sdk: AddonSDK | null = null

async function reload() {
  loading.value = true
  errorMsg.value = ''
  sdk = null
  try {
    const sd = await loadSDK()
    sdk = sd
    // prometheusrules 是 namespaced 资源，需带 namespace（取 MONITOR_NAMESPACE 参数，默认 openkuboard）
    let namespace = 'openkuboard'
    try {
      const params = await sd.config.getParameters()
      if (params.MONITOR_NAMESPACE) namespace = params.MONITOR_NAMESPACE
    } catch {
      /* 参数读取失败时用默认命名空间 */
    }
    const items = (await sd.resource.list({ ...RESOURCE, namespace })) as PrometheusRuleCrd[]
    crds.value = items
    groups.value = crdToGroups(items)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function onSave(payload: AddonAlertRuleGroup[]) {
  if (!sdk || saving.value) return
  saving.value = true
  try {
    const targets = groupsToCrds(crds.value, payload)
    for (const target of targets) {
      await sdk.resource.update({
        ...RESOURCE,
        name: target.metadata.name,
        namespace: target.metadata.namespace,
        // resource.update 为整对象替换：object 携带完整 CRD 与 metadata.resourceVersion。
        // SDK 形参类型为 Record<string, unknown>，强类型 CRD 经 unknown 收窄后序列化。
        object: target as unknown as Record<string, unknown>,
      })
    }
    ElMessage.success('告警规则已保存')
    await reload()
  } catch (e) {
    ElMessage.error(`保存失败：${e instanceof Error ? e.message : String(e)}`)
  } finally {
    saving.value = false
  }
}

onMounted(reload)
</script>

<template>
  <div class="alert-rules-view" v-loading="loading">
    <el-alert
      v-if="errorMsg"
      class="view-error"
      type="error"
      :closable="false"
      show-icon
      title="告警规则加载失败"
    >
      <template #default>
        <div class="view-error-actions">
          <span>{{ errorMsg }}</span>
          <el-button size="small" type="primary" plain @click="reload">重试</el-button>
        </div>
      </template>
    </el-alert>

    <template v-else-if="!loading">
      <template v-if="crds.length">
        <AddonAlertRulesPanel
          :groups="groups"
          :readonly="false"
          :saving="saving"
          @save="onSave"
          @reload="reload"
        />
      </template>

      <el-alert
        v-else
        title="暂无告警规则"
        description="当前命名空间下没有 PrometheusRule 对象；如需在此编辑，请在集群中创建 PrometheusRule 后刷新。"
        type="info"
        :closable="false"
        show-icon
      />
    </template>
  </div>
</template>

<style scoped>
.alert-rules-view {
  min-height: 200px;
}
.view-error {
  margin-bottom: 12px;
}
.view-error-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
