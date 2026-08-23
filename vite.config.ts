import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

// Deployment target for the Nitro server build. Nitro reads this from the
// NITRO_PRESET env var if it's set (see package.json "build" script); this
// is just the fallback when building without that env var, e.g. `vite build`
// run directly or from an editor task.
if (!process.env.NITRO_PRESET) {
  process.env.NITRO_PRESET = "node-server";
}

export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    viteReact(),
  ],
  server: {
    // Lets a free localtunnel (loca.lt) URL reach the dev server — needed
    // because Instagram Business Login's OAuth redirect_uri must be HTTPS,
    // which localhost isn't. Wildcard subdomain since loca.lt assigns a
    // random one per run unless you pin it. Dev-only; never applies to a
    // production build.
    allowedHosts: [".loca.lt"],
  },
});
