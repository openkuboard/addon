// 告警配置 schema/数据契约类型（从 host frontend-vue/src/addons/types.ts 还原的最小公共子集）。
//
// 与 addon-dev/sdk/index.d.ts 的 Config.getAlertConfig() 返回的 schema（= 后端 alert_config_defs，
// 内容即 alert-config-schema.json）对应。本小应用只消费这些字段，其余 host 类型不引入。

/** form 字段定义（interface tab 内 section.fields） */
export interface AddonAlertConfigField {
  path: string
  label: string
  type?: 'text' | 'password' | 'switch' | 'textarea'
  placeholder?: string
  default?: unknown
  inline?: boolean
  rows?: number
  activeText?: string
  inactiveText?: string
  showWhen?: {
    path: string
    equals?: unknown
    truthy?: boolean
  }
}

/** form 分组（一组字段 + 可选标题） */
export interface AddonAlertConfigSection {
  title?: string
  fields: AddonAlertConfigField[]
}

/** 联系人组渠道定义（哪个字段存放哪类联系人） */
export interface AddonContactGroupChannelDef {
  label: string
  field: string
  type: 'tags' | 'webhook_list'
  requiresInterface?: string
  setupHint?: string
  setupActionLabel?: string
  setupTab?: string
  addLabel?: string
  urlPlaceholder?: string
  namePlaceholder?: string
}

/** 联系人组（contacts tab 数据：contact_groups 内每一项） */
export interface AddonContactGroup {
  name: string
  email_contacts?: string[]
  wechat_contacts?: string[]
  dingtalk_robots?: Array<{ name?: string; webhook_url: string }>
  webhooks?: Array<{ name?: string; url: string }>
}

/** 告警路由节点（routes tab 数据：Alertmanager 路由树节点） */
export interface AlertRouteNode {
  receiver: string
  group_by?: string[]
  group_wait?: string
  group_interval?: string
  repeat_interval?: string
  continue?: boolean
  match?: Record<string, string>
  match_re?: Record<string, string>
  routes?: AlertRouteNode[]
}

/** 抑制规则匹配器（key=value，regex 标记该匹配走 *_match_re） */
export interface AlertInhibitMatcher {
  key: string
  value: string
  regex?: boolean
}

/** 抑制规则（inhibit_rules tab 数据内每一项） */
export interface AlertInhibitRule {
  equal?: string[]
  source_match?: Record<string, string>
  source_match_re?: Record<string, string>
  target_match?: Record<string, string>
  target_match_re?: Record<string, string>
}

/** 消息模板渠道（templates tab 的 templateChannels：email/wechat/dingtalk） */
export interface AddonMessageTemplateChannel {
  id: string
  label: string
}

/** 告警配置 schema tab 定义 */
export interface AddonAlertConfigTab {
  id: string
  label: string
  kind: 'form' | 'json' | 'contact_groups' | 'alert_routes' | 'inhibit_rules' | 'message_templates'
  sections?: AddonAlertConfigSection[]
  path?: string
  hint?: string
  default?: unknown
  contactGroupChannels?: Record<string, AddonContactGroupChannelDef>
  addGroupLabel?: string
  docsTitle?: string
  docsContent?: string
  receiverPath?: string
  addRuleLabel?: string
  templateChannels?: AddonMessageTemplateChannel[]
}

/** 告警配置 schema 顶层（= alert-config-schema.json） */
export interface AddonAlertConfigDefs {
  helpUrl?: string
  helpLabel?: string
  footnote?: string
  tabs: AddonAlertConfigTab[]
}

/** 告警发送配置（alert_sending_config：可编辑模型顶层） */
export interface AddonAlertSendingConfig {
  prometheus_url?: string
  email?: Record<string, unknown>
  wechat?: Record<string, unknown>
  dingtalk?: Record<string, unknown>
  contact_groups?: unknown[]
  routes?: unknown[]
  inhibit_rules?: unknown[]
  message_templates?: Record<string, string>
}

/** 告警规则分组（PrometheusRule 分组视图；预留，规则编辑器后续实现） */
export interface AddonAlertRuleGroup {
  file: string
  rule_set: string
  group: string
  interval?: string
  rules: Array<Record<string, unknown>>
}
