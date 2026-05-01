import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import type { CreateSourceInput } from "@auto-fb/shared";
import { useForm } from "react-hook-form";
import { Button } from "../../components/ui/button.js";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form.js";
import { Input } from "../../components/ui/input.js";
import { Select } from "../../components/ui/select.js";
import { api } from "../../lib/api-client.js";
import { sourceDefaultValues, sourceFormSchema, urlSourceTypeOptions, type SourceTabProps } from "./source-constants.js";

export function UrlSourceTab({ fanpageId, canCreate, onSuccess }: SourceTabProps) {
  const form = useForm<CreateSourceInput>({
    resolver: zodResolver(sourceFormSchema),
    defaultValues: sourceDefaultValues
  });

  const createSource = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateSourceInput }) => api.createFanpageSource(id, input),
    onSuccess: () => {
      form.reset(sourceDefaultValues);
      onSuccess();
    }
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
