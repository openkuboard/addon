/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// 合并后的单应用：base 用相对路径 './'，便于挂载在任意 basePath（如
// /addons/velero.addons.openkuboard.github.io@2.0.0/frontend/dist/）下；config / usage
// 两页以 URL 锚（hash）区分，main.ts 按 hash 动态 import 对应根组件（code-split）。
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
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue'],
          'element-plus': ['element-plus'],
        },
      },
    },
    chunkSizeWarningLimit: 1100,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
})