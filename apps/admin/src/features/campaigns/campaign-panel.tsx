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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog.js";
import { ScrollArea } from "../../components/ui/scroll-area.js";
import { Badge } from "../../components/ui/badge.js";
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
      setIsDialogOpen(false);
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
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-800">
          <ListChecks size={18} className="text-slate-500" />
          <h2 className="text-base font-semibold">Fanpages</h2>
        </div>
        {canCreate ? (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1">
                <Plus size={14} />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-6 sm:rounded-xl shadow-lg border-slate-200">
              <DialogHeader className="mb-2">
                <DialogTitle className="text-xl font-bold text-slate-900">Create Fanpage Campaign</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form className="grid gap-4 py-4" noValidate onSubmit={form.handleSubmit(submit)}>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fanpage name</FormLabel>
                        <FormControl>
                          <Input placeholder="E.g., Tech Startup Hub" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
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
                              <option value={fanpageEnvironments.sandbox}>Sandbox (Testing)</option>
                              <option value={fanpageEnvironments.production}>Production (Live)</option>
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
                            placeholder="EAAGm0P..."
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
                        <FormLabel>Topic Focus</FormLabel>
                        <FormControl>
                          <Input placeholder="E.g., AI tools, software engineering, remote work" {...field} />
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
                        <FormLabel>Writing Style</FormLabel>
                        <FormControl>
                          <Textarea placeholder="E.g., Professional yet approachable, concise, informative" className="resize-none" rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mt-2">
                    <FormField
                      control={form.control}
                      name="scheduleConfig.enabled"
                      render={({ field }) => (
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                          <input className="rounded border-slate-300" checked={field.value} onChange={(event) => field.onChange(event.target.checked)} type="checkbox" />
                          Schedule Draft Generation
                        </label>
                      )}
                    />
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="scheduleConfig.postsPerDay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-600">Posts per day</FormLabel>
                            <FormControl>
                              <Input
                                disabled={!scheduleEnabled}
                                min={1}
                                onChange={(event) => field.onChange(Number(event.target.value))}
                                type="number"
                                value={field.value}
                                className="bg-white"
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
                            <FormLabel className="text-slate-600">Interval (minutes)</FormLabel>
                            <FormControl>
                              <Input
                                disabled={!scheduleEnabled}
                                min={5}
                                onChange={(event) => field.onChange(Number(event.target.value))}
                                type="number"
                                value={field.value}
                                className="bg-white"
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
                            <FormLabel className="text-slate-600">Start time</FormLabel>
                            <FormControl>
                              <Input disabled={!scheduleEnabled} type="time" {...field} className="bg-white" />
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
                            <FormLabel className="text-slate-600">Timezone</FormLabel>
                            <FormControl>
                              <Input disabled={!scheduleEnabled} placeholder="Asia/Saigon" {...field} className="bg-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button className="w-full sm:w-auto" disabled={createFanpage.isPending} type="submit">
                      {createFanpage.isPending ? "Creating..." : "Create Fanpage"}
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
          {fanpages.data?.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-500 border border-dashed rounded-lg">
              No fanpages found.
            </div>
          )}
          {connectionMessage ? <p className="mt-2 text-xs font-medium text-emerald-600">{connectionMessage}</p> : null}
        </div>
      </ScrollArea>
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
    <div 
      className={`group relative overflow-hidden rounded-lg border p-3 text-left transition-all duration-200 cursor-pointer ${
        isSelected 
          ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500/20" 
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
      onClick={() => onSelect(fanpage.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-semibold truncate ${isSelected ? "text-blue-900" : "text-slate-900"}`}>
              {fanpage.name}
            </span>
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-slate-500" title={fanpage.topic}>
            {fanpage.topic || "No topic specified"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <EnvironmentBadge environment={fanpage.environment} />
            <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0 h-4">
              {fanpage.facebookPageId}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Test Connection Button - Shown on hover or if selected */}
      <div className={`mt-3 pt-3 border-t border-slate-100 ${isSelected ? "block" : "hidden group-hover:block"}`}>
        <button
          className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
            isSelected ? "text-blue-600 hover:text-blue-700" : "text-slate-500 hover:text-slate-700"
          } disabled:opacity-50`}
          disabled={isTesting || !fanpage.hasPageAccessToken}
          onClick={(e) => {
            e.stopPropagation();
            onTest(fanpage.id);
          }}
          title={fanpage.hasPageAccessToken ? "Test Graph API connection" : "Missing access token"}
          type="button"
        >
          <ShieldCheck size={14} className={isTesting ? "animate-pulse" : ""} />
          {isTesting ? "Testing Connection..." : "Test Connection"}
        </button>
      </div>
    </div>
  );
}

function EnvironmentBadge({ environment }: { environment: Fanpage["environment"] }) {
  const isSandbox = environment === fanpageEnvironments.sandbox;
  return (
    <Badge 
      variant={isSandbox ? "outline" : "default"} 
      className={`text-[10px] h-4 px-1.5 py-0 gap-1 font-medium ${
        isSandbox 
          ? "border-sky-200 bg-sky-50 text-sky-700" 
          : "bg-amber-100 text-amber-800 hover:bg-amber-100"
      }`}
    >
      {isSandbox ? <FlaskConical size={10} /> : <ShieldCheck size={10} />}
      {isSandbox ? "Sandbox" : "Production"}
    </Badge>
  );
}
