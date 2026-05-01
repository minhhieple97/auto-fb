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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs.js";
import { Badge } from "../../components/ui/badge.js";
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
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-50">
      {/* Fixed Left Sidebar */}
      <aside className="w-80 flex-shrink-0 border-r border-slate-200 bg-white shadow-sm z-10 flex flex-col h-full">
        <div className="flex-1 flex flex-col p-4 overflow-hidden h-full">
          <div className="flex-1 min-h-0">
            <CampaignPanel
              canCreate={canManageCampaigns}
              selectedFanpageId={selectedFanpageId}
              onSelect={selectFanpage}
              onCreated={selectFanpage}
            />
          </div>
          <div className="h-px bg-slate-200 -mx-4 my-4 flex-shrink-0" />
          <div className="flex-1 min-h-0">
            <SourcePanel canCreate={canManageSources} fanpageId={selectedFanpageId} sources={sources.data ?? []} />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Top Actions Panel */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <CampaignRunPanel canRun={canRunWorkflow} fanpageId={selectedFanpageId} fanpageName={selectedFanpage?.name} />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <SearchAgentPanel canRun={canRunWorkflow} campaignId={selectedCampaignId} onGenerated={refreshDashboard} />
            </div>
          </section>

          {/* Tabbed Interface for Detailed Information */}
          <section>
            <Tabs defaultValue="inbox" className="w-full">
              <div className="mb-4 border-b border-slate-200">
                <TabsList className="h-10 bg-transparent p-0 w-full justify-start rounded-none">
                  <TabsTrigger 
                    value="inbox" 
                    className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-2 font-medium text-slate-500 hover:text-slate-900 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
                  >
                    Draft Inbox
                    {drafts.data?.length ? (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-semibold bg-amber-100 text-amber-800 hover:bg-amber-100">
                        {drafts.data.length}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="timeline" 
                    className="rounded-none border-b-2 border-transparent px-4 py-2 font-medium text-slate-500 hover:text-slate-900 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
                  >
                    Agent Timeline
                  </TabsTrigger>
                  <TabsTrigger 
                    value="history" 
                    className="rounded-none border-b-2 border-transparent px-4 py-2 font-medium text-slate-500 hover:text-slate-900 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
                  >
                    Published History
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="mt-4">
                <TabsContent value="inbox" className="mt-0 outline-none">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <DraftInbox canReview={canReviewDrafts} drafts={drafts.data ?? []} onChanged={refreshDashboard} />
                  </div>
                </TabsContent>
                <TabsContent value="timeline" className="mt-0 outline-none">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <AgentTimeline runs={agentRuns.data ?? []} onOpenDetails={() => navigate(adminRoutes.agentRuns)} />
                  </div>
                </TabsContent>
                <TabsContent value="history" className="mt-0 outline-none">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden p-2">
                    <PublishedHistory posts={publishedPosts.data ?? []} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </section>
        </div>
      </main>
    </div>
  );
}
