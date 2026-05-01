import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api-client.js";
import { renderWithClient } from "../../test/render.js";
import { CampaignRunPanel } from "./campaign-run-panel.js";

vi.mock("../../lib/api-client.js", () => ({
  api: {
    runFanpageWorkflow: vi.fn()
  }
}));

const runFanpageWorkflow = vi.mocked(api.runFanpageWorkflow);

describe("CampaignRunPanel", () => {
  beforeEach(() => {
    runFanpageWorkflow.mockReset();
  });

  it("does not allow agent runs without a selected campaign", () => {
    renderWithClient(<CampaignRunPanel fanpageId={undefined} />);

    expect(screen.getByText("No fanpage selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run agents/i })).toBeDisabled();
  });

  it("starts the controlled workflow and refreshes generated artifacts", async () => {
    const user = userEvent.setup();
    runFanpageWorkflow.mockResolvedValue({
      id: "workflow-run-1",
      campaignId: "campaign-1",
      graphRunId: "graph-1",
      status: "QUEUED",
      triggeredByUserId: "user-1",
      createdAt: "2026-05-01T00:00:00.000Z",
      steps: []
    });
    const { queryClient } = renderWithClient(<CampaignRunPanel fanpageId="fanpage-1" fanpageName="Launch" />);
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await user.click(screen.getByRole("button", { name: /run agents/i }));

    await waitFor(() => expect(runFanpageWorkflow).toHaveBeenCalledWith("fanpage-1"));
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["drafts"] }));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["agent-runs"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["agent-workflow-runs"] });
  });

  it("disables workflow runs without permission", async () => {
    const user = userEvent.setup();
    renderWithClient(<CampaignRunPanel canRun={false} fanpageId="fanpage-1" />);

    const button = screen.getByRole("button", { name: /run agents/i });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(runFanpageWorkflow).not.toHaveBeenCalled();
  });
});
