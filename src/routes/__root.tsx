import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";
import { ThemeProvider } from "@/lib/theme";
import { ErrorFallback } from "@/components/ErrorFallback";
import "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { applyLangToDocument } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { syncSessionToLocal } from "@/lib/auth";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Boom Teams — Influencer Analysis" },
      { name: "description", content: "AI-powered influencer analysis platform" },
      { property: "og:title", content: "Boom Teams — Influencer Analysis" },
      { name: "twitter:title", content: "Boom Teams — Influencer Analysis" },
      { property: "og:description", content: "AI-powered influencer analysis platform" },
      { name: "twitter:description", content: "AI-powered influencer analysis platform" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/38c91948-1294-42fa-9d10-dda459333f3b/id-preview-e26dab01--4becd43a-34e6-4017-8832-bb5c28d0c7c1.lovable.app-1779785625173.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/38c91948-1294-42fa-9d10-dda459333f3b/id-preview-e26dab01--4becd43a-34e6-4017-8832-bb5c28d0c7c1.lovable.app-1779785625173.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  errorComponent: ({ error, reset }) => <ErrorFallback error={error} reset={reset} />,
  notFoundComponent: () => <ErrorFallback error={new Error("Page not found")} />,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head><HeadContent /></head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { i18n } = useTranslation();
  // After hydration: sync language from localStorage, then keep <html> in sync.
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("boom_lang") : null;
      if (saved && (saved === "ar" || saved === "en") && saved !== i18n.language) {
        i18n.changeLanguage(saved);
        return; // languageChanged handler will applyLangToDocument
      }
    } catch {}
    applyLangToDocument(i18n.language || "ar");
  }, [i18n.language]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      syncSessionToLocal(u?.email, u?.user_metadata as any, u?.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      syncSessionToLocal(u?.email, u?.user_metadata as any, u?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ScrollToTop />
        <Outlet />
        <Toaster richColors position="bottom-right" duration={3000} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
function ScrollToTop() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" as any }); }, [pathname]);
  return null;
}
