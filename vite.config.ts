import path from "path"
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type UserConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }): UserConfig => {
  const isProd = mode === 'production';

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },

    // Production build optimizations
    build: {
      // Generate source maps for error tracking (Sentry, etc.)
      sourcemap: isProd ? 'hidden' : true,
      // Minify with esbuild (fast) in dev, terser (smaller) in prod
      minify: isProd ? 'terser' : 'esbuild',
      // Split vendor chunks for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-tooltip'],
            'vendor-charts': ['recharts'],
          },
        },
      },
      // Warn on large chunks (> 500KB)
      chunkSizeWarningLimit: 500,
      // Target modern browsers
      target: 'es2020',
    },

    // Dev server config
    server: {
      port: 5173,
      strictPort: false,
      open: false,
    },

    // Preview (production build preview)
    preview: {
      port: 4173,
    },

    // Env file configuration
    envPrefix: 'VITE_',
  };
});
