import type { AddonAlertRuleGroup } from '../types'

// PrometheusRule 告警规则分组纯逻辑（还原自 host frontend-vue/src/utils/alertPrometheusRules.ts）。
// 规则编辑器（AddonAlertRulesPanel）后续若还原，将依赖本模块；暂未接入 UI。

export interface PrometheusAlertRule {
  alert: string
  expr: string
  for?: string
  labels?: Record<string, string>
  annotations?: Record<string, string>
}

export interface AlertRuleSetView {
  rule_set: string
  file: string
  groups: AddonAlertRuleGroup[]
}

export interface AlertKvPair {
  key: string
  value: string
}

export function isAlertRule(rule: Record<string, unknown>): boolean {
  return typeof rule.alert === 'string' && rule.alert.trim().length > 0
}

export function ruleExpr(rule: Record<string, unknown>): string {
  const expr = rule.expr
  return typeof expr === 'string' ? expr : ''
}

function kvRecordFromUnknown(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === undefined || value === null) continue
    next[key] = String(value)
  }
  return Object.keys(next).length ? next : undefined
}

export function alertRulesOnly(rules: Array<Record<string, unknown>>): PrometheusAlertRule[] {
  return rules
    .filter(isAlertRule)
    .map((rule) => ({
      alert: String(rule.alert ?? ''),
      expr: ruleExpr(rule),
      for: typeof rule.for === 'string' ? rule.for : undefined,
      labels: kvRecordFromUnknown(rule.labels),
      annotations: kvRecordFromUnknown(rule.annotations),
    }))
}

export function groupHasAlertRules(group: AddonAlertRuleGroup): boolean {
  return group.rules.some(isAlertRule)
}

export function groupByRuleSet(groups: AddonAlertRuleGroup[]): AlertRuleSetView[] {
  const map = new Map<string, AlertRuleSetView>()
  for (const group of groups) {
    if (!groupHasAlertRules(group)) continue
    const key = `${group.file}::${group.rule_set}`
    const existing = map.get(key)
    if (existing) {
      existing.groups.push(group)
    } else {
      map.set(key, {
        rule_set: group.rule_set,
        file: group.file,
        groups: [group],
      })
    }
  }
  return Array.from(map.values())
}

export function cloneAlertRuleGroups(groups: AddonAlertRuleGroup[]): AddonAlertRuleGroup[] {
  return JSON.parse(JSON.stringify(groups)) as AddonAlertRuleGroup[]
}

export function emptyAlertRule(): PrometheusAlertRule {
  return {
    alert: '',
    expr: '',
    for: '10m',
    labels: { severity: 'warning' },
    annotations: {},
  }
}

export function kvPairs(record?: Record<string, string>): AlertKvPair[] {
  if (!record || !Object.keys(record).length) {
    return [{ key: '', value: '' }]
  }
  return Object.entries(record).map(([key, value]) => ({ key, value }))
}

export function kvRecord(pairs: AlertKvPair[]): Record<string, string> | undefined {
  const next: Record<string, string> = {}
  for (const pair of pairs) {
    const key = pair.key.trim()
    if (!key) continue
    next[key] = pair.value
  }
  return Object.keys(next).length ? next : undefined
}

export function alertRuleToPayload(rule: PrometheusAlertRule): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    alert: rule.alert.trim(),
    expr: rule.expr.trim(),
  }
  if (rule.for?.trim()) payload.for = rule.for.trim()
  if (rule.labels && Object.keys(rule.labels).length) payload.labels = rule.labels
  if (rule.annotations && Object.keys(rule.annotations).length) payload.annotations = rule.annotations
  return payload
}

export function buildSavePayload(groups: AddonAlertRuleGroup[]): AddonAlertRuleGroup[] {
  return groups
    .filter(groupHasAlertRules)
    .map((group) => ({
      file: group.file,
      rule_set: group.rule_set,
      group: group.group,
      interval: group.interval ?? '',
      rules: alertRulesOnly(group.rules).map(alertRuleToPayload),
    }))
}

export function patchGroupAlertRules(
  groups: AddonAlertRuleGroup[],
  file: string,
  ruleSet: string,
  groupName: string,
  patch: Partial<Pick<AddonAlertRuleGroup, 'interval' | 'rules'>>,
): AddonAlertRuleGroup[] {
  return groups.map((group) => {
    if (group.file !== file || group.rule_set !== ruleSet || group.group !== groupName) {
      return group
    }
    const recordingRules = group.rules.filter((rule) => !isAlertRule(rule))
    const alertRules = patch.rules
      ? patch.rules.filter(isAlertRule).map((rule) => ({
        alert: String(rule.alert ?? ''),
        expr: ruleExpr(rule),
        ...(typeof rule.for === 'string' && rule.for ? { for: rule.for } : {}),
        ...(kvRecordFromUnknown(rule.labels) ? { labels: kvRecordFromUnknown(rule.labels) } : {}),
        ...(kvRecordFromUnknown(rule.annotations) ? { annotations: kvRecordFromUnknown(rule.annotations) } : {}),
      }))
      : group.rules.filter(isAlertRule)
    return {
      ...group,
      interval: patch.interval !== undefined ? patch.interval : group.interval,
      rules: [...recordingRules, ...alertRules],
    }
  })
}

export function getGroupAlertRules(group: AddonAlertRuleGroup): PrometheusAlertRule[] {
  return alertRulesOnly(group.rules)
}
