import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sourceDefaults, sourceTypeSchema, type CreateSourceInput, type Source } from "@auto-fb/shared";
import { Plus, Rss, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button.js";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form.js";
import { Input } from "../../components/ui/input.js";
import { Select } from "../../components/ui/select.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog.js";
import { ScrollArea } from "../../components/ui/scroll-area.js";
import { Badge } from "../../components/ui/badge.js";
import { queryKeys } from "../../app/query-keys.js";
import { api } from "../../lib/api-client.js";
import { sourceTypeOptions } from "./source-options.js";

type SourcePanelProps = {
  canCreate?: boolean;
  fanpageId: string | undefined;
  sources: Source[];
};

const sourceFormSchema = z.object({
  type: sourceTypeSchema,
  url: z.string().trim().url("Enter a valid source URL."),
  crawlPolicy: z.string().min(1),
  enabled: z.boolean()
}) satisfies z.ZodType<CreateSourceInput>;

const sourceDefaultValues: CreateSourceInput = {
  type: sourceDefaults.type,
  url: "",
  crawlPolicy: sourceDefaults.crawlPolicy,
  enabled: sourceDefaults.enabled
};

export function SourcePanel({ canCreate = true, fanpageId, sources }: SourcePanelProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const form = useForm<CreateSourceInput>({
    resolver: zodResolver(sourceFormSchema),
    defaultValues: sourceDefaultValues
  });
  const createSource = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateSourceInput }) => api.createFanpageSource(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.sourcesRoot });
      setIsDialogOpen(false);
    }
  });
  const disabled = !fanpageId || !canCreate || createSource.isPending;

  function submit(values: CreateSourceInput) {
    if (!fanpageId) return;
    createSource.mutate({
      id: fanpageId,
      input: values
    });
    form.reset(sourceDefaultValues);
  }

  return (
    <div className="flex flex-col h-full mt-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-800">
          <Send size={18} className="text-slate-500" />
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
            <DialogContent className="sm:max-w-[425px] bg-white p-6 sm:rounded-xl shadow-lg border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900">Add Content Source</DialogTitle>
              </DialogHeader>
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
                            {sourceTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
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
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <ScrollArea className="flex-1 pr-4 -mr-4">
        <div className="space-y-2 pb-2">
          {sources.map((source) => (
            <div className="group rounded-lg border border-slate-200 bg-white p-3 text-sm transition-all hover:border-slate-300 hover:shadow-sm" key={source.id}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md bg-slate-100 p-1.5 text-slate-500">
                  <Rss size={14} />
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
                  <p className="mt-1 truncate text-xs text-slate-500" title={source.url}>
                    {source.url}
                  </p>
                </div>
              </div>
            </div>
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
