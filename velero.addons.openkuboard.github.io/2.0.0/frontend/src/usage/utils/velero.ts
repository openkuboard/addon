// Velero usage 页纯逻辑：Backup / Restore / Schedule / DeleteBackupRequest 的
// payload 构造与状态解析。保持纯函数、无 DOM / SDK 依赖，便于 vitest 直接覆盖（TDD）。

export const VELERO_GROUP = 'velero.io'
export const VELERO_VERSION = 'v1'

export const VELERO_RESOURCES = {
  backups: 'backups',
  restores: 'restores',
  schedules: 'schedules',
  backupStorageLocations: 'backupstoragelocations',
  volumeSnapshotLocations: 'volumesnapshotlocations',
  backupRepositories: 'backuprepositories',
  deleteBackupRequests: 'deletebackuprequests',
} as const

export interface BackupTemplateOptions {
  includedNamespaces?: string[]
  excludedNamespaces?: string[]
  includeClusterResources?: boolean
  labelSelector?: string
  ttlHours?: number
  storageLocation?: string
  snapshotVolumes?: boolean
}

/** 将 "app=nginx" / "app=nginx,env=prod" 解析为 K8s labelSelector.matchLabels；空串返回 undefined */
export function parseLabelSelector(input: string): { matchLabels: Record<string, string> } | undefined {
  const text = (input || '').trim()
  if (!text) return undefined
  const matchLabels: Record<string, string> = {}
  for (const part of text.split(',')) {
    const seg = part.trim()
    if (!seg) continue
    const eq = seg.indexOf('=')
    if (eq <= 0 || eq === seg.length - 1) continue
    matchLabels[seg.slice(0, eq).trim()] = seg.slice(eq + 1).trim()
  }
  return Object.keys(matchLabels).length ? { matchLabels } : undefined
}

/** 小时数 → ISO 8601 时长（如 720 → "720h"）；非正数返回默认 */
export function toTTLDuration(hours: number | undefined, fallback = 720): string {
  const h = hours && hours > 0 ? hours : fallback
  return `${h}h`
}

/** ISO 8601 时长（如 "720h"）→ 小时数；无法解析返回 null */
export function parseTTLHours(ttl: string | undefined): number | null {
  if (!ttl) return null
  const m = ttl.match(/^(\d+(?:\.\d+)?)h$/)
  return m ? Number(m[1]) : null
}

/** RFC 1123 名称清洗：小写、非法字符转 '-'，去掉首尾 '-'，空则加前缀 */
export function sanitizeName(input: string, prefix = 'velero-'): string {
  const cleaned = (input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned || prefix
}

/** 构造 Backup CR 对象 */
export function buildBackupPayload(
  name: string,
  opts: BackupTemplateOptions,
): Record<string, unknown> {
  const spec: Record<string, unknown> = {}
  const included = opts.includedNamespaces?.filter(Boolean)
  const excluded = opts.excludedNamespaces?.filter(Boolean)
  if (included?.length) spec.includedNamespaces = included
  if (excluded?.length) spec.excludedNamespaces = excluded
  if (opts.includeClusterResources !== undefined) spec.includeClusterResources = opts.includeClusterResources
  if (opts.snapshotVolumes !== undefined) spec.snapshotVolumes = opts.snapshotVolumes
  const selector = parseLabelSelector(opts.labelSelector || '')
  if (selector) spec.labelSelector = selector
  if (opts.storageLocation) spec.storageLocation = opts.storageLocation
  spec.ttl = toTTLDuration(opts.ttlHours)
  return {
    apiVersion: `${VELERO_GROUP}/${VELERO_VERSION}`,
    kind: 'Backup',
    metadata: { name: sanitizeName(name) },
    spec,
  }
}

/** 构造 Restore CR 对象 */
export function buildRestorePayload(
  name: string,
  backupName: string,
  opts: { includedNamespaces?: string[]; restorePVs?: boolean; preserveNodePorts?: boolean },
): Record<string, unknown> {
  const spec: Record<string, unknown> = { backupName }
  const included = opts.includedNamespaces?.filter(Boolean)
  if (included?.length) spec.includedNamespaces = included
  if (opts.restorePVs !== undefined) spec.restorePVs = opts.restorePVs
  if (opts.preserveNodePorts !== undefined) spec.preserveNodePorts = opts.preserveNodePorts
  return {
    apiVersion: `${VELERO_GROUP}/${VELERO_VERSION}`,
    kind: 'Restore',
    metadata: { name: sanitizeName(name) },
    spec,
  }
}

/** 构造 Schedule CR 对象（template 即一次备份的 spec） */
export function buildSchedulePayload(
  name: string,
  cron: string,
  opts: BackupTemplateOptions,
  paused = false,
): Record<string, unknown> {
  const template: Record<string, unknown> = {}
  const included = opts.includedNamespaces?.filter(Boolean)
  const excluded = opts.excludedNamespaces?.filter(Boolean)
  if (included?.length) template.includedNamespaces = included
  if (excluded?.length) template.excludedNamespaces = excluded
  if (opts.includeClusterResources !== undefined) template.includeClusterResources = opts.includeClusterResources
  if (opts.snapshotVolumes !== undefined) template.snapshotVolumes = opts.snapshotVolumes
  const selector = parseLabelSelector(opts.labelSelector || '')
  if (selector) template.labelSelector = selector
  if (opts.storageLocation) template.storageLocation = opts.storageLocation
  template.ttl = toTTLDuration(opts.ttlHours)
  return {
    apiVersion: `${VELERO_GROUP}/${VELERO_VERSION}`,
    kind: 'Schedule',
    metadata: { name: sanitizeName(name) },
    spec: {
      schedule: cron || '0 2 * * *',
      paused: !!paused,
      template,
    },
  }
}

/** 构造 DeleteBackupRequest CR 对象（正确删除备份数据） */
export function buildDeleteBackupRequestPayload(name: string, backupName: string): Record<string, unknown> {
  return {
    apiVersion: `${VELERO_GROUP}/${VELERO_VERSION}`,
    kind: 'DeleteBackupRequest',
    metadata: { name: sanitizeName(name, 'dbr-') },
    spec: { backupName },
  }
}

export interface BackupStatusInfo {
  phase: string
  errors: number
  warnings: number
  startedAt: string
  completedAt: string
  expiration: string
  ttlHours: number | null
}

/** 解析 Backup CR 的 phase / errors / warnings / 时间 */
export function backupStatus(backup: Record<string, any>): BackupStatusInfo {
  const status = backup?.status || {}
  const spec = backup?.spec || {}
  const errors = (status?.errors as number) ?? 0
  const warnings = (status?.warnings as number) ?? 0
  return {
    phase: status?.phase || 'Unknown',
    errors,
    warnings,
    startedAt: status?.startTimestamp || '',
    completedAt: status?.completionTimestamp || '',
    expiration: status?.expiration || '',
    ttlHours: parseTTLHours(spec?.ttl),
  }
}

/** 时间字符串 → 本地可读文本；空返回 '—' */
export function formatTime(ts: string | undefined): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** ElTag type 映射：Completed/Ready → success，Failed → danger，Pending/InProgress → warning */
export function phaseTagType(phase: string): string {
  if (/^(Completed|Ready|Available)$/.test(phase)) return 'success'
  if (/^(Failed|PartiallyFailed|Unavailable|FailedValidation)$/.test(phase)) return 'danger'
  if (/^(New|Pending|InProgress|Running|Downloading|Uploading)$/.test(phase)) return 'warning'
  return 'info'
}

/** 备份进度文本：已备份项 / 总数 */
export function progressText(status: Record<string, any> | undefined): string {
  if (!status) return '—'
  const p = status.progress || {}
  return `${p.itemsBackedUp ?? 0} / ${p.totalItems ?? 0}`
}

/* ─────────────── 备份详情描述（详情抽屉展示用，纯函数可测） ─────────────── */

export interface DetailField {
  key: string
  label: string
  value: string
}

export interface DetailSection {
  title: string
  fields: DetailField[]
}

function joinList(v: string[] | undefined): string {
  if (!v || !v.length) return '—'
  return v.join(', ')
}

function orDash(v: unknown): string {
  if (v === undefined || v === null || v === '') return '—'
  return String(v)
}

function boolText(v: boolean | undefined): string {
  if (v === undefined) return '—'
  return v ? '是' : '否'
}

function objSummary(v: unknown): string {
  if (v === undefined || v === null) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function mapSummary(m: Record<string, string> | undefined): string {
  if (!m || !Object.keys(m).length) return '—'
  return Object.entries(m)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
}

/** 备份摘要统计：阶段 / 进度 / 错误 / 警告 / 数据项 */
export function backupSummary(b: Record<string, any>): {
  phase: string
  items: string
  errors: number
  warnings: number
  expired: string
} {
  const status = b?.status || {}
  return {
    phase: status.phase || 'Unknown',
    items: progressText(status),
    errors: (status.errors as number) ?? 0,
    warnings: (status.warnings as number) ?? 0,
    expired: formatTime(status.expiration),
  }
}

/** 将 Backup CR 描述为「标题 + 字段」的分组详情，供详情抽屉渲染 */
export function describeBackup(b: Record<string, any>): { sections: DetailSection[]; raw: string } {
  const meta = b?.metadata || {}
  const spec = b?.spec || {}
  const status = b?.status || {}

  const postHooks = (spec.hooks?.post || []).length
  const preCount = (spec.hooks?.pre || []).length + (spec.hooks?.resources || []).length

  const basic: DetailField[] = [
    { key: 'name', label: '名称', value: orDash(meta.name) },
    { key: 'namespace', label: '命名空间', value: orDash(meta.namespace) },
    { key: 'phase', label: '阶段', value: orDash(status.phase) },
    { key: 'ttl', label: 'TTL', value: orDash(spec.ttl) },
    { key: 'storageLocation', label: '存储位置', value: orDash(spec.storageLocation) },
    { key: 'labels', label: '标签', value: mapSummary(meta.labels) },
    { key: 'annotations', label: '注解', value: mapSummary(meta.annotations) },
    { key: 'createdAt', label: '创建时间', value: formatTime(meta.creationTimestamp) },
    { key: 'startedAt', label: '开始时间', value: formatTime(status.startTimestamp) },
    { key: 'completedAt', label: '完成时间', value: formatTime(status.completionTimestamp) },
    { key: 'expiration', label: '过期时间', value: formatTime(status.expiration) },
    { key: 'version', label: '版本', value: orDash(status.version) },
  ]

  const scope: DetailField[] = [
    { key: 'includedNamespaces', label: '包含命名空间', value: joinList(spec.includedNamespaces) },
    { key: 'excludedNamespaces', label: '排除命名空间', value: joinList(spec.excludedNamespaces) },
    { key: 'includeClusterResources', label: '包含集群资源', value: boolText(spec.includeClusterResources) },
    { key: 'snapshotVolumes', label: '快照卷', value: boolText(spec.snapshotVolumes) },
    { key: 'labelSelector', label: '标签选择器', value: objSummary(spec.labelSelector) },
    { key: 'orderedResources', label: '有序资源', value: objSummary(spec.orderedResources) },
    { key: 'defaultVolumesToFsBackup', label: '默认文件级备份', value: boolText(spec.defaultVolumesToFsBackup) },
    { key: 'hooks', label: 'Hook 数量', value: `${preCount} 前 / ${postHooks} 后` },
    { key: 'uploaderCfg', label: '上传器配置', value: objSummary(spec.uploaderCfg) },
  ]

  const stat: DetailField[] = [
    { key: 'errors', label: '错误', value: orDash(status.errors ?? 0) },
    { key: 'warnings', label: '警告', value: orDash(status.warnings ?? 0) },
    { key: 'validationErrors', label: '校验错误', value: joinList(status.validationErrors) },
    { key: 'progress', label: '进度', value: progressText(status) },
    { key: 'formatVersion', label: '数据格式版本', value: orDash(status.formatVersion) },
  ]

  const sections: DetailSection[] = [
    { title: '基本信息', fields: basic },
    { title: '备份范围', fields: scope },
    { title: '状态', fields: stat },
  ]

  return { sections, raw: JSON.stringify(b, null, 2) }
}