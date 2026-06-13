import { createFileRoute } from "@tanstack/react-router";
import { AiInsightsTab } from "@/components/report/AiInsightsTab";

export const Route = createFileRoute("/_app/report/$id/ai")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  return <AiInsightsTab influencerId={id} />;
}
