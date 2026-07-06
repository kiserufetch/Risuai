import { defineConfig, type Plugin } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import wasm from "vite-plugin-wasm";
import strip from '@rollup/plugin-strip';
import tailwindcss from '@tailwindcss/vite'
import { spawn, type ChildProcess } from "node:child_process";

// Starts an ngrok tunnel to the dev server and prints the public URL
function ngrokTunnel(): Plugin {
  let ngrok: ChildProcess | null = null;
  return {
    name: "ngrok-tunnel",
    apply: "serve",
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        const port = server.config.server.port ?? 5174;
        ngrok = spawn("ngrok", ["http", String(port)], {
          stdio: "ignore",
          windowsHide: true,
        });
        ngrok.on("error", () => {
          server.config.logger.warn("  ➜  ngrok: failed to start. Is ngrok installed and in PATH?");
        });

        // ngrok doesn't print the URL in non-tty mode, so poll its local API
        const startedAt = Date.now();
        const poll = setInterval(async () => {
          try {
            const res = await fetch("http://127.0.0.1:4040/api/tunnels");
            const data: any = await res.json();
            const url = data?.tunnels?.[0]?.public_url;
            if (url) {
              clearInterval(poll);
              server.config.logger.info(`  ➜  ngrok:   ${url}`);
            }
          } catch {
            // ngrok API not up yet
          }
          if (Date.now() - startedAt > 20000) {
            clearInterval(poll);
            server.config.logger.warn("  ➜  ngrok: tunnel URL not detected within 20s (check `ngrok config add-authtoken`)");
          }
        }, 1000);

        const kill = () => {
          clearInterval(poll);
          ngrok?.kill();
        };
        server.httpServer?.once("close", kill);
        process.once("exit", kill);
      });
    },
  };
}
// https://vitejs.dev/config/
export default defineConfig(({command, mode}) => {
  return {
    plugins: [
      svelte({
        preprocess: vitePreprocess(),
        onwarn: (warning, handler) => {
          // disable a11y warnings
          if (warning.code.startsWith("a11y-")) return;
          handler(warning);
        },
      }),
      tailwindcss(),
      wasm(),
      command === 'build' ? strip({
        include: '**/*.(mjs|js|svelte|ts)'
      }) : null,
      ngrokTunnel()
    ],

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    // prevent vite from obscuring rust errors
    clearScreen: false,
    // tauri expects a fixed port, fail if that port is not available
    server: {
      host: '0.0.0.0', // listen on all addresses
      port: 5174,
      strictPort: true,
      allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.dev', '.ngrok.io'],
      // The RisuRealm hub API only whitelists known origins (localhost, *.risuai.xyz,
      // Tauri) for CORS, so browsing Realm breaks when the dev server is opened from
      // another origin (phone via ngrok/LAN IP). Proxy hub traffic through the dev
      // server itself so those requests stay same-origin (see hubURL).
      proxy: {
        '/hub-proxy': {
          target: 'https://sv.risuai.xyz',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/hub-proxy/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // The hub 403s on foreign Origin/Referer values (browsers attach
              // Origin to POSTs even same-origin), so drop them.
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
          },
        },
      },
      // hmr: false,
    },
    // to make use of `TAURI_ENV_DEBUG` and other env variables
    // https://v2.tauri.app/reference/environment-variables/
    envPrefix: ["VITE_", "TAURI_"],
    build: {
      target:'baseline-widely-available',
      // don't minify for debug builds
      minify: process.env.TAURI_ENV_DEBUG === 'true' ? false : 'oxc',
      // produce sourcemaps for debug builds
      sourcemap: process.env.TAURI_ENV_DEBUG === 'true',
      chunkSizeWarningLimit: 2000,
    },
    
    optimizeDeps:{
      exclude: [
        "@browsermt/bergamot-translator"
      ],
      needsInterop:[
        "@mlc-ai/web-tokenizers"
      ]
    },

    resolve:{
      alias:{
        'src':'/src',
      }
    },
    worker: {
      format: 'es'
    }
}
});
