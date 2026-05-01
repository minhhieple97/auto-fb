import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { agentSearchDefaults, agentSearchResultLimits, type AgentSearchResult } from "@auto-fb/shared";
import { FileText, Search, Sparkles } from "lucide-react";
import { queryKeys } from "../../app/query-keys.js";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import { Textarea } from "../../components/ui/textarea.js";
import { api } from "../../lib/api-client.js";

type SearchAgentPanelProps = {
  canRun?: boolean;
  campaignId: string | undefined;
  onGenerated?: () => Promise<void>;
};

export function SearchAgentPanel({ canRun = true, campaignId, onGenerated }: SearchAgentPanelProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState<number>(agentSearchDefaults.resultLimit);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [instructions, setInstructions] = useState("");
  const searchAgent = useMutation({
    mutationFn: () =>
      api.searchAgent(campaignId!, {
        query,
        limit,
        provider: agentSearchDefaults.provider,
        model: agentSearchDefaults.model
      }),
    onSuccess: () => setSelectedIds(new Set())
  });
  const generate = useMutation({
    mutationFn: (selectedResults: AgentSearchResult[]) =>
      api.generateFromSearch(campaignId!, {
        selectedResults,
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        provider: agentSearchDefaults.provider,
        model: agentSearchDefaults.model
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.draftsRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sourcesRoot }),
        onGenerated?.()
      ]);
      setInstructions("");
    }
  });

  const results = searchAgent.data?.results ?? [];
  const selectedResults = useMemo(() => results.filter((result) => selectedIds.has(result.id)), [results, selectedIds]);
  const disabled = !campaignId || !canRun || searchAgent.isPending || generate.isPending;

  function toggleResult(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <Search size={18} />
        <h2 className="text-base font-semibold">Search agent</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
        <Input
          aria-label="Search query"
          disabled={!campaignId || !canRun || searchAgent.isPending}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search query"
          value={query}
        />
        <select
          aria-label="Result limit"
          className="field"
          disabled={!campaignId || !canRun || searchAgent.isPending}
          onChange={(event) => setLimit(Number(event.target.value))}
          value={limit}
        >
          <option value={agentSearchResultLimits.default}>{agentSearchResultLimits.default}</option>
          <option value={agentSearchResultLimits.max}>{agentSearchResultLimits.max}</option>
        </select>
        <Button
          disabled={disabled || query.trim().length < 2}
          onClick={() => searchAgent.mutate()}
          title="Search sources"
          type="button"
          variant="outline"
        >
          <Search size={16} />
          {searchAgent.isPending ? "Searching" : "Search"}
        </Button>
      </div>

      {searchAgent.error ? <p className="mt-3 text-sm text-warn">{searchAgent.error.message}</p> : null}
      {generate.error ? <p className="mt-3 text-sm text-warn">{generate.error.message}</p> : null}

      {results.length > 0 ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium">{results.length} results</div>
            <Button
              disabled={disabled || selectedResults.length === 0}
              onClick={() => generate.mutate(selectedResults)}
              title="Generate draft"
              type="button"
              variant="action"
            >
              <Sparkles size={16} />
              {generate.isPending ? "Generating" : "Generate draft"}
            </Button>
          </div>
          <Textarea
            aria-label="Generation instructions"
            disabled={disabled}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Generation instructions"
            value={instructions}
          />
          <div className="space-y-2">
            {results.map((result) => (
              <label className="block rounded-md border border-line p-3 text-sm" key={result.id}>
                <div className="flex items-start gap-3">
                  <input
                    checked={selectedIds.has(result.id)}
                    className="mt-1"
                    disabled={disabled}
                    onChange={() => toggleResult(result.id)}
                    type="checkbox"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 flex items-center gap-2 font-medium">
                      <FileText size={15} />
                      <span>{result.title}</span>
                    </span>
                    <a className="break-all text-xs text-action" href={result.url} rel="noreferrer" target="_blank">
                      {result.sourceName ?? result.url}
                    </a>
                    {result.snippet ? <span className="mt-2 block text-slate-600">{result.snippet}</span> : null}
                  </span>
                </div>
              </label>
            ))}
          </div>
          {searchAgent.data?.searchEntryPointHtml ? (
            <div className="text-xs text-slate-500" dangerouslySetInnerHTML={{ __html: searchAgent.data.searchEntryPointHtml }} />
          ) : null}
        </div>
      ) : searchAgent.isSuccess ? (
        <p className="mt-3 text-sm text-slate-600">No grounded results returned.</p>
      ) : null}
    </div>
  );
}
