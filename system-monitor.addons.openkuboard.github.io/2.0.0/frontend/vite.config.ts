/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// 合并后的单应用：base 用相对路径 './'，便于挂载在任意 basePath（如
// /addons/system-monitor...@2.0.0/frontend/dist/）下；config / usage 两页以 URL 锚（hash）区分，
// main.ts 按 hash 动态 import 对应根组件，vite 据此天然做 code-split（只加载当前页 chunk）。
export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true, // 每次构建清空 dist，保证产物与源码一致
    rollupOptions: {
      output: {
        // Element Plus / Vue 体量大，拆成独立 vendor chunk 便于浏览器长期缓存
        manualChunks: {
          vue: ['vue'],
          'element-plus': ['element-plus'],
        },
      },
    },
    // Element Plus 全量打包后单 chunk 偏大（gzip ~300KB），阈值放宽避免误报
    chunkSizeWarningLimit: 1100,
  },
  test: {
    environment: 'node', // 默认 node；组件测试内用 @vitest-environment happy-dom 覆盖
    include: ['tests/**/*.spec.ts'],
  },
})
