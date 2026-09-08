// usage 前端内部 hash 路由：独立备份详情页（#usage/backup/<name>）与列表页。
// 纯函数解析，便于 vitest 覆盖（TDD）。
export type UsageRoute = { page: 'list' } | { page: 'backup'; name: string }

const HASH_PREFIX = 'usage'

/** 解析 window.location.hash（如 "#usage"、"#usage/backup/xyz"、"#config"）为内部路由 */
export function parseUsageRoute(hash: string): UsageRoute {
  const h = String(hash || '').replace(/^#\/?/, '')
  const parts = h.split('/').filter((p) => p.length > 0)
  if (parts[0] === HASH_PREFIX && parts[1] === 'backup' && parts[2]) {
    try {
      return { page: 'backup', name: decodeURIComponent(parts[2]) }
    } catch {
      return { page: 'backup', name: parts[2] }
    }
  }
  return { page: 'list' }
}

/** 构造备份详情页 hash（用于 window.location.hash 赋值） */
export function backupDetailHash(name: string): string {
  return `#${HASH_PREFIX}/backup/${encodeURIComponent(name)}`
}

/** 列表页 hash */
export function listHash(): string {
  return `#${HASH_PREFIX}`
}