import { useEffect, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AgentRun, AgentWorkflowRunDetail } from "@auto-fb/shared";
import { adminPermissions, agentRunStatuses, agentWorkflowNodeNames, agentWorkflowRunStatuses, workflowRunListLimits } from "@auto-fb/shared";
import { AlertTriangle, Bot, CheckCircle2, Clock3, LoaderCircle, XCircle } from "lucide-react";
import { useAdminStore } from "../../app/admin.store.js";
import { useAuth } from "../../app/auth-provider.js";
import { queryKeys } from "../../app/query-keys.js";
import { api } from "../../lib/api-client.js";
import { CampaignRunPanel } from "../workflow/campaign-run-panel.js";
import { agentRunsDisplay } from "./agent-runs.constants.js";
import { Badge } from "../../components/ui/badge.js";
import { ScrollArea } from "../../components/ui/scroll-area.js";

const stepOrder = new Map<string, number>(agentWorkflowNodeNames.map((name, index) => [name, index]));

export function AgentRunsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const selectedCampaignId = useAdminStore((state) => state.selectedCampaignId);
  const setSelectedCampaignId = useAdminStore((state) => state.setSelectedCampaignId);
  const [{ selectedGraphRunId, selectedStepId, streamError }, dispatch] = useReducer(agentRunsPageReducer, initialAgentRunsPageState);
  const workflowQueryKey = useMemo(() => queryKeys.agentWorkflowRuns(selectedCampaignId), [selectedCampaignId]);

  const campaigns = useQuery({ queryKey: queryKeys.campaigns, queryFn: api.campaigns });
  const workflowRuns = useQuery({
    queryKey: workflowQueryKey,
    queryFn: () => api.agentWorkflowRuns({ ...(selectedCampaignId ? { campaignId: selectedCampaignId } : {}), limit: workflowRunListLimits.default })
  });

  useEffect(() => {
    const firstRun = workflowRuns.data?.[0];
    if (!selectedGraphRunId && firstRun) {
      dispatch({ graphRunId: firstRun.graphRunId, type: "selectRun" });
    }
    if (selectedGraphRunId && workflowRuns.data && !workflowRuns.data.some((run) => run.graphRunId === selectedGraphRunId)) {
      dispatch({ graphRunId: firstRun?.graphRunId, type: "selectRun" });
    }
  }, [selectedGraphRunId, workflowRuns.data]);

  const selectedRun = workflowRuns.data?.find((run) => run.graphRunId === selectedGraphRunId);
  const orderedSteps = useMemo(() => orderSteps(selectedRun?.steps ?? []), [selectedRun?.steps]);

  useEffect(() => {
    const preferredStep = orderedSteps.find((step) => step.status === agentRunStatuses.running) ?? orderedSteps[0];
    if (!selectedStepId && preferredStep) {
      dispatch({ stepId: preferredStep.id, type: "selectStep" });
    }
    if (selectedStepId && !orderedSteps.some((step) => step.id === selectedStepId)) {
      dispatch({ stepId: preferredStep?.id, type: "selectStep" });
    }
  }, [orderedSteps, selectedStepId]);

  const selectedStep = orderedSteps.find((step) => step.id === selectedStepId);
  const counters = useMemo(() => summarizeRuns(workflowRuns.data ?? []), [workflowRuns.data]);
  const canRunWorkflow = hasPermission(adminPermissions.runWorkflow);

  useEffect(() => {
    dispatch({ type: "streamStarted" });
    return api.streamAgentWorkflowRuns({
      ...(selectedCampaignId ? { campaignId: selectedCampaignId } : {}),
      onEvent: (event) => {
        queryClient.setQueryData<AgentWorkflowRunDetail[]>(workflowQueryKey, (current = []) => upsertWorkflowRun(current, event.run));
        queryClient.invalidateQueries({ queryKey: queryKeys.agentRunsRoot });
        dispatch({ graphRunId: event.run.graphRunId, type: "streamEvent" });
      },
      onError: (error) => dispatch({ message: error.message, type: "streamFailed" })
    });
  }, [queryClient, selectedCampaignId, workflowQueryKey]);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-50">
      {/* Fixed Left Sidebar */}
      <aside className="w-80 flex-shrink-0 border-r border-slate-200 bg-white shadow-sm z-10 flex flex-col h-full">
        <div className="p-4 border-b border-slate-200">
          <div className="mb-3 flex items-center gap-2 text-slate-800">
            <Bot size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold">Agent Runs</h2>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="agent-run-campaign">
              Filter by Campaign
            </label>
            <select
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              id="agent-run-campaign"
              onChange={(event) => setSelectedCampaignId(event.target.value || undefined)}
              value={selectedCampaignId ?? ""}
            >
              <option value="">All campaigns</option>
              {(campaigns.data ?? []).map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Workflow History</h3>
            {workflowRuns.isFetching ? <LoaderCircle className="animate-spin text-slate-400" size={14} /> : null}
          </div>
          
          {streamError ? (
            <div className="mx-4 mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 shadow-sm">
              <AlertTriangle className="mt-0.5 shrink-0" size={14} />
              <span>{streamError}</span>
            </div>
          ) : null}

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-2 pb-4">
              {(workflowRuns.data ?? []).length === 0 ? <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-200 rounded-lg">No workflow runs found</p> : null}
              {(workflowRuns.data ?? []).map((run) => (
                <button
                  className={`w-full group rounded-lg border p-3 text-left transition-all hover:shadow-sm ${
                    run.graphRunId === selectedGraphRunId 
                      ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500/20" 
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  key={run.graphRunId}
                  onClick={() => dispatch({ graphRunId: run.graphRunId, type: "selectRun" })}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`font-semibold text-sm truncate ${run.graphRunId === selectedGraphRunId ? 'text-blue-900' : 'text-slate-900'}`}>
                      {run.currentNodeName ?? run.graphRunId.slice(0, agentRunsDisplay.graphRunIdPreviewLength)}
                    </span>
                    <StatusPill status={run.status} />
                  </div>
                  <div className="text-xs text-slate-500 truncate mb-1">
                    Actor: <span className="text-slate-700 font-medium">{run.triggeredByEmail ?? run.triggeredByUserId}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {formatDate(run.createdAt)}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <SummaryCounters {...counters} />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col justify-center">
              <CampaignRunPanel
                canRun={canRunWorkflow}
                campaignId={selectedCampaignId}
                onRunCreated={(run) => {
                  queryClient.setQueryData<AgentWorkflowRunDetail[]>(workflowQueryKey, (current = []) => upsertWorkflowRun(current, run));
                  dispatch({ graphRunId: run.graphRunId, type: "selectRun" });
                }}
              />
            </div>
          </div>

          <WorkflowRunDetail
            onSelectStep={(stepId) => dispatch({ stepId, type: "selectStep" })}
            run={selectedRun}
            selectedStep={selectedStep}
            selectedStepId={selectedStepId}
            steps={orderedSteps}
          />
        </div>
      </main>
    </div>
  );
}

type AgentRunsPageState = {
  selectedGraphRunId: string | undefined;
  selectedStepId: string | undefined;
  streamError: string | undefined;
};

type AgentRunsPageAction =
  | { graphRunId: string | undefined; type: "selectRun" }
  | { stepId: string | undefined; type: "selectStep" }
  | { type: "streamStarted" }
  | { graphRunId: string; type: "streamEvent" }
  | { message: string; type: "streamFailed" };

const initialAgentRunsPageState: AgentRunsPageState = {
  selectedGraphRunId: undefined,
  selectedStepId: undefined,
  streamError: undefined
};

function agentRunsPageReducer(state: AgentRunsPageState, action: AgentRunsPageAction): AgentRunsPageState {
  switch (action.type) {
    case "selectRun":
      return { ...state, selectedGraphRunId: action.graphRunId };
    case "selectStep":
      return { ...state, selectedStepId: action.stepId };
    case "streamStarted":
      return { ...state, streamError: undefined };
    case "streamEvent":
      return {
        ...state,
        selectedGraphRunId: state.selectedGraphRunId ?? action.graphRunId,
        streamError: undefined
      };
    case "streamFailed":
      return { ...state, streamError: action.message };
  }
}

function SummaryCounters({ failed, running, success, total }: { failed: number; running: number; success: number; total: number }) {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 h-full">
      <Counter label="Running" value={running} icon={<Clock3 size={16} className="text-blue-500" />} />
      <Counter label="Success" value={success} icon={<CheckCircle2 size={16} className="text-emerald-500" />} />
      <Counter label="Failed" value={failed} icon={<XCircle size={16} className="text-red-500" />} />
      <Counter label="Total" value={total} icon={<Bot size={16} className="text-slate-500" />} />
    </section>
  );
}

function Counter({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function WorkflowRunDetail({
  onSelectStep,
  run,
  selectedStep,
  selectedStepId,
  steps
}: {
  onSelectStep: (id: string) => void;
  run: AgentWorkflowRunDetail | undefined;
  selectedStep: AgentRun | undefined;
  selectedStepId: string | undefined;
  steps: AgentRun[];
}) {
  if (!run) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <Bot size={48} className="mx-auto text-slate-200 mb-4" />
        <h2 className="text-lg font-semibold text-slate-800">Run Detail</h2>
        <p className="mt-2 text-sm text-slate-500">Select a workflow run from the sidebar to inspect its steps.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="border-b border-slate-200 p-6 bg-slate-50/50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Run Detail</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-[11px] font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">{run.graphRunId}</span>
            </div>
          </div>
          <StatusPill status={run.status} className="text-xs px-3 py-1.5" />
        </div>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <DetailTerm label="Actor" value={run.triggeredByEmail ?? run.triggeredByUserId} />
          <DetailTerm label="Current node" value={run.currentNodeName ?? "-"} />
          <DetailTerm label="Triggered" value={formatDate(run.createdAt)} />
          <DetailTerm label="Duration" value={formatDuration(run.startedAt, run.finishedAt)} />
        </dl>
      </div>

      <div className="grid gap-0 lg:grid-cols-[320px_1fr] min-h-[500px]">
        {/* Steps List */}
        <div className="border-r border-slate-200 bg-slate-50 p-4 overflow-y-auto">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 ml-1">Execution Steps</h3>
          <div className="space-y-2">
            {steps.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">No steps recorded yet</p> : null}
            {steps.map((step) => (
              <button
                className={`w-full group rounded-lg border p-3 text-left transition-all ${
                  step.id === selectedStepId 
                    ? "border-blue-500 bg-white shadow-sm ring-1 ring-blue-500/20" 
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
                key={step.id}
                onClick={() => onSelectStep(step.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`font-semibold text-sm truncate ${step.id === selectedStepId ? 'text-blue-900' : 'text-slate-900'}`}>
                    {step.nodeName}
                  </span>
                  <StatusPill status={step.status} />
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {formatDuration(step.startedAt, step.completedAt)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* JSON Inspector */}
        <div className="p-6 bg-white overflow-y-auto">
          <JsonInspector step={selectedStep} />
        </div>
      </div>
    </section>
  );
}

function DetailTerm({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</dt>
      <dd className="text-sm font-medium text-slate-900 break-words">{value}</dd>
    </div>
  );
}

function JsonInspector({ step }: { step: AgentRun | undefined }) {
  if (!step) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 p-8 text-sm text-slate-500 bg-slate-50/50">
        Select a step from the left to inspect its JSON state.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="text-base font-bold text-slate-900">Step Inspector</h3>
        <Badge variant="outline" className="text-slate-500 font-medium bg-slate-50">{step.nodeName}</Badge>
      </div>
      <JsonBlock label="Input Payload" value={step.inputJson} />
      <JsonBlock label="Output Response" value={step.outputJson} />
      {step.errorMessage ? (
        <JsonBlock label="Error Message" value={step.errorMessage} isError />
      ) : null}
    </div>
  );
}

function JsonBlock({ label, value, isError }: { label: string; value: unknown; isError?: boolean }) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</h4>
      <pre className={`max-h-96 overflow-auto rounded-lg border p-4 text-[13px] leading-relaxed font-mono shadow-sm ${
        isError 
          ? "border-red-200 bg-red-50 text-red-900" 
          : "border-slate-800 bg-slate-950 text-slate-50"
      }`}>
        {formatJson(value)}
      </pre>
    </section>
  );
}

function StatusPill({ status, className = "" }: { status: string; className?: string }) {
  const colorClass =
    status === agentRunStatuses.success
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === agentRunStatuses.failed
        ? "bg-red-50 text-red-700 border-red-200"
        : status === agentRunStatuses.running
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-slate-50 text-slate-600 border-slate-200";
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colorClass} ${className}`}>{status}</span>;
}

function orderSteps(steps: AgentRun[]): AgentRun[] {
  return steps
    .slice()
    .sort(
      (a, b) =>
        (stepOrder.get(a.nodeName) ?? Number.MAX_SAFE_INTEGER) - (stepOrder.get(b.nodeName) ?? Number.MAX_SAFE_INTEGER) ||
        a.createdAt.localeCompare(b.createdAt)
    );
}

function summarizeRuns(runs: AgentWorkflowRunDetail[]) {
  return {
    total: runs.length,
    running: runs.filter((run) => run.status === agentWorkflowRunStatuses.queued || run.status === agentWorkflowRunStatuses.running).length,
    success: runs.filter((run) => run.status === agentWorkflowRunStatuses.success).length,
    failed: runs.filter((run) => run.status === agentWorkflowRunStatuses.failed).length
  };
}

function upsertWorkflowRun(runs: AgentWorkflowRunDetail[], run: AgentWorkflowRunDetail): AgentWorkflowRunDetail[] {
  const next = [run, ...runs.filter((item) => item.graphRunId !== run.graphRunId)];
  return next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function formatJson(value: unknown): string {
  return typeof value === "string" ? value : (JSON.stringify(value, null, 2) ?? "undefined");
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function formatDuration(startedAt: string | undefined, finishedAt: string | undefined): string {
  if (!startedAt) return "Not started";
  if (!finishedAt) return "In progress";
  const diffMs = Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt));
  const seconds = Math.round(diffMs / agentRunsDisplay.millisecondsPerSecond);
  if (seconds < agentRunsDisplay.secondsPerMinute) return `${seconds}s`;
  const minutes = Math.floor(seconds / agentRunsDisplay.secondsPerMinute);
  return `${minutes}m ${seconds % agentRunsDisplay.secondsPerMinute}s`;
}
