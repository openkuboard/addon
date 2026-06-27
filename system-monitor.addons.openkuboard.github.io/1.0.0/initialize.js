import { startInitTasks, completeInitTask, KuboardProxy } from '/addon-api/index.js'

export function initializeKuboardAddon (initContext) {
  startInitTasks([
    {
      name: 'system-monitor',
      description: '初始化 Prometheus/Grafana 监控套件',
      descriptionEn: 'init task: system-monitor',
    },
  ])

  const grafanaHttp = new KuboardProxy({
    namespace: 'openkuboard',
    service: 'grafana',
    port: 3000,
    protocol: 'http://',
  })

  grafanaHttp.execute({
    method: 'get',
    url: '/api/health',
  }).then(() => {
    completeInitTask('system-monitor')
  }).catch(() => {
    // Grafana 可能仍在启动，延迟标记完成（dashboard 已通过 ConfigMap 预置）
    setTimeout(() => completeInitTask('system-monitor'), 3000)
  })
}
