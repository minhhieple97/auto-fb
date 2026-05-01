import { useQueryClient } from "@tanstack/react-query";
import type { Source } from "@auto-fb/shared";
import { Globe, Plus, Search, Sparkles, Terminal } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "../../components/ui/button.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog.js";
import { ScrollArea } from "../../components/ui/scroll-area.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs.js";
import { queryKeys } from "../../app/query-keys.js";
import { SourceListItem } from "./source-list-item.js";
import { UrlSourceTab } from "./url-source-tab.js";
import { CurlSourceTab } from "./curl-source-tab.js";
import { SearchSourceTab } from "./search-source-tab.js";

type SourcePanelProps = {
  canCreate?: boolean;
  fanpageId: string | undefined;
  sources: Source[];
};

export function SourcePanel({ canCreate = true, fanpageId, sources }: SourcePanelProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSuccess = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.sourcesRoot });
    setIsDialogOpen(false);
  }, [queryClient]);

  return (
    <div className="flex flex-col h-full mt-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-800">
          <Sparkles size={18} className="text-slate-500" />
          <h2 className="text-base font-semibold">Sources</h2>
        </div>
        {canCreate && (
          <AddSourceDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            fanpageId={fanpageId}
            canCreate={canCreate}
            onSuccess={handleSuccess}
          />
        )}
      </div>

      {/* Source list */}
      <ScrollArea className="flex-1 pr-4 -mr-4 [&>[data-radix-scroll-area-viewport]>div]:!block">
        <div className="space-y-2 pb-2">
          {sources.map((source) => (
            <SourceListItem key={source.id} source={source} />
          ))}
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

/* ─── Add Source Dialog ─────────────────────────────────────────────────── */

type AddSourceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fanpageId: string | undefined;
  canCreate: boolean;
  onSuccess: () => void;
};

function AddSourceDialog({ open, onOpenChange, fanpageId, canCreate, onSuccess }: AddSourceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1" disabled={!fanpageId}>
          <Plus size={14} />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto bg-white p-6 sm:rounded-xl shadow-lg border-slate-200">
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
            <UrlSourceTab fanpageId={fanpageId} canCreate={canCreate} onSuccess={onSuccess} />
          </TabsContent>
          <TabsContent value="curl">
            <CurlSourceTab fanpageId={fanpageId} canCreate={canCreate} onSuccess={onSuccess} />
          </TabsContent>
          <TabsContent value="search">
            <SearchSourceTab fanpageId={fanpageId} canCreate={canCreate} onSuccess={onSuccess} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
