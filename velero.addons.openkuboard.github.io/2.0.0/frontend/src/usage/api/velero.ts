// Velero usage 页数据访问层：封装 addonSDK.resource CRUD，统一 group/version/namespace。
import {
  VELERO_GROUP,
  VELERO_VERSION,
  VELERO_RESOURCES,
  buildBackupPayload,
  buildRestorePayload,
  buildSchedulePayload,
  buildDeleteBackupRequestPayload,
  type BackupTemplateOptions,
} from '../utils/velero'

export class VeleroApi {
  constructor(
    private sdk: AddonSDK,
    private namespace: string,
  ) {}

  private ref(resource: string, name?: string) {
    return {
      group: VELERO_GROUP,
      version: VELERO_VERSION,
      resource,
      name,
      namespace: this.namespace,
    }
  }

  list(resource: string): Promise<Record<string, any>[]> {
    return this.sdk.resource.list(this.ref(resource)) as Promise<Record<string, any>[]>
  }

  create(resource: string, payload: Record<string, unknown>): Promise<unknown> {
    return this.sdk.resource.create({ ...this.ref(resource), object: payload })
  }

  update(resource: string, name: string, payload: Record<string, unknown>): Promise<unknown> {
    return this.sdk.resource.update({ ...this.ref(resource, name), object: payload })
  }

  remove(resource: string, name: string): Promise<void> {
    return this.sdk.resource.delete(this.ref(resource, name))
  }

  listBackups(): Promise<Record<string, any>[]> {
    return this.list(VELERO_RESOURCES.backups)
  }

  listSchedules(): Promise<Record<string, any>[]> {
    return this.list(VELERO_RESOURCES.schedules)
  }

  listRestores(): Promise<Record<string, any>[]> {
    return this.list(VELERO_RESOURCES.restores)
  }

  listStorageLocations(): Promise<Record<string, any>[]> {
    return this.list(VELERO_RESOURCES.backupStorageLocations)
  }

  listRepositories(): Promise<Record<string, any>[]> {
    return this.list(VELERO_RESOURCES.backupRepositories)
  }

  createBackup(name: string, opts: BackupTemplateOptions): Promise<unknown> {
    return this.create(VELERO_RESOURCES.backups, buildBackupPayload(name, opts))
  }

  createRestore(
    name: string,
    backupName: string,
    opts: { includedNamespaces?: string[]; restorePVs?: boolean },
  ): Promise<unknown> {
    return this.create(
      VELERO_RESOURCES.restores,
      buildRestorePayload(name, backupName, { restorePVs: opts.restorePVs ?? true, ...opts }),
    )
  }

  createSchedule(name: string, cron: string, opts: BackupTemplateOptions, paused = false): Promise<unknown> {
    return this.create(VELERO_RESOURCES.schedules, buildSchedulePayload(name, cron, opts, paused))
  }

  setSchedulePaused(schedule: Record<string, any>, paused: boolean): Promise<unknown> {
    const obj = JSON.parse(JSON.stringify(schedule)) as Record<string, any>
    if (!obj.spec) obj.spec = {}
    obj.spec.paused = paused
    return this.update(VELERO_RESOURCES.schedules, obj.metadata?.name, obj)
  }

  /** 通过 DeleteBackupRequest 正确删除备份（连同对象存储数据） */
  deleteBackup(backupName: string): Promise<unknown> {
    const payload = buildDeleteBackupRequestPayload('delete-' + backupName, backupName)
    return this.create(VELERO_RESOURCES.deleteBackupRequests, payload)
  }
}