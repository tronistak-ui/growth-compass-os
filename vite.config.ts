import { defineConfig, loadEnv } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig(({ mode }) => {
  // Every deployment of this app is white-labeled to one client — same
  // codebase, no per-client fork. BRAND_NAME/BRAND_TAGLINE get baked into
  // the client bundle at build time (see src/lib/brand.ts), not read at
  // request time, so the pre-login screens (which run before any org/DB
  // context exists) can show the client's own name with no extra request.
  // loadEnv (not `import.meta.env`) because this runs in vite.config.ts
  // itself, outside the app's own module graph.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tailwindcss(),
      tanstackStart({
        // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
        server: { entry: "server" },
      }),
      viteReact(),
    ],
    define: {
      __BRAND_NAME__: JSON.stringify(env["BRAND_NAME"] || "TrendZypher"),
      __BRAND_TAGLINE__: JSON.stringify(env["BRAND_TAGLINE"] || "Growth OS"),
      // Empty by default, not a placeholder address — a wrong/fake support
      // contact shown to a real client is worse than no link at all, so the
      // UI hides the "Contact support" link entirely until this is set.
      __SUPPORT_EMAIL__: JSON.stringify(env["SUPPORT_EMAIL"] || ""),
    },
    server: {
      // Lets a free localtunnel (loca.lt) URL reach the dev server — needed
      // because Instagram Business Login's OAuth redirect_uri must be HTTPS,
      // which localhost isn't. Wildcard subdomain since loca.lt assigns a
      // random one per run unless you pin it. Dev-only; never applies to a
      // production build.
      allowedHosts: [".loca.lt"],
    },
  };
});
