# OpenKuboard 套件仓库

[English](./README.md) · [简体中文](./README.zh-CN.md)

本仓库托管 [OpenKuboard](https://github.com/openkuboard) 平台的**套件（addon）**定义。

套件可部署 Kubernetes 资源、在前端添加上下文感知按钮（监控、文件浏览等），使平台具备无限扩展能力。本仓库**既是**套件数据源（经 `raw.githubusercontent.com` 提供下载）**也是**文档站（GitHub Pages）。

> 🌐 **文档站：** [https://openkuboard.github.io/addon/](https://openkuboard.github.io/addon/)  
> 📦 **套件数据（raw）：** https://raw.githubusercontent.com/openkuboard/addon/main/

---

## 文档

| 页面 | 说明 |
|------|------|
| [📋 套件总览](https://openkuboard.github.io/addon/) | 已有套件详情与链接 |
| [📘 开发指南](https://openkuboard.github.io/addon/docs/development/) | 如何创建并发布新套件 |
| [📐 规范说明](https://openkuboard.github.io/addon/docs/addon-spec/) | `addon.json` 字段、扩展点、仓库索引 |

> English docs: [README.md](./README.md) · 英文文档镜像见 [/en/](https://openkuboard.github.io/addon/en/)

---

## 仓库结构

```
addon/
├── index/
│   └── repository.json          # 套件注册表索引（平台发现套件用）
├── <addon-id>.addons.openkuboard.github.io/
│   └── <version>/
│       ├── addon.json           # 套件清单（必需）
│       ├── README.md            # 套件说明文档
│       ├── initialize.js        # 前端初始化脚本（可选）
│       ├── extensions.json      # 上下文菜单扩展点定义（可选）
│       ├── alert-config.json    # 告警默认配置（可选）
│       ├── alert-config-schema.json  # 告警配置 UI schema（可选）
│       └── k8s/                 # Kubernetes 清单（可选）
│           ├── *.yaml
│           └── resources/       # 按组件组织的子资源
├── docs/                        # Jekyll 文档站 —— 中文（GitHub Pages 源）
├── en/                          # Jekyll 文档站 —— 英文镜像
├── _config.yml                  # Jekyll 配置（构建时排除套件数据目录）
└── README.md                    # 本文件
```

---

## 可用套件

| 套件 ID | 名称 | 说明 |
|----------|------|------|
| `system-monitor.addons.openkuboard.github.io` | K8S 资源监控套件 | 基于 Prometheus / Grafana / Alertmanager 的集群监控 |
| `pv-browser.addons.openkuboard.github.io` | 存储卷浏览器 | 通过浏览器管理 Kubernetes 持久化存储卷文件 |

各套件详情见 `index/repository.json`。

---

## 新增套件

1. 创建目录 `<your-addon-id>.addons.openkuboard.github.io/<version>/`
2. 编写 `addon.json` 清单（参考已有套件）
3. 在 `k8s/` 放入 K8s 清单，脚本放在版本目录根
4. 在 `index/repository.json` 登记

完整流程见 [开发指南](https://openkuboard.github.io/addon/docs/development/)。

---

## Addon JSON 示例（`addon.json`）

最小结构：

```json
{
  "id": "your-id.addons.openkuboard.github.io",
  "name": "展示名称",
  "version": "1.0.0",
  "lastUpdate": "2026-06-27",
  "maintainer": "devops",
  "isGlobal": true,
  "scripts": ["initialize.js"],
  "k8s": ["k8s/your-resource.yaml"],
  "resources": ["README.md", "extensions.json"],
  "info": {
    "description": "一句话描述套件功能。",
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

## 许可证

各套件许可证见其各自目录。