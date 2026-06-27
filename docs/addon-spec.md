# Addon 套件规范

本文档描述 OpenKuboard 套件（addon）仓库的目录布局与 `addon.json` 字段约定。

## 1. 目录布局

每个套件对应一个目录，命名格式为：

```
<addon-id>.addons.openkuboard.github.io/<version>/
```

- `addon-id`：套件唯一标识，建议使用反向域名风格，固定以 `.addons.openkuboard.github.io` 结尾。
- `version`：语义化版本目录（如 `1.0.0`、`v3.0.1`）。

一个套件目录下可包含：

| 文件 / 目录 | 必需 | 说明 |
|-------------|------|------|
| `addon.json` | 是 | 套件清单（manifest） |
| `README.md` | 否 | 套件说明文档 |
| `initialize.js` | 否 | 前端初始化脚本 |
| `extensions.json` | 否 | 上下文菜单扩展点定义 |
| `alert-config.json` | 否 | 告警默认配置 |
| `alert-config-schema.json` | 否 | 告警配置 UI schema |
| `k8s/` | 否 | Kubernetes 资源清单 |

## 2. `addon.json` 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 套件 ID，与目录名前缀一致 |
| `name` | string | 展示名称 |
| `version` | string | 版本号，与版本目录名一致 |
| `lastUpdate` | string | 最后更新日期 `YYYY-MM-DD` |
| `maintainer` | string | 维护者 |
| `isGlobal` | bool | 是否为集群级套件 |
| `scripts` | string[] | 前端脚本相对路径 |
| `k8s` | string[] | K8s 清单相对路径 |
| `resources` | string[] | 附加资源文件（README/extensions/alert-config 等） |
| `info.description` | string | 描述 |
| `info.document` | string | 文档链接 |
| `info.important` | string | 重要提示（安装前展示） |
| `parameters` | object | 参数默认值 |
| `parameterDefs` | array | 参数定义（name/required/default/description） |
| `parameterExtraSteps` | string | 参数页额外 HTML 提示 |
| `extensions` | array | 上下文扩展点按钮 |
| `rbac` | array | 套件所需 RBAC 规则 |
| `installPackages` | array | 分组安装包 |
| `quickLinks` | array | 快捷入口 |
| `capabilities` | object | 告警 / Prometheus 规则 / 监控扩展能力声明 |

## 3. 扩展点（extension points）

扩展点决定按钮出现在哪个上下文菜单。当前约定的扩展点 ID 均以 `extension-point.openkuboard.github.io` 结尾：

| 扩展点 | 上下文 |
|--------|--------|
| `pod-context.extension-point.openkuboard.github.io` | 容器组 |
| `node-context.extension-point.openkuboard.github.io` | 节点 |
| `workload-context.extension-point.openkuboard.github.io` | 工作负载 |
| `namespace-context.extension-point.openkuboard.github.io` | 命名空间 |
| `cluster-context.extension-point.openkuboard.github.io` | 集群 |

## 4. 仓库索引

`index/repository.json` 是套件注册表，平台通过它发现可用套件。每条记录包含：

- `id`：套件 ID
- `name`：展示名称
- `version`：版本
- `url`：指向本仓库内 `addon.json` 的 raw 文件 URL
- `info.document`：文档链接

新增套件时必须在此文件登记。
