import type {
  AddonAlertConfigDefs,
  AddonAlertConfigField,
  AddonAlertConfigTab,
} from '../types'
import { applyTabDefault } from '../schemaKindRegistry'
import { cloneConfig, getByPath, setByPath } from './addonSchemaPaths'

// 告警配置表单模型纯逻辑（还原自 host frontend-vue/src/utils/addonSchemaForm.ts）。

export { cloneConfig, getByPath, setByPath }

export function fieldVisible(
  field: AddonAlertConfigField,
  model: Record<string, unknown>,
): boolean {
  const rule = field.showWhen
  if (!rule) return true
  const actual = getByPath(model, rule.path)
  if ('equals' in rule) return actual === rule.equals
  if ('truthy' in rule) return Boolean(actual) === rule.truthy
  return true
}

export function applySchemaDefaults(
  schema: AddonAlertConfigDefs | undefined,
  base: Record<string, unknown>,
): Record<string, unknown> {
  const next = cloneConfig(base ?? {}) as Record<string, unknown>
  if (!schema?.tabs?.length) return next

  for (const tab of schema.tabs) {
    applyTabDefault(tab, next)
  }
  return next
}

export function collectSchemaPaths(schema: AddonAlertConfigDefs | undefined): string[] {
  if (!schema?.tabs?.length) return []
  const paths: string[] = []
  for (const tab of schema.tabs) {
    if (tab.kind === 'form') {
      for (const section of tab.sections ?? []) {
        for (const field of section.fields ?? []) {
          if (field.path) paths.push(field.path)
        }
      }
      continue
    }
    if (tab.path) paths.push(tab.path)
  }
  return paths
}

export function firstTabId(schema: AddonAlertConfigDefs | undefined): string {
  return schema?.tabs?.[0]?.id ?? 'interface'
}

export function jsonTabValue(
  model: Record<string, unknown>,
  tab: AddonAlertConfigTab,
): string {
  const raw = tab.path ? getByPath(model, tab.path) : undefined
  const fallback = tab.default ?? {}
  return JSON.stringify(raw ?? fallback, null, 2)
}

export function setJsonTabValue(
  model: Record<string, unknown>,
  tab: AddonAlertConfigTab,
  raw: string,
) {
  if (!tab.path) return
  try {
    setByPath(model, tab.path, JSON.parse(raw))
  } catch {
    /* 编辑过程中允许暂时无效的 JSON */
  }
}

export function formatReadonlyValue(
  field: AddonAlertConfigField,
  value: unknown,
): string {
  if (field.type === 'password') return value ? '******' : '—'
  if (field.type === 'switch') {
    if (field.activeText || field.inactiveText) {
      return value ? (field.activeText ?? '是') : (field.inactiveText ?? '否')
    }
    return value ? '是' : '否'
  }
  if (value === undefined || value === null || value === '') return '—'
  return String(value)
}
