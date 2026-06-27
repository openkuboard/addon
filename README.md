# OpenKuboard Addon Repository

[English](./README.md) · [简体中文](./README.zh-CN.md)

This repository hosts **addon** definitions for the [OpenKuboard](https://github.com/openkuboard) platform.

Addons extend OpenKuboard's UI with context-sensitive buttons (monitoring, file browsing, etc.) and optionally deploy Kubernetes resources into the cluster. This repository is **both** an addon data source (served via `raw.githubusercontent.com`) and a documentation site (GitHub Pages).

> 🌐 **Documentation site:** [https://openkuboard.github.io/addon/](https://openkuboard.github.io/addon/)  
> 📦 **Addon data (raw):** https://raw.githubusercontent.com/openkuboard/addon/main/

---

## Documentation

| Page | Description |
|------|-------------|
| [📋 Addon Overview](https://openkuboard.github.io/addon/) | Available addons with details and links |
| [📘 Development Guide](https://openkuboard.github.io/addon/docs/development/) | How to create and publish a new addon |
| [📐 Addon Spec](https://openkuboard.github.io/addon/docs/addon-spec/) | `addon.json` fields, extension points, repository index |

> 中文文档：[README.zh-CN.md](./README.zh-CN.md) · 文档站中文版为默认（[首页](https://openkuboard.github.io/addon/)），英文镜像见 [/en/](https://openkuboard.github.io/addon/en/)

---

## Repository Structure

```
addon/
├── index/
│   └── repository.json          # Addon registry index (discoverable by OpenKuboard)
├── <addon-id>.addons.openkuboard.github.io/
│   └── <version>/
│       ├── addon.json           # Addon manifest (required)
│       ├── README.md            # Human-readable documentation
│       ├── initialize.js        # Frontend initialization script (optional)
│       ├── extensions.json      # Context menu extension definitions (optional)
│       ├── alert-config.json    # Default alert configuration (optional)
│       ├── alert-config-schema.json  # Alert config UI schema (optional)
│       └── k8s/                 # Kubernetes manifests (optional)
│           ├── *.yaml
│           └── resources/       # Sub-resources organized by component
├── docs/                        # Jekyll documentation site — Chinese (GitHub Pages source)
├── en/                          # Jekyll documentation site — English mirror
├── _config.yml                  # Jekyll config (excludes addon data dirs from build)
└── README.md                    # This file
```

---

## Available Addons

| Addon ID | Name | Description |
|----------|------|-------------|
| `system-monitor.addons.openkuboard.github.io` | K8S Resource Monitoring Suite | Cluster monitoring with Prometheus / Grafana / Alertmanager |
| `pv-browser.addons.openkuboard.github.io` | PV Browser | Web-based persistent volume file browser for Kubernetes |

For details on each addon, see `index/repository.json`.

---

## Adding a New Addon

1. Create a directory named `<your-addon-id>.addons.openkuboard.github.io/<version>/`
2. Add an `addon.json` manifest (see existing addons as reference)
3. Include any K8s manifests under `k8s/` and scripts at the root of your version directory
4. Register it in `index/repository.json`

See the [Development Guide](https://openkuboard.github.io/addon/docs/development/) for the full walkthrough.

---

## Addon JSON Schema (`addon.json`)

Minimal structure:

```json
{
  "id": "your-id.addons.openkuboard.github.io",
  "name": "Display Name",
  "version": "1.0.0",
  "lastUpdate": "2026-06-27",
  "maintainer": "devops",
  "isGlobal": true,
  "scripts": ["initialize.js"],
  "k8s": ["k8s/your-resource.yaml"],
  "resources": ["README.md", "extensions.json"],
  "info": {
    "description": "Short description.",
    "document": "https://..."
  },
  "parameters": {},
  "parameterDefs": [],
  "extensions": [],
  "quickLinks": [],
  "rbac": [],
  "installPackages": []
}
```

---

## License

See individual addon directories for their respective licenses.