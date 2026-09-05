import type { Component } from 'vue'
import type { AddonAlertConfigTab } from './types'
import AddonSchemaForm from './components/AddonSchemaForm.vue'
import AddonSchemaContactGroups from './components/AddonSchemaContactGroups.vue'
import AddonSchemaAlertRoutes from './components/AddonSchemaAlertRoutes.vue'
import AddonSchemaInhibitRules from './components/AddonSchemaInhibitRules.vue'
import AddonSchemaMessageTemplates from './components/AddonSchemaMessageTemplates.vue'
import { cloneConfig, getByPath, setByPath } from './utils/addonSchemaPaths'
import { normalizeRouteRoot } from './utils/alertRouteTree'
import { defaultMessageTemplates, isLegacyMessageTemplates } from './utils/alertMessageTemplates'

// schema kind → 处理器/组件注册表（还原自 host frontend-vue/src/addons/schemaKindRegistry.ts）。

export type SchemaKindHandler = {
  pathBacked?: boolean
  applyDefault?: (tab: AddonAlertConfigTab, model: Record<string, unknown>) => void
  component?: Component
}

function applyPathDefault(
  tab: AddonAlertConfigTab,
  model: Record<string, unknown>,
  isEmpty: (current: unknown) => boolean,
  resolveDefault: (tab: AddonAlertConfigTab) => unknown,
) {
  if (!tab.path) return
  const current = getByPath(model, tab.path)
  if (current !== undefined && !isEmpty(current)) return
  setByPath(model, tab.path, cloneConfig(resolveDefault(tab)))
}

const kindRegistry: Record<string, SchemaKindHandler> = {
  form: {
    applyDefault(tab, model) {
      for (const section of tab.sections ?? []) {
        for (const field of section.fields ?? []) {
          if (!field.path) continue
          if (getByPath(model, field.path) === undefined && field.default !== undefined) {
            setByPath(model, field.path, field.default)
          }
        }
      }
    },
    component: AddonSchemaForm,
  },
  json: {
    pathBacked: true,
    applyDefault(tab, model) {
      applyPathDefault(
        tab,
        model,
        (current) => current === undefined,
        (item) => item.default ?? {},
      )
    },
  },
  contact_groups: {
    pathBacked: true,
    applyDefault(tab, model) {
      applyPathDefault(
        tab,
        model,
        (current) => Array.isArray(current) && current.length === 0,
        (item) => item.default ?? [],
      )
    },
    component: AddonSchemaContactGroups,
  },
  alert_routes: {
    pathBacked: true,
    applyDefault(tab, model) {
      applyPathDefault(
        tab,
        model,
        (current) => current === undefined || Array.isArray(current) || !normalizeRouteRoot(current),
        (item) => item.default ?? {},
      )
    },
    component: AddonSchemaAlertRoutes,
  },
  inhibit_rules: {
    pathBacked: true,
    applyDefault(tab, model) {
      applyPathDefault(
        tab,
        model,
        (current) => Array.isArray(current) && current.length === 0,
        (item) => item.default ?? [],
      )
    },
    component: AddonSchemaInhibitRules,
  },
  message_templates: {
    pathBacked: true,
    applyDefault(tab, model) {
      applyPathDefault(
        tab,
        model,
        (current) => current === undefined || isLegacyMessageTemplates(current),
        (item) => (
          item.default && !isLegacyMessageTemplates(item.default)
            ? item.default
            : defaultMessageTemplates()
        ),
      )
    },
    component: AddonSchemaMessageTemplates,
  },
}

export function resolveSchemaKind(kind: string | undefined): SchemaKindHandler {
  if (kind && kindRegistry[kind]) return kindRegistry[kind]
  return kindRegistry.json
}

export function isPathBackedSchemaKind(kind: string | undefined): boolean {
  return !!resolveSchemaKind(kind).pathBacked || kind === 'json'
}

export function applyTabDefault(tab: AddonAlertConfigTab, model: Record<string, unknown>) {
  resolveSchemaKind(tab.kind).applyDefault?.(tab, model)
}

export function resolveSchemaTabComponent(kind: string | undefined): Component | undefined {
  return resolveSchemaKind(kind).component
}

export function registeredSchemaKinds(): string[] {
  return Object.keys(kindRegistry)
}
