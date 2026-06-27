# OpenKuboard Addon Repository

This repository hosts **addon (套件)** definitions for the [OpenKuboard](https://github.com/openkuboard) platform.

Addons extend OpenKuboard's UI with context-sensitive buttons (monitoring, file browsing, etc.) and optionally deploy Kubernetes resources into the cluster.

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
├── docs/                        # Documentation (forthcoming)
└── README.md                    # This file
```

---

## Available Addons

| Addon ID | Name | Description |
|----------|------|-------------|
| `system-monitor.addons.openkuboard.github.io` | K8S 资源监控套件 | Cluster monitoring with Prometheus / Grafana / Alertmanager |
| `pv-browser.addons.openkuboard.github.io` | 存储卷浏览器 | Web-based PV file browser for Kubernetes |

For details on each addon, see `index/repository.json`.

---

## Adding a New Addon

1. Create a directory named `<your-addon-id>.addons.openkuboard.github.io/<version>/`
2. Add an `addon.json` manifest (see existing addons as reference)
3. Include any K8s manifests under `k8s/` and scripts under the root of your version directory
4. Register it in `index/repository.json`

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