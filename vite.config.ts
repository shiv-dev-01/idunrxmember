import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiHost = env.VITE_API_HOST || "https://panel.whitelabelmd.com";
  // Hostinger (temp): https://lightgoldenrodyellow-okapi-586794.hostingersite.com
  const apiPath = env.VITE_IDUNRX_API_PATH || "/idunrx_token_v2";
  const yourCoachEnv = env.VITE_YOURCOACH_ENV || "staging";
  const yourCoachApiTarget =
    yourCoachEnv === "production"
      ? "https://api.yourcoach.health"
      : yourCoachEnv === "development"
        ? "https://api.stage1.yourcoach.health"
        : "https://api.rc.yourcoach.health";

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ["lucide-react"],
    },
    server: {
      proxy: {
        // Same-origin proxy so HttpOnly session cookies work in local DEV
        [apiPath]: {
          target: apiHost,
          changeOrigin: true,
          secure: true,
        },
        "/sanctum": {
          target: apiHost,
          changeOrigin: true,
          secure: true,
        },
        // Same-origin proxy for wlmdbackend / v1 (order-op, uploads, etc.)
        "/wlmdbackend": {
          target: apiHost,
          changeOrigin: true,
          secure: true,
        },
        "/v1": {
          target: apiHost,
          changeOrigin: true,
          secure: true,
        },
        "/yourcoach-api": {
          target: yourCoachApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/yourcoach-api/, ""),
        },
      },
    },
  };
});
