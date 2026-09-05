import { describe, expect, it } from 'vitest'
import {
  crdToGroups,
  groupsToCrds,
  type PrometheusRuleCrd,
  type PrometheusRuleGroup,
} from '../src/config/utils/prometheusRuleCrud'
import { buildSavePayload } from '../src/config/utils/alertPrometheusRules'
import type { AddonAlertRuleGroup } from '../src/config/types'

// 覆盖 PrometheusRule CRD ⇄ AddonAlertRuleGroup 的双向转换：
// CRD → groups 字段映射、空 spec.groups 处理；groups → CRD 按 rule_set 聚合回写、resourceVersion 保留。

const CPU_CRD: PrometheusRuleCrd = {
  apiVersion: 'monitoring.coreos.com/v1',
  kind: 'PrometheusRule',
  metadata: {
    name: 'cpu-alerts',
    namespace: 'monitor-system',
    resourceVersion: '1001',
    uid: 'cafe-babe',
  },
  spec: {
    groups: [
      {
        name: 'cpu-usage',
        interval: '30s',
        rules: [
          {
            alert: 'HighCPU',
            expr: 'sum(rate(node_cpu_seconds_total{mode="idle"}[5m])) < 0.1',
            for: '10m',
            labels: { severity: 'critical' },
            annotations: { summary: 'CPU usage high' },
          },
        ],
      },
      {
        name: 'disk-usage',
        interval: '1m',
        rules: [],
      },
    ],
  },
}

const MEM_CRD: PrometheusRuleCrd = {
  metadata: { name: 'mem-alerts', namespace: 'monitor-system', resourceVersion: '2002' },
  spec: {
    groups: [
      {
        name: 'mem-usage',
        interval: '1m',
        rules: [{ alert: 'HighMem', expr: 'node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.1' }],
      },
    ],
  },
}

// 只含 recording 规则（无 alert 字段），编辑器不展示、也不应被改写
const REC_ONLY_CRD: PrometheusRuleCrd = {
  metadata: { name: 'record-rules', namespace: 'monitor-system', resourceVersion: '3003' },
  spec: {
    groups: [{ name: 'recording', rules: [{ record: 'node:up:rate', expr: 'sum(up)' }] }],
  },
}

describe('crdToGroups', () => {
  it('CRD → groups 字段映射：file=ns/name、rule_set=name、interval 缺省补空串', () => {
    const groups = crdToGroups([CPU_CRD])
    expect(groups).toHaveLength(2)

    expect(groups[0].file).toBe('monitor-system/cpu-alerts')
    expect(groups[0].rule_set).toBe('cpu-alerts')
    expect(groups[0].group).toBe('cpu-usage')
    expect(groups[0].interval).toBe('30s')

    const rule = groups[0].rules[0] as Record<string, unknown>
    expect(rule.alert).toBe('HighCPU')
    expect(rule.expr).toBe('sum(rate(node_cpu_seconds_total{mode="idle"}[5m])) < 0.1')
    expect(rule.for).toBe('10m')
    expect(rule.labels).toEqual({ severity: 'critical' })
    expect(rule.annotations).toEqual({ summary: 'CPU usage high' })

    // 第二个 group 无规则
    expect(groups[1].group).toBe('disk-usage')
    expect(groups[1].rules).toEqual([])
  })

  it('spec.groups 为空 / spec 缺失时产出空数组', () => {
    expect(crdToGroups([])).toEqual([])
    expect(crdToGroups([{ metadata: { name: 'x', namespace: 'ns' }, spec: { groups: [] } }])).toEqual([])
    expect(crdToGroups([{ metadata: { name: 'y', namespace: 'ns' } }])).toEqual([])
  })

  it('CRD 缺 interval 的 group 补为空串（编辑模型统一 string 形态）', () => {
    const crd: PrometheusRuleCrd = {
      metadata: { name: 'no-interval', namespace: 'ns' },
      spec: {
        groups: [{ name: 'g', rules: [{ alert: 'A', expr: 'up == 0' }] }],
      },
    }
    const [group] = crdToGroups([crd])
    expect(group?.interval).toBe('')
  })
})

describe('groupsToCrds', () => {
  function ruleSetGroup(crd: PrometheusRuleCrd, group: PrometheusRuleGroup): AddonAlertRuleGroup {
    return {
      file: `${crd.metadata.namespace}/${crd.metadata.name}`,
      rule_set: crd.metadata.name,
      group: group.name,
      interval: group.interval ?? '',
      rules: group.rules ?? [],
    }
  }

  it('按 rule_set 聚合回写：编辑后的 groups 归属各自 CRD，未编辑（recording-only）CRD 跳过', () => {
    // 编辑后：cpu-alerts 加了第二条告警组、mem-alerts 原样；record-rules 不在编辑集
    const edited: AddonAlertRuleGroup[] = [
      {
        ...ruleSetGroup(CPU_CRD, CPU_CRD.spec!.groups![0]),
        interval: '15s',
        rules: [{ alert: 'HighCPU', expr: 'sum(rate(...)) > 0.2', for: '5m', labels: { severity: 'warning' } }],
      },
      ruleSetGroup(CPU_CRD, { name: 'net-usage', interval: '2m', rules: [{ alert: 'HighNet', expr: 'rate(...) > 1000' }] }),
      ruleSetGroup(MEM_CRD, MEM_CRD.spec!.groups![0]),
    ]
    const payload = buildSavePayload(edited)
    const out = groupsToCrds([CPU_CRD, MEM_CRD, REC_ONLY_CRD], payload)

    // record-rules 不含可编辑告警组 → 不返回（不改写）
    expect(out.map((c) => c.metadata.name).sort()).toEqual(['cpu-alerts', 'mem-alerts'])

    const cpu = out.find((c) => c.metadata.name === 'cpu-alerts')!
    // metadata 保留（含 resourceVersion / 其它 label）
    expect(cpu.apiVersion).toBe('monitoring.coreos.com/v1')
    expect(cpu.kind).toBe('PrometheusRule')
    expect(cpu.metadata.namespace).toBe('monitor-system')
    expect(cpu.metadata.resourceVersion).toBe('1001')
    expect(cpu.metadata.uid).toBe('cafe-babe')

    // spec.groups 被编辑后的分组重建（含新增组），recording 空组 disk-usage 因编辑后无 alert 规则被移除
    const cpuNames = cpu.spec?.groups?.map((g) => g.name) ?? []
    expect(cpuNames).toEqual(['cpu-usage', 'net-usage'])
    expect(cpu.spec?.groups?.find((g) => g.name === 'cpu-usage')?.interval).toBe('15s')
    expect(cpu.spec?.groups?.find((g) => g.name === 'net-usage')?.interval).toBe('2m')
    expect(cpu.spec?.groups?.find((g) => g.name === 'cpu-usage')?.rules).toHaveLength(1)

    // 未编辑的 mem-alerts 也被重建（内容同源），record-rules 完全未动
    const mem = out.find((c) => c.metadata.name === 'mem-alerts')!
    expect(mem.metadata.resourceVersion).toBe('2002')
    expect(mem.spec?.groups?.[0]?.rules).toHaveLength(1)
    expect(REC_ONLY_CRD.spec?.groups?.[0]?.rules).toEqual([{ record: 'node:up:rate', expr: 'sum(up)' }])
  })

  it('原本含告警组的 CRD 全部清空后以空 groups 回写；recording-only CRD 仍不动', () => {
    // 用户把 cpu-alerts 的告警全删了 → payload 不含其分组
    const out = groupsToCrds([CPU_CRD, REC_ONLY_CRD], [])
    const cpu = out.find((c) => c.metadata.name === 'cpu-alerts')
    expect(cpu).toBeDefined()
    expect(cpu!.metadata.resourceVersion).toBe('1001')
    expect(cpu!.spec?.groups).toEqual([])
    expect(out.some((c) => c.metadata.name === 'record-rules')).toBe(false)
  })
})
