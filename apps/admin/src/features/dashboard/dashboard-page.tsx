import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminPermissions } from "@auto-fb/shared";
import { useNavigate } from "react-router-dom";
import { useAdminStore } from "../../app/admin.store.js";
import { useAuth } from "../../app/auth-provider.js";
import { queryKeys } from "../../app/query-keys.js";
import { invalidateDashboardData } from "../../app/query-invalidation.js";
import { adminRoutes } from "../../app/routes.js";
import { AgentTimeline } from "../agent-runs/agent-timeline.js";
import { CampaignPanel } from "../campaigns/campaign-panel.js";
import { DraftInbox } from "../drafts/draft-inbox.js";
import { PublishedHistory } from "../published-posts/published-history.js";
import { SourcePanel } from "../sources/source-panel.js";
import { CampaignRunPanel } from "../workflow/campaign-run-panel.js";
import { SearchAgentPanel } from "../workflow/search-agent-panel.js";
import { api } from "../../lib/api-client.js";

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const selectedFanpageId = useAdminStore((state) => state.selectedFanpageId);
  const setSelectedFanpageId = useAdminStore((state) => state.setSelectedFanpageId);
  const setSelectedCampaignId = useAdminStore((state) => state.setSelectedCampaignId);
  const fanpages = useQuery({ queryKey: queryKeys.fanpages, queryFn: api.fanpages });
  const selectedFanpage = fanpages.data?.find((fanpage) => fanpage.id === selectedFanpageId);
  const selectedCampaignId = selectedFanpage?.campaignId;
  const sources = useQuery({
    queryKey: queryKeys.sources(selectedFanpageId),
    queryFn: () => api.fanpageSources(selectedFanpageId!),
    enabled: Boolean(selectedFanpageId)
  });
  const drafts = useQuery({ queryKey: queryKeys.drafts(selectedFanpageId), queryFn: () => api.drafts(selectedFanpageId) });
  const agentRuns = useQuery({
    queryKey: queryKeys.agentRuns(selectedCampaignId),
    queryFn: () => api.agentRuns(selectedCampaignId ? { campaignId: selectedCampaignId } : {}),
    enabled: Boolean(selectedCampaignId)
  });
  const publishedPosts = useQuery({
    queryKey: queryKeys.publishedPosts(selectedFanpageId),
    queryFn: () => api.publishedPosts(selectedFanpageId)
  });

  useEffect(() => {
    if (!selectedFanpageId && fanpages.data?.[0]) {
      setSelectedFanpageId(fanpages.data[0].id);
      setSelectedCampaignId(fanpages.data[0].campaignId);
    }
  }, [fanpages.data, selectedFanpageId, setSelectedCampaignId, setSelectedFanpageId]);

  function selectFanpage(id: string) {
    setSelectedFanpageId(id);
    setSelectedCampaignId(fanpages.data?.find((fanpage) => fanpage.id === id)?.campaignId);
  }

  const refreshDashboard = () => invalidateDashboardData(queryClient);
  const canManageCampaigns = hasPermission(adminPermissions.manageCampaigns);
  const canManageSources = hasPermission(adminPermissions.manageSources);
  const canRunWorkflow = hasPermission(adminPermissions.runWorkflow);
  const canReviewDrafts = hasPermission(adminPermissions.reviewDrafts);

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-6 py-6 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-4">
        <CampaignPanel
          canCreate={canManageCampaigns}
          selectedFanpageId={selectedFanpageId}
          onSelect={selectFanpage}
          onCreated={selectFanpage}
        />
        <SourcePanel canCreate={canManageSources} fanpageId={selectedFanpageId} sources={sources.data ?? []} />
      </aside>

      <section className="space-y-4">
        <CampaignRunPanel canRun={canRunWorkflow} fanpageId={selectedFanpageId} fanpageName={selectedFanpage?.name} />
        <SearchAgentPanel canRun={canRunWorkflow} campaignId={selectedCampaignId} onGenerated={refreshDashboard} />
        <DraftInbox canReview={canReviewDrafts} drafts={drafts.data ?? []} onChanged={refreshDashboard} />
        <AgentTimeline runs={agentRuns.data ?? []} onOpenDetails={() => navigate(adminRoutes.agentRuns)} />
        <PublishedHistory posts={publishedPosts.data ?? []} />
      </section>
    </div>
  );
}
