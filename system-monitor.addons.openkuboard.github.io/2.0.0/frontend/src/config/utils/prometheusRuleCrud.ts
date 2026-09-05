// PrometheusRule CRD ⇄ AddonAlertRuleGroup 双向转换 + 按 CRD 聚合回写。
//
// v2 起告警规则不再由 host 读写 YAML 文件，而是经 addonSDK.resource 直接读写
// PrometheusRule CRD（monitoring.coreos.com/v1，namespaced）。本模块负责把 CRD 对象
// 列表转成 AddonAlertRulesPanel 可编辑的 AddonAlertRuleGroup[]，以及把编辑结果
// （buildSavePayload 之后）按 rule_set（=CRD metadata.name）重新聚合回各自 CRD。
//
// AddonAlertRuleGroup.file 由 host 的 YAML 路径退化为 `namespace/name` 合成唯一 key：
//   读：file = `${metadata.namespace}/${metadata.name}`，rule_set = metadata.name
//   写：file 仅用于编辑视图内分组定位；rule_set 是真正用于匹配回写 CRD 的主键。

import type { AddonAlertRuleGroup } from '../types'
import { isAlertRule } from './alertPrometheusRules'

/** PrometheusRule spec.groups 内的单个 rule 组 */
export interface PrometheusRuleGroup {
  name: string
  interval?: string
  rules?: Array<Record<string, unknown>>
}

/** PrometheusRule CRD 对象（仅本应用读写的字段；metadata 其余 label 原样保留） */
export interface PrometheusRuleCrd {
  apiVersion?: string
  kind?: string
  metadata: {
    name: string
    namespace?: string
    resourceVersion?: string
    [key: string]: unknown
  }
  spec?: {
    groups?: PrometheusRuleGroup[]
    [key: string]: unknown
  }
}

/** CRD 单条 rule → 编辑模型 rule：只保留编辑器关心的字段（alert/expr/for/labels/annotations）。 */
function crdRuleToGroupRule(rule: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  if (rule.alert !== undefined) next.alert = rule.alert
  next.expr = typeof rule.expr === 'string' ? rule.expr : ''
  if (typeof rule.for === 'string') next.for = rule.for
  if (rule.labels && typeof rule.labels === 'object' && !Array.isArray(rule.labels)) {
    next.labels = rule.labels
  }
  if (rule.annotations && typeof rule.annotations === 'object' && !Array.isArray(rule.annotations)) {
    next.annotations = rule.annotations
  }
  return next
}

/**
 * CRD 数组 → AddonAlertRuleGroup[]。
 * 每个 CRD 展开为它的每个 rule group：file=`ns/name`、rule_set=`name`；
 * interval 缺省补空串（编辑模型统一 string 形态，与 host buildSavePayload 对齐）。
 */
export function crdToGroups(crds: PrometheusRuleCrd[]): AddonAlertRuleGroup[] {
  const out: AddonAlertRuleGroup[] = []
  for (const crd of crds) {
    const name = crd.metadata?.name
    if (typeof name !== 'string' || !name) continue
    const file = `${crd.metadata?.namespace ?? ''}/${name}`
    for (const group of crd.spec?.groups ?? []) {
      if (!group || typeof group.name !== 'string' || !group.name) continue
      out.push({
        file,
        rule_set: name,
        group: group.name,
        interval: typeof group.interval === 'string' ? group.interval : '',
        rules: Array.isArray(group.rules) ? group.rules.map(crdRuleToGroupRule) : [],
      })
    }
  }
  return out
}

/** 编辑模型 group → CRD group：interval 空串不回写（避免写入无意义空 interval）。 */
function groupToCrdGroup(group: AddonAlertRuleGroup): PrometheusRuleGroup {
  const next: PrometheusRuleGroup = {
    name: group.group,
    rules: Array.isArray(group.rules) ? group.rules : [],
  }
  if (typeof group.interval === 'string' && group.interval.trim() !== '') {
    next.interval = group.interval
  }
  return next
}

/** 该 CRD 是否含可编辑（alert）rule 组 —— 用于判断整组清空后是否应空写覆盖。 */
function crdHasAlertGroup(crd: PrometheusRuleCrd): boolean {
  return (crd.spec?.groups ?? []).some((group) => (group?.rules ?? []).some(isAlertRule))
}

/**
 * 编辑结果（buildSavePayload 之后的 groups）按 rule_set 聚合回写各自 CRD。
 * - rule_set = CRD metadata.name，据此把同 CRD 的 group 归并后重建 spec.groups；
 * - metadata（含 resourceVersion、其它 label）与 apiVersion/kind 原样保留；
 * - 原本不含告警组的 CRD（如纯 recording rules）不在编辑范围，直接跳过不改写；
 * - 原本含告警组、编辑后一个都不剩 → 以空 groups 回写（用户删除生效）。
 */
export function groupsToCrds(
  crds: PrometheusRuleCrd[],
  groups: AddonAlertRuleGroup[],
): PrometheusRuleCrd[] {
  const byRuleSet = new Map<string, AddonAlertRuleGroup[]>()
  for (const group of groups) {
    const arr = byRuleSet.get(group.rule_set)
    if (arr) arr.push(group)
    else byRuleSet.set(group.rule_set, [group])
  }

  const out: PrometheusRuleCrd[] = []
  for (const crd of crds) {
    const name = crd.metadata?.name
    if (typeof name !== 'string' || !name) continue
    const mine = byRuleSet.get(name) ?? []
    // 没有任何编辑结果归属且原本不可编辑 → 保持原样，不产生写请求
    if (!mine.length && !crdHasAlertGroup(crd)) continue
    out.push({
      ...crd,
      metadata: { ...crd.metadata },
      spec: { ...(crd.spec ?? {}), groups: mine.map(groupToCrdGroup) },
    })
  }
  return out
}
