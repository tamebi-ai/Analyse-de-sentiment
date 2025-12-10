
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Cela permet d'éviter les erreurs "process is not defined" dans le navigateur
    'process.env': {}
  }
})
