# K8S 资源监控套件 v2.0.0

基于 Prometheus / Grafana 提供 Kubernetes 集群资源监控能力（CPU、内存、磁盘、网络等资源层指标），适配 Kubernetes 1.35。

## v2 变更（Addon v2 架构）

本版本按 [addon-v2 架构](../../../../docs/addon-v2-prd.md) 迁移为 **B 类（第三方服务 UI）** addon：

- **移除** `scripts[]` / `initialize.js` → 声明式 `readiness`（grafana `/api/health` 探活）驱动 activate 状态机。
- **移除** `extensions[]` handler JS → `entry.context` 声明式上下文入口（24 个监控入口，含 `visibleWhen` 与 `node.internalIP` / `node.kubeletPort` helper 取值）。
- **移除** `quickLinks[]` / `capabilities` → 显式 `serviceUI` + `entry.quickLink` + `permissions` / `resourceAccess` / `hostReads` / `frontend`。
- 新增 **config 前端**（`frontend/config/dist/`），经 `@openkuboard/addon-sdk` 读写参数与 host 数据。

## 安装

安装前请在套件详情页「配置」tab 选择 Prometheus StorageClass 与存储卷大小；需集群已启用 metrics-server 或 kubelet/cAdvisor 指标采集。

## 组件版本

| 组件 | 版本 |
|------|------|
| grafana | grafana 11.4.0 |
| prometheus | prometheus-k8s |
| alertmanager | alertmanager-main |
| node-exporter | node-exporter |
| kube-state-metrics | kube-state-metrics |

