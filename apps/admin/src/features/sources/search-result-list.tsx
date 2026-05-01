import type { AgentSearchResult } from "@auto-fb/shared";
import { useCallback } from "react";

type SearchResultListProps = {
  results: AgentSearchResult[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
};

export function SearchResultList({ results, selectedIds, onSelectionChange }: SearchResultListProps) {
  const allSelected = selectedIds.size === results.length;

  const toggleOne = useCallback(
    (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange]
  );

  const toggleAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(results.map((r) => r.id)));
    }
  }, [allSelected, results, onSelectionChange]);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Header with select-all */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            className="rounded border-slate-300"
            checked={allSelected}
            onChange={toggleAll}
          />
          {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
        </label>
        <span className="text-xs text-slate-400">{results.length} results</span>
      </div>

      {/* Scrollable result items */}
      <div className="max-h-80 overflow-y-auto">
        <div className="divide-y divide-slate-100">
          {results.map((result) => (
            <SearchResultItem
              key={result.id}
              result={result}
              selected={selectedIds.has(result.id)}
              onToggle={toggleOne}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Individual result row ─────────────────────────────────────────────── */

type SearchResultItemProps = {
  result: AgentSearchResult;
  selected: boolean;
  onToggle: (id: string) => void;
};

function SearchResultItem({ result, selected, onToggle }: SearchResultItemProps) {
  return (
    <label
      className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-slate-50 ${
        selected ? "bg-violet-50/50" : ""
      }`}
    >
      <input
        type="checkbox"
        className="mt-0.5 shrink-0 rounded border-slate-300"
        checked={selected}
        onChange={() => onToggle(result.id)}
      />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-sm font-medium text-slate-800 truncate">{result.title}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">{result.url}</p>
        {result.snippet && (
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{result.snippet}</p>
        )}
      </div>
    </label>
  );
}
