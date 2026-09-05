// 消息模板默认值 + 归一化（还原自 host frontend-vue/src/utils/alertMessageTemplates.ts）。

export type MessageTemplateMap = Record<string, string>

export const WECHAT_DEFAULT_TEMPLATE = `{{ define "wechat.default.message" }}
{{- if gt (len .Alerts.Firing) 0 -}}
{{- range $index, $alert := .Alerts -}}
{{- if eq $index 0 -}}
==========
告警类型: {{ $alert.Labels.alertname }}
告警级别: {{ $alert.Labels.severity }}

{{- end }}
*****告警详情*****
告警详情: {{ $alert.Annotations.message }}
故障时间: {{ $alert.StartsAt.Format "2006-01-02 15:04:05" }}
*****参考信息*****
{{ if gt (len $alert.Labels.instance) 0 -}}故障实例ip: {{ $alert.Labels.instance }};{{- end -}}
{{- if gt (len $alert.Labels.namespace) 0 -}}故障实例所在namespace: {{ $alert.Labels.namespace }};{{- end -}}
{{- if gt (len $alert.Labels.node) 0 -}}故障物理机ip: {{ $alert.Labels.node }};{{- end -}}
{{- if gt (len $alert.Labels.pod_name) 0 -}}故障pod名称: {{ $alert.Labels.pod_name }}{{- end -}}
====================
{{- end }}
{{- end }}

{{- if gt (len .Alerts.Resolved) 0 -}}
{{- range $index, $alert := .Alerts -}}
{{- if eq $index 0 -}}
==========
告警类型: {{ $alert.Labels.alertname }}
告警级别: {{ $alert.Labels.severity }}

{{- end }}
*****告警详情*****
告警详情: {{ $alert.Annotations.message }}
故障时间: {{ $alert.StartsAt.Format "2006-01-02 15:04:05" }}
恢复时间: {{ $alert.EndsAt.Format "2006-01-02 15:04:05" }}
====================
{{- end }}
{{- end }}
{{- end }}`

export const DINGTALK_DEFAULT_TEMPLATE = `{{ define "dingtalk.default.message" }}
{{- if gt (len .Alerts.Firing) 0 -}}
{{- range $index, $alert := .Alerts -}}
{{- if eq $index 0 -}}
==========
告警类型: {{ $alert.Labels.alertname }}
告警级别: {{ $alert.Labels.severity }}

{{- end }}
*****告警详情*****
告警详情: {{ $alert.Annotations.message }}
故障时间: {{ $alert.StartsAt.Format "2006-01-02 15:04:05" }}
*****参考信息*****
{{ if gt (len $alert.Labels.instance) 0 -}}故障实例ip: {{ $alert.Labels.instance }};{{- end -}}
{{- if gt (len $alert.Labels.namespace) 0 -}}故障实例所在namespace: {{ $alert.Labels.namespace }};{{- end -}}
{{- if gt (len $alert.Labels.node) 0 -}}故障物理机ip: {{ $alert.Labels.node }};{{- end -}}
{{- if gt (len $alert.Labels.pod_name) 0 -}}故障pod名称: {{ $alert.Labels.pod_name }}{{- end -}}
====================
{{- end }}
{{- end }}

{{- if gt (len .Alerts.Resolved) 0 -}}
{{- range $index, $alert := .Alerts -}}
{{- if eq $index 0 -}}
==========
告警类型: {{ $alert.Labels.alertname }}
告警级别: {{ $alert.Labels.severity }}

{{- end }}
*****告警详情*****
告警详情: {{ $alert.Annotations.message }}
故障时间: {{ $alert.StartsAt.Format "2006-01-02 15:04:05" }}
恢复时间: {{ $alert.EndsAt.Format "2006-01-02 15:04:05" }}
====================
{{- end }}
{{- end }}
{{- end }}`

export const EMAIL_DEFAULT_TEMPLATE = `{{ define "email.default.subject" }}[{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}{{ end }}

{{ define "email.default.html" }}
<!DOCTYPE html>
<html>
<body>
{{- if gt (len .Alerts.Firing) 0 -}}
<h3>告警触发</h3>
{{- range $index, $alert := .Alerts.Firing -}}
<p>
<b>告警类型:</b> {{ $alert.Labels.alertname }}<br/>
<b>告警级别:</b> {{ $alert.Labels.severity }}<br/>
<b>告警详情:</b> {{ $alert.Annotations.message }}<br/>
<b>故障时间:</b> {{ $alert.StartsAt.Format "2006-01-02 15:04:05" }}<br/>
{{- if $alert.Labels.instance -}}<b>故障实例:</b> {{ $alert.Labels.instance }}<br/>{{- end -}}
{{- if $alert.Labels.namespace -}}<b>命名空间:</b> {{ $alert.Labels.namespace }}<br/>{{- end -}}
</p>
<hr/>
{{- end -}}
{{- end -}}
{{- if gt (len .Alerts.Resolved) 0 -}}
<h3>告警恢复</h3>
{{- range $index, $alert := .Alerts.Resolved -}}
<p>
<b>告警类型:</b> {{ $alert.Labels.alertname }}<br/>
<b>告警级别:</b> {{ $alert.Labels.severity }}<br/>
<b>告警详情:</b> {{ $alert.Annotations.message }}<br/>
<b>恢复时间:</b> {{ $alert.EndsAt.Format "2006-01-02 15:04:05" }}<br/>
</p>
<hr/>
{{- end -}}
{{- end -}}
</body>
</html>
{{ end }}`

export function defaultMessageTemplates(): MessageTemplateMap {
  return {
    email: EMAIL_DEFAULT_TEMPLATE,
    wechat: WECHAT_DEFAULT_TEMPLATE,
    dingtalk: DINGTALK_DEFAULT_TEMPLATE,
  }
}

export function isLegacyMessageTemplates(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return true
  const entries = Object.entries(raw as Record<string, unknown>)
  if (entries.length === 0) return true
  return entries.every(([, value]) => typeof value === 'string' && /\.tmpl$/i.test(value))
}

export function normalizeMessageTemplates(
  raw: unknown,
  channelIds: string[] = ['email', 'wechat', 'dingtalk'],
): MessageTemplateMap {
  const defaults = defaultMessageTemplates()
  const source = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as MessageTemplateMap)
    : {}
  const next: MessageTemplateMap = {}
  for (const id of channelIds) {
    const value = source[id]
    next[id] = typeof value === 'string' && value.trim() ? value : (defaults[id] ?? '')
  }
  return next
}
