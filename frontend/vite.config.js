import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import mkcert from 'vite-plugin-mkcert';

// Only use mkcert in development (not in production)
const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        dev: isDev,
      },
    }),
    // Only enable mkcert for HTTPS in development
    ...(isDev ? [
      mkcert({
        hosts: ['localhost', '127.0.0.1', '0.0.0.0', '192.168.1.112'], // Include localhost and your IP address
        force: true, // Force regeneration of certificate
        autoUpgrade: true, // Automatically upgrade mkcert if needed
      })
    ] : []),
  ],
  server: isDev ? {
    https: true, // Enable HTTPS in development (for camera access)
    host: '0.0.0.0', // Listen on all network interfaces (allows mobile access)
    // Mobile: use the "Network" URL (e.g. https://192.168.1.112:5173). Accept cert: Advanced → Proceed.
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  } : undefined, // Production uses Nginx or hosting platform's server
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.svelte'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Disable sourcemaps in production for smaller builds
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  publicDir: 'public',
  optimizeDeps: {
    include: ['cropperjs'],
    exclude: [],
  },
  ssr: {
    noExternal: ['cropperjs'],
  },
});
