import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/my_sports/",
  server: {
    proxy: {
      "/api/nhl": {
        target: "https://api-web.nhle.com/v1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nhl/, ""),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        configure: (proxy, _options) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          proxy.on("proxyRes", (proxyRes, _req, _res) => {
            const location = proxyRes.headers["location"];
            if (
              typeof location === "string" &&
              location.startsWith("https://api-web.nhle.com/v1")
            ) {
              proxyRes.headers["location"] = location.replace(
                "https://api-web.nhle.com/v1",
                "/api/nhl"
              );
            }
          });
        },
      },
    },
  },
});
