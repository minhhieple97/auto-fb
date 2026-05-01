import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import type { AgentWorkflowRunDetail } from "@auto-fb/shared";
import { api } from "../../lib/api-client.js";

type CampaignRunPanelProps = {
  campaignId: string | undefined;
  onRunCreated?: (run: AgentWorkflowRunDetail) => void;
};

export function CampaignRunPanel({ campaignId, onRunCreated }: CampaignRunPanelProps) {
  const queryClient = useQueryClient();
  const runWorkflow = useMutation({
    mutationFn: (id: string) => api.runWorkflow(id),
    onSuccess: (run) => {
      onRunCreated?.(run);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ["drafts"] }),
        queryClient.invalidateQueries({ queryKey: ["agent-runs"] }),
        queryClient.invalidateQueries({ queryKey: ["agent-workflow-runs"] })
      ]);
    }
  });

  return (
    <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <h2 className="text-base font-semibold">Campaign run</h2>
        <p className="text-sm text-slate-600">{campaignId ? campaignId : "No campaign selected"}</p>
      </div>
      <button
        className="button bg-action text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={!campaignId || runWorkflow.isPending}
        onClick={() => campaignId && runWorkflow.mutate(campaignId)}
        title="Run agents"
      >
        <Play size={16} />
        Run agents
      </button>
    </div>
  );
}
