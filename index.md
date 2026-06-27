---
layout: default
title: 套件总览
---

# OpenKuboard 套件（Addon）

OpenKuboard 平台通过**套件（addon）**扩展功能。套件可部署 Kubernetes 资源、在前端添加上下文感知按钮，使平台具备无限扩展能力。

本仓库是 OpenKuboard 套件的主仓库，通过 **raw.githubusercontent.com** 为平台提供 addon 定义文件（`addon.json`、K8s 清单、初始化脚本等），同时在此站点提供开发文档。

文档站：**[https://openkuboard.github.io/addon/](https://openkuboard.github.io/addon/)**  
仓库地址：**[https://github.com/openkuboard/addon](https://github.com/openkuboard/addon)**

---

## 可用套件

### K8S 资源监控套件

| 项目 | 内容 |
|------|------|
| **套件 ID** | `system-monitor.addons.openkuboard.github.io` |
| **版本** | `1.0.0` |
| **说明** | 基于 Prometheus / Grafana / Alertmanager 提供 Kubernetes 集群资源层监控能力。包含 23 个预置 Grafana Dashboard，覆盖节点、容器组、工作负载、命名空间、集群等多个角度。 |
| **安装** | 在 **套件中心** 下载 → 配置 StorageClass/副本数等参数 → 应用安装脚本 → 初始化 |
| **组件** | prometheus-operator v0.78.2, prometheus v2.55.1, grafana 11.4.0, alertmanager, node-exporter, kube-state-metrics |
| **适配** | Kubernetes 1.35，已处理节点标签、OS 选择器等兼容性调整 |
| **源码** | [system-monitor.addons.openkuboard.github.io](https://github.com/openkuboard/addon/tree/main/system-monitor.addons.openkuboard.github.io/1.0.0) |
| **Addon JSON** | [addon.json](https://raw.githubusercontent.com/openkuboard/addon/main/system-monitor.addons.openkuboard.github.io/1.0.0/addon.json) |
| **文档** | [README](https://github.com/openkuboard/addon/blob/main/system-monitor.addons.openkuboard.github.io/1.0.0/README.md) |

**扩展点按钮：**

| 上下文 | 按钮 | 功能 |
|--------|------|------|
| 节点 | 节点资源监控 / Kubelet 监控 / API Server 监控 / 资源使用情况 | 跳转 Grafana Dashboard |
| 容器组 | 容器组资源监控 / 容器组网络监控 | 跳转 Grafana Dashboard |
| 工作负载 | 工作负载资源监控 / 工作负载网络监控 | 跳转 Grafana Dashboard |
| 命名空间 | 资源/网络监控（Pods / Deployments / StatefulSets / DaemonSets） | 跳转 Grafana Dashboard |
| 集群 | APIServer / 资源 / 网络 / Kubelet / 资源使用监控 | 跳转 Grafana Dashboard |

---

### 存储卷浏览器（PV Browser）

| 项目 | 内容 |
|------|------|
| **套件 ID** | `pv-browser.addons.openkuboard.github.io` |
| **版本** | `v3.0.1` |
| **说明** | 通过浏览器直接查看并管理 Kubernetes 持久化存储卷中的文件（上传、下载、删除）。 |
| **安装** | 套件中心下载 → 应用即可 |
| **使用** | 进入任意命名空间 → 工作负载详情 → Pod 行点击「文件」图标 |
| **源码** | [pv-browser.addons.openkuboard.github.io](https://github.com/openkuboard/addon/tree/main/pv-browser.addons.openkuboard.github.io/v3.0.1) |
| **Addon JSON** | [addon.json](https://raw.githubusercontent.com/openkuboard/addon/main/pv-browser.addons.openkuboard.github.io/v3.0.1/addon.json) |
| **文档** | [README](https://github.com/openkuboard/addon/blob/main/pv-browser.addons.openkuboard.github.io/v3.0.1/README.md) |

---

## 套件索引

本仓库 `index/repository.json` 是平台用于发现可用套件的注册表：

- [repository.json](https://raw.githubusercontent.com/openkuboard/addon/main/index/repository.json)

新增套件时必须在此文件登记。

---

## 快速开始 — 开发者

如果你想为 OpenKuboard 开发新套件，请参阅：

- [开发指南](./docs/development)
- [Addon 规范说明](./docs/addon-spec)