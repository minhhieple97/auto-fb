import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import type { AgentWorkflowRunDetail } from "@auto-fb/shared";
import { queryKeys } from "../../app/query-keys.js";
import { api } from "../../lib/api-client.js";

type CampaignRunPanelProps = {
  canRun?: boolean;
  campaignId?: string | undefined;
  fanpageId?: string | undefined;
  fanpageName?: string | undefined;
  onRunCreated?: (run: AgentWorkflowRunDetail) => void;
};

export function CampaignRunPanel({ canRun = true, campaignId, fanpageId, fanpageName, onRunCreated }: CampaignRunPanelProps) {
  const queryClient = useQueryClient();
  const runWorkflow = useMutation({
    mutationFn: (id: string) => (fanpageId ? api.runFanpageWorkflow(id) : api.runWorkflow(id)),
    onSuccess: (run) => {
      onRunCreated?.(run);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.draftsRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.agentRunsRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.agentWorkflowRunsRoot })
      ]);
    }
  });
  const runTargetId = fanpageId ?? campaignId;

  return (
    <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <h2 className="text-base font-semibold">Campaign run</h2>
        <p className="text-sm text-slate-600">{runTargetId ? fanpageName ?? runTargetId : "No fanpage selected"}</p>
      </div>
      <button
        className="button bg-action text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={!runTargetId || !canRun || runWorkflow.isPending}
        onClick={() => runTargetId && runWorkflow.mutate(runTargetId)}
        title="Run agents"
      >
        <Play size={16} />
        Run agents
      </button>
    </div>
  );
}
