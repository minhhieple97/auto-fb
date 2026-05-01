import { llmModels } from "@auto-fb/shared";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api-client.js";
import { renderWithClient } from "../../test/render.js";
import { SearchAgentPanel } from "./search-agent-panel.js";

vi.mock("../../lib/api-client.js", () => ({
  api: {
    generateFromSearch: vi.fn(),
    searchAgent: vi.fn()
  }
}));

const searchAgent = vi.mocked(api.searchAgent);
const generateFromSearch = vi.mocked(api.generateFromSearch);

const searchResult = {
  id: "result-1",
  title: "AI automation source",
  url: "https://example.com/story",
  snippet: "Useful source context.",
  sourceName: "example.com"
};

describe("SearchAgentPanel", () => {
  beforeEach(() => {
    searchAgent.mockReset();
    generateFromSearch.mockReset();
  });

  it("does not allow search without a selected campaign", () => {
    renderWithClient(<SearchAgentPanel campaignId={undefined} />);

    expect(screen.getByLabelText("Search query")).toBeDisabled();
    expect(screen.getByRole("button", { name: /search/i })).toBeDisabled();
  });

  it("searches, lets the user select results, and creates a draft", async () => {
    const user = userEvent.setup();
    searchAgent.mockResolvedValue({
      query: "AI automation",
      provider: "gemini",
      model: llmModels.gemini.flash3Preview,
      searchQueries: ["AI automation"],
      results: [searchResult]
    });
    generateFromSearch.mockResolvedValue({
      draft: {
        id: "draft-1",
        campaignId: "campaign-1",
        contentItemId: "content-1",
        text: "Generated draft",
        status: "PENDING_APPROVAL",
        riskScore: 0,
        riskFlags: [],
        approvalStatus: "PENDING",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z"
      },
      contentItem: {
        id: "content-1",
        campaignId: "campaign-1",
        sourceId: "source-1",
        sourceUrl: "https://example.com/story",
        title: "AI automation source",
        rawText: "Useful source context.",
        summary: "Useful source context.",
        imageUrls: [],
        hash: "hash-1",
        createdAt: "2026-05-01T00:00:00.000Z"
      },
      duplicate: false
    });
    const onGenerated = vi.fn().mockResolvedValue(undefined);
    const { queryClient } = renderWithClient(<SearchAgentPanel campaignId="campaign-1" onGenerated={onGenerated} />);
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await user.type(screen.getByLabelText("Search query"), "AI automation");
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(await screen.findByText("AI automation source")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText("Generation instructions"), "Keep it short.");
    await user.click(screen.getByRole("button", { name: /generate draft/i }));

    await waitFor(() =>
      expect(generateFromSearch).toHaveBeenCalledWith("campaign-1", {
        selectedResults: [searchResult],
        instructions: "Keep it short.",
        provider: "gemini",
        model: llmModels.gemini.flash3Preview
      })
    );
    expect(searchAgent).toHaveBeenCalledWith("campaign-1", {
      query: "AI automation",
      limit: 10,
      provider: "gemini",
      model: llmModels.gemini.flash3Preview
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["drafts"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["sources"] });
    expect(onGenerated).toHaveBeenCalled();
  });
});
