# K8S 资源监控套件

基于 **Prometheus / Grafana** 提供 Kubernetes 集群资源层监控能力，参考 [Kuboard system-monitor v3.0.3](https://github.com/eip-work/kuboard-addons/tree/master/repository/kuboard-system-monitor/v3.0.3) 整理，并针对 **Kubernetes 1.35** 做了兼容性调整。

## 能力

- 节点 CPU / 内存 / 磁盘 / 网络监控
- 容器组（Pod）计算资源与网络监控
- Prometheus + Alertmanager + Grafana 全栈
- 预置 kube-prometheus 风格 Grafana Dashboard

## 适配说明（K8s 1.35）

| 项 | 调整 |
|----|------|
| 组件版本 | prometheus-operator v0.78.2、prometheus v2.55.1、grafana 11.4.0 等 |
| 节点标签 | `node-role.kubernetes.io/master` → `control-plane` |
| OS 选择器 | `beta.kubernetes.io/os` → `kubernetes.io/os` |
| test 集群 | 默认 Prometheus 副本数 1、PVC 20Gi |

## 安装步骤

1. 在 **套件中心** 下载本套件（bootstrap 已为 test 集群种子 `downloaded` 状态）
2. 在套件详情页配置 **StorageClass** 等参数
3. **② 应用安装脚本** — 按顺序 apply CRD、RBAC、Operator、Prometheus/Grafana
4. **③ 初始化** — 等待 Grafana 就绪

## 访问

| 服务 | 命名空间 | Service | 端口 |
|------|----------|---------|------|
| Grafana | openkuboard | grafana | 3000 |
| Prometheus | openkuboard | prometheus-k8s | 9090 |
| Alertmanager | openkuboard | alertmanager-main | 9093 |

## Grafana 面板

K8s 监控面板自 [Kuboard system-monitor v3.0.3](https://github.com/eip-work/kuboard-addons/tree/master/repository/kuboard-system-monitor/v3.0.3) 提取，以 JSON 源文件维护，安装时通过 ConfigMap 挂载到 Grafana 容器的 `/grafana-dashboard-definitions/0/`。

| 路径 | 说明 |
|------|------|
| `grafana-dashboards/` | 23 个面板 JSON 源文件（按挂载子目录组织） |
| `k8s/dashboard-definitions.yaml` | 由源文件生成的 ConfigMap 清单 |
| `k8s/resources/deployment-grafana.yaml` | 将各 ConfigMap 挂载进 Grafana 容器 |

维护命令：

```bash
# 从 Kuboard 官方 addonResource 重新提取面板
python scripts/extract-kuboard-grafana-dashboards.py

# 由 JSON 重新生成 dashboard-definitions.yaml
python scripts/build-grafana-dashboard-configmaps.py
```

安装后 Grafana 通过 file provisioning 自动加载面板（含节点 `Nodes`、集群资源、Pod/Workload 等 23 个面板）。

## 更新记录

### 1.0.0

- 2026-06-27 插件 ID / 扩展点 / 标签由 `openkuboard.com` 命名空间迁移至 `openkuboard.github.io`，并归档至独立仓库 `openkuboard/addon`
- 2026-06-17 基于 Kuboard system-monitor v3.0.3 整理，插件 ID 为 `system-monitor.addons.openkuboard.github.io`
- 升级监控组件版本以适配 Kubernetes 1.35
- 默认 test 集群 Prometheus 单副本、20Gi 存储
- 从 Kuboard 提取完整 Grafana 面板 JSON，补齐 `statefulset` 等缺失 ConfigMap
