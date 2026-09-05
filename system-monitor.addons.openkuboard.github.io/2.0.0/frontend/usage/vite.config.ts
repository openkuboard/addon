/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// 独立小应用：base 用相对路径 './'，便于挂载在任意 basePath（如
// /addons/system-monitor...@2.0.0/frontend/usage/dist/）下。
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
    environment: 'node', // 本页仅纯函数单测，node 环境足够
    include: ['tests/**/*.spec.ts'],
  },
})
