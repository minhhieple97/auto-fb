import type {
  AgentRun,
  Campaign,
  CreateCampaignInput,
  CreateSourceInput,
  PostDraft,
  PublishedPost,
  Source
} from "@auto-fb/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as { message?: string } | undefined;
    throw new Error(payload?.message ?? `Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

export const api = {
  campaigns: () => request<Campaign[]>("/campaigns"),
  createCampaign: (input: CreateCampaignInput) =>
    request<Campaign>("/campaigns", { method: "POST", body: JSON.stringify(input) }),
  updateCampaign: (id: string, input: Partial<CreateCampaignInput>) =>
    request<Campaign>(`/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  sources: (campaignId: string) => request<Source[]>(`/campaigns/${campaignId}/sources`),
  createSource: (campaignId: string, input: CreateSourceInput) =>
    request<Source>(`/campaigns/${campaignId}/sources`, { method: "POST", body: JSON.stringify(input) }),
  runWorkflow: (campaignId: string) => request(`/campaigns/${campaignId}/runs`, { method: "POST" }),
  agentRuns: (campaignId?: string) => request<AgentRun[]>(`/agent-runs${campaignId ? `?campaignId=${campaignId}` : ""}`),
  drafts: () => request<PostDraft[]>("/drafts?status=PENDING_APPROVAL"),
  approveDraft: (id: string) => request<PublishedPost>(`/drafts/${id}/approve`, { method: "POST", body: JSON.stringify({}) }),
  rejectDraft: (id: string) => request<PostDraft>(`/drafts/${id}/reject`, { method: "POST", body: JSON.stringify({}) }),
  publishedPosts: () => request<PublishedPost[]>("/published-posts")
};
