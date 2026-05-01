import { useMutation } from "@tanstack/react-query";
import { sourceSearchResultLimits, type AgentSearchResult, type SourceSearchResponse } from "@auto-fb/shared";
import { Loader2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import { Select } from "../../components/ui/select.js";
import { api } from "../../lib/api-client.js";
import type { SourceTabProps } from "./source-constants.js";
import { SearchResultList } from "./search-result-list.js";

const MIN_QUERY_LENGTH = 2;

export function SearchSourceTab({ fanpageId, canCreate, onSuccess }: SourceTabProps) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState<number>(sourceSearchResultLimits.default);
  const [searchResults, setSearchResults] = useState<SourceSearchResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const searchMutation = useMutation({
    mutationFn: ({ id, q, l }: { id: string; q: string; l: number }) =>
      api.searchSources(id, { query: q, limit: l }),
    onSuccess: (data) => {
      setSearchResults(data);
      setSelectedIds(new Set());
    }
  });

  const addMutation = useMutation({
    mutationFn: ({ id, results }: { id: string; results: AgentSearchResult[] }) =>
      api.addSearchSources(id, { selectedResults: results }),
    onSuccess: () => {
      setSearchResults(null);
      setQuery("");
      setSelectedIds(new Set());
      onSuccess();
    }
  });

  const disabled = !fanpageId || !canCreate;
  const searching = searchMutation.isPending;
  const adding = addMutation.isPending;

  function handleSearch() {
    if (!fanpageId || query.trim().length < MIN_QUERY_LENGTH) return;
    searchMutation.mutate({ id: fanpageId, q: query.trim(), l: limit });
  }

  function handleAddSelected() {
    if (!fanpageId || !searchResults || selectedIds.size === 0) return;
    const selected = searchResults.results.filter((r) => selectedIds.has(r.id));
    addMutation.mutate({ id: fanpageId, results: selected });
  }

  return (
    <div className="grid gap-4 py-4">
      {/* Search controls */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Search query</label>
          <Input
            disabled={disabled || searching}
            placeholder="AI news, market trends, tech..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div className="w-20">
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Limit</label>
          <Select disabled={disabled || searching} value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </Select>
        </div>
        <Button disabled={disabled || searching || query.trim().length < MIN_QUERY_LENGTH} onClick={handleSearch} className="shrink-0">
          {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          <span className="ml-1.5">{searching ? "Searching..." : "Search"}</span>
        </Button>
      </div>

      {searchMutation.isError && (
        <p className="text-xs text-red-600">{(searchMutation.error as Error).message}</p>
      )}

      {/* Results list */}
      {searchResults && searchResults.results.length > 0 && (
        <SearchResultList
          results={searchResults.results}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      )}

      {searchResults && searchResults.results.length === 0 && (
        <div className="py-4 text-center text-sm text-slate-500 border border-dashed rounded-lg">
          No results found. Try a different query.
        </div>
      )}

      {/* Add selected button */}
      {selectedIds.size > 0 && (
        <div className="flex justify-end">
          <Button disabled={adding} onClick={handleAddSelected}>
            {adding ? (
              <><Loader2 size={14} className="mr-1.5 animate-spin" /> Adding...</>
            ) : (
              <><Plus size={14} className="mr-1.5" /> Add {selectedIds.size} Source{selectedIds.size > 1 ? "s" : ""}</>
            )}
          </Button>
        </div>
      )}

      {addMutation.isError && (
        <p className="text-xs text-red-600">{(addMutation.error as Error).message}</p>
      )}
    </div>
  );
}
