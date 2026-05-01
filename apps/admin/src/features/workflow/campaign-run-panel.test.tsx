import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api-client.js";
import { renderWithClient } from "../../test/render.js";
import { CampaignRunPanel } from "./campaign-run-panel.js";

vi.mock("../../lib/api-client.js", () => ({
  api: {
    runWorkflow: vi.fn()
  }
}));

const runWorkflow = vi.mocked(api.runWorkflow);

describe("CampaignRunPanel", () => {
  beforeEach(() => {
    runWorkflow.mockReset();
  });

  it("does not allow agent runs without a selected campaign", () => {
    renderWithClient(<CampaignRunPanel campaignId={undefined} />);

    expect(screen.getByText("No campaign selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run agents/i })).toBeDisabled();
  });

  it("starts the controlled workflow and refreshes generated artifacts", async () => {
    const user = userEvent.setup();
    runWorkflow.mockResolvedValue({ ok: true });
    const { queryClient } = renderWithClient(<CampaignRunPanel campaignId="campaign-1" />);
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await user.click(screen.getByRole("button", { name: /run agents/i }));

    await waitFor(() => expect(runWorkflow).toHaveBeenCalledWith("campaign-1"));
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["drafts"] }));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["agent-runs"] });
  });
});
