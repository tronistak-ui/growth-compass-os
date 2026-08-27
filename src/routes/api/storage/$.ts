// Serves files written through the storage abstraction (server/storage/) —
// stands in for what a public bucket URL would do. No buckets are in use
// yet (see server/storage/types.ts), so this is unauthenticated for now;
// revisit if/when a use case needs private files (e.g. signed URLs).
import { createFileRoute } from "@tanstack/react-router";
import { storage } from "@/server/storage/driver.server";

export const Route = createFileRoute("/api/storage/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = params._splat;
        if (!key) return new Response("Not found", { status: 404 });

        let object;
        try {
          object = await storage.get(key);
        } catch {
          return new Response("Invalid key", { status: 400 });
        }
        if (!object) return new Response("Not found", { status: 404 });

        return new Response(object.data as BodyInit, {
          headers: {
            "Content-Type": object.contentType ?? "application/octet-stream",
            "Cache-Control": "private, max-age=3600",
          },
        });
      },
    },
  },
});
