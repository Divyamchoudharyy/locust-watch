import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // base path for GitHub Pages — change 'locust-predictor' to your repo name
  base: './',
})
