---
layout: default
title: Addon Development Guide
lang: en
---

<p align="right">
  English · <a href="/addon/docs/development/">简体中文</a>
</p>

# Addon Development Guide

This guide explains how to develop and publish an addon for OpenKuboard.

## 1. Directory Convention

Each addon corresponds to a directory in the repository, named:

```
<addon-id>.addons.openkuboard.github.io/<version>/
```

- **addon-id**: the addon's unique identifier, reverse-DNS style recommended, and **must** end with `.addons.openkuboard.github.io`.
- **version**: a semantic-version directory (e.g. `1.0.0`, `v3.0.1`) that matches the `version` field in `addon.json`.

A version directory may contain:

| File / Dir | Required | Description |
|------------|----------|-------------|
| `addon.json` | Yes | Addon manifest (entry point) |
| `README.md` | No | Addon documentation |
| `initialize.js` | No | Frontend initialization script |
| `extensions.json` | No | Context-menu extension definitions |
| `alert-config.json` | No | Default alert configuration |
| `alert-config-schema.json` | No | Alert config UI schema |
| `k8s/` | No | Kubernetes manifests (organized by component) |

## 2. Minimal `addon.json` Example

```json
{
  "id": "your-id.addons.openkuboard.github.io",
  "name": "Display Name",
  "version": "1.0.0",
  "lastUpdate": "2026-06-27",
  "maintainer": "your-name",
  "isGlobal": true,
  "scripts": ["initialize.js"],
  "k8s": ["k8s/your-resource.yaml"],
  "resources": ["README.md", "extensions.json"],
  "info": {
    "description": "One-line description of what the addon does.",
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

See the [Addon Spec](./addon-spec) for the meaning of each field.

## 3. Extension Points

Extension points determine which context menu a button appears in. Conventional extension-point IDs all end with `extension-point.openkuboard.github.io`:

| Extension point | Context |
|-----------------|---------|
| `pod-context.extension-point.openkuboard.github.io` | Pod |
| `node-context.extension-point.openkuboard.github.io` | Node |
| `workload-context.extension-point.openkuboard.github.io` | Workload |
| `namespace-context.extension-point.openkuboard.github.io` | Namespace |
| `cluster-context.extension-point.openkuboard.github.io` | Cluster |

Each extension contains:

- `id`: unique extension identifier
- `extensionPoint`: target extension-point ID
- `buttonText` / `buttonTextEn`: button labels
- `buttonType` / `buttonIcon`: button style and icon
- `handler`: JS executed on click (may use APIs like `KuboardProxy`, `openUrlInBlank`)
- `isEnabledFor`: decides whether the button is shown for a given context

See the `system-monitor` addon's `addon.json` and `extensions.json` for full usage.

## 4. Adding a New Addon

1. Create a directory `<your-id>.addons.openkuboard.github.io/<version>/` at the repo root
2. Write the `addon.json` manifest (use existing addons as reference)
3. Add K8s manifests (`k8s/`), scripts, extensions, etc.
4. Register the addon in `index/repository.json`:
   ```json
   {
     "id": "your-id.addons.openkuboard.github.io",
     "name": "Addon Name",
     "version": "1.0.0",
     "lastUpdate": "2026-06-27",
     "maintainer": "your-name",
     "isGlobal": true,
     "url": "https://raw.githubusercontent.com/openkuboard/addon/main/your-id.addons.openkuboard.github.io/1.0.0/addon.json",
     "info": {
       "description": "Description",
       "document": "https://github.com/openkuboard/addon/blob/main/your-id.addons.openkuboard.github.io/1.0.0/README.md"
     }
   }
   ```
5. Commit and push to the `main` branch
6. Refresh the Addon Center in the platform to see the new addon

## 5. Previewing the Docs Site Locally

This repository is also a GitHub Pages site. To preview locally:

```bash
# After installing Ruby and bundler
bundle init 2>/dev/null
echo 'gem "github-pages", group: :jekyll_plugins' >> Gemfile
bundle install
bundle exec jekyll serve
# Open http://127.0.0.1:4000/addon/
```

> Note: the addon data directories (`*.addons.openkuboard.github.io`, `index/`) are excluded in `_config.yml` so Jekyll does not render them. Do **not** remove {% raw %}`{{ ... }}`{% endraw %} Prometheus rule expressions from addon data files — they are required for the addon to work.

## 6. Publishing Notes

- **The version directory and the `version` field must match**
- **The `id` field must match the directory name prefix** (everything before the version directory)
- **The raw URL path must be exact**: `https://raw.githubusercontent.com/openkuboard/addon/main/<id>/<version>/addon.json`
- Liquid syntax like {% raw %}`{{ }}`, `{% %}`{% endraw %} in addon data files does not affect the platform (it reads raw files directly) but breaks Jekyll — therefore always keep the `_config.yml` `exclude` settings intact.