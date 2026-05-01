import { useMemo } from "react";
import type { AgentRun } from "@auto-fb/shared";
import { History } from "lucide-react";

type AgentTimelineProps = {
  runs: AgentRun[];
};

export function AgentTimeline({ runs }: AgentTimelineProps) {
  const grouped = useMemo(() => runs.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [runs]);
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <History size={18} />
        <h2 className="text-base font-semibold">Agent timeline</h2>
      </div>
      <ol className="space-y-2">
        {grouped.length === 0 ? <li className="text-sm text-slate-600">No agent runs</li> : null}
        {grouped.map((run) => (
          <li className="rounded-md border border-line p-3 text-sm" key={run.id}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{run.nodeName}</span>
              <span className={run.status === "SUCCESS" ? "text-action" : "text-red-700"}>{run.status}</span>
            </div>
            <div className="mt-1 text-xs text-slate-600">{run.graphRunId}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
