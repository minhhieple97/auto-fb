import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  campaignDefaults,
  createFanpageSchema,
  fanpageEnvironments,
  fanpageScheduleDefaults,
  llmProviders,
  type CreateFanpageInput,
  type Fanpage,
  type LlmProvider
} from "@auto-fb/shared";
import { FlaskConical, ListChecks, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { Button } from "../../components/ui/button.js";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form.js";
import { Input } from "../../components/ui/input.js";
import { Select } from "../../components/ui/select.js";
import { Textarea } from "../../components/ui/textarea.js";
import { queryKeys } from "../../app/query-keys.js";
import { api } from "../../lib/api-client.js";
import { providerModels } from "./provider-models.js";

type CampaignPanelProps = {
  canCreate?: boolean;
  selectedFanpageId: string | undefined;
  onSelect: (id: string) => void;
  onCreated: (id: string) => void;
};

type FanpageFormValues = CreateFanpageInput;

const fanpageFormSchema = createFanpageSchema;

const fanpageDefaultValues: FanpageFormValues = {
  name: "",
  facebookPageId: "",
  environment: fanpageEnvironments.sandbox,
  topic: "",
  language: campaignDefaults.language,
  brandVoice: campaignDefaults.brandVoice,
  llmProvider: campaignDefaults.llmProvider,
  llmModel: providerModels[llmProviders.openai][0] ?? campaignDefaults.llmModel,
  scheduleConfig: fanpageScheduleDefaults,
  pageAccessToken: undefined
};

function firstModelForProvider(provider: LlmProvider) {
  return providerModels[provider]?.[0] ?? providerModels[llmProviders.openai][0] ?? campaignDefaults.llmModel;
}

export function CampaignPanel({ canCreate = true, selectedFanpageId, onSelect, onCreated }: CampaignPanelProps) {
  const queryClient = useQueryClient();
  const [connectionMessage, setConnectionMessage] = useState<string | undefined>();
  const fanpages = useQuery({ queryKey: queryKeys.fanpages, queryFn: api.fanpages });
  const form = useForm<FanpageFormValues>({
    resolver: zodResolver(fanpageFormSchema) as Resolver<FanpageFormValues>,
    defaultValues: fanpageDefaultValues
  });
  const createFanpage = useMutation({
    mutationFn: api.createFanpage,
    onSuccess: async (fanpage) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.fanpages }),
        queryClient.invalidateQueries({ queryKey: queryKeys.campaigns })
      ]);
      onCreated(fanpage.id);
    }
  });
  const testConnection = useMutation({
    mutationFn: (id: string) => api.testFanpageConnection(id),
    onSuccess: async (result) => {
      setConnectionMessage(`Connected to ${result.pageName ?? result.facebookPageId}`);
      await queryClient.invalidateQueries({ queryKey: queryKeys.fanpages });
    },
    onError: (error) => setConnectionMessage(error instanceof Error ? error.message : "Connection test failed")
  });

  const provider = form.watch("llmProvider");
  const scheduleEnabled = form.watch("scheduleConfig.enabled");
  const models = providerModels[provider] ?? providerModels[llmProviders.openai];

  function submit(values: FanpageFormValues) {
    const pageAccessToken = values.pageAccessToken?.trim();
    createFanpage.mutate({
      ...values,
      ...(pageAccessToken ? { pageAccessToken } : { pageAccessToken: undefined })
    });
    form.reset({
      ...fanpageDefaultValues,
      llmProvider: values.llmProvider,
      llmModel: firstModelForProvider(values.llmProvider)
    });
  }

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <ListChecks size={18} />
        <h2 className="text-base font-semibold">Fanpages</h2>
      </div>
      <div className="mb-4 space-y-2">
        {(fanpages.data ?? []).map((fanpage) => (
          <FanpageListItem
            fanpage={fanpage}
            isSelected={fanpage.id === selectedFanpageId}
            isTesting={testConnection.isPending}
            key={fanpage.id}
            onSelect={onSelect}
            onTest={(id) => testConnection.mutate(id)}
          />
        ))}
        {connectionMessage ? <p className="text-xs text-slate-600">{connectionMessage}</p> : null}
      </div>
      {canCreate ? (
        <Form {...form}>
          <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(submit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fanpage name</FormLabel>
                  <FormControl>
                    <Input placeholder="Fanpage name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="facebookPageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook Page ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Facebook Page ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="environment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Environment</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        <option value={fanpageEnvironments.sandbox}>Sandbox</option>
                        <option value={fanpageEnvironments.production}>Production</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="pageAccessToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page Access Token</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Page Access Token"
                      type="password"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <FormControl>
                    <Input placeholder="Topic" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="brandVoice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Writing style</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Writing style" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="llmProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <FormControl>
                      <Select
                        {...field}
                        onChange={(event) => {
                          const nextProvider = event.target.value as LlmProvider;
                          field.onChange(nextProvider);
                          form.setValue("llmModel", firstModelForProvider(nextProvider), { shouldValidate: true });
                        }}
                      >
                        {Object.keys(providerModels).map((item) => (
                          <option key={item} value={item}>
                            {item}
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
                name="llmModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        {models.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="rounded-md border border-line p-3">
              <FormField
                control={form.control}
                name="scheduleConfig.enabled"
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input checked={field.value} onChange={(event) => field.onChange(event.target.checked)} type="checkbox" />
                    Schedule draft generation
                  </label>
                )}
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="scheduleConfig.postsPerDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Posts per day</FormLabel>
                      <FormControl>
                        <Input
                          disabled={!scheduleEnabled}
                          min={1}
                          onChange={(event) => field.onChange(Number(event.target.value))}
                          type="number"
                          value={field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scheduleConfig.intervalMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interval minutes</FormLabel>
                      <FormControl>
                        <Input
                          disabled={!scheduleEnabled}
                          min={5}
                          onChange={(event) => field.onChange(Number(event.target.value))}
                          type="number"
                          value={field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scheduleConfig.startTimeLocal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start time</FormLabel>
                      <FormControl>
                        <Input disabled={!scheduleEnabled} type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scheduleConfig.timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <FormControl>
                        <Input disabled={!scheduleEnabled} placeholder="Asia/Saigon" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <Button disabled={createFanpage.isPending} title="Create fanpage" type="submit">
              <Plus size={16} />
              {createFanpage.isPending ? "Creating" : "Create"}
            </Button>
          </form>
        </Form>
      ) : null}
    </div>
  );
}

function FanpageListItem({
  fanpage,
  isSelected,
  isTesting,
  onSelect,
  onTest
}: {
  fanpage: Fanpage;
  isSelected: boolean;
  isTesting: boolean;
  onSelect: (id: string) => void;
  onTest: (id: string) => void;
}) {
  return (
    <div className={`rounded-md border p-3 text-left text-sm ${isSelected ? "border-action bg-emerald-50" : "border-line bg-white"}`}>
      <button className="w-full text-left" onClick={() => onSelect(fanpage.id)} title={`Select ${fanpage.name}`} type="button">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{fanpage.name}</span>
          <EnvironmentBadge environment={fanpage.environment} />
        </span>
        <span className="mt-1 block text-slate-600">{fanpage.topic}</span>
        <span className="mt-1 block text-xs text-slate-500">
          Page {fanpage.facebookPageId} - Token {fanpage.hasPageAccessToken ? fanpage.pageAccessTokenMask ?? "saved" : "missing"}
        </span>
      </button>
      <button
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-action disabled:text-slate-400"
        disabled={isTesting || !fanpage.hasPageAccessToken}
        onClick={() => onTest(fanpage.id)}
        title="Test Graph API connection"
        type="button"
      >
        <ShieldCheck size={14} />
        {isTesting ? "Testing" : "Test Graph API connection"}
      </button>
    </div>
  );
}

function EnvironmentBadge({ environment }: { environment: Fanpage["environment"] }) {
  const isSandbox = environment === fanpageEnvironments.sandbox;
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${isSandbox ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>
      {isSandbox ? <FlaskConical size={13} /> : <ShieldCheck size={13} />}
      {isSandbox ? "Sandbox" : "Production"}
    </span>
  );
}
