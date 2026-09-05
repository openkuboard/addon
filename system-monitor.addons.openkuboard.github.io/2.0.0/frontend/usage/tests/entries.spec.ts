// 资源层监控套件 usage 前端：入口路由纯函数单测（TDD）。
//
// buildProxyUrl 负责把 object route（serviceUI + path）拼成 host 受控代理 URL：
//     /api/addon/{addon_id}/proxy/{serviceUI}{path}?cluster=...
// resolveTemplate 负责把 {{dot.path}} 占位符替换成上下文值（cluster 级入口基本无占位，
// 但保留与 host useSystemMonitor 对齐的实现，避免 route.path 含模板时落到字面花括号）。

import { describe, it, expect } from 'vitest'
import { buildProxyUrl, resolveTemplate } from '../src/utils/entries'

const ADDON = 'system-monitor.addons.openkuboard.github.io'

describe('buildProxyUrl', () => {
  it('拼接基础代理 URL：addon_id / serviceUI 编码、cluster 追加为 query 参数', () => {
    const url = buildProxyUrl(
      ADDON,
      'grafana',
      '/d/09ec8aa1e996d6ffcd6817bbaff4db1b/apiserver?orgId=1&refresh=10s',
      'test',
    )
    expect(url).toBe(
      `/api/addon/${ADDON}/proxy/grafana/d/09ec8aa1e996d6ffcd6817bbaff4db1b/apiserver?orgId=1&refresh=10s&cluster=test`,
    )
  })

  it('path 以 / 开头时不再重复加斜杠', () => {
    const url = buildProxyUrl(ADDON, 'prometheus', '/graph', 'test')
    expect(url).toBe(`/api/addon/${ADDON}/proxy/prometheus/graph?cluster=test`)
  })

  it('path 不以 / 开头时自动补 /（与 SDK serviceUI.proxy 语义一致）', () => {
    const url = buildProxyUrl(ADDON, 'grafana', 'd/xxx', 'test')
    expect(url).toBe(`/api/addon/${ADDON}/proxy/grafana/d/xxx?cluster=test`)
  })

  it('空 path 与 "/" 兜底为不带尾斜杠的纯代理根路径', () => {
    expect(buildProxyUrl(ADDON, 'alertmanager', '', 'test')).toBe(
      `/api/addon/${ADDON}/proxy/alertmanager?cluster=test`,
    )
    expect(buildProxyUrl(ADDON, 'alertmanager', '/', 'test')).toBe(
      `/api/addon/${ADDON}/proxy/alertmanager?cluster=test`,
    )
  })

  it('cluster 为空串时省略 cluster query 参数', () => {
    const url = buildProxyUrl(ADDON, 'grafana', '/d/x?orgId=1', '')
    expect(url).toBe(`/api/addon/${ADDON}/proxy/grafana/d/x?orgId=1`)
  })

  it('path 不带 query 时 cluster 用 ? 连接', () => {
    const url = buildProxyUrl(ADDON, 'grafana', '/d/x', 'k8s-prod')
    expect(url).toBe(`/api/addon/${ADDON}/proxy/grafana/d/x?cluster=k8s-prod`)
  })
})

describe('resolveTemplate', () => {
  it('替换 {{dot.path}} 占位符为上下文嵌套字段', () => {
    const ctx = {
      node: { metadata: { name: 'node-01' }, internalIP: '10.0.0.5', kubeletPort: '10250' },
      namespace: { metadata: { name: 'ops' } },
    }
    expect(
      resolveTemplate('{{node.metadata.name}}:{{node.internalIP}}:{{node.kubeletPort}}', ctx),
    ).toBe('node-01:10.0.0.5:10250')
  })

  it('取不到值的占位符替换为空串（保守不抛错）', () => {
    const ctx = { node: {} } as Record<string, unknown>
    expect(resolveTemplate('/d/x?var={{node.metadata.name}}', ctx)).toBe('/d/x?var=')
  })

  it('无占位符时原样返回', () => {
    expect(resolveTemplate('/d/xxx?orgId=1', {})).toBe('/d/xxx?orgId=1')
  })

  it('值为数字/布尔时转字符串', () => {
    const ctx = { pod: { metadata: { namespace: 'web' } }, replica: 3, ready: true }
    expect(resolveTemplate('{{pod.metadata.namespace}}/{{replica}}/{{ready}}', ctx)).toBe(
      'web/3/true',
    )
  })
})
