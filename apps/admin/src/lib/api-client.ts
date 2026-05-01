import type {
  AgentRun,
  AgentWorkflowRunDetail,
  AgentWorkflowRunEvent,
  AgentWorkflowRunStatus,
  Campaign,
  CreateCampaignInput,
  CreateSourceInput,
  PostDraft,
  PublishedPost,
  Source
} from "@auto-fb/shared";
import { getAuthAccessToken } from "./supabase.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

type AgentWorkflowRunFilters = {
  campaignId?: string | undefined;
  status?: AgentWorkflowRunStatus | undefined;
  limit?: number | undefined;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const accessToken = getAuthAccessToken();

  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (accessToken && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as { message?: string } | undefined;
    throw new Error(payload?.message ?? `Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

type StreamAgentWorkflowRunsInput = {
  campaignId?: string | undefined;
  onEvent: (event: AgentWorkflowRunEvent) => void;
  onError?: (error: Error) => void;
};

function streamAgentWorkflowRuns({ campaignId, onEvent, onError }: StreamAgentWorkflowRunsInput): () => void {
  const controller = new AbortController();
  const headers = new Headers({ Accept: "text/event-stream" });
  const accessToken = getAuthAccessToken();
  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  void readEventStream(`${API_BASE_URL}/agent-workflow-runs/stream${queryString({ campaignId })}`, headers, controller.signal, onEvent).catch(
    (error: unknown) => {
      if (!controller.signal.aborted) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }
  );

  return () => controller.abort();
}

async function readEventStream(
  url: string,
  headers: Headers,
  signal: AbortSignal,
  onEvent: (event: AgentWorkflowRunEvent) => void
): Promise<void> {
  const response = await fetch(url, { headers, signal });
  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as { message?: string } | undefined;
    throw new Error(payload?.message ?? `Stream failed with ${response.status}`);
  }
  if (!response.body) {
    throw new Error("Workflow stream did not return a readable body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = flushSseBuffer(buffer, onEvent);
  }

  const remainder = decoder.decode();
  if (remainder) {
    buffer = flushSseBuffer(buffer + remainder, onEvent);
  }
}

function flushSseBuffer(buffer: string, onEvent: (event: AgentWorkflowRunEvent) => void): string {
  let cursor = buffer.indexOf("\n\n");
  while (cursor >= 0) {
    const rawEvent = buffer.slice(0, cursor);
    buffer = buffer.slice(cursor + 2);
    const data = rawEvent
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (data) {
      onEvent(JSON.parse(data) as AgentWorkflowRunEvent);
    }
    cursor = buffer.indexOf("\n\n");
  }
  return buffer;
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
  runWorkflow: (campaignId: string) => request<AgentWorkflowRunDetail>(`/campaigns/${campaignId}/runs`, { method: "POST" }),
  agentRuns: (filters: { campaignId?: string | undefined; graphRunId?: string | undefined } | string = {}) => {
    const normalized = typeof filters === "string" ? { campaignId: filters } : filters;
    return request<AgentRun[]>(`/agent-runs${queryString(normalized)}`);
  },
  agentWorkflowRuns: (filters: AgentWorkflowRunFilters = {}) =>
    request<AgentWorkflowRunDetail[]>(`/agent-workflow-runs${queryString(filters)}`),
  streamAgentWorkflowRuns,
  drafts: () => request<PostDraft[]>("/drafts?status=PENDING_APPROVAL"),
  approveDraft: (id: string) => request<PublishedPost>(`/drafts/${id}/approve`, { method: "POST", body: JSON.stringify({}) }),
  rejectDraft: (id: string) => request<PostDraft>(`/drafts/${id}/reject`, { method: "POST", body: JSON.stringify({}) }),
  publishedPosts: () => request<PublishedPost[]>("/published-posts")
};
