import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminStore } from "../../app/admin.store.js";
import { AgentTimeline } from "../agent-runs/agent-timeline.js";
import { CampaignPanel } from "../campaigns/campaign-panel.js";
import { DraftInbox } from "../drafts/draft-inbox.js";
import type { AdminRoute } from "../navigation/admin-header.js";
import { AdminHeader } from "../navigation/admin-header.js";
import { PublishedHistory } from "../published-posts/published-history.js";
import { SourcePanel } from "../sources/source-panel.js";
import { CampaignRunPanel } from "../workflow/campaign-run-panel.js";
import { api } from "../../lib/api-client.js";

type DashboardPageProps = {
  onNavigate: (route: AdminRoute) => void;
};

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const queryClient = useQueryClient();
  const selectedCampaignId = useAdminStore((state) => state.selectedCampaignId);
  const setSelectedCampaignId = useAdminStore((state) => state.setSelectedCampaignId);
  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: api.campaigns });
  const sources = useQuery({
    queryKey: ["sources", selectedCampaignId],
    queryFn: () => api.sources(selectedCampaignId!),
    enabled: Boolean(selectedCampaignId)
  });
  const drafts = useQuery({ queryKey: ["drafts"], queryFn: api.drafts });
  const agentRuns = useQuery({
    queryKey: ["agent-runs", selectedCampaignId],
    queryFn: () => api.agentRuns({ campaignId: selectedCampaignId }),
    enabled: Boolean(selectedCampaignId)
  });
  const publishedPosts = useQuery({ queryKey: ["published-posts"], queryFn: api.publishedPosts });

  useEffect(() => {
    if (!selectedCampaignId && campaigns.data?.[0]) {
      setSelectedCampaignId(campaigns.data[0].id);
    }
  }, [campaigns.data, selectedCampaignId, setSelectedCampaignId]);

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
      queryClient.invalidateQueries({ queryKey: ["sources"] }),
      queryClient.invalidateQueries({ queryKey: ["drafts"] }),
      queryClient.invalidateQueries({ queryKey: ["agent-runs"] }),
      queryClient.invalidateQueries({ queryKey: ["published-posts"] })
    ]);
  };

  return (
    <main className="min-h-screen bg-canvas">
      <AdminHeader activeRoute="/" onNavigate={onNavigate} onRefresh={refreshAll} />

      <div className="mx-auto grid max-w-7xl gap-4 px-6 py-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <CampaignPanel selectedCampaignId={selectedCampaignId} onSelect={setSelectedCampaignId} onCreated={setSelectedCampaignId} />
          <SourcePanel campaignId={selectedCampaignId} sources={sources.data ?? []} />
        </aside>

        <section className="space-y-4">
          <CampaignRunPanel campaignId={selectedCampaignId} />
          <DraftInbox drafts={drafts.data ?? []} onChanged={refreshAll} />
          <AgentTimeline runs={agentRuns.data ?? []} onOpenDetails={() => onNavigate("/agent-runs")} />
          <PublishedHistory posts={publishedPosts.data ?? []} />
        </section>
      </div>
    </main>
  );
}
