import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // Prevent splitting CSS into separate files so CSS can be inlined
    cssCodeSplit: false,
    // Inline small assets (fonts/images) up to 100 KB — increase if you need larger inlined assets
    assetsInlineLimit: 100 * 1024,
    rollupOptions: {
      output: {
        // Force everything into a single chunk named "everything" — helps produce a single bundle
        manualChunks: () => 'everything'
      }
    }
  }
})