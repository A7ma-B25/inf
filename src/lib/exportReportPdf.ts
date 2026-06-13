// Professional multi-page influencer PDF report (jsPDF + html2canvas).
import jsPDF from "jspdf";
import { nfmt, pct, imgProxy } from "./format";
import { FIELD_REGISTRY, reliabilityLabel } from "./data-sources";

const PURPLE = "#461bb6";
const PURPLE_LIGHT = "#dad1f0";
const TEXT = "#111827";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const M = 20; // margin mm

type R = any;

async function loadImageDataURL(url: string): Promise<string | null> {
  try {
    const proxied = imgProxy(url);
    const res = await fetch(proxied);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onloadend = () => resolve(fr.result as string);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch { return null; }
}

function pageFrame(pdf: jsPDF, r: R, pageNum: number) {
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  // Top accent line
  pdf.setFillColor(PURPLE);
  pdf.rect(0, 0, w, 2, "F");
  // Header
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(PURPLE);
  pdf.text("BOOM", M, 10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120);
  pdf.text("teams", M + 10, 10);
  pdf.setFontSize(8);
  pdf.setTextColor(MUTED);
  pdf.text(`@${r.username || ""}`, w - M, 10, { align: "right" });
  // Bottom accent line
  pdf.setFillColor(PURPLE);
  pdf.rect(0, h - 2, w, 2, "F");
  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(MUTED);
  pdf.text("Confidential - Internal Use Only", w / 2, h - 6, { align: "center" });
  pdf.text(`Page ${pageNum}`, w - M, h - 6, { align: "right" });
}

function sectionTitle(pdf: jsPDF, title: string, _y: number): number {
  const w = pdf.internal.pageSize.getWidth();
  // Full-width purple header bar
  pdf.setFillColor(PURPLE);
  pdf.rect(0, 15, w, 12, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text(title.toUpperCase(), M, 23);
  return 35;
}

function zebraRow(pdf: jsPDF, x: number, y: number, w: number, h: number, idx: number) {
  if (idx % 2 === 0) {
    pdf.setFillColor(247, 247, 250);
    pdf.rect(x, y, w, h, "F");
  }
}

function divider(pdf: jsPDF, y: number): number {
  const w = pdf.internal.pageSize.getWidth() - M * 2;
  pdf.setDrawColor(BORDER);
  pdf.setLineWidth(0.2);
  pdf.line(M, y, M + w, y);
  return y + 4;
}

function card(pdf: jsPDF, x: number, y: number, w: number, h: number) {
  pdf.setDrawColor(BORDER);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(x, y, w, h, 1.5, 1.5, "S");
}

function metricCard(pdf: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string) {
  card(pdf, x, y, w, h);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(MUTED);
  pdf.text(label.toUpperCase(), x + 3, y + 4);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(TEXT);
  pdf.text(value, x + 3, y + h - 3);
}

function wrappedText(pdf: jsPDF, text: string, x: number, y: number, maxW: number, lineH = 4.5): number {
  if (!text) return y;
  const lines = pdf.splitTextToSize(text, maxW) as string[];
  lines.forEach((line, i) => pdf.text(line, x, y + i * lineH));
  return y + lines.length * lineH;
}

function chip(pdf: jsPDF, x: number, y: number, text: string): number {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  const w = pdf.getTextWidth(text) + 4;
  pdf.setFillColor(PURPLE_LIGHT);
  pdf.roundedRect(x, y - 3, w, 5, 1, 1, "F");
  pdf.setTextColor(PURPLE);
  pdf.text(text, x + 2, y + 0.5);
  return x + w + 2;
}

function chipList(pdf: jsPDF, items: string[], x: number, y: number, maxW: number): number {
  let cx = x;
  let cy = y;
  items.forEach((t) => {
    pdf.setFontSize(8);
    const w = pdf.getTextWidth(t) + 4;
    if (cx + w > x + maxW) { cx = x; cy += 7; }
    chip(pdf, cx, cy, t);
    cx += w + 2;
  });
  return cy + 5;
}

function ensureSpace(pdf: jsPDF, y: number, need: number, r: R, pageNum: { v: number }): number {
  const h = pdf.internal.pageSize.getHeight();
  if (y + need > h - 15) {
    pdf.addPage();
    pageNum.v++;
    pageFrame(pdf, r, pageNum.v);
    return 25;
  }
  return y;
}

function newPage(pdf: jsPDF, r: R, pageNum: { v: number }): number {
  pdf.addPage();
  pageNum.v++;
  pageFrame(pdf, r, pageNum.v);
  return 25;
}

// ---------- Pages ----------

async function coverPage(pdf: jsPDF, r: R) {
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  pageFrame(pdf, r, 1);

  // Logo (larger)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(PURPLE);
  pdf.text("BOOM", M, 30);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120);
  pdf.text("teams", M + 22, 30);

  // Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(TEXT);
  pdf.text("INFLUENCER INTELLIGENCE", w / 2, 65, { align: "center" });
  pdf.text("REPORT", w / 2, 75, { align: "center" });

  // Profile photo
  const img = await loadImageDataURL(r.profile_pic_url);
  const cx = w / 2; const cy = 110; const radius = 22;
  pdf.setDrawColor(PURPLE);
  pdf.setLineWidth(1);
  pdf.circle(cx, cy, radius + 1, "S");
  if (img) {
    try { pdf.addImage(img, "JPEG", cx - radius, cy - radius, radius * 2, radius * 2); }
    catch { /* ignore */ }
  } else {
    pdf.setFillColor(PURPLE_LIGHT);
    pdf.circle(cx, cy, radius, "F");
  }

  // Name + username
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(TEXT);
  pdf.text(r.influencer_name || "-", w / 2, cy + radius + 12, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(MUTED);
  pdf.text(`@${r.username || ""}`, w / 2, cy + radius + 19, { align: "center" });

  // Platform chip
  const platform = r.platform || "-";
  pdf.setFontSize(9);
  const pw = pdf.getTextWidth(platform) + 6;
  pdf.setFillColor(PURPLE_LIGHT);
  pdf.roundedRect(w / 2 - pw / 2, cy + radius + 23, pw, 6, 1.5, 1.5, "F");
  pdf.setTextColor(PURPLE);
  pdf.text(platform, w / 2, cy + radius + 27, { align: "center" });

  // Location + niche
  const meta = [r.city, r.country, r.niche].filter(Boolean).join("  |  ");
  if (meta) {
    pdf.setFontSize(10);
    pdf.setTextColor(MUTED);
    pdf.text(meta, w / 2, cy + radius + 38, { align: "center" });
  }

  // Generated date
  pdf.setFontSize(9);
  pdf.setTextColor(150);
  pdf.text(`Generated on ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`, w / 2, cy + radius + 46, { align: "center" });

  // Overall Score bottom right
  const score = r.overall_score || 0;
  const sx = w - M - 25; const sy = h - 50;
  pdf.setFillColor(PURPLE);
  pdf.circle(sx, sy, 18, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(255, 255, 255);
  pdf.text(String(score), sx, sy + 2, { align: "center" });
  pdf.setFontSize(7);
  pdf.text("/100", sx, sy + 9, { align: "center" });
  pdf.setFontSize(8);
  pdf.setTextColor(MUTED);
  pdf.text("OVERALL SCORE", sx, sy + 24, { align: "center" });
}

function overviewPage(pdf: jsPDF, r: R, pn: { v: number }) {
  let y = newPage(pdf, r, pn);
  y = sectionTitle(pdf, "Overview", y);
  y += 4;

  const w = pdf.internal.pageSize.getWidth() - M * 2;
  const cw = (w - 4 * 3) / 5;
  const metrics = [
    ["Followers", nfmt(r.followers)],
    ["ER", pct(r.engagement_rate)],
    ["Avg Likes", nfmt(r.avg_likes)],
    ["Avg Comments", nfmt(r.avg_comments)],
    ["Avg Views", nfmt(r.avg_views)],
  ];
  metrics.forEach(([l, v], i) => metricCard(pdf, M + i * (cw + 3), y, cw, 16, l, v));
  y += 22;

  if (r.ai_summary) {
    const sumW = pdf.internal.pageSize.getWidth() - M * 2;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(60);
    const lines = pdf.splitTextToSize(r.ai_summary, sumW - 8) as string[];
    const boxH = 8 + lines.length * 4.5;
    // Box with purple left border
    pdf.setDrawColor(BORDER); pdf.setLineWidth(0.2);
    pdf.rect(M, y, sumW, boxH, "S");
    pdf.setFillColor(PURPLE);
    pdf.rect(M, y, 1.5, boxH, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
    pdf.text("AI Summary", M + 5, y + 5);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(60);
    lines.forEach((line, i) => pdf.text(line, M + 5, y + 10 + i * 4.5));
    y += boxH + 5;
  }

  const blocks: [string, string | undefined, string][] = [
    ["Strengths", r.ai_strengths, "#10b981"],
    ["Weaknesses", r.ai_weaknesses, "#ef4444"],
    ["Recommendation", r.ai_recommendation, PURPLE],
  ];
  blocks.forEach(([title, text, color]) => {
    if (!text) return;
    y = ensureSpace(pdf, y, 20, r, pn);
    pdf.setFillColor(color); pdf.rect(M, y - 3, 1.5, 5, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
    pdf.text(title, M + 4, y); y += 5;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(60);
    y = wrappedText(pdf, text, M, y, w) + 4;
  });

  const tags: string[] = Array.isArray(r.best_for_tags) ? r.best_for_tags : [];
  if (tags.length) {
    y = ensureSpace(pdf, y, 20, r, pn);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
    pdf.text("Best For", M, y); y += 5;
    chipList(pdf, tags.slice(0, 12), M, y, w);
  }
}

function rowList(pdf: jsPDF, items: { label: string; value: string }[], x: number, y: number, w: number): number {
  items.forEach((it, i) => {
    const ry = y + i * 6;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(60);
    pdf.text(it.label, x, ry);
    pdf.setFont("helvetica", "bold"); pdf.setTextColor(TEXT);
    pdf.text(it.value, x + w, ry, { align: "right" });
  });
  return y + items.length * 6;
}

function barRow(pdf: jsPDF, x: number, y: number, w: number, label: string, value: number, max = 100, valueLabel?: string) {
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(60);
  pdf.text(label, x, y);
  pdf.setFont("helvetica", "bold"); pdf.setTextColor(TEXT);
  pdf.text(valueLabel ?? String(value), x + w, y, { align: "right" });
  pdf.setFillColor(BORDER);
  pdf.roundedRect(x, y + 1.5, w, 2, 0.5, 0.5, "F");
  pdf.setFillColor(PURPLE);
  const fillW = Math.max(0, Math.min(w, (value / max) * w));
  pdf.roundedRect(x, y + 1.5, fillW, 2, 0.5, 0.5, "F");
}

function audiencePage(pdf: jsPDF, r: R, pn: { v: number }) {
  let y = newPage(pdf, r, pn);
  y = sectionTitle(pdf, "Audience", y);
  y += 4;
  const w = pdf.internal.pageSize.getWidth() - M * 2;
  const colW = (w - 5) / 2;

  // Gender (inline text)
  const gender = r.audience_gender_split || {};
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
  pdf.text("Gender", M, y);
  const genderText = Object.entries(gender)
    .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${Number(v).toFixed(0)}%`)
    .join("   |   ") || "-";
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(60);
  pdf.text(genderText, M, y + 6);

  // Age groups (table)
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
  pdf.text("Age Groups", M + colW + 5, y);
  const ages = r.audience_age_groups || {};
  let ay = y + 5;
  Object.entries(ages).forEach(([k, v], i) => {
    zebraRow(pdf, M + colW + 5, ay - 3.5, colW, 5, i);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(60);
    pdf.text(k, M + colW + 7, ay);
    pdf.setFont("helvetica", "bold"); pdf.setTextColor(TEXT);
    pdf.text(`${Number(v).toFixed(1)}%`, M + colW + 5 + colW - 2, ay, { align: "right" });
    ay += 5;
  });
  y = Math.max(y + 14, ay) + 6;

  // Top country / cities
  y = ensureSpace(pdf, y, 20, r, pn);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
  pdf.text("Top Country", M, y);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(60);
  pdf.text(r.audience_top_country || "-", M + 35, y);
  y += 6;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
  pdf.text("Top Cities", M, y);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(60);
  pdf.text(r.audience_top_cities || "-", M + 35, y);
  y = divider(pdf, y + 6);

  // Quality
  y = ensureSpace(pdf, y, 30, r, pn);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
  pdf.text("Audience Quality", M, y); y += 5;
  barRow(pdf, M, y, w, "Quality Score", r.audience_quality_score || 0, 100, `${r.audience_quality_score || 0}/100`); y += 7;
  barRow(pdf, M, y, w, "Authenticity Score", r.audience_authenticity_score || 0, 100, `${r.audience_authenticity_score || 0}/100`); y += 7;
  barRow(pdf, M, y, w, "Fake Followers", r.fake_followers_score || 0, 100, `${r.fake_followers_score || 0}%`); y += 10;

  // Languages - handle array [{language, percentage}] or object {lang: pct}, fallback to country
  let langEntries: { name: string; pct: number }[] = [];
  const rawLangs = r.audience_languages;
  if (Array.isArray(rawLangs)) {
    langEntries = rawLangs
      .map((l: any) => ({
        name: String(l?.language ?? l?.name ?? l?.code ?? "").trim(),
        pct: Number(l?.percentage ?? l?.percent ?? l?.value ?? 0),
      }))
      .filter(l => l.name && !isNaN(l.pct));
  } else if (rawLangs && typeof rawLangs === "object") {
    langEntries = Object.entries(rawLangs)
      .map(([k, v]) => ({ name: k, pct: Number(v) }))
      .filter(l => l.name && !isNaN(l.pct));
  }
  if (!langEntries.length) {
    const country = String(r.audience_top_country || r.country || "").toLowerCase();
    const arabicCountries = ["saudi", "uae", "egypt", "morocco", "algeria", "tunisia", "iraq", "jordan", "lebanon", "kuwait", "qatar", "oman", "bahrain", "yemen", "syria", "libya"];
    if (arabicCountries.some(c => country.includes(c))) {
      langEntries = [{ name: "Arabic", pct: 70 }, { name: "English", pct: 30 }];
    }
  }
  if (langEntries.length) {
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
    pdf.text("Languages", M, y); y += 5;
    chipList(pdf, langEntries.map(l => `${l.name}: ${l.pct.toFixed(0)}%`), M, y, w);
  }
}

function growthPage(pdf: jsPDF, r: R, pn: { v: number }) {
  let y = newPage(pdf, r, pn);
  y = sectionTitle(pdf, "Growth", y);
  y += 4;
  const w = pdf.internal.pageSize.getWidth() - M * 2;
  const cw = (w - 6) / 3;
  const g30 = Number(r.follower_growth_30d || 0);
  const g90 = Number(r.follower_growth_90d || 0);
  const net = g30 + g90;
  metricCard(pdf, M, y, cw, 16, "30-Day Growth", `${g30 >= 0 ? "+" : ""}${g30.toFixed(2)}%`);
  metricCard(pdf, M + cw + 3, y, cw, 16, "90-Day Growth", `${g90 >= 0 ? "+" : ""}${g90.toFixed(2)}%`);
  metricCard(pdf, M + (cw + 3) * 2, y, cw, 16, "Net Change", `${net >= 0 ? "+" : ""}${net.toFixed(2)}%`);
  y += 22;

  // Milestones
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
  pdf.text("Follower Milestones", M, y); y += 5;
  const f = r.followers || 0;
  const milestones = [10000, 50000, 100000, 500000, 1000000].filter(m => m <= f * 2);
  milestones.forEach((m) => {
    barRow(pdf, M, y, w, `${nfmt(m)} followers`, Math.min(f, m), m, f >= m ? "Reached" : `${((f / m) * 100).toFixed(0)}%`);
    y += 7;
  });
  y += 4;

  // Projection
  y = ensureSpace(pdf, y, 35, r, pn);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
  pdf.text("Projected Growth", M, y); y += 5;
  const monthlyRate = g30 / 100;
  [1, 3, 6, 12].forEach(months => {
    const projected = Math.round(f * Math.pow(1 + monthlyRate, months));
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(60);
    pdf.text(`In ${months} month${months > 1 ? "s" : ""}`, M, y);
    pdf.setFont("helvetica", "bold"); pdf.setTextColor(TEXT);
    pdf.text(nfmt(projected), M + w, y, { align: "right" });
    y += 5;
  });
  y += 4;

  // Insights
  y = ensureSpace(pdf, y, 30, r, pn);
  const insights = [
    ["Engagement Growth", `${Number(r.engagement_growth || 0).toFixed(2)}%`],
    ["Viral Frequency", `${r.viral_frequency_score || 0}/100`],
    ["Posting Consistency", r.posting_consistency || "-"],
    ["Reliability", `${r.reliability_score || 0}/100`],
  ];
  const iw = (w - 6) / 2;
  insights.forEach(([l, v], i) => {
    const ix = M + (i % 2) * (iw + 6);
    const iy = y + Math.floor(i / 2) * 14;
    metricCard(pdf, ix, iy, iw, 12, l, v);
  });
}

function engagementPage(pdf: jsPDF, r: R, pn: { v: number }) {
  let y = newPage(pdf, r, pn);
  y = sectionTitle(pdf, "Engagement", y);
  y += 4;
  const w = pdf.internal.pageSize.getWidth() - M * 2;
  const cw = (w - 4 * 3) / 5;
  const metrics = [
    ["ER", pct(r.engagement_rate)],
    ["Avg Likes", nfmt(r.avg_likes)],
    ["Avg Comments", nfmt(r.avg_comments)],
    ["Avg Shares", nfmt(r.avg_shares)],
    ["Avg Saves", nfmt(r.avg_saves)],
  ];
  metrics.forEach(([l, v], i) => metricCard(pdf, M + i * (cw + 3), y, cw, 16, l, v));
  y += 22;

  // Breakdown
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
  pdf.text("Engagement Breakdown", M, y); y += 5;
  const total = (r.avg_likes || 0) + (r.avg_comments || 0) + (r.avg_shares || 0) + (r.avg_saves || 0) || 1;
  [
    ["Likes", r.avg_likes || 0],
    ["Comments", r.avg_comments || 0],
    ["Shares", r.avg_shares || 0],
    ["Saves", r.avg_saves || 0],
  ].forEach(([l, v]) => {
    const pctVal = ((v as number) / total) * 100;
    barRow(pdf, M, y, w, l as string, pctVal, 100, `${pctVal.toFixed(1)}%`);
    y += 7;
  });
  y += 4;

  // Top posts
  const posts: any[] = Array.isArray(r.popular_posts) ? r.popular_posts : (Array.isArray(r.recent_posts) ? r.recent_posts : []);
  if (posts.length) {
    y = ensureSpace(pdf, y, 40, r, pn);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
    pdf.text("Top Engaging Posts", M, y); y += 5;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(MUTED);
    pdf.text("#", M, y); pdf.text("LIKES", M + 90, y, { align: "right" });
    pdf.text("COMMENTS", M + 130, y, { align: "right" }); pdf.text("VIEWS", M + w, y, { align: "right" });
    y += 2;
    pdf.setDrawColor(BORDER); pdf.line(M, y, M + w, y); y += 4;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(TEXT);
    posts.slice(0, 5).forEach((p, i) => {
      pdf.text(`Post ${i + 1}`, M, y);
      pdf.text(nfmt(p.likes || p.likesCount), M + 90, y, { align: "right" });
      pdf.text(nfmt(p.comments || p.commentsCount), M + 130, y, { align: "right" });
      pdf.text(nfmt(p.views || p.videoViewCount || p.playCount), M + w, y, { align: "right" });
      y += 5;
    });
  }

  // Best time to post heatmap
  const bt = r.best_time_to_post || {};
  if (bt.best_day || bt.best_hour) {
    y = ensureSpace(pdf, y, 15, r, pn);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
    pdf.text("Best Time to Post", M, y); y += 5;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(60);
    pdf.text(`Best Day: ${bt.best_day || "-"}   |   Best Hour: ${bt.best_hour || "-"}`, M, y);
  }
}

function contentPage(pdf: jsPDF, r: R, pn: { v: number }) {
  let y = newPage(pdf, r, pn);
  y = sectionTitle(pdf, "Content", y);
  y += 4;
  const w = pdf.internal.pageSize.getWidth() - M * 2;

  const cw = (w - 6) / 3;
  metricCard(pdf, M, y, cw, 14, "Top Format", r.top_performing_format || "-");
  metricCard(pdf, M + cw + 3, y, cw, 14, "Top Hook", r.top_performing_hook_type || "-");
  metricCard(pdf, M + (cw + 3) * 2, y, cw, 14, "Top Style", r.top_performing_content_style || "-");
  y += 20;

  const styles = [
    ["Creator Style", r.creator_style],
    ["Filming Style", r.filming_style],
    ["Editing Style", r.editing_style],
    ["Pacing", r.pacing_style],
    ["Storytelling", r.storytelling_style],
  ].filter(([, v]) => v);
  if (styles.length) {
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
    pdf.text("Style Breakdown", M, y); y += 5;
    y = rowList(pdf, styles.map(([l, v]) => ({ label: l as string, value: v as string })), M, y, w);
    y += 4;
  }

  // Recent Posts - numbered table (plain text only)
  const posts: any[] = Array.isArray(r.recent_posts) ? r.recent_posts : [];
  if (posts.length) {
    y = ensureSpace(pdf, y, 50, r, pn);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
    pdf.text("Recent Posts", M, y); y += 5;

    // Column positions
    const cX = {
      num: M + 2,
      post: M + 14,
      likes: M + w * 0.55,
      comments: M + w * 0.75,
      views: M + w - 2,
    };
    // Header
    pdf.setFillColor(PURPLE);
    pdf.rect(M, y, w, 6, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(255, 255, 255);
    pdf.text("#", cX.num, y + 4);
    pdf.text("POST", cX.post, y + 4);
    pdf.text("LIKES", cX.likes, y + 4, { align: "right" });
    pdf.text("COMMENTS", cX.comments, y + 4, { align: "right" });
    pdf.text("VIEWS", cX.views, y + 4, { align: "right" });
    y += 6;

    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(TEXT);
    posts.slice(0, 10).forEach((p, i) => {
      zebraRow(pdf, M, y, w, 6, i);
      pdf.setTextColor(MUTED); pdf.text(String(i + 1), cX.num, y + 4);
      pdf.setTextColor(TEXT); pdf.text(`Post ${i + 1}`, cX.post, y + 4);
      pdf.text(nfmt(p.likes || p.likesCount), cX.likes, y + 4, { align: "right" });
      pdf.text(nfmt(p.comments || p.commentsCount), cX.comments, y + 4, { align: "right" });
      pdf.text(nfmt(p.views || p.videoViewCount || p.playCount), cX.views, y + 4, { align: "right" });
      y += 6;
    });
    y += 4;
  }

  // Hashtags
  const tags: string[] = Array.isArray(r.top_hashtags) ? r.top_hashtags.map((t: any) => typeof t === "string" ? t : t.tag || t.name) : [];
  if (tags.length) {
    y = ensureSpace(pdf, y, 20, r, pn);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
    pdf.text("Top Hashtags", M, y); y += 5;
    chipList(pdf, tags.slice(0, 15).map(t => t.startsWith("#") ? t : `#${t}`), M, y, w);
  }
}

function reachPage(pdf: jsPDF, r: R, pn: { v: number }) {
  let y = newPage(pdf, r, pn);
  y = sectionTitle(pdf, "Reach", y);
  y += 4;
  const w = pdf.internal.pageSize.getWidth() - M * 2;
  const cw = (w - 6) / 3;
  const totalReach = (r.avg_reach || 0) * (r.posts_count || 1);
  metricCard(pdf, M, y, cw, 16, "Avg Reach", nfmt(r.avg_reach));
  metricCard(pdf, M + cw + 3, y, cw, 16, "Avg Impressions", nfmt(r.avg_impressions));
  metricCard(pdf, M + (cw + 3) * 2, y, cw, 16, "Total Reach (est.)", nfmt(totalReach));
  y += 22;

  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
  pdf.text("Reach Quality", M, y); y += 5;
  barRow(pdf, M, y, w, "View Rate", Number(r.avg_view_rate || 0), 100, `${Number(r.avg_view_rate || 0).toFixed(1)}%`); y += 7;
  barRow(pdf, M, y, w, "Completion Rate", Number(r.avg_completion_rate || 0), 100, `${Number(r.avg_completion_rate || 0).toFixed(1)}%`); y += 7;
  barRow(pdf, M, y, w, "Conversion Intent", r.conversion_intent_score || 0, 100, `${r.conversion_intent_score || 0}/100`); y += 10;

  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
  pdf.text("Top Country", M, y);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(60);
  pdf.text(r.audience_top_country || "-", M + 30, y); y += 6;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
  pdf.text("Strongest Platform", M, y);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(60);
  pdf.text(r.strongest_platform || r.platform || "-", M + 40, y);
}

function brandPage(pdf: jsPDF, r: R, pn: { v: number }) {
  let y = newPage(pdf, r, pn);
  y = sectionTitle(pdf, "Brand Mentions", y);
  y += 4;
  const w = pdf.internal.pageSize.getWidth() - M * 2;

  // Memory score gauge (semicircle)
  const memory = r.brand_safety_score || 0;
  const gx = M + 25; const gy = y + 25;
  pdf.setDrawColor(BORDER); pdf.setLineWidth(3);
  pdf.circle(gx, gy, 18, "S");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(20); pdf.setTextColor(PURPLE);
  pdf.text(String(memory), gx, gy + 2, { align: "center" });
  pdf.setFontSize(7); pdf.setTextColor(MUTED);
  pdf.text("BRAND MEMORY", gx, gy + 24, { align: "center" });

  // Right side scores
  const sx = M + 60; let sy = y;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
  pdf.text("Score Breakdown", sx, sy); sy += 5;
  [
    ["Brand Safety", r.brand_safety_score || 0],
    ["Trust Score", r.trust_score || 0],
    ["Recommendation Power", r.recommendation_power_score || 0],
    ["Ad Reusability", r.ad_reusability_score || 0],
    ["Purchase Intent", r.audience_purchase_intent_score || 0],
  ].forEach(([l, v]) => {
    barRow(pdf, sx, sy, w - 60, l as string, v as number, 100, `${v}/100`);
    sy += 6;
  });
  y = Math.max(gy + 30, sy) + 4;

  // Top brands
  const brands: any[] = Array.isArray(r.creator_brand_affinity) ? r.creator_brand_affinity : [];
  if (brands.length) {
    y = ensureSpace(pdf, y, 30, r, pn);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
    pdf.text("Top Mentioned Brands", M, y); y += 5;
    chipList(pdf, brands.slice(0, 12).map((b: any) => typeof b === "string" ? b : b.brand || b.name || "-"), M, y, w);
    y += 4;
  }

  // Audience impact
  y = ensureSpace(pdf, y, 30, r, pn);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
  pdf.text("Audience Impact", M, y); y += 5;
  const cw = (w - 6) / 2;
  const impacts = [
    ["Positive Comments", `${Number(r.positive_comment_ratio || 0).toFixed(1)}%`],
    ["Buying Comments", `${Number(r.buying_comments_ratio || 0).toFixed(1)}%`],
    ["Trust Comments", `${Number(r.trust_comments_ratio || 0).toFixed(1)}%`],
    ["Sentiment Verdict", r.sentiment_verdict || "-"],
  ];
  impacts.forEach(([l, v], i) => {
    const ix = M + (i % 2) * (cw + 6);
    const iy = y + Math.floor(i / 2) * 14;
    metricCard(pdf, ix, iy, cw, 12, l, v);
  });
}

function collaborationPage(pdf: jsPDF, r: R, pn: { v: number }) {
  let y = newPage(pdf, r, pn);
  y = sectionTitle(pdf, "Collaboration Details", y);
  y += 4;
  const w = pdf.internal.pageSize.getWidth() - M * 2;

  // Pricing table
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
  pdf.text("Pricing", M, y); y += 5;
  const colX = [M, M + w * 0.4, M + w * 0.6, M + w * 0.8];
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(MUTED);
  pdf.text("CONTENT", colX[0], y);
  pdf.text("MIN", colX[1], y, { align: "right" });
  pdf.text("EST", colX[2], y, { align: "right" });
  pdf.text("MAX", colX[3], y, { align: "right" });
  y += 2;
  pdf.setDrawColor(BORDER); pdf.line(M, y, M + w, y); y += 4;

  const rows = [
    ["Post", r.post_price_min, r.post_price_estimated, r.post_price_max],
    ["Story", r.story_price_min, r.story_price_estimated, r.story_price_max],
    ["Reel", r.reel_price_min, r.reel_price_estimated, r.reel_price_max],
  ];
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(TEXT);
  rows.forEach(([name, mn, est, mx]) => {
    pdf.setFont("helvetica", "bold");
    pdf.text(name as string, colX[0], y);
    pdf.setFont("helvetica", "normal");
    pdf.text(`$${Number(mn || 0).toLocaleString()}`, colX[1], y, { align: "right" });
    pdf.setTextColor(PURPLE); pdf.setFont("helvetica", "bold");
    pdf.text(`$${Number(est || 0).toLocaleString()}`, colX[2], y, { align: "right" });
    pdf.setTextColor(TEXT); pdf.setFont("helvetica", "normal");
    pdf.text(`$${Number(mx || 0).toLocaleString()}`, colX[3], y, { align: "right" });
    y += 6;
  });
  y += 4;

  // Collab tips
  const tips: string[] = Array.isArray(r.collab_tips) ? r.collab_tips : [];
  if (tips.length) {
    y = ensureSpace(pdf, y, 30, r, pn);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
    pdf.text("Collaboration Tips", M, y); y += 5;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(60);
    tips.slice(0, 8).forEach((t) => {
      y = ensureSpace(pdf, y, 8, r, pn);
      pdf.setTextColor(PURPLE); pdf.text("-", M, y);
      pdf.setTextColor(60);
      const lines = pdf.splitTextToSize(t, w - 5) as string[];
      lines.forEach((line, i) => pdf.text(line, M + 4, y + i * 4.5));
      y += lines.length * 4.5 + 1;
    });
    y += 4;
  }

  // Risk assessment
  y = ensureSpace(pdf, y, 40, r, pn);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(TEXT);
  pdf.text("Risk Assessment", M, y); y += 5;
  [
    ["Controversy", r.controversy_score || 0],
    ["Overpromotion", r.overpromotion_score || 0],
    ["Audience Mismatch", r.audience_mismatch_risk || 0],
    ["Inconsistency", r.inconsistency_risk || 0],
  ].forEach(([l, v]) => {
    barRow(pdf, M, y, w, l as string, v as number, 100, `${v}/100`);
    y += 7;
  });
}

export async function exportInfluencerPdf(r: R, opts: { isAdmin?: boolean } = {}) {
  const pdf = new jsPDF("p", "mm", "a4");
  const pn = { v: 1 };
  await coverPage(pdf, r);
  overviewPage(pdf, r, pn);
  audiencePage(pdf, r, pn);
  if (opts.isAdmin) {
    growthPage(pdf, r, pn);
    engagementPage(pdf, r, pn);
    contentPage(pdf, r, pn);
    reachPage(pdf, r, pn);
    brandPage(pdf, r, pn);
    collaborationPage(pdf, r, pn);
    methodologyPage(pdf, r, pn);
  }
  const date = new Date().toISOString().slice(0, 10);
  const suffix = opts.isAdmin ? "-admin" : "";
  pdf.save(`${r.username || "report"}-report${suffix}-${date}.pdf`);
}

function methodologyPage(pdf: jsPDF, r: R, pn: { v: number }) {
  // FIELD_REGISTRY and reliabilityLabel imported at top of file
  let y = newPage(pdf, r, pn);
  y = sectionTitle(pdf, "Data Methodology", y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(MUTED);
  y = wrappedText(
    pdf,
    "Admin-only appendix. Every metric shown in this report, its computed value, formula, source, and reliability rating (1=very low, 5=verified).",
    M, y, pdf.internal.pageSize.getWidth() - M * 2,
  );
  y += 4;

  const w = pdf.internal.pageSize.getWidth() - M * 2;
  const cols = [
    { x: M, w: 36, label: "Field" },
    { x: M + 36, w: 38, label: "Value" },
    { x: M + 74, w: 52, label: "Formula" },
    { x: M + 126, w: 30, label: "Source" },
    { x: M + 156, w: w - 156, label: "Rel." },
  ];
  // Header row
  pdf.setFillColor(PURPLE);
  pdf.rect(M, y, w, 6, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  cols.forEach((c) => pdf.text(c.label, c.x + 1.5, y + 4));
  y += 6;

  const rowH = 12;
  const entries = Object.values(FIELD_REGISTRY);
  entries.forEach((meta, i) => {
    y = ensureSpace(pdf, y, rowH + 4, r, pn);
    zebraRow(pdf, M, y, w, rowH, i);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(TEXT);
    const valRaw = (r as any)?.[meta.field];
    const valStr = valRaw == null
      ? "—"
      : typeof valRaw === "object"
        ? JSON.stringify(valRaw).slice(0, 40)
        : String(valRaw).slice(0, 40);
    pdf.text(meta.field, cols[0].x + 1.5, y + 4);
    pdf.setFont("helvetica", "normal");
    pdf.text(pdf.splitTextToSize(valStr, cols[1].w - 2) as string[], cols[1].x + 1.5, y + 4);
    pdf.setFontSize(7);
    pdf.setTextColor(MUTED);
    pdf.text(pdf.splitTextToSize(meta.formula, cols[2].w - 2) as string[], cols[2].x + 1.5, y + 4);
    pdf.text(pdf.splitTextToSize(meta.source, cols[3].w - 2) as string[], cols[3].x + 1.5, y + 4);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(PURPLE);
    pdf.text(`${meta.reliability}/5`, cols[4].x + 1.5, y + 4);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(MUTED);
    pdf.text(reliabilityLabel(meta.reliability as any), cols[4].x + 1.5, y + 8);
    y += rowH;
  });
}
