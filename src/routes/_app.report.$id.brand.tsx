import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BrandTab } from "@/components/report/sections";
import { isAdmin } from "@/lib/auth";

export const Route = createFileRoute("/_app/report/$id/brand")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  const { data: r } = useQuery({
    queryKey: ["influencer", id],
    queryFn: async () => (await supabase.from("influencers").select("*").eq("id", id).maybeSingle()).data,
  });
  if (!r) return null;
  return <BrandTab r={r} isAdmin={isAdmin()} />;
}
