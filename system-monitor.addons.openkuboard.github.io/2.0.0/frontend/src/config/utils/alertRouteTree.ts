import type { AlertRouteNode } from '../types'

// 告警路由树纯逻辑（还原自 host frontend-vue/src/utils/alertRouteTree.ts）。
// routes 数据 = Alertmanager 路由树根节点对象（含 receiver/match/routes 等）。

export type RoutePath = number[]

export function emptyRouteNode(receiver = 'New'): AlertRouteNode {
  return {
    receiver,
    match: {},
    routes: [],
  }
}

export function defaultRouteTree(): AlertRouteNode {
  return {
    receiver: 'Default',
    group_by: ['namespace'],
    group_wait: '30s',
    group_interval: '5m',
    repeat_interval: '12h',
    routes: [
      {
        receiver: 'Watchdog',
        match: { alertname: 'Watchdog' },
        routes: [],
      },
      {
        receiver: 'Critical',
        match: { severity: 'critical' },
        routes: [],
      },
    ],
  }
}

export function routePathKey(path: RoutePath): string {
  return path.length ? path.join('-') : 'root'
}

export function getRouteNode(root: AlertRouteNode, path: RoutePath): AlertRouteNode | null {
  if (!path.length) return root
  let current: AlertRouteNode = root
  for (const index of path) {
    const children = current.routes ?? []
    if (index < 0 || index >= children.length) return null
    current = children[index]
  }
  return current
}

export function getRouteSiblings(root: AlertRouteNode, path: RoutePath): {
  parent: AlertRouteNode
  list: AlertRouteNode[]
  index: number
} | null {
  if (!path.length) return null
  const parentPath = path.slice(0, -1)
  const parent = getRouteNode(root, parentPath)
  if (!parent) return null
  const list = parent.routes ?? (parent.routes = [])
  const index = path[path.length - 1]
  if (index < 0 || index >= list.length) return null
  return { parent, list, index }
}

export function cloneRouteTree(root: AlertRouteNode): AlertRouteNode {
  return JSON.parse(JSON.stringify(root)) as AlertRouteNode
}

export function updateRouteNode(
  root: AlertRouteNode,
  path: RoutePath,
  patch: Partial<AlertRouteNode>,
) {
  const node = getRouteNode(root, path)
  if (!node) return
  Object.assign(node, patch)
}

export function deleteRouteNode(root: AlertRouteNode, path: RoutePath): boolean {
  if (!path.length) return false
  const siblings = getRouteSiblings(root, path)
  if (!siblings) return false
  siblings.list.splice(siblings.index, 1)
  return true
}

export function moveRouteNode(root: AlertRouteNode, path: RoutePath, direction: -1 | 1): RoutePath | null {
  if (!path.length) return null
  const siblings = getRouteSiblings(root, path)
  if (!siblings) return null
  const target = siblings.index + direction
  if (target < 0 || target >= siblings.list.length) return null
  const [item] = siblings.list.splice(siblings.index, 1)
  siblings.list.splice(target, 0, item)
  return [...path.slice(0, -1), target]
}

export function addChildRoute(root: AlertRouteNode, path: RoutePath, child?: AlertRouteNode) {
  const node = getRouteNode(root, path)
  if (!node) return
  if (!node.routes) node.routes = []
  node.routes.push(child ?? emptyRouteNode())
}

export interface RouteTreeItem {
  label: string
  path: RoutePath
  pathKey?: string
  children?: RouteTreeItem[]
}

export function buildRouteTreeItems(node: AlertRouteNode, path: RoutePath = []): RouteTreeItem {
  const children = (node.routes ?? []).map((child, index) =>
    buildRouteTreeItems(child, [...path, index]),
  )
  return {
    label: node.receiver || '未命名',
    path,
    pathKey: routePathKey(path),
    children: children.length ? children : undefined,
  }
}

export function routeTreeData(root: AlertRouteNode): RouteTreeItem[] {
  return [buildRouteTreeItems(root, [])]
}

export function normalizeRouteRoot(value: unknown): AlertRouteNode | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const root = value as AlertRouteNode
  if (!root.receiver) return null
  if (!root.routes) root.routes = []
  return root
}

export function matchEntries(match: Record<string, string> | undefined): Array<{ key: string; value: string }> {
  return Object.entries(match ?? {}).map(([key, value]) => ({ key, value }))
}

export function entriesToMatch(entries: Array<{ key: string; value: string }>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of entries) {
    const key = row.key.trim()
    if (!key) continue
    out[key] = row.value
  }
  return out
}
