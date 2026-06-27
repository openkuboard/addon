---
layout: default
title: 套件开发指南
---

# 套件开发指南

本指南介绍如何为 OpenKuboard 开发并发布一个套件（addon）。

## 1. 目录约定

每个套件对应仓库内一个目录，命名格式：

```
<addon-id>.addons.openkuboard.github.io/<version>/
```

- **addon-id**：套件唯一标识，建议使用反向域名风格，**必须**以 `.addons.openkuboard.github.io` 结尾。
- **version**：语义化版本目录（如 `1.0.0`、`v3.0.1`），需与 `addon.json` 的 `version` 字段一致。

一个套件目录下可包含的文件：

| 文件 / 目录 | 必需 | 说明 |
|-------------|------|------|
| `addon.json` | 是 | 套件清单（manifest），套件的入口 |
| `README.md` | 否 | 套件说明文档 |
| `initialize.js` | 否 | 前端初始化脚本 |
| `extensions.json` | 否 | 上下文菜单扩展点定义 |
| `alert-config.json` | 否 | 告警默认配置 |
| `alert-config-schema.json` | 否 | 告警配置 UI schema |
| `k8s/` | 否 | Kubernetes 资源清单（按组件组织） |

## 2. `addon.json` 最小示例

```json
{
  "id": "your-id.addons.openkuboard.github.io",
  "name": "套件展示名称",
  "version": "1.0.0",
  "lastUpdate": "2026-06-27",
  "maintainer": "your-name",
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

各字段含义见 [Addon 规范说明](./addon-spec)。

## 3. 扩展点（Extension Points）

扩展点决定按钮出现在平台的哪个上下文菜单。约定的扩展点 ID 均以 `extension-point.openkuboard.github.io` 结尾：

| 扩展点 | 上下文 |
|--------|--------|
| `pod-context.extension-point.openkuboard.github.io` | 容器组 |
| `node-context.extension-point.openkuboard.github.io` | 节点 |
| `workload-context.extension-point.openkuboard.github.io` | 工作负载 |
| `namespace-context.extension-point.openkuboard.github.io` | 命名空间 |
| `cluster-context.extension-point.openkuboard.github.io` | 集群 |

每个扩展包含：

- `id`：扩展唯一标识
- `extensionPoint`：目标扩展点 ID
- `buttonText` / `buttonTextEn`：按钮文案
- `buttonType` / `buttonIcon`：按钮样式与图标
- `handler`：点击执行的 JS 代码（可使用 `KuboardProxy`、`openUrlInBlank` 等 API）
- `isEnabledFor`：根据上下文决定按钮是否可用

参考 `system-monitor` 套件的 `addon.json` 与 `extensions.json` 了解完整用法。

## 4. 新增套件流程

1. 在仓库根创建目录 `<your-id>.addons.openkuboard.github.io/<version>/`
2. 编写 `addon.json` 清单（参考已有套件）
3. 放入 K8s 清单（`k8s/`）、脚本、扩展等文件
4. 在 `index/repository.json` 登记新套件：
   ```json
   {
     "id": "your-id.addons.openkuboard.github.io",
     "name": "套件名称",
     "version": "1.0.0",
     "lastUpdate": "2026-06-27",
     "maintainer": "your-name",
     "isGlobal": true,
     "url": "https://raw.githubusercontent.com/openkuboard/addon/main/your-id.addons.openkuboard.github.io/1.0.0/addon.json",
     "info": {
       "description": "描述",
       "document": "https://github.com/openkuboard/addon/blob/main/your-id.addons.openkuboard.github.io/1.0.0/README.md"
     }
   }
   ```
5. 提交并推送到 `main` 分支
6. 平台在套件中心刷新即可看到新套件

## 5. 本地预览文档站

本仓库同时是 GitHub Pages 站点。本地预览：

```bash
# 安装 Ruby 与 bundler 后
bundle init 2>/dev/null
echo 'gem "github-pages", group: :jekyll_plugins' >> Gemfile
bundle install
bundle exec jekyll serve
# 访问 http://127.0.0.1:4000/addon/
```

> 注意：套件数据目录（`*.addons.openkuboard.github.io`、`index/`）已在 `_config.yml` 中通过 `exclude` 排除，Jekyll 不会渲染它们。请勿在套件数据文件中移除 `{{ ... }}` 等 Prometheus 规则表达式——它们是套件正常工作所需。

## 6. 发布注意事项

- **版本目录与 `version` 字段必须一致**
- **`id` 字段与目录名前缀必须一致**（去掉版本目录后的部分）
- **raw URL 路径必须准确**：`https://raw.githubusercontent.com/openkuboard/addon/main/<id>/<version>/addon.json`
- 套件数据文件中的 `{{ }}`、`{% %}` 等 Liquid 语法不会影响平台运行（平台直接读取 raw 文件），但会被 Jekyll 报错——因此务必保持 `_config.yml` 的 exclude 配置