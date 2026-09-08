import { describe, it, expect } from 'vitest'
import {
  buildBackupPayload,
  buildRestorePayload,
  buildSchedulePayload,
  buildDeleteBackupRequestPayload,
  parseLabelSelector,
  toTTLDuration,
  parseTTLHours,
  sanitizeName,
  backupStatus,
  formatTime,
  phaseTagType,
  describeBackup,
  backupSummary,
} from '../src/usage/utils/velero'

describe('parseLabelSelector', () => {
  it('解析单个 key=value', () => {
    expect(parseLabelSelector('app=nginx')).toEqual({ matchLabels: { app: 'nginx' } })
  })
  it('解析多个逗号分隔', () => {
    expect(parseLabelSelector('app=nginx,env=prod')).toEqual({
      matchLabels: { app: 'nginx', env: 'prod' },
    })
  })
  it('空串 / 空白返回 undefined', () => {
    expect(parseLabelSelector('')).toBeUndefined()
    expect(parseLabelSelector('   ')).toBeUndefined()
  })
  it('非法片段（无等号 / 空 key）被忽略', () => {
    expect(parseLabelSelector('app=nginx,malformed')).toEqual({ matchLabels: { app: 'nginx' } })
  })
})

describe('TTL 工具', () => {
  it('toTTLDuration 输出 ISO 时长', () => {
    expect(toTTLDuration(720)).toBe('720h')
    expect(toTTLDuration(24)).toBe('24h')
    expect(toTTLDuration(undefined)).toBe('720h')
    expect(toTTLDuration(0)).toBe('720h')
  })
  it('parseTTLHours 解析反向', () => {
    expect(parseTTLHours('720h')).toBe(720)
    expect(parseTTLHours('1.5h')).toBe(1.5)
    expect(parseTTLHours('')).toBeNull()
    expect(parseTTLHours(undefined)).toBeNull()
  })
})

describe('sanitizeName', () => {
  it('小写并替换非法字符', () => {
    expect(sanitizeName('My Backup 1!')).toBe('my-backup-1')
  })
  it('空输入回退前缀', () => {
    expect(sanitizeName('')).toBe('velero-')
  })
})

describe('buildBackupPayload', () => {
  it('包含命名空间、TTL、标签选择器', () => {
    const p = buildBackupPayload('my-backup', {
      includedNamespaces: ['default'],
      ttlHours: 24,
      labelSelector: 'app=nginx',
    })
    expect(p.kind).toBe('Backup')
    expect(p.apiVersion).toBe('velero.io/v1')
    expect((p.spec as any).includedNamespaces).toEqual(['default'])
    expect((p.spec as any).ttl).toBe('24h')
    expect((p.spec as any).labelSelector).toEqual({ matchLabels: { app: 'nginx' } })
  })
  it('空命名空间 / 空选择器不写入 spec', () => {
    const p = buildBackupPayload('b1', { includedNamespaces: [] })
    expect((p.spec as any).includedNamespaces).toBeUndefined()
    expect((p.spec as any).labelSelector).toBeUndefined()
    expect((p.spec as any).ttl).toBe('720h')
  })
  it('includeClusterResources / snapshotVolumes 透传', () => {
    const p = buildBackupPayload('b2', { includeClusterResources: false, snapshotVolumes: false })
    expect((p.spec as any).includeClusterResources).toBe(false)
    expect((p.spec as any).snapshotVolumes).toBe(false)
  })
})

describe('buildRestorePayload', () => {
  it('引用 backupName 与命名空间覆盖', () => {
    const p = buildRestorePayload('r1', 'my-backup', { includedNamespaces: ['default'] })
    expect(p.kind).toBe('Restore')
    expect((p.spec as any).backupName).toBe('my-backup')
    expect((p.spec as any).includedNamespaces).toEqual(['default'])
  })
  it('无命名空间覆盖时不写 includedNamespaces（恢复全部）', () => {
    const p = buildRestorePayload('r2', 'my-backup', {})
    expect((p.spec as any).includedNamespaces).toBeUndefined()
  })
})

describe('buildSchedulePayload', () => {
  it('构造 schedule + template', () => {
    const p = buildSchedulePayload('daily', '0 2 * * *', { includedNamespaces: ['default'], ttlHours: 48 })
    expect(p.kind).toBe('Schedule')
    expect((p.spec as any).schedule).toBe('0 2 * * *')
    expect((p.spec as any).paused).toBe(false)
    expect((p.spec as any).template.includedNamespaces).toEqual(['default'])
    expect((p.spec as any).template.ttl).toBe('48h')
  })
  it('paused 置位', () => {
    const p = buildSchedulePayload('s1', '0 2 * * *', {}, true)
    expect((p.spec as any).paused).toBe(true)
  })
})

describe('buildDeleteBackupRequestPayload', () => {
  it('引用备份名', () => {
    const p = buildDeleteBackupRequestPayload('del', 'my-backup')
    expect(p.kind).toBe('DeleteBackupRequest')
    expect((p.spec as any).backupName).toBe('my-backup')
  })
})

describe('backupStatus / 展示辅助', () => {
  it('解析 phase 与错误统计', () => {
    const s = backupStatus({
      spec: { ttl: '24h' },
      status: { phase: 'Failed', errors: 2, warnings: 1, startTimestamp: '2026-01-01T00:00:00Z' },
    })
    expect(s.phase).toBe('Failed')
    expect(s.errors).toBe(2)
    expect(s.warnings).toBe(1)
    expect(s.ttlHours).toBe(24)
  })
  it('phaseTagType 分类', () => {
    expect(phaseTagType('Completed')).toBe('success')
    expect(phaseTagType('Failed')).toBe('danger')
    expect(phaseTagType('InProgress')).toBe('warning')
    expect(phaseTagType('Other')).toBe('info')
  })
  it('formatTime 空值回退', () => {
    expect(formatTime('')).toBe('—')
    expect(formatTime(undefined)).toBe('—')
    expect(formatTime('2026-01-02T03:04:05Z')).toContain('2026-01-02')
  })
})

describe('describeBackup 详情描述', () => {
  it('按基本信息/备份范围/状态分节输出', () => {
    const { sections } = describeBackup({
      metadata: { name: 'my-backup', namespace: 'velero', creationTimestamp: '2026-01-01T00:00:00Z' },
      spec: {
        includedNamespaces: ['default', 'openkuboard'],
        excludedNamespaces: [],
        includeClusterResources: false,
        snapshotVolumes: true,
        labelSelector: { matchLabels: { app: 'nginx' } },
        storageLocation: 'default',
        ttl: '24h',
      },
      status: {
        phase: 'Completed',
        errors: 0,
        warnings: 2,
        progress: { itemsBackedUp: 10, totalItems: 10 },
        startTimestamp: '2026-01-01T00:00:00Z',
        completionTimestamp: '2026-01-01T00:00:05Z',
      },
    })
    expect(sections.map((s) => s.title)).toEqual(['基本信息', '备份范围', '状态'])

    const byKey = (title: string) => (key: string) =>
      sections.find((s) => s.title === title)!.fields.find((f) => f.key === key)!.value
    expect(byKey('基本信息')('name')).toBe('my-backup')
    expect(byKey('基本信息')('phase')).toBe('Completed')
    expect(byKey('基本信息')('ttl')).toBe('24h')
    expect(byKey('备份范围')('includedNamespaces')).toBe('default, openkuboard')
    expect(byKey('备份范围')('excludedNamespaces')).toBe('—')
    expect(byKey('备份范围')('includeClusterResources')).toBe('否')
    expect(byKey('备份范围')('snapshotVolumes')).toBe('是')
    expect(byKey('备份范围')('labelSelector')).toContain('matchLabels')
    expect(byKey('状态')('errors')).toBe('0')
    expect(byKey('状态')('warnings')).toBe('2')
    expect(byKey('状态')('progress')).toBe('10 / 10')
  })

  it('raw 输出完整 JSON', () => {
    const { raw } = describeBackup({ metadata: { name: 'b1' }, spec: { ttl: '1h' } } as any)
    expect(JSON.parse(raw)).toMatchObject({ metadata: { name: 'b1' }, spec: { ttl: '1h' } })
  })

  it('基本信息含标签/注解', () => {
    const { sections } = describeBackup({
      metadata: {
        name: 'b1',
        labels: { 'velero.io/storage-location': 'default' },
        annotations: { 'velero.io/foo': 'bar' },
      },
      spec: {},
      status: {},
    } as any)
    const basic = sections.find((s) => s.title === '基本信息')!.fields
    expect(basic.find((f) => f.key === 'labels')!.value).toBe('velero.io/storage-location=default')
    expect(basic.find((f) => f.key === 'annotations')!.value).toBe('velero.io/foo=bar')
  })
})

describe('backupSummary 摘要', () => {
  it('汇总阶段/进度/错误/警告/过期', () => {
    const s = backupSummary({
      status: {
        phase: 'Completed',
        errors: 0,
        warnings: 2,
        progress: { itemsBackedUp: 667, totalItems: 667 },
        expiration: '2026-10-08T12:01:56Z',
      },
    } as any)
    expect(s.phase).toBe('Completed')
    expect(s.items).toBe('667 / 667')
    expect(s.errors).toBe(0)
    expect(s.warnings).toBe(2)
    expect(s.expired).toContain('2026-10-08')
  })
})