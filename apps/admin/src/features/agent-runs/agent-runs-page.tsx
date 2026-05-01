import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AgentRun, AgentWorkflowRunDetail } from "@auto-fb/shared";
import { agentWorkflowNodeNames } from "@auto-fb/shared";
import { AlertTriangle, Bot, CheckCircle2, Clock3, LoaderCircle, XCircle } from "lucide-react";
import { useAdminStore } from "../../app/admin.store.js";
import { api } from "../../lib/api-client.js";
import type { AdminRoute } from "../navigation/admin-header.js";
import { AdminHeader } from "../navigation/admin-header.js";
import { CampaignRunPanel } from "../workflow/campaign-run-panel.js";

type AgentRunsPageProps = {
  onNavigate: (route: AdminRoute) => void;
};

const stepOrder = new Map<string, number>(agentWorkflowNodeNames.map((name, index) => [name, index]));

export function AgentRunsPage({ onNavigate }: AgentRunsPageProps) {
  const queryClient = useQueryClient();
  const selectedCampaignId = useAdminStore((state) => state.selectedCampaignId);
  const setSelectedCampaignId = useAdminStore((state) => state.setSelectedCampaignId);
  const [selectedGraphRunId, setSelectedGraphRunId] = useState<string>();
  const [selectedStepId, setSelectedStepId] = useState<string>();
  const [streamError, setStreamError] = useState<string>();
  const workflowQueryKey = useMemo(() => ["agent-workflow-runs", selectedCampaignId ?? "all"] as const, [selectedCampaignId]);

  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: api.campaigns });
  const workflowRuns = useQuery({
    queryKey: workflowQueryKey,
    queryFn: () => api.agentWorkflowRuns({ ...(selectedCampaignId ? { campaignId: selectedCampaignId } : {}), limit: 50 })
  });

  useEffect(() => {
    const firstRun = workflowRuns.data?.[0];
    if (!selectedGraphRunId && firstRun) {
      setSelectedGraphRunId(firstRun.graphRunId);
    }
    if (selectedGraphRunId && workflowRuns.data && !workflowRuns.data.some((run) => run.graphRunId === selectedGraphRunId)) {
      setSelectedGraphRunId(firstRun?.graphRunId);
    }
  }, [selectedGraphRunId, workflowRuns.data]);

  const selectedRun = workflowRuns.data?.find((run) => run.graphRunId === selectedGraphRunId);
  const orderedSteps = useMemo(() => orderSteps(selectedRun?.steps ?? []), [selectedRun?.steps]);

  useEffect(() => {
    const preferredStep = orderedSteps.find((step) => step.status === "RUNNING") ?? orderedSteps[0];
    if (!selectedStepId && preferredStep) {
      setSelectedStepId(preferredStep.id);
    }
    if (selectedStepId && !orderedSteps.some((step) => step.id === selectedStepId)) {
      setSelectedStepId(preferredStep?.id);
    }
  }, [orderedSteps, selectedStepId]);

  const selectedStep = orderedSteps.find((step) => step.id === selectedStepId);
  const counters = useMemo(() => summarizeRuns(workflowRuns.data ?? []), [workflowRuns.data]);

  useEffect(() => {
    setStreamError(undefined);
    return api.streamAgentWorkflowRuns({
      ...(selectedCampaignId ? { campaignId: selectedCampaignId } : {}),
      onEvent: (event) => {
        queryClient.setQueryData<AgentWorkflowRunDetail[]>(workflowQueryKey, (current = []) => upsertWorkflowRun(current, event.run));
        queryClient.invalidateQueries({ queryKey: ["agent-runs"] });
        setSelectedGraphRunId((current) => current ?? event.run.graphRunId);
      },
      onError: (error) => setStreamError(error.message)
    });
  }, [queryClient, selectedCampaignId, workflowQueryKey]);

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
      queryClient.invalidateQueries({ queryKey: ["agent-workflow-runs"] }),
      queryClient.invalidateQueries({ queryKey: ["agent-runs"] }),
      queryClient.invalidateQueries({ queryKey: ["drafts"] })
    ]);
  };

  return (
    <main className="min-h-screen bg-canvas">
      <AdminHeader activeRoute="/agent-runs" onNavigate={onNavigate} onRefresh={refreshAll} />

      <div className="mx-auto grid max-w-7xl gap-4 px-6 py-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <section className="panel p-4">
            <div className="mb-3 flex items-center gap-2">
              <Bot size={18} />
              <h2 className="text-base font-semibold">Agent runs</h2>
            </div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="agent-run-campaign">
              Campaign
            </label>
            <select
              className="field w-full"
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
          </section>

          <CampaignRunPanel
            campaignId={selectedCampaignId}
            onRunCreated={(run) => {
              queryClient.setQueryData<AgentWorkflowRunDetail[]>(workflowQueryKey, (current = []) => upsertWorkflowRun(current, run));
              setSelectedGraphRunId(run.graphRunId);
            }}
          />

          <SummaryCounters {...counters} />

          <section className="panel p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Workflow history</h2>
              {workflowRuns.isFetching ? <LoaderCircle className="animate-spin text-slate-500" size={16} /> : null}
            </div>
            {streamError ? (
              <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 shrink-0" size={16} />
                <span>{streamError}</span>
              </div>
            ) : null}
            <div className="space-y-2">
              {(workflowRuns.data ?? []).length === 0 ? <p className="text-sm text-slate-600">No workflow runs</p> : null}
              {(workflowRuns.data ?? []).map((run) => (
                <button
                  className={`w-full rounded-md border p-3 text-left text-sm ${
                    run.graphRunId === selectedGraphRunId ? "border-action bg-emerald-50" : "border-line bg-white"
                  }`}
                  key={run.graphRunId}
                  onClick={() => setSelectedGraphRunId(run.graphRunId)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{run.currentNodeName ?? run.graphRunId.slice(0, 8)}</span>
                    <StatusPill status={run.status} />
                  </div>
                  <div className="mt-1 text-xs text-slate-600">{run.triggeredByEmail ?? run.triggeredByUserId}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatDate(run.createdAt)}</div>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          <WorkflowRunDetail
            onSelectStep={setSelectedStepId}
            run={selectedRun}
            selectedStep={selectedStep}
            selectedStepId={selectedStepId}
            steps={orderedSteps}
          />
        </section>
      </div>
    </main>
  );
}

function SummaryCounters({ failed, running, success, total }: { failed: number; running: number; success: number; total: number }) {
  return (
    <section className="grid grid-cols-2 gap-3">
      <Counter label="Running" value={running} icon={<Clock3 size={16} />} />
      <Counter label="Success" value={success} icon={<CheckCircle2 size={16} />} />
      <Counter label="Failed" value={failed} icon={<XCircle size={16} />} />
      <Counter label="Total" value={total} icon={<Bot size={16} />} />
    </section>
  );
}

function Counter({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="panel p-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold text-ink">{value}</div>
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
      <section className="panel p-5">
        <h2 className="text-base font-semibold">Run detail</h2>
        <p className="mt-2 text-sm text-slate-600">Select a workflow run to inspect its steps.</p>
      </section>
    );
  }

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Run detail</h2>
          <p className="mt-1 font-mono text-xs text-slate-600">{run.graphRunId}</p>
        </div>
        <StatusPill status={run.status} />
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <DetailTerm label="Actor" value={run.triggeredByEmail ?? run.triggeredByUserId} />
        <DetailTerm label="Current node" value={run.currentNodeName ?? "-"} />
        <DetailTerm label="Triggered" value={formatDate(run.createdAt)} />
        <DetailTerm label="Duration" value={formatDuration(run.startedAt, run.finishedAt)} />
      </dl>

      <div className="mt-5 grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="space-y-2">
          {steps.length === 0 ? <p className="rounded-md border border-line p-3 text-sm text-slate-600">No steps recorded yet</p> : null}
          {steps.map((step) => (
            <button
              className={`w-full rounded-md border p-3 text-left text-sm ${
                step.id === selectedStepId ? "border-action bg-emerald-50" : "border-line bg-white"
              }`}
              key={step.id}
              onClick={() => onSelectStep(step.id)}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{step.nodeName}</span>
                <StatusPill status={step.status} />
              </div>
              <div className="mt-1 text-xs text-slate-500">{formatDuration(step.startedAt, step.completedAt)}</div>
            </button>
          ))}
        </div>

        <JsonInspector step={selectedStep} />
      </div>
    </section>
  );
}

function DetailTerm({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-3">
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-slate-800">{value}</dd>
    </div>
  );
}

function JsonInspector({ step }: { step: AgentRun | undefined }) {
  if (!step) {
    return <div className="rounded-md border border-line p-4 text-sm text-slate-600">Select a step to inspect JSON state.</div>;
  }

  return (
    <div className="space-y-3">
      <JsonBlock label="Input" value={step.inputJson} />
      <JsonBlock label="Output" value={step.outputJson} />
      <JsonBlock label="Error" value={step.errorMessage ?? "No error"} />
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold">{label}</h3>
      <pre className="max-h-64 overflow-auto rounded-md border border-line bg-slate-950 p-3 text-xs leading-5 text-slate-100">
        {formatJson(value)}
      </pre>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const className =
    status === "SUCCESS"
      ? "bg-emerald-100 text-emerald-800"
      : status === "FAILED"
        ? "bg-red-100 text-red-800"
        : status === "RUNNING"
          ? "bg-blue-100 text-blue-800"
          : "bg-slate-100 text-slate-700";
  return <span className={`rounded px-2 py-1 text-xs font-semibold ${className}`}>{status}</span>;
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
    running: runs.filter((run) => run.status === "QUEUED" || run.status === "RUNNING").length,
    success: runs.filter((run) => run.status === "SUCCESS").length,
    failed: runs.filter((run) => run.status === "FAILED").length
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
  const seconds = Math.round(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}
