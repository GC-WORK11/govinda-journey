import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020', chunkSizeWarningLimit: 1500,
    rollupOptions: { output: { manualChunks: {
      // Only three is pinned to its own stream — it downloads in parallel with
      // everything else. Do NOT bucket fiber+drei here: forcing them into one
      // chunk drags level-only drei (troika text, Html, Sparkles) onto the
      // cold path. Natural splitting puts eager drei with World5's graph and
      // leaves level-only code in lazy level chunks.
      three: ['three'],
    } } } },
})
