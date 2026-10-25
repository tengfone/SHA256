import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Migrated from Create React App (craco). Output goes to `build/` so the
// existing Vercel output-directory setting keeps working.
export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'REACT_APP_'],
  build: {
    outDir: 'build',
  },
  server: {
    port: 3000,
  },
})
