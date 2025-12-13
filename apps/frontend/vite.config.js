import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url' // [新增] 引入 node:url

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // [新增] resolve 配置
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})