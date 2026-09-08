# Velero 备份套件

基于 [Velero](https://velero.io/) + S3/MinIO 对象存储的 Kubernetes 集群备份/恢复套件，面向多命名空间与集群级资源提供：
备份（一次性）、定时备份（Schedule）、恢复（Restore）、备份历史与存储位置管理等完整能力。

## 功能

- **完整安装**：一次性应用全部 Velero 组件（Namespace / CRDs / ServiceAccount / RBAC / Secret / BackupStorageLocation / Deployment）。
- **配置页**：编辑存储参数（MinIO 端点、桶、AccessKey/SecretKey、镜像仓库、版本）并重新应用安装脚本。
- **使用页**：
  - 备份历史：按时间展示 `Backup` 列表（状态、阶段、包含/排除命名空间、TTL、开始/完成时间、错误统计）。
  - 创建备份：选择包含/排除命名空间、资源标签选择器、TTL。
  - 定时备份：创建 / 暂停 / 删除 `Schedule`。
  - 恢复：从历史备份创建 `Restore`，查看恢复结果。
  - 存储位置：`BackupStorageLocation` 状态（Available / Unavailable）与配置。
  - 备份仓库：`BackupRepository`（kopia 文件级备份）状态。
  - 快照位置：`VolumeSnapshotLocation` 一览。

## 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `VELERO_NAMESPACE` | Velero 组件命名空间 | `velero` |
| `VELERO_IMAGE_REGISTRY` | 镜像仓库前缀（含结尾 `/`，留空走官方源） | 空 |
| `VELERO_VERSION` | Velero Server 镜像版本 | `v1.18.1` |
| `VELERO_PLUGIN_AWS_VERSION` | AWS(S3) 插件镜像版本 | `v1.11.0` |
| `MINIO_ENDPOINT` | S3/MinIO 服务地址 | 空（需配置） |
| `MINIO_BUCKET` | 备份存储桶 | `velero` |
| `MINIO_ACCESS_KEY` | S3 访问密钥 | 空（需配置） |
| `MINIO_SECRET_KEY` | S3 访问密钥 SecretKey | 空（需配置） |
| `MINIO_REGION` | S3 region（MinIO 可任意） | `minio` |

## 安装

1. 在「套件中心」找到本套件并安装；
2. 打开「配置」页确认 / 修改 MinIO 存储参数；
3. 应用安装脚本（资源包按顺序应用，先 CRDs 后 Deployment）；
4. 完成初始化，等待状态变为 READY；
5. 在「用户与权限 → 角色」中为相关角色授权 `velero:*` 权限；
6. 通过左侧「套件 → Velero 备份套件」进入使用页。

## 使用示例

创建一次备份（使用页「创建备份」）：

```yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: my-backup
  namespace: velero
spec:
  includedNamespaces:
  - default
  ttl: 720h
```

从备份恢复（使用页「创建恢复」）：

```yaml
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: my-restore
  namespace: velero
spec:
  backupName: my-backup
```

## 存储

本套件默认对接 S3/MinIO 对象存储，BackupStorageLocation 以 `s3Url` + path-style 访问，
需保证集群节点可访问 `MINIO_ENDPOINT`。文件级备份（kopia）默认由 Velero Server
（`--uploader-type=kopia`）处理。