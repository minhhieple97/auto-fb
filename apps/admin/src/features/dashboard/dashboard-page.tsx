import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAdminStore } from "../../app/admin.store.js";
import { queryKeys } from "../../app/query-keys.js";
import { invalidateDashboardData } from "../../app/query-invalidation.js";
import { adminRoutes } from "../../app/routes.js";
import { AgentTimeline } from "../agent-runs/agent-timeline.js";
import { CampaignPanel } from "../campaigns/campaign-panel.js";
import { DraftInbox } from "../drafts/draft-inbox.js";
import { PublishedHistory } from "../published-posts/published-history.js";
import { SourcePanel } from "../sources/source-panel.js";
import { CampaignRunPanel } from "../workflow/campaign-run-panel.js";
import { api } from "../../lib/api-client.js";

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectedCampaignId = useAdminStore((state) => state.selectedCampaignId);
  const setSelectedCampaignId = useAdminStore((state) => state.setSelectedCampaignId);
  const campaigns = useQuery({ queryKey: queryKeys.campaigns, queryFn: api.campaigns });
  const sources = useQuery({
    queryKey: queryKeys.sources(selectedCampaignId),
    queryFn: () => api.sources(selectedCampaignId!),
    enabled: Boolean(selectedCampaignId)
  });
  const drafts = useQuery({ queryKey: queryKeys.drafts, queryFn: api.drafts });
  const agentRuns = useQuery({
    queryKey: queryKeys.agentRuns(selectedCampaignId),
    queryFn: () => api.agentRuns({ campaignId: selectedCampaignId }),
    enabled: Boolean(selectedCampaignId)
  });
  const publishedPosts = useQuery({ queryKey: queryKeys.publishedPosts, queryFn: api.publishedPosts });

  useEffect(() => {
    if (!selectedCampaignId && campaigns.data?.[0]) {
      setSelectedCampaignId(campaigns.data[0].id);
    }
  }, [campaigns.data, selectedCampaignId, setSelectedCampaignId]);

  const refreshDashboard = () => invalidateDashboardData(queryClient);

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-6 py-6 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-4">
        <CampaignPanel selectedCampaignId={selectedCampaignId} onSelect={setSelectedCampaignId} onCreated={setSelectedCampaignId} />
        <SourcePanel campaignId={selectedCampaignId} sources={sources.data ?? []} />
      </aside>

      <section className="space-y-4">
        <CampaignRunPanel campaignId={selectedCampaignId} />
        <DraftInbox drafts={drafts.data ?? []} onChanged={refreshDashboard} />
        <AgentTimeline runs={agentRuns.data ?? []} onOpenDetails={() => navigate(adminRoutes.agentRuns)} />
        <PublishedHistory posts={publishedPosts.data ?? []} />
      </section>
    </div>
  );
}
