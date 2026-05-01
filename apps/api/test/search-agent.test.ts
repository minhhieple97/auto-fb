import { describe, expect, it, vi } from "vitest";
import { SearchContentAgent } from "../src/agents/search-content.agent.js";
import { FakeDatabase } from "./fake-database.js";
import { buildCampaignInput } from "./helpers.js";

const selectedResult = {
  id: "result-1",
  title: "AI automation source",
  url: "https://example.com/story",
  snippet: "Teams are automating routine publishing work.",
  sourceName: "example.com"
};

describe("SearchContentAgent", () => {
  it("delegates grounded search to the configured LLM provider", async () => {
    const db = new FakeDatabase();
    const campaign = db.createCampaign(buildCampaignInput());
    const searchResponse = {
      query: "AI automation",
      provider: "gemini" as const,
      model: "gemini-2.5-flash",
      searchQueries: ["AI automation"],
      results: [selectedResult]
    };
    const llm = {
      searchContent: vi.fn().mockResolvedValue(searchResponse),
      generatePost: vi.fn()
    };
    const agent = new SearchContentAgent(db, llm as never, { check: vi.fn() } as never);

    await expect(agent.search(campaign.id, { query: "AI automation", limit: 10, provider: "gemini", model: "gemini-2.5-flash" })).resolves.toEqual(
      searchResponse
    );
    expect(llm.searchContent).toHaveBeenCalledWith({ query: "AI automation", limit: 10, provider: "gemini", model: "gemini-2.5-flash" });
  });

  it("creates a pending approval draft from selected search results", async () => {
    const db = new FakeDatabase();
    const campaign = db.createCampaign(buildCampaignInput({ topic: "AI operations" }));
    const llm = {
      searchContent: vi.fn(),
      generatePost: vi.fn().mockResolvedValue({
        text: "Draft from selected result\n\nNguon: https://example.com/story",
        provider: "gemini",
        model: "gemini-2.5-flash"
      })
    };
    const qa = { check: vi.fn().mockResolvedValue({ riskScore: 0, riskFlags: [], approvedForHumanReview: true }) };
    const agent = new SearchContentAgent(db, llm as never, qa as never);

    const response = await agent.generate(campaign.id, {
      selectedResults: [selectedResult],
      instructions: "Keep it short.",
      provider: "gemini",
      model: "gemini-2.5-flash"
    });

    expect(response.draft).toMatchObject({
      status: "PENDING_APPROVAL",
      approvalStatus: "PENDING",
      text: "Draft from selected result\n\nNguon: https://example.com/story"
    });
    expect(response.contentItem).toMatchObject({
      title: "AI automation source",
      sourceUrl: "https://example.com/story",
      rawText: expect.stringContaining("Teams are automating routine publishing work.")
    });
    expect(db.listSources(campaign.id)[0]).toMatchObject({
      type: "static_html",
      url: "https://example.com/story",
      crawlPolicy: "user_selected_search",
      enabled: false
    });
    expect(llm.generatePost).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "gemini",
        model: "gemini-2.5-flash",
        topic: "AI operations",
        sourceUrl: "https://example.com/story",
        instructions: expect.stringContaining("Keep it short.")
      })
    );
    expect(qa.check).toHaveBeenCalledWith(
      expect.objectContaining({
        draftText: "Draft from selected result\n\nNguon: https://example.com/story"
      })
    );
  });
});
