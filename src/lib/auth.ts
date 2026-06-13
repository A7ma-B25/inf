import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "user";

// Admin status is determined by profiles.is_admin in the database.

const KEY = "boom_auth";
const ROLE_KEY = "boom_role";
const UID_KEY = "boom_uid";
const FULL_ACCESS_KEY = "boom_full_access";

export const DEFAULT_USER_ANALYSIS_LIMIT = 2;
// Kept for backward compat; prefer getAnalysisLimit()
export const USER_ANALYSIS_LIMIT = DEFAULT_USER_ANALYSIS_LIMIT;

export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "true";
}

export function getRole(): Role | null {
  if (typeof window === "undefined") return null;
  const r = localStorage.getItem(ROLE_KEY);
  return r === "admin" || r === "user" ? r : null;
}

export function isAdmin(): boolean { return getRole() === "admin"; }
export function isUser(): boolean { return getRole() === "user"; }

export function hasFullAccess(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(FULL_ACCESS_KEY) === "true";
}

/** A user that should see admin-only UI surfaces (real admin OR a user granted full_access). */
export function canViewAll(): boolean {
  return isAdmin() || hasFullAccess();
}

export function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(UID_KEY);
}

/** Sync a Supabase session into the local cache so isAuthed/getRole work synchronously. */
export async function syncSessionToLocal(
  email: string | null | undefined,
  meta?: { first_name?: string; last_name?: string },
  userId?: string | null,
) {
  if (typeof window === "undefined") return;
  if (!email) {
    localStorage.removeItem(KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(UID_KEY);
    localStorage.removeItem(FULL_ACCESS_KEY);
    localStorage.removeItem("boom_session_start");
    return;
  }
  let role: Role = "user";
  let fullAccess = false;
  if (userId) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, full_access")
        .eq("id", userId)
        .maybeSingle();
      if ((profile as any)?.is_admin === true) role = "admin";
      if ((profile as any)?.full_access === true) fullAccess = true;
    } catch {}
  }
  localStorage.setItem(KEY, "true");
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(FULL_ACCESS_KEY, fullAccess ? "true" : "false");
  if (userId) localStorage.setItem(UID_KEY, userId);
  if (!localStorage.getItem("boom_session_start")) {
    localStorage.setItem("boom_session_start", new Date().toISOString());
  }
  try {
    const existing = JSON.parse(localStorage.getItem("boom_user") || "null") || {};
    localStorage.setItem("boom_user", JSON.stringify({
      ...existing,
      email,
      first_name: meta?.first_name ?? existing.first_name,
      last_name: meta?.last_name ?? existing.last_name,
    }));
  } catch {}
}

export async function signOut() {
  try { await supabase.auth.signOut(); } catch {}
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(UID_KEY);
  localStorage.removeItem(FULL_ACCESS_KEY);
  localStorage.removeItem("boom_session_start");
}

// =====================================================================
// Per-user analysis usage (source of truth = profiles row in the DB,
// mirrored to localStorage keyed by user id so sync checks stay fast).
// =====================================================================
const countKey = (uid: string) => `usage_count_${uid}`;
const limitKey = (uid: string) => `usage_limit_${uid}`;
const reportsKey = (uid: string) => `user_reports_${uid}`;

export function getAnalysisCount(): number {
  if (typeof window === "undefined") return 0;
  const uid = getUserId();
  if (!uid) return Number(localStorage.getItem("analysis_count") || "0");
  return Number(localStorage.getItem(countKey(uid)) || "0");
}

export function getAnalysisLimit(): number {
  if (typeof window === "undefined") return DEFAULT_USER_ANALYSIS_LIMIT;
  const uid = getUserId();
  if (!uid) return DEFAULT_USER_ANALYSIS_LIMIT;
  const v = localStorage.getItem(limitKey(uid));
  return v ? Number(v) : DEFAULT_USER_ANALYSIS_LIMIT;
}

export function getUserReportIds(): string[] {
  if (typeof window === "undefined") return [];
  const uid = getUserId();
  if (!uid) {
    try { return JSON.parse(localStorage.getItem("boom_user_reports") || "[]"); } catch { return []; }
  }
  try { return JSON.parse(localStorage.getItem(reportsKey(uid)) || "[]"); } catch { return []; }
}

/** Pull the latest count/limit/report_ids from the DB and mirror to localStorage. */
export async function refreshUserUsage(): Promise<void> {
  const uid = getUserId();
  if (!uid) return;
  const { data } = await supabase
    .from("profiles")
    .select("analysis_count, analysis_limit, report_ids, full_access")
    .eq("id", uid)
    .maybeSingle();
  if (!data) return;
  localStorage.setItem(countKey(uid), String(data.analysis_count ?? 0));
  localStorage.setItem(limitKey(uid), String(data.analysis_limit ?? DEFAULT_USER_ANALYSIS_LIMIT));
  localStorage.setItem(reportsKey(uid), JSON.stringify(data.report_ids ?? []));
  localStorage.setItem(FULL_ACCESS_KEY, (data as any).full_access === true ? "true" : "false");
}

/** Admin-only: toggle a user's full-access flag. */
export async function adminSetFullAccess(targetUserId: string, value: boolean): Promise<void> {
  await supabase.from("profiles").update({ full_access: value } as any).eq("id", targetUserId);
}

/** Increment the user's analysis count on the server, then mirror. Returns new count. */
export async function incrementAnalysisCount(): Promise<number> {
  const uid = getUserId();
  const next = getAnalysisCount() + 1;
  if (uid) {
    await supabase.from("profiles").update({ analysis_count: next }).eq("id", uid);
    localStorage.setItem(countKey(uid), String(next));
  } else {
    localStorage.setItem("analysis_count", String(next));
  }
  return next;
}

/** Append a report id to the user's report_ids list, on the server and mirror. */
export async function addUserReportId(reportId: string): Promise<void> {
  const uid = getUserId();
  const current = getUserReportIds();
  if (current.includes(reportId)) return;
  const next = [...current, reportId];
  if (uid) {
    await supabase.from("profiles").update({ report_ids: next as any }).eq("id", uid);
    localStorage.setItem(reportsKey(uid), JSON.stringify(next));
  } else {
    localStorage.setItem("boom_user_reports", JSON.stringify(next));
  }
}

/** Reset the current user's count (self-service, also used by admin via adminResetCount). */
export async function resetAnalysisCount(): Promise<void> {
  const uid = getUserId();
  if (uid) {
    await supabase.from("profiles").update({ analysis_count: 0 }).eq("id", uid);
    localStorage.setItem(countKey(uid), "0");
  } else {
    localStorage.setItem("analysis_count", "0");
  }
}

/** Admin-only: renew (reset to 0) the analysis count for another user. */
export async function adminResetUserCount(targetUserId: string): Promise<void> {
  await supabase.from("profiles").update({ analysis_count: 0 }).eq("id", targetUserId);
}

/** Admin-only: set the analysis limit (cap) for another user. */
export async function adminSetUserLimit(targetUserId: string, limit: number): Promise<void> {
  await supabase.from("profiles").update({ analysis_limit: limit }).eq("id", targetUserId);
}
