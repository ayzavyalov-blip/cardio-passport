import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Замените 'cardio-passport' на имя вашего репозитория на GitHub
// Например, если репо: github.com/you/cardio-passport → base: '/cardio-passport/'
export default defineConfig({
  plugins: [react()],
  base: '/cardio-passport/',
})
