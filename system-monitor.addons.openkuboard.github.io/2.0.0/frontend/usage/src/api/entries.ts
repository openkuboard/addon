// host API：读取 cluster 级监控入口（entry.context 的 cluster 子集）。
//
// GET /api/addon/entries/?level=cluster&cluster={code}
// 统一 Result envelope：{ code, msg, data: { entries: [...] } }（code<0 且 !=0 视为失败）。
// cluster（当前集群上下文）按仓库「集群参数传递契约」走 query 参数；
// addon 页面与 host 同源，附加 Authorization: Bearer（与 /addon-sdk/index.js 同款读取）。

import type {
  AddonClusterEntry,
  AddonEntriesData,
  AddonEntriesResponse,
} from '@/types/entries'

/** 从 localStorage 读 JWT（host 登录后写入；与 SDK authHeaders 同源） */
function authHeaders(): Record<string, string> {
  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem('jwt_token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * 拉取 cluster 级入口。cluster 为空时省略 cluster 参数（后端回退默认集群）。
 * 任一失败（网络/非零 code）抛错，由 UI 展示；空列表返回 []。
 */
export async function fetchClusterEntries(cluster: string): Promise<AddonClusterEntry[]> {
  const url = new URL('/api/addon/entries/', window.location.origin)
  url.searchParams.set('level', 'cluster')
  if (cluster) url.searchParams.set('cluster', cluster)

  const res = await fetch(url.toString(), { headers: authHeaders() })
  if (!res.ok) {
    throw new Error(`读取集群监控入口失败（HTTP ${res.status}）`)
  }
  const body = (await res.json()) as AddonEntriesResponse
  if (body.code < 0 && body.code !== 0) {
    throw new Error(body.msg || `读取集群监控入口失败（code ${body.code}）`)
  }
  const data: AddonEntriesData | null = body.data ?? null
  return data?.entries ?? []
}
