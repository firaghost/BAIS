import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    // Load env file based on `mode`
    const env = loadEnv(mode, process.cwd(), '');

    return {
        appType: 'spa',
        plugins: [react(), tailwindcss()],
        server: {
            port: 5173,
            strictPort: true,
            // In development, you might still want a proxy. In production (Vercel), you MUST use absolute URLs via VITE_API_URL.
            proxy: mode === 'development' ? {
                '/api': {
                    target: env.VITE_API_URL || 'http://127.0.0.1:8000',
                    changeOrigin: true,
                },
            } : {},
        },
        build: {
            // Output directory for Vercel
            outDir: 'dist',
            emptyOutDir: true,
            rollupOptions: {
                output: {
                    manualChunks: {
                        vendor: ['react', 'react-dom', 'react-router-dom'],
                        ui: ['lucide-react', 'leaflet', 'react-leaflet']
                    }
                }
            }
        }
    };
});
