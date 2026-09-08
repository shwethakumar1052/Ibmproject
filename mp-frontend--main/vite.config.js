import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend URL: use env var in Docker, fallback to localhost for dev
const BACKEND_URL    = process.env.VITE_API_URL    || 'http://localhost:5001'
const BACKEND_WS_URL = BACKEND_URL.replace(/^http/, 'ws')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,          // allow connections from Docker network
    allowedHosts: [
      "localhost",
      ".ngrok-free.app",
      ".ngrok-free.dev",
      ".ngrok.io",
    ],
    proxy: {
      // REST API proxy
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      // WebSocket proxy — required for live notifications
      '/ws': {
        target: BACKEND_WS_URL,
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    // Reduce chunk size warnings for jsPDF + framer-motion
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:    ['react', 'react-dom', 'react-router-dom'],
          motion:    ['framer-motion'],
          pdf:       ['jspdf', 'jspdf-autotable'],
          i18n:      ['i18next', 'react-i18next'],
        },
      },
    },
  },
})
