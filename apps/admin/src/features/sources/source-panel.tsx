import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  sourceDefaults,
  sourceSearchResultLimits,
  sourceTypeSchema,
  sourceTypes,
  type AgentSearchResult,
  type CreateSourceInput,
  type Source,
  type SourceSearchResponse
} from "@auto-fb/shared";
import { FileText, Globe, Loader2, Plus, Rss, Search, Sparkles, Terminal } from "lucide-react";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button.js";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form.js";
import { Input } from "../../components/ui/input.js";
import { Select } from "../../components/ui/select.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog.js";
import { ScrollArea } from "../../components/ui/scroll-area.js";
import { Badge } from "../../components/ui/badge.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs.js";
import { Textarea } from "../../components/ui/textarea.js";
import { queryKeys } from "../../app/query-keys.js";
import { api } from "../../lib/api-client.js";
import { sourceTypeOptions } from "./source-options.js";

type SourcePanelProps = {
  canCreate?: boolean;
  fanpageId: string | undefined;
  sources: Source[];
};

const urlSourceTypeOptions = sourceTypeOptions.filter(
  (o) => o.value !== sourceTypes.curl && o.value !== sourceTypes.geminiSearch
);

const sourceFormSchema = z.object({
  type: sourceTypeSchema,
  url: z.string().trim().url("Enter a valid source URL."),
  crawlPolicy: z.string().min(1),
  enabled: z.boolean()
});

const sourceDefaultValues: CreateSourceInput = {
  type: sourceDefaults.type,
  url: "",
  crawlPolicy: sourceDefaults.crawlPolicy,
  enabled: sourceDefaults.enabled
};

const SOURCE_ICON_MAP: Record<string, React.ElementType> = {
  [sourceTypes.rss]: Rss,
  [sourceTypes.api]: Globe,
  [sourceTypes.staticHtml]: FileText,
  [sourceTypes.curl]: Terminal,
  [sourceTypes.geminiSearch]: Sparkles
};

function sourceIcon(type: string) {
  return SOURCE_ICON_MAP[type] ?? Rss;
}

export function SourcePanel({ canCreate = true, fanpageId, sources }: SourcePanelProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const invalidateSources = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.sourcesRoot });
  }, [queryClient]);

  return (
    <div className="flex flex-col h-full mt-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-800">
          <Sparkles size={18} className="text-slate-500" />
          <h2 className="text-base font-semibold">Sources</h2>
        </div>
        {canCreate ? (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1" disabled={!fanpageId}>
                <Plus size={14} />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] bg-white p-6 sm:rounded-xl shadow-lg border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900">Add Content Source</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="url" className="mt-2">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="url" className="gap-1.5 text-xs">
                    <Globe size={14} />
                    URL
                  </TabsTrigger>
                  <TabsTrigger value="curl" className="gap-1.5 text-xs">
                    <Terminal size={14} />
                    cURL
                  </TabsTrigger>
                  <TabsTrigger value="search" className="gap-1.5 text-xs">
                    <Search size={14} />
                    Gemini Search
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url">
                  <UrlSourceTab
                    fanpageId={fanpageId}
                    canCreate={canCreate}
                    onSuccess={() => { void invalidateSources(); setIsDialogOpen(false); }}
                  />
                </TabsContent>

                <TabsContent value="curl">
                  <CurlSourceTab
                    fanpageId={fanpageId}
                    canCreate={canCreate}
                    onSuccess={() => { void invalidateSources(); setIsDialogOpen(false); }}
                  />
                </TabsContent>

                <TabsContent value="search">
                  <SearchSourceTab
                    fanpageId={fanpageId}
                    canCreate={canCreate}
                    onSuccess={() => { void invalidateSources(); setIsDialogOpen(false); }}
                  />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <ScrollArea className="flex-1 pr-4 -mr-4">
        <div className="space-y-2 pb-2">
          {sources.map((source) => {
            const Icon = sourceIcon(source.type);
            return (
              <div className="group rounded-lg border border-slate-200 bg-white p-3 text-sm transition-all hover:border-slate-300 hover:shadow-sm" key={source.id}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-slate-100 p-1.5 text-slate-500">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{source.type}</span>
                      {source.enabled ? (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal bg-slate-50 text-slate-500 border-slate-200">Disabled</Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500" title={source.url || (source.metadata as Record<string, string> | undefined)?.curlCommand}>
                      {source.url || truncateCurl((source.metadata as Record<string, string> | undefined)?.curlCommand)}
                    </p>
                    {source.type === sourceTypes.geminiSearch && source.metadata && (
                      <p className="mt-0.5 truncate text-xs text-violet-500">
                        🔍 {(source.metadata as Record<string, string>).snippet}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {sources.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-500 border border-dashed rounded-lg">
              {fanpageId ? "No sources configured." : "Select a fanpage first."}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ─── Tab 1: URL Source ────────────────────────────────────────────────── */

function UrlSourceTab({ fanpageId, canCreate, onSuccess }: { fanpageId: string | undefined; canCreate: boolean; onSuccess: () => void }) {
  const form = useForm<CreateSourceInput>({
    resolver: zodResolver(sourceFormSchema),
    defaultValues: sourceDefaultValues
  });
  const createSource = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateSourceInput }) => api.createFanpageSource(id, input),
    onSuccess: () => { form.reset(sourceDefaultValues); onSuccess(); }
  });
  const disabled = !fanpageId || !canCreate || createSource.isPending;

  function submit(values: CreateSourceInput) {
    if (!fanpageId) return;
    createSource.mutate({ id: fanpageId, input: values });
  }

  return (
    <Form {...form}>
      <form className="grid gap-4 py-4" noValidate onSubmit={form.handleSubmit(submit)}>
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source type</FormLabel>
              <FormControl>
                <Select disabled={disabled} {...field}>
                  {urlSourceTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL</FormLabel>
              <FormControl>
                <Input disabled={disabled} placeholder="https://example.com/feed.xml" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-2">
          <Button disabled={disabled} type="submit">
            {createSource.isPending ? "Adding..." : "Add Source"}
          </Button>
        </div>
        {createSource.isError && (
          <p className="text-xs text-red-600">{(createSource.error as Error).message}</p>
        )}
      </form>
    </Form>
  );
}

/* ─── Tab 2: cURL Paste ────────────────────────────────────────────────── */

function CurlSourceTab({ fanpageId, canCreate, onSuccess }: { fanpageId: string | undefined; canCreate: boolean; onSuccess: () => void }) {
  const [curlText, setCurlText] = useState("");
  const createCurl = useMutation({
    mutationFn: ({ id, curlCommand }: { id: string; curlCommand: string }) =>
      api.createCurlSource(id, { curlCommand }),
    onSuccess: () => { setCurlText(""); onSuccess(); }
  });
  const disabled = !fanpageId || !canCreate || createCurl.isPending;
  const valid = curlText.trim().length >= 5;

  return (
    <div className="grid gap-4 py-4">
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1.5 block">Paste cURL command</label>
        <Textarea
          disabled={disabled}
          className="min-h-32 font-mono text-xs"
          placeholder={`curl 'https://api.example.com/articles' \\\n  -H 'Accept: application/json'`}
          value={curlText}
          onChange={(e) => setCurlText(e.target.value)}
        />
        <p className="text-xs text-slate-400 mt-1">Supports GET/POST requests with headers and body.</p>
      </div>
      <div className="flex justify-end pt-2">
        <Button disabled={disabled || !valid} onClick={() => fanpageId && createCurl.mutate({ id: fanpageId, curlCommand: curlText })}>
          {createCurl.isPending ? (
            <><Loader2 size={14} className="mr-1.5 animate-spin" /> Adding...</>
          ) : (
            <><Terminal size={14} className="mr-1.5" /> Add cURL Source</>
          )}
        </Button>
      </div>
      {createCurl.isError && (
        <p className="text-xs text-red-600">{(createCurl.error as Error).message}</p>
      )}
    </div>
  );
}

/* ─── Tab 3: Gemini Search ─────────────────────────────────────────────── */

function SearchSourceTab({ fanpageId, canCreate, onSuccess }: { fanpageId: string | undefined; canCreate: boolean; onSuccess: () => void }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState<number>(sourceSearchResultLimits.default);
  const [searchResults, setSearchResults] = useState<SourceSearchResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const searchMutation = useMutation({
    mutationFn: ({ id, q, l }: { id: string; q: string; l: number }) =>
      api.searchSources(id, { query: q, limit: l }),
    onSuccess: (data) => { setSearchResults(data); setSelectedIds(new Set()); }
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

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!searchResults) return;
    if (selectedIds.size === searchResults.results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(searchResults.results.map((r) => r.id)));
    }
  }

  function handleSearch() {
    if (!fanpageId || !query.trim()) return;
    searchMutation.mutate({ id: fanpageId, q: query.trim(), l: limit });
  }

  function handleAddSelected() {
    if (!fanpageId || !searchResults || selectedIds.size === 0) return;
    const selected = searchResults.results.filter((r) => selectedIds.has(r.id));
    addMutation.mutate({ id: fanpageId, results: selected });
  }

  return (
    <div className="grid gap-4 py-4">
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
        <Button disabled={disabled || searching || query.trim().length < 2} onClick={handleSearch} className="shrink-0">
          {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          <span className="ml-1.5">{searching ? "Searching..." : "Search"}</span>
        </Button>
      </div>

      {searchMutation.isError && (
        <p className="text-xs text-red-600">{(searchMutation.error as Error).message}</p>
      )}

      {searchResults && searchResults.results.length > 0 && (
        <div className="border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 rounded-t-lg">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={selectedIds.size === searchResults.results.length}
                onChange={toggleAll}
              />
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
            </label>
            <span className="text-xs text-slate-400">{searchResults.results.length} results</span>
          </div>
          <ScrollArea className="max-h-64">
            <div className="divide-y divide-slate-100">
              {searchResults.results.map((result) => (
                <label
                  key={result.id}
                  className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-slate-50 ${
                    selectedIds.has(result.id) ? "bg-violet-50/50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-slate-300"
                    checked={selectedIds.has(result.id)}
                    onChange={() => toggleSelect(result.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{result.title}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{result.url}</p>
                    {result.snippet && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{result.snippet}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {searchResults && searchResults.results.length === 0 && (
        <div className="py-4 text-center text-sm text-slate-500 border border-dashed rounded-lg">
          No results found. Try a different query.
        </div>
      )}

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

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function truncateCurl(curl: string | undefined): string {
  if (!curl) return "—";
  return curl.length > 80 ? `${curl.slice(0, 77)}...` : curl;
}
