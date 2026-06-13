import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getRole, syncSessionToLocal, refreshUserUsage, hasFullAccess } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app")({ component: AppLayout });

const ADMIN_ONLY_PREFIXES = ["/dashboard", "/compare", "/top-lists", "/tracked", "/campaigns"];

function AppLayout() {
  const navigate = useNavigate();
  const path = useRouterState({ select: s => s.location.pathname });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const u = data.session?.user;
      await syncSessionToLocal(u?.email, u?.user_metadata as any, u?.id);
      if (!u) { navigate({ to: "/login", replace: true }); return; }
      // Sync per-user analysis count / report ids from the DB (fire and forget; UI reads cached values)
      refreshUserUsage().catch(() => {});
      const role = getRole();
      const fullAccess = hasFullAccess();
      if (role === "user" && !fullAccess && ADMIN_ONLY_PREFIXES.some(p => path === p || path.startsWith(p + "/"))) {
        navigate({ to: "/analyze", replace: true });
        return;
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [navigate, path]);
  if (!ready) return null;
  return <AppShell><Outlet /></AppShell>;
}
