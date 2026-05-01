import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateCampaignInput, LlmProvider } from "@auto-fb/shared";
import { ListChecks, Plus } from "lucide-react";
import { api } from "../../lib/api-client.js";
import { stringField } from "../../lib/form.js";
import { providerModels } from "./provider-models.js";

type CampaignPanelProps = {
  selectedCampaignId: string | undefined;
  onSelect: (id: string) => void;
  onCreated: (id: string) => void;
};

export function CampaignPanel({ selectedCampaignId, onSelect, onCreated }: CampaignPanelProps) {
  const queryClient = useQueryClient();
  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: api.campaigns });
  const createCampaign = useMutation({
    mutationFn: api.createCampaign,
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      onCreated(campaign.id);
    }
  });
  const [provider, setProvider] = useState<LlmProvider>("openai");

  const models = providerModels[provider] ?? providerModels.openai;
  const firstModel = models[0] ?? "gpt-4o-mini";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: CreateCampaignInput = {
      name: stringField(form, "name"),
      topic: stringField(form, "topic"),
      language: stringField(form, "language", "vi"),
      brandVoice: stringField(form, "brandVoice", "helpful, concise, practical"),
      targetPageId: stringField(form, "targetPageId"),
      llmProvider: provider,
      llmModel: stringField(form, "llmModel", firstModel)
    };
    createCampaign.mutate(input);
    event.currentTarget.reset();
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
      <form className="grid gap-2" onSubmit={submit}>
        <input className="field" name="name" placeholder="Campaign name" required />
        <input className="field" name="topic" placeholder="Topic" required />
        <input className="field" name="targetPageId" placeholder="Facebook Page ID" required />
        <input className="field" name="language" placeholder="Language" defaultValue="vi" />
        <textarea className="field min-h-20" name="brandVoice" placeholder="Brand voice" defaultValue="helpful, concise, practical" />
        <div className="grid grid-cols-2 gap-2">
          <select className="field" value={provider} onChange={(event) => setProvider(event.target.value as LlmProvider)}>
            {Object.keys(providerModels).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select className="field" name="llmModel" defaultValue={firstModel} key={provider}>
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
        <button className="button bg-ink text-white" title="Create campaign">
          <Plus size={16} />
          Create
        </button>
      </form>
    </div>
  );
}
