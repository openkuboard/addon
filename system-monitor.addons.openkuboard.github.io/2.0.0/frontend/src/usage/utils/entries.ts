// object route → host 受控代理 URL 的纯函数工具（TDD）。
//
// 与 host frontend-vue/src/composables/useSystemMonitor.ts 的 openV2Entry 语义对齐，
// 但抽成无 Vue 依赖的纯函数便于单测：addon 页面点击 cluster 级入口时，把
// { serviceUI, path, target } 拼成
//     /api/addon/{addon_id}/proxy/{serviceUI}{path}?cluster={cluster}
// path 可自带 query（如 Grafana dashboard 的 var-*/refresh/from/to/kiosk），
// cluster 始终作为最后一个 query 参数追加；path 为 '' / '/' 时退化为纯代理根路径。

/** 纯 dot-path 取值：a.b.c → obj.a.b.c（取不到返回 undefined，不抛错）。 */
function dotGet(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined
    return (acc as Record<string, unknown>)[key]
  }, obj)
}

/**
 * 替换模板里的 {{dot.path}} 占位符为上下文嵌套字段值。
 * 取不到的字段替换为空串（保守：cluster 级入口基本无占位，避免路由里残留花括号）。
 * 值非字符串时 String() 归一。
 */
export function resolveTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{([^{}]+)\}\}/g, (_m, expr: string) => {
    const v = dotGet(data, expr.trim())
    return v == null ? '' : String(v)
  })
}

/** path → [路径部分, query 部分]；无 query 时 query 为空串。 */
function splitPathQuery(input: string): [string, string] {
  const i = input.indexOf('?')
  if (i < 0) return [input, '']
  return [input.slice(0, i), input.slice(i + 1)]
}

/**
 * object route 类型守卫：route 为对象（{serviceUI,path,target}）而非 usage 内部路由字符串。
 */
export function isRouteObject(
  route: string | { serviceUI: string; path?: string; target?: string } | undefined,
): route is { serviceUI: string; path?: string; target?: string } {
  return !!route && typeof route === 'object' && typeof route.serviceUI === 'string'
}

/**
 * 拼接 object route 的完整代理 URL。serviceUI 空串时返回空串（非法输入防御）。
 * path 与 SDK serviceUI.proxy 同语义：'' / '/' 不加尾随路径；非 / 开头自动补 /。
 * cluster 为空时省略 cluster 参数；path 自带 query 时改用 & 连接。
 */
export function buildProxyUrl(
  addonId: string,
  serviceUI: string,
  path: string,
  cluster: string,
): string {
  if (!serviceUI) return ''
  const raw = path && path !== '/' ? (path.startsWith('/') ? path : `/${path}`) : ''
  const [pathPart, query] = splitPathQuery(raw)
  const base = `/api/addon/${encodeURIComponent(addonId)}/proxy/${encodeURIComponent(serviceUI)}${pathPart}`

  const params = new URLSearchParams()
  if (query) {
    // 把原 query 逐键拆回，避免重复编码或丢失参数
    for (const [k, v] of new URLSearchParams(query)) params.set(k, v)
  }
  if (cluster) params.set('cluster', cluster)

  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}
