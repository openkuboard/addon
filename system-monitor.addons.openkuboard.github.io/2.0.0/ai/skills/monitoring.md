---
name: k8s-资源监控
description: 查询「K8S 资源监控套件」的监控数据：指标（PromQL）、活跃告警、告警规则评估与采集目标健康
version: 1
triggers:
  - 监控
  - 告警
  - 报警
  - prometheus
  - Prometheus
  - grafana
  - Grafana
  - CPU
  - 内存
  - 延迟
  - QPS
  - metrics
---

# K8S 资源监控套件（system-monitor）数据查询

本技能只在集群已安装并激活「K8S 资源监控套件」时进入会话。开始前可先
`list_addons` 确认 `system-monitor.addons.openkuboard.github.io` 已就绪，
及其 `service_uis`（prometheus / alertmanager / grafana）。

## 工具选择

| 要查什么 | 工具 |
|---|---|
| 指标数值（时序/瞬时） | `prom_query`（封装好的 PromQL 查询，结构化输出） |
| 活跃告警、规则评估、采集目标 | `addon_query`（service_ui=prometheus / alertmanager） |
| 告警规则定义（CR） | `list_resources` / `get_resource`（monitoring.coreos.com PrometheusRule） |

## prom_query（指标）

参数：`promql`（必填）、`range`（可选回看窗口 `30m`/`1h`/`4h`/`1d`，缺省为瞬时查询）、`cluster`。

典型查询（cluster 级口径，按需加 namespace/pod 标签过滤）：

```promql
# 节点 CPU 使用率(%)
100 - avg by (node) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100

# 节点内存使用率(%)
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# Pod CPU 使用 top10（5m 窗口速率）
topk(10, sum by (namespace, pod) (rate(container_cpu_usage_seconds_total{container!=""}[5m])))

# Pod 内存 working set top10
topk(10, sum by (namespace, pod) (container_memory_working_set_bytes{container!=""}))

# 控制面/节点组件存活
up{job=~"kube-apiserver|kube-scheduler|kube-controller-manager|kubelet"}
```

## addon_query（告警与采集状态）

```jsonc
// 活跃告警（Alertmanager API v2）
{"addon":"system-monitor.addons.openkuboard.github.io","service_ui":"alertmanager","path":"/api/v2/alerts"}

// 只看激活中的告警
{"addon":"system-monitor.addons.openkuboard.github.io","service_ui":"alertmanager","path":"/api/v2/alerts","query":{"active":"true","silenced":"false"}}

// 告警规则评估状态（firing/pending，含规则表达式）
{"addon":"system-monitor.addons.openkuboard.github.io","service_ui":"prometheus","path":"/api/v1/rules","query":{"type":"alert"}}

// 采集目标健康（哪些 target 处于 down）
{"addon":"system-monitor.addons.openkuboard.github.io","service_ui":"prometheus","path":"/api/v1/targets"}

// 任意 PromQL（原始形态，与 prom_query 等价）
{"addon":"system-monitor.addons.openkuboard.github.io","service_ui":"prometheus","path":"/api/v1/query","query":{"query":"up"}}

// 区间查询（start/end 为 unix 秒）
{"addon":"system-monitor.addons.openkuboard.github.io","service_ui":"prometheus","path":"/api/v1/query_range","query":{"query":"up","start":"1770000000","end":"1770003600","step":"60s"}}
```

## 告警规则定义（PrometheusRule CR）

```jsonc
// 列举某命名空间的告警规则 CR
list_resources {"apiVersion":"monitoring.coreos.com/v1","kind":"PrometheusRule","namespace":"openkuboard"}

// 读取单条规则定义
get_resource {"apiVersion":"monitoring.coreos.com/v1","kind":"PrometheusRule","namespace":"openkuboard","name":"<规则名>"}
```

## 排查姿势

1. 用户报「有告警/系统异常」：先 `/api/v2/alerts` 看活跃告警（labels 带出
   alertname/severity/namespace）；
2. 按 alertname 用 `/api/v1/rules` 找到规则表达式与评估状态；
3. 用 `prom_query` 执行该表达式验证现状，结合 `range` 看趋势后再下结论；
4. 怀疑监控自身问题：`/api/v1/targets` 看 target 是否 down、`up{job=...}` 看组件存活。

## 注意

- 套件是集群级安装：同一套件在别的集群可能未安装，一切以 `list_addons` 为准。
- 响应可能很大：`addon_query` 结果带截断标记（truncated=true）时，用 query
  参数缩小范围（标签过滤、更窄时间窗）再查。
- Prometheus API 时间为 unix 秒；相对回看优先用 `prom_query` 的 `range` 参数。
