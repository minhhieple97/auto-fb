import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AgentWorkflowRunDetail } from "@auto-fb/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminStore } from "../../app/admin.store.js";
import { api } from "../../lib/api-client.js";
import { renderWithClient } from "../../test/render.js";
import { AgentRunsPage } from "./agent-runs-page.js";

vi.mock("../../lib/api-client.js", () => ({
  api: {
    agentWorkflowRuns: vi.fn(),
    campaigns: vi.fn(),
    runWorkflow: vi.fn(),
    streamAgentWorkflowRuns: vi.fn()
  }
}));

vi.mock("../../app/auth-provider.js", () => ({
  useAuth: () => ({
    hasPermission: () => true
  })
}));

const workflowRuns = vi.mocked(api.agentWorkflowRuns);
const campaigns = vi.mocked(api.campaigns);
const streamAgentWorkflowRuns = vi.mocked(api.streamAgentWorkflowRuns);

function workflowRun(overrides: Partial<AgentWorkflowRunDetail> = {}): AgentWorkflowRunDetail {
  return {
    id: "workflow_1",
    campaignId: "camp_1",
    graphRunId: "graph_1",
    status: "RUNNING",
    currentNodeName: "generate_post",
    triggeredByUserId: "user_1",
    triggeredByEmail: "admin@example.com",
    createdAt: "2026-05-01T00:00:00.000Z",
    startedAt: "2026-05-01T00:00:01.000Z",
    steps: [
      {
        id: "step_1",
        campaignId: "camp_1",
        graphRunId: "graph_1",
        nodeName: "load_campaign",
        inputJson: { campaignId: "camp_1" },
        outputJson: { loaded: true },
        status: "SUCCESS",
        startedAt: "2026-05-01T00:00:01.000Z",
        completedAt: "2026-05-01T00:00:02.000Z",
        createdAt: "2026-05-01T00:00:01.000Z"
      },
      {
        id: "step_2",
        campaignId: "camp_1",
        graphRunId: "graph_1",
        nodeName: "generate_post",
        inputJson: { draft: true },
        outputJson: {},
        status: "RUNNING",
        startedAt: "2026-05-01T00:00:03.000Z",
        createdAt: "2026-05-01T00:00:03.000Z"
      }
    ],
    ...overrides
  };
}

describe("AgentRunsPage", () => {
  beforeEach(() => {
    workflowRuns.mockReset();
    campaigns.mockReset();
    streamAgentWorkflowRuns.mockReset();
    useAdminStore.setState({ selectedCampaignId: "camp_1" });
    campaigns.mockResolvedValue([
      {
        id: "camp_1",
        name: "Launch campaign",
        topic: "AI operations",
        language: "vi",
        brandVoice: "direct",
        targetPageId: "page_1",
        llmProvider: "mock",
        llmModel: "mock",
        status: "ACTIVE",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z"
      }
    ]);
    streamAgentWorkflowRuns.mockReturnValue(vi.fn());
  });

  it("renders counters, active step details, actor, and JSON panels", async () => {
    workflowRuns.mockResolvedValue([workflowRun(), workflowRun({ id: "workflow_2", graphRunId: "graph_2", status: "SUCCESS", steps: [] })]);

    renderWithClient(<AgentRunsPage />);

    expect(await screen.findByText("Workflow history")).toBeInTheDocument();
    expect((await screen.findAllByText("admin@example.com")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("generate_post")).length).toBeGreaterThan(0);
    const runningPanel = screen.getByText("Running").closest(".panel") as HTMLElement;
    const successPanel = screen.getByText("Success").closest(".panel") as HTMLElement;
    expect(within(runningPanel).getByText("1")).toBeInTheDocument();
    expect(within(successPanel).getByText("1")).toBeInTheDocument();
    expect(await screen.findByText("Input")).toBeInTheDocument();
    expect(await screen.findByText((content) => content.includes('"draft": true'))).toBeInTheDocument();
    expect(streamAgentWorkflowRuns).toHaveBeenCalledWith(expect.objectContaining({ campaignId: "camp_1" }));
  });

  it("switches the JSON inspector when a different step is selected", async () => {
    const user = userEvent.setup();
    workflowRuns.mockResolvedValue([
      workflowRun({
        steps: [
          workflowRun().steps[0]!,
          {
            id: "step_3",
            campaignId: "camp_1",
            graphRunId: "graph_1",
            nodeName: "qa_check",
            inputJson: { qa: true },
            outputJson: {},
            status: "FAILED",
            errorMessage: "Blocked by policy",
            createdAt: "2026-05-01T00:00:04.000Z"
          }
        ]
      })
    ]);

    renderWithClient(<AgentRunsPage />);

    await user.click(await screen.findByRole("button", { name: /qa_check/i }));

    await waitFor(() => expect(screen.getByText("Blocked by policy")).toBeInTheDocument());
  });
});
