import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    // Use relative asset paths so the built app also opens correctly from file://
    // and from static hosting roots like Cloudflare Pages.
    base: './',
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:5001',
                changeOrigin: true,
            }
        }
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        // Target modern browsers to reduce polyfills and output size.
        target: 'es2020',
        // Use terser for slightly better minification at cost of speed.
        minify: 'terser',
        terserOptions: {
            compress: {
                passes: 2,
            },
            format: {
                comments: false,
            },
        },
        // Keep chunk warnings sensible
        chunkSizeWarningLimit: 600,
        // Prevent inlining very large assets into JS bundles which can bloat them
        assetsInlineLimit: 4096,
        rollupOptions: {
            output: {
                // More granular manual chunking: split node_modules per-package
                manualChunks: function (id) {
                    if (!id)
                        return undefined;
                    if (id.includes('node_modules')) {
                        var parts = id.split('node_modules/')[1].split('/');
                        var pkg = parts[0].startsWith('@') ? "".concat(parts[0], "/").concat(parts[1]) : parts[0];
                        // group react and react-dom together
                        if (pkg === 'react' || pkg === 'react-dom' || pkg.startsWith('react'))
                            return 'vendor-react';
                        // common large libs that can be separated
                        if (/purify|lodash|chart.js|moment|date-fns|rxjs/.test(pkg))
                            return "vendor-".concat(pkg.replace(/[^a-z0-9]/gi, '-'));
                        // default: put each package in its own chunk to avoid one massive bundle
                        return "vendor-".concat(pkg.replace(/[^a-z0-9]/gi, '-'));
                    }
                    // Group large app-level shared code
                    if (id.includes('/src/components/') || id.includes('/src/pages/') || id.includes('/src/features/')) {
                        return 'commons';
                    }
                    return undefined;
                }
            }
        }
    }
});
