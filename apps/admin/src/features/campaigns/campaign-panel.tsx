import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { campaignDefaults, llmProviderSchema, llmProviders, type CreateCampaignInput, type LlmProvider } from "@auto-fb/shared";
import { ListChecks, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button.js";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form.js";
import { Input } from "../../components/ui/input.js";
import { Select } from "../../components/ui/select.js";
import { Textarea } from "../../components/ui/textarea.js";
import { queryKeys } from "../../app/query-keys.js";
import { api } from "../../lib/api-client.js";
import { providerModels } from "./provider-models.js";

type CampaignPanelProps = {
  selectedCampaignId: string | undefined;
  onSelect: (id: string) => void;
  onCreated: (id: string) => void;
};

const campaignFormSchema = z.object({
  name: z.string().trim().min(2, "Campaign name must be at least 2 characters."),
  topic: z.string().trim().min(2, "Topic must be at least 2 characters."),
  language: z.string().trim().min(2, "Language is required."),
  brandVoice: z.string().trim().min(2, "Brand voice is required."),
  targetPageId: z.string().trim().min(1, "Facebook Page ID is required."),
  llmProvider: llmProviderSchema,
  llmModel: z.string().trim().min(1, "Model is required.")
}) satisfies z.ZodType<CreateCampaignInput>;

const campaignDefaultValues: CreateCampaignInput = {
  name: "",
  topic: "",
  language: campaignDefaults.language,
  brandVoice: campaignDefaults.brandVoice,
  targetPageId: "",
  llmProvider: campaignDefaults.llmProvider,
  llmModel: providerModels[llmProviders.openai][0] ?? campaignDefaults.llmModel
};

function firstModelForProvider(provider: LlmProvider) {
  return providerModels[provider]?.[0] ?? providerModels[llmProviders.openai][0] ?? campaignDefaults.llmModel;
}

export function CampaignPanel({ selectedCampaignId, onSelect, onCreated }: CampaignPanelProps) {
  const queryClient = useQueryClient();
  const campaigns = useQuery({ queryKey: queryKeys.campaigns, queryFn: api.campaigns });
  const form = useForm<CreateCampaignInput>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: campaignDefaultValues
  });
  const createCampaign = useMutation({
    mutationFn: api.createCampaign,
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaigns });
      onCreated(campaign.id);
    }
  });

  const provider = form.watch("llmProvider");
  const models = providerModels[provider] ?? providerModels[llmProviders.openai];

  function submit(values: CreateCampaignInput) {
    createCampaign.mutate(values);
    form.reset({
      ...campaignDefaultValues,
      llmProvider: values.llmProvider,
      llmModel: firstModelForProvider(values.llmProvider)
    });
  }

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <ListChecks size={18} />
        <h2 className="text-base font-semibold">Campaigns</h2>
      </div>
      <div className="mb-4 space-y-2">
        {(campaigns.data ?? []).map((campaign) => (
          <button
            className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
              campaign.id === selectedCampaignId ? "border-action bg-emerald-50" : "border-line bg-white"
            }`}
            key={campaign.id}
            onClick={() => onSelect(campaign.id)}
            title={`Select ${campaign.name}`}
          >
            <span className="block font-medium">{campaign.name}</span>
            <span className="block text-slate-600">{campaign.topic}</span>
          </button>
        ))}
      </div>
      <Form {...form}>
        <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(submit)}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Campaign name</FormLabel>
                <FormControl>
                  <Input placeholder="Campaign name" {...field} />
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
            name="targetPageId"
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
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Language</FormLabel>
                <FormControl>
                  <Input placeholder="Language" {...field} />
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
                <FormLabel>Brand voice</FormLabel>
                <FormControl>
                  <Textarea placeholder="Brand voice" {...field} />
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
          <Button disabled={createCampaign.isPending} title="Create campaign" type="submit">
            <Plus size={16} />
            {createCampaign.isPending ? "Creating" : "Create"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
