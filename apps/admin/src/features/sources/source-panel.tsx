import { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateSourceInput, Source, SourceType } from "@auto-fb/shared";
import { Plus, Send } from "lucide-react";
import { api } from "../../lib/api-client.js";
import { stringField } from "../../lib/form.js";

type SourcePanelProps = {
  campaignId: string | undefined;
  sources: Source[];
};

export function SourcePanel({ campaignId, sources }: SourcePanelProps) {
  const queryClient = useQueryClient();
  const createSource = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateSourceInput }) => api.createSource(id, input),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["sources"] })
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!campaignId) return;
    const form = new FormData(event.currentTarget);
    createSource.mutate({
      id: campaignId,
      input: {
        type: stringField(form, "type") as SourceType,
        url: stringField(form, "url"),
        crawlPolicy: "whitelist_only",
        enabled: true
      }
    });
    event.currentTarget.reset();
  }

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <Send size={18} />
        <h2 className="text-base font-semibold">Sources</h2>
      </div>
      <div className="mb-4 space-y-2">
        {sources.map((source) => (
          <div className="rounded-md border border-line p-3 text-sm" key={source.id}>
            <div className="font-medium">{source.type}</div>
            <div className="break-all text-slate-600">{source.url}</div>
          </div>
        ))}
      </div>
      <form className="grid gap-2" onSubmit={submit}>
        <select className="field" name="type" defaultValue="rss" disabled={!campaignId}>
          <option value="rss">RSS</option>
          <option value="api">JSON API</option>
          <option value="static_html">Static HTML</option>
        </select>
        <input className="field" name="url" placeholder="https://example.com/feed.xml" required disabled={!campaignId} />
        <button className="button bg-ink text-white disabled:bg-slate-300" disabled={!campaignId} title="Add source">
          <Plus size={16} />
          Add source
        </button>
      </form>
    </div>
  );
}
