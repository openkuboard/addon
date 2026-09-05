import { describe, expect, it } from 'vitest'
import { applySchemaDefaults } from '../src/utils/addonSchemaForm'
import {
  registeredSchemaKinds,
  resolveSchemaKind,
} from '../src/schemaKindRegistry'
import {
  EMAIL_DEFAULT_TEMPLATE,
  defaultMessageTemplates,
} from '../src/utils/alertMessageTemplates'
import { normalizeRouteRoot } from '../src/utils/alertRouteTree'
import type { AddonAlertConfigDefs } from '../src/types'

// 覆盖 schemaKindRegistry 的 kind 解析 + applySchemaDefaults 的默认值补齐语义。
// schema 形状参考 addons/.../2.0.0/alert-config-schema.json（缩略自建，避免跨目录导入）。

const MIN_SCHEMA: AddonAlertConfigDefs = {
  tabs: [
    {
      id: 'interface',
      label: '接口参数',
      kind: 'form',
      sections: [
        {
          title: '邮件发送接口',
          fields: [
            { path: 'email.smtp_host', label: 'smtp 服务器', type: 'text', default: '' },
            { path: 'email.use_tls', label: 'TLS', type: 'switch', default: true },
          ],
        },
      ],
    },
    {
      id: 'contacts',
      label: '联系人组',
      kind: 'contact_groups',
      path: 'contact_groups',
      default: [
        { name: 'Default', email_contacts: [], wechat_contacts: [], dingtalk_robots: [], webhooks: [] },
        { name: 'Critical', email_contacts: [], wechat_contacts: [], dingtalk_robots: [], webhooks: [] },
      ],
    },
    {
      id: 'routes',
      label: '告警路由',
      kind: 'alert_routes',
      path: 'routes',
      default: { receiver: 'Default', routes: [] },
    },
    {
      id: 'templates',
      label: '消息模板',
      kind: 'message_templates',
      path: 'message_templates',
    },
  ],
}

describe('schemaKindRegistry', () => {
  it('注册 5 类 kind（form/contact_groups/alert_routes/inhibit_rules/message_templates）', () => {
    expect(registeredSchemaKinds()).toEqual(
      expect.arrayContaining(['form', 'contact_groups', 'alert_routes', 'inhibit_rules', 'message_templates']),
    )
  })

  it('未知 kind 回退到 json（无组件、pathBacked）', () => {
    const handler = resolveSchemaKind('some_unknown_kind')
    expect(handler.component).toBeUndefined()
    expect(handler.pathBacked).toBe(true)
  })
})

describe('applySchemaDefaults', () => {
  it('form 字段缺失且带 default 时补齐（含布尔开关）', () => {
    const model = applySchemaDefaults(MIN_SCHEMA, {})
    expect(model).toHaveProperty('email.smtp_host', '')
    expect(model).toHaveProperty('email.use_tls', true)
  })

  it('form 已有值不被 default 覆盖', () => {
    const model = applySchemaDefaults(MIN_SCHEMA, { email: { smtp_host: 'smtp.example.com:465' } })
    expect(model).toHaveProperty('email.smtp_host', 'smtp.example.com:465')
    expect(model).toHaveProperty('email.use_tls', true)
  })

  it('contact_groups 缺失或空数组时填入 schema 默认，非空则保留', () => {
    const empty = applySchemaDefaults(MIN_SCHEMA, { contact_groups: [] })
    expect((empty as { contact_groups: unknown[] }).contact_groups).toHaveLength(2)

    const existing = applySchemaDefaults(MIN_SCHEMA, {
      contact_groups: [{ name: 'Ops', email_contacts: ['a@b.c'], wechat_contacts: [], dingtalk_robots: [], webhooks: [] }],
    })
    const groups = (existing as { contact_groups: Array<{ name: string }> }).contact_groups
    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe('Ops')
  })

  it('routes 为数组或空对象时视为非法，回填合法路由树根', () => {
    const fixed = applySchemaDefaults(MIN_SCHEMA, { routes: [] })
    expect(normalizeRouteRoot((fixed as { routes: unknown }).routes)).not.toBeNull()
    expect((fixed as { routes: { receiver: string } }).routes.receiver).toBe('Default')
  })

  it('message_templates 为 legacy .tmpl 引用时升级为内置内联模板', () => {
    const upgraded = applySchemaDefaults(MIN_SCHEMA, { message_templates: { email: 'alert.tmpl' } })
    const templates = (upgraded as { message_templates: Record<string, string> }).message_templates
    expect(templates.email).toBe(EMAIL_DEFAULT_TEMPLATE)
    expect(Object.keys(templates).sort()).toEqual(['dingtalk', 'email', 'wechat'])
    expect(templates.wechat).toBe(defaultMessageTemplates().wechat)
  })
})
