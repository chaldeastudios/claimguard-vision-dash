import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Dev server port -- defaults to 5173 (matches the openIMIS module's
// DEFAULT_BASE_URL, see openimis-claimguard-module/src/config.js). Override
// via a PORT env var (in .env, or docker-compose.yml's claimguard-dash
// service) if you need a different port last-minute without editing code.
const PORT = Number(process.env.PORT) || 5173;

export default defineConfig({
  server: { port: PORT },
  plugins: [
    tanstackStart({
      server: {
        entry: "src/server",
      },
    }),
    nitro(),
    viteReact(),
    tailwindcss(),
    tsconfigPaths(),
  ],
});
