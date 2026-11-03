import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      // Dos páginas: el centro de control (index) y el complejo hospitalario 3D.
      input: { main: 'index.html', complejo: 'complejo.html' },
    },
  },
})
