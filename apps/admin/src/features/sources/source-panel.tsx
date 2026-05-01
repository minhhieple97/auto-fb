import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sourceDefaults, sourceTypeSchema, type CreateSourceInput, type Source } from "@auto-fb/shared";
import { Plus, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button.js";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form.js";
import { Input } from "../../components/ui/input.js";
import { Select } from "../../components/ui/select.js";
import { queryKeys } from "../../app/query-keys.js";
import { api } from "../../lib/api-client.js";
import { sourceTypeOptions } from "./source-options.js";

type SourcePanelProps = {
  campaignId: string | undefined;
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

export function SourcePanel({ campaignId, sources }: SourcePanelProps) {
  const queryClient = useQueryClient();
  const form = useForm<CreateSourceInput>({
    resolver: zodResolver(sourceFormSchema),
    defaultValues: sourceDefaultValues
  });
  const createSource = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateSourceInput }) => api.createSource(id, input),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: queryKeys.sourcesRoot })
  });
  const disabled = !campaignId || createSource.isPending;

  function submit(values: CreateSourceInput) {
    if (!campaignId) return;
    createSource.mutate({
      id: campaignId,
      input: values
    });
    form.reset(sourceDefaultValues);
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
      <Form {...form}>
        <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(submit)}>
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
          <Button disabled={disabled} title="Add source" type="submit">
            <Plus size={16} />
            {createSource.isPending ? "Adding" : "Add source"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
