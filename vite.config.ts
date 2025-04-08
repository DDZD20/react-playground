import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,  // 构建完成后自动打开浏览器
      gzipSize: true,  // 显示gzip压缩后的大小
      brotliSize: true,  // 显示brotli压缩后的大小
      filename: 'dist/stats.html'  // 分析图表输出的文件名
    })
  ],
})
