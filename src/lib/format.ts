export function nfmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(Math.round(n));
}
export function pct(n: number | null | undefined, digits = 1): string {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(digits) + "%";
}
export function platformBadgeClass(p?: string | null) {
  switch ((p || "").toLowerCase()) {
    case "instagram": return "bg-pink-500/15 text-pink-600 dark:text-pink-400";
    case "tiktok": return "bg-foreground/10 text-foreground";
    case "youtube": return "bg-red-500/15 text-red-600 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
}
export function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  return "unknown";
}
export function extractUsername(url: string): string {
  try {
    const u = new URL(url.trim());
    const path = u.pathname.replace(/^\/+|\/+$/g, "");
    const first = path.split("/")[0] || "";
    return first.replace(/^@/, "");
  } catch { return ""; }
}

export function imgProxy(url?: string | null): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  } catch { return url || ""; }
}


