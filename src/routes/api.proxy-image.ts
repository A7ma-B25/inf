import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/proxy-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const target = u.searchParams.get("url");
        if (!target) return new Response("Missing url", { status: 400 });
        let parsed: URL;
        try { parsed = new URL(target); } catch { return new Response("Invalid url", { status: 400 }); }
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          return new Response("Invalid protocol", { status: 400 });
        }

        // 1x1 transparent PNG fallback (e.g. expired Instagram CDN signatures)
        const fallback = () => {
          const png = Uint8Array.from(atob(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
          ), c => c.charCodeAt(0));
          return new Response(png, {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=300",
              "Access-Control-Allow-Origin": "*",
            },
          });
        };

        try {
          const res = await fetch(parsed.toString(), {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
              "Referer": parsed.origin,
              "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            },
          });
          if (!res.ok) return fallback();
          const ct = res.headers.get("Content-Type") || "image/jpeg";
          if (!ct.startsWith("image/")) return fallback();
          const buf = await res.arrayBuffer();
          return new Response(buf, {
            status: 200,
            headers: {
              "Content-Type": ct,
              "Cache-Control": "public, max-age=86400",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch {
          return fallback();
        }
      },
    },
  },
});
