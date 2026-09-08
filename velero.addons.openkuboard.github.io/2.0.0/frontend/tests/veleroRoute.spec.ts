import { describe, it, expect } from 'vitest'
import { parseUsageRoute, backupDetailHash, listHash } from '../src/usage/utils/route'

describe('parseUsageRoute', () => {
  it('空 / 非 usage 前缀回退列表页', () => {
    expect(parseUsageRoute('')).toEqual({ page: 'list' })
    expect(parseUsageRoute('#config')).toEqual({ page: 'list' })
    expect(parseUsageRoute('#usage')).toEqual({ page: 'list' })
  })
  it('#usage/backup/<name> 解析为详情页', () => {
    expect(parseUsageRoute('#usage/backup/my-backup')).toEqual({ page: 'backup', name: 'my-backup' })
    expect(parseUsageRoute('#/usage/backup/xxx')).toEqual({ page: 'backup', name: 'xxx' })
  })
  it('URL 编码名称解码', () => {
    expect(parseUsageRoute('#usage/backup/my%20backup')).toEqual({ page: 'backup', name: 'my backup' })
  })
  it('缺少备份名视为列表页', () => {
    expect(parseUsageRoute('#usage/backup')).toEqual({ page: 'list' })
    expect(parseUsageRoute('#usage/backup/')).toEqual({ page: 'list' })
  })
})

describe('hash 构造', () => {
  it('backupDetailHash 编码名称', () => {
    expect(backupDetailHash('my backup')).toBe('#usage/backup/my%20backup')
    expect(parseUsageRoute(backupDetailHash('my-backup'))).toEqual({ page: 'backup', name: 'my-backup' })
  })
  it('listHash 回列表', () => {
    expect(listHash()).toBe('#usage')
  })
})