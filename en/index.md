---
layout: default
title: Addon Overview
lang: en
---

<p align="right">
  English · <a href="/addon/">简体中文</a>
</p>

# OpenKuboard Addons

The OpenKuboard platform is extended through **addons**. An addon can deploy Kubernetes resources and add context-aware buttons to the frontend, giving the platform unlimited extensibility.

This repository is the main addon repository for OpenKuboard. It serves addon definition files (`addon.json`, K8s manifests, init scripts, etc.) to the platform via **raw.githubusercontent.com**, and hosts this documentation site.

Documentation site: **[https://openkuboard.github.io/addon/](https://openkuboard.github.io/addon/)**  
Repository: **[https://github.com/openkuboard/addon](https://github.com/openkuboard/addon)**

---

## Available Addons

### K8S Resource Monitoring Suite

| Field | Value |
|-------|-------|
| **Addon ID** | `system-monitor.addons.openkuboard.github.io` |
| **Version** | `1.0.0` |
| **Description** | Cluster-level resource monitoring for Kubernetes based on Prometheus / Grafana / Alertmanager. Ships with 23 prebuilt Grafana dashboards covering nodes, pods, workloads, namespaces, and the cluster. |
| **Install** | Download in the **Addon Center** → configure StorageClass / replicas etc. → apply install scripts → initialize |
| **Components** | prometheus-operator v0.78.2, prometheus v2.55.1, grafana 11.4.0, alertmanager, node-exporter, kube-state-metrics |
| **Compatibility** | Kubernetes 1.35; node-role labels, OS selectors and other compatibility tweaks applied |
| **Source** | [system-monitor.addons.openkuboard.github.io](https://github.com/openkuboard/addon/tree/main/system-monitor.addons.openkuboard.github.io/1.0.0) |
| **Addon JSON** | [addon.json](https://raw.githubusercontent.com/openkuboard/addon/main/system-monitor.addons.openkuboard.github.io/1.0.0/addon.json) |
| **Docs** | [README](https://github.com/openkuboard/addon/blob/main/system-monitor.addons.openkuboard.github.io/1.0.0/README.md) |

**Extension-point buttons:**

| Context | Buttons | Action |
|---------|---------|--------|
| Node | Node resources / Kubelet / API Server / Resource usage | Open Grafana dashboard |
| Pod | Pod resources / Pod networking | Open Grafana dashboard |
| Workload | Workload resources / Workload networking | Open Grafana dashboard |
| Namespace | Resources/Networking (Pods / Deployments / StatefulSets / DaemonSets) | Open Grafana dashboard |
| Cluster | APIServer / Resources / Networking / Kubelet / Resource usage | Open Grafana dashboard |

---

### PV Browser

| Field | Value |
|-------|-------|
| **Addon ID** | `pv-browser.addons.openkuboard.github.io` |
| **Version** | `v3.0.1` |
| **Description** | Browse and manage files inside Kubernetes persistent volumes directly from the browser (upload, download, delete). |
| **Install** | Download in the Addon Center → apply |
| **Usage** | Open any namespace → workload detail → click the "Files" icon on the pod row |
| **Source** | [pv-browser.addons.openkuboard.github.io](https://github.com/openkuboard/addon/tree/main/pv-browser.addons.openkuboard.github.io/v3.0.1) |
| **Addon JSON** | [addon.json](https://raw.githubusercontent.com/openkuboard/addon/main/pv-browser.addons.openkuboard.github.io/v3.0.1/addon.json) |
| **Docs** | [README](https://github.com/openkuboard/addon/blob/main/pv-browser.addons.openkuboard.github.io/v3.0.1/README.md) |

---

## Addon Index

`index/repository.json` in this repository is the registry the platform uses to discover available addons:

- [repository.json](https://raw.githubusercontent.com/openkuboard/addon/main/index/repository.json)

Any new addon must be registered here.

---

## Getting Started — Developers

If you want to build a new addon for OpenKuboard, see:

- [Development Guide](./docs/development)
- [Addon Spec](./docs/addon-spec)