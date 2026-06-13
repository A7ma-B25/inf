import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GrowthTab } from "@/components/report/sections";
import { isAdmin } from "@/lib/auth";

export const Route = createFileRoute("/_app/report/$id/growth")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  const { data: r } = useQuery({
    queryKey: ["influencer", id],
    queryFn: async () => (await supabase.from("influencers").select("*").eq("id", id).maybeSingle()).data,
  });
  if (!r) return null;
  return <GrowthTab r={r} isAdmin={isAdmin()} />;
}
