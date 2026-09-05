import type { AlertInhibitMatcher, AlertInhibitRule } from '../types'

// 抑制规则表单 ↔ 存储结构互转纯逻辑（还原自 host frontend-vue/src/utils/alertInhibitRules.ts）。

export function defaultInhibitRules(): AlertInhibitRule[] {
  return [
    {
      equal: ['namespace', 'alertname'],
      source_match: { severity: 'critical' },
      target_match_re: { severity: 'warning|info' },
    },
    {
      equal: ['namespace', 'alertname'],
      source_match: { severity: 'warning' },
      target_match_re: { severity: 'info' },
    },
  ]
}

export function normalizeInhibitRules(value: unknown): AlertInhibitRule[] {
  if (!Array.isArray(value)) return []
  return value.filter((item) => item && typeof item === 'object') as AlertInhibitRule[]
}

function matchersFromMap(
  exact?: Record<string, string>,
  regex?: Record<string, string>,
): AlertInhibitMatcher[] {
  const rows: AlertInhibitMatcher[] = []
  for (const [key, val] of Object.entries(exact ?? {})) {
    rows.push({ key, value: val, regex: false })
  }
  for (const [key, val] of Object.entries(regex ?? {})) {
    rows.push({ key, value: val, regex: true })
  }
  return rows.length ? rows : [{ key: '', value: '', regex: false }]
}

function mapFromMatchers(rows: AlertInhibitMatcher[], regex: boolean) {
  const out: Record<string, string> = {}
  for (const row of rows) {
    if (!!row.regex !== regex) continue
    const key = row.key.trim()
    if (!key) continue
    out[key] = row.value
  }
  return Object.keys(out).length ? out : undefined
}

export interface InhibitRuleForm {
  equal: string[]
  sourceMatchers: AlertInhibitMatcher[]
  targetMatchers: AlertInhibitMatcher[]
}

export function ruleToForm(rule: AlertInhibitRule): InhibitRuleForm {
  return {
    equal: [...(rule.equal ?? [])],
    sourceMatchers: matchersFromMap(rule.source_match, rule.source_match_re),
    targetMatchers: matchersFromMap(rule.target_match, rule.target_match_re),
  }
}

export function formToRule(form: InhibitRuleForm): AlertInhibitRule {
  const rule: AlertInhibitRule = {
    equal: form.equal.filter(Boolean),
    source_match: mapFromMatchers(form.sourceMatchers, false),
    source_match_re: mapFromMatchers(form.sourceMatchers, true),
    target_match: mapFromMatchers(form.targetMatchers, false),
    target_match_re: mapFromMatchers(form.targetMatchers, true),
  }
  if (!rule.source_match) delete rule.source_match
  if (!rule.source_match_re) delete rule.source_match_re
  if (!rule.target_match) delete rule.target_match
  if (!rule.target_match_re) delete rule.target_match_re
  return rule
}

export function emptyInhibitRuleForm(): InhibitRuleForm {
  return {
    equal: ['namespace', 'alertname'],
    sourceMatchers: [{ key: '', value: '', regex: false }],
    targetMatchers: [{ key: '', value: '', regex: true }],
  }
}

export function cloneInhibitRules(rules: AlertInhibitRule[]): AlertInhibitRule[] {
  return JSON.parse(JSON.stringify(rules)) as AlertInhibitRule[]
}
