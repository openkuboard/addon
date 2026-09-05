// cluster 级监控入口的类型（与 host /api/addon/entries/ 响应对齐）。
//
// 后端返回的 AddonEntry 序列化字段见 backend-go/internal/addon/types.go：
//   addon_id / id / label / label_en / level / is_v2 / route / permission / visible_when
// route 是联合类型 —— v2 声明式 object route（{serviceUI,path,target}）或 usage 前端
// 内部路由字符串（"usage#/..."）；本页面只渲染本套件 cluster 级 object route 入口。
// 注：addon.json entry.context 本身无 id，后端按数组下标生成 "ctx-N"。

export type AddonRouteTarget = 'blank' | 'iframe'

/** v2 声明式 object route：经 host /api/addon/{addon_id}/proxy/{serviceUI} 打开 */
export interface AddonRouteObject {
  serviceUI: string
  path?: string
  target?: AddonRouteTarget
}

export interface AddonClusterEntry {
  addon_id: string
  id: string
  label: string
  label_en?: string
  level: string
  is_v2?: boolean
  route?: string | AddonRouteObject
  permission?: string
}

/** entries 接口 data 段 */
export interface AddonEntriesData {
  entries: AddonClusterEntry[]
}

/** entries 接口统一 Result 响应 envelope */
export interface AddonEntriesResponse {
  code: number
  msg?: string
  data?: AddonEntriesData | null
}
