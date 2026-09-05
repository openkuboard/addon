// 深拷贝 + 按点路径读写嵌套对象（还原自 host frontend-vue/src/utils/addonSchemaPaths.ts）。

export function cloneConfig<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current == null || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[key]
  }, obj)
}

export function setByPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.')
  let current = obj
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i]
    const next = current[key]
    if (next == null || typeof next !== 'object' || Array.isArray(next)) {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = value
}
