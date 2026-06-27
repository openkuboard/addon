---
layout: default
title: Addon Spec
lang: en
---

<p align="right">
  English · <a href="/addon/docs/addon-spec/">简体中文</a>
</p>

# Addon Spec

This document describes the directory layout and `addon.json` field conventions of the OpenKuboard addon repository.

## 1. Directory Layout

Each addon corresponds to one directory, named:

```
<addon-id>.addons.openkuboard.github.io/<version>/
```

- `addon-id`: the addon's unique identifier, reverse-DNS style recommended, fixed to end with `.addons.openkuboard.github.io`.
- `version`: a semantic-version directory (e.g. `1.0.0`, `v3.0.1`).

A version directory may contain:

| File / Dir | Required | Description |
|------------|----------|-------------|
| `addon.json` | Yes | Addon manifest |
| `README.md` | No | Addon documentation |
| `initialize.js` | No | Frontend initialization script |
| `extensions.json` | No | Context-menu extension definitions |
| `alert-config.json` | No | Default alert configuration |
| `alert-config-schema.json` | No | Alert config UI schema |
| `k8s/` | No | Kubernetes manifests |

## 2. `addon.json` Fields

| Field | Type | Description |
|-------|-------|-------------|
| `id` | string | Addon ID, matches the directory-name prefix |
| `name` | string | Display name |
| `version` | string | Version, matches the version directory |
| `lastUpdate` | string | Last update date `YYYY-MM-DD` |
| `maintainer` | string | Maintainer |
| `isGlobal` | bool | Whether this is a cluster-level addon |
| `scripts` | string[] | Frontend script relative paths |
| `k8s` | string[] | K8s manifest relative paths |
| `resources` | string[] | Extra resource files (README/extensions/alert-config, etc.) |
| `info.description` | string | Description |
| `info.document` | string | Documentation link |
| `info.important` | string | Important notice (shown before install) |
| `parameters` | object | Parameter defaults |
| `parameterDefs` | array | Parameter definitions (name/required/default/description) |
| `parameterExtraSteps` | string | Extra HTML hint on the parameter page |
| `extensions` | array | Context extension-point buttons |
| `rbac` | array | RBAC rules required by the addon |
| `installPackages` | array | Grouped install packages |
| `quickLinks` | array | Quick links |
| `capabilities` | object | Alert / Prometheus rules / monitoring-extension capability declarations |

## 3. Extension Points

Extension points determine which context menu a button appears in. Conventional extension-point IDs all end with `extension-point.openkuboard.github.io`:

| Extension point | Context |
|-----------------|---------|
| `pod-context.extension-point.openkuboard.github.io` | Pod |
| `node-context.extension-point.openkuboard.github.io` | Node |
| `workload-context.extension-point.openkuboard.github.io` | Workload |
| `namespace-context.extension-point.openkuboard.github.io` | Namespace |
| `cluster-context.extension-point.openkuboard.github.io` | Cluster |

## 4. Repository Index

`index/repository.json` is the addon registry; the platform uses it to discover available addons. Each record contains:

- `id`: addon ID
- `name`: display name
- `version`: version
- `url`: raw-file URL pointing to the addon's `addon.json` in this repo
- `info.document`: documentation link

Any new addon must be registered in this file.