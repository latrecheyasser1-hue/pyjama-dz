import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { pathToFileURL } from 'url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      {
        name: 'local-api-handler',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            if (parsedUrl.pathname === '/api/try-on') {
              try {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                  try {
                    req.body = body ? JSON.parse(body) : {};
                  } catch (e) {
                    req.body = {};
                  }

                  if (!res.status) {
                    res.status = (code) => {
                      res.statusCode = code;
                      return res;
                    };
                  }
                  if (!res.json) {
                    res.json = (data) => {
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify(data));
                      return res;
                    };
                  }
                  if (!res.send) {
                    res.send = (data) => {
                      res.end(data);
                      return res;
                    };
                  }

                  const filePath = pathToFileURL(path.resolve(process.cwd(), 'api/try-on.js')).href;
                  const { default: handler } = await import(`${filePath}?t=${Date.now()}`);
                  await handler(req, res);
                });
                return;
              } catch (err) {
                console.error('Local API Error:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
                return;
              }
            }
            next();
          });
        }
      },
      VitePWA({
        registerType: 'autoUpdate',
        selfDestroying: true,
        devOptions: {
          enabled: true
        },
      manifest: {
        name: 'PyjamaDZ Store',
        short_name: 'PyjamaDZ',
        description: 'متجر بيجامات الجزائر - ملابس نوم فاخرة',
        theme_color: '#8B1818',
        background_color: '#8B1818',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide-icons';
          }
          if (id.includes('node_modules/xlsx') || id.includes('node_modules/canvas-confetti')) {
            return 'vendor-admin-utils';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-core';
          }
        }
      }
    }
  }
};
});
