import type {
  AgentRun,
  AgentRunFilters,
  AgentSearchInput,
  AgentSearchResponse,
  AgentWorkflowRunDetail,
  AgentWorkflowRunEvent,
  AgentWorkflowRunFilters,
  AdminProfile,
  Campaign,
  CreateCampaignInput,
  CreateFanpageInput,
  CreateSourceInput,
  Fanpage,
  GenerateFromSearchInput,
  GenerateFromSearchResponse,
  PostDraft,
  PublishOptions,
  PublishedPost,
  Source,
  TestFanpageConnectionResponse,
  UpdateFanpageInput,
  UpdateFanpageScheduleInput,
  UpdateFanpageTokenInput
} from "@auto-fb/shared";
import { apiEndpoints, defaultApiBaseUrl, queryString } from "./api-endpoints.js";
import { sseProtocol } from "./sse.constants.js";
import { getAuthAccessToken } from "./supabase.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl;

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

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
    throw new ApiClientError(payload?.message ?? `Request failed with ${response.status}`, response.status);
  }
  return (await response.json()) as T;
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

  void readEventStream(`${API_BASE_URL}${apiEndpoints.agentWorkflowRunsStream}${queryString({ campaignId })}`, headers, controller.signal, onEvent).catch(
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
  let cursor = buffer.indexOf(sseProtocol.eventSeparator);
  while (cursor >= 0) {
    const rawEvent = buffer.slice(0, cursor);
    buffer = buffer.slice(cursor + sseProtocol.eventSeparator.length);
    const data = rawEvent
      .split(sseProtocol.lineBreakPattern)
      .filter((line) => line.startsWith(sseProtocol.dataPrefix))
      .map((line) => line.slice(sseProtocol.dataPrefix.length).trimStart())
      .join(sseProtocol.lineJoiner);
    if (data) {
      onEvent(JSON.parse(data) as AgentWorkflowRunEvent);
    }
    cursor = buffer.indexOf(sseProtocol.eventSeparator);
  }
  return buffer;
}

export const api = {
  me: () => request<AdminProfile>(apiEndpoints.authMe),
  campaigns: () => request<Campaign[]>(apiEndpoints.campaigns),
  createCampaign: (input: CreateCampaignInput) =>
    request<Campaign>(apiEndpoints.campaigns, { method: "POST", body: JSON.stringify(input) }),
  updateCampaign: (id: string, input: Partial<CreateCampaignInput>) =>
    request<Campaign>(apiEndpoints.campaign(id), { method: "PATCH", body: JSON.stringify(input) }),
  fanpages: () => request<Fanpage[]>(apiEndpoints.fanpages),
  createFanpage: (input: CreateFanpageInput) =>
    request<Fanpage>(apiEndpoints.fanpages, { method: "POST", body: JSON.stringify(input) }),
  updateFanpage: (id: string, input: UpdateFanpageInput) =>
    request<Fanpage>(apiEndpoints.fanpage(id), { method: "PATCH", body: JSON.stringify(input) }),
  updateFanpageSchedule: (id: string, input: UpdateFanpageScheduleInput) =>
    request<Fanpage>(apiEndpoints.fanpageSchedule(id), { method: "PATCH", body: JSON.stringify(input) }),
  updateFanpageToken: (id: string, input: UpdateFanpageTokenInput) =>
    request<Fanpage>(apiEndpoints.fanpageToken(id), { method: "PATCH", body: JSON.stringify(input) }),
  testFanpageConnection: (id: string) =>
    request<TestFanpageConnectionResponse>(apiEndpoints.fanpageTestConnection(id), { method: "POST", body: JSON.stringify({}) }),
  sources: (campaignId: string) => request<Source[]>(apiEndpoints.campaignSources(campaignId)),
  createSource: (campaignId: string, input: CreateSourceInput) =>
    request<Source>(apiEndpoints.campaignSources(campaignId), { method: "POST", body: JSON.stringify(input) }),
  fanpageSources: (fanpageId: string) => request<Source[]>(apiEndpoints.fanpageSources(fanpageId)),
  createFanpageSource: (fanpageId: string, input: CreateSourceInput) =>
    request<Source>(apiEndpoints.fanpageSources(fanpageId), { method: "POST", body: JSON.stringify(input) }),
  searchAgent: (campaignId: string, input: AgentSearchInput) =>
    request<AgentSearchResponse>(apiEndpoints.campaignAgentSearch(campaignId), { method: "POST", body: JSON.stringify(input) }),
  generateFromSearch: (campaignId: string, input: GenerateFromSearchInput) =>
    request<GenerateFromSearchResponse>(apiEndpoints.campaignAgentSearchGenerate(campaignId), {
      method: "POST",
      body: JSON.stringify(input)
    }),
  runWorkflow: (campaignId: string) => request<AgentWorkflowRunDetail>(apiEndpoints.campaignRuns(campaignId), { method: "POST" }),
  runFanpageWorkflow: (fanpageId: string) =>
    request<AgentWorkflowRunDetail>(apiEndpoints.fanpageRuns(fanpageId), { method: "POST", body: JSON.stringify({}) }),
  agentRuns: (filters: AgentRunFilters | string = {}) => {
    const normalized = typeof filters === "string" ? { campaignId: filters } : filters;
    return request<AgentRun[]>(`${apiEndpoints.agentRuns}${queryString(normalized)}`);
  },
  agentWorkflowRuns: (filters: AgentWorkflowRunFilters = {}) =>
    request<AgentWorkflowRunDetail[]>(`${apiEndpoints.agentWorkflowRuns}${queryString(filters)}`),
  streamAgentWorkflowRuns,
  drafts: (fanpageId?: string) => request<PostDraft[]>(apiEndpoints.drafts(undefined, fanpageId)),
  approveDraft: (id: string, options: PublishOptions = {}) =>
    request<PublishedPost>(apiEndpoints.draftApprove(id), { method: "POST", body: JSON.stringify(options) }),
  rejectDraft: (id: string) => request<PostDraft>(apiEndpoints.draftReject(id), { method: "POST", body: JSON.stringify({}) }),
  publishedPosts: (fanpageId?: string) => request<PublishedPost[]>(apiEndpoints.publishedPosts(fanpageId))
};
