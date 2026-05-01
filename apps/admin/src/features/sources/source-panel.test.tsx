import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Source } from "@auto-fb/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api-client.js";
import { renderWithClient } from "../../test/render.js";
import { SourcePanel } from "./source-panel.js";

vi.mock("../../lib/api-client.js", () => ({
  api: {
    createSource: vi.fn()
  }
}));

const createSource = vi.mocked(api.createSource);

function source(overrides: Partial<Source> = {}): Source {
  return {
    id: "source-1",
    campaignId: "campaign-1",
    type: "rss",
    url: "https://example.com/feed.xml",
    crawlPolicy: "whitelist_only",
    enabled: true,
    createdAt: "2026-05-01T00:00:00.000Z",
    ...overrides
  };
}

describe("SourcePanel", () => {
  beforeEach(() => {
    createSource.mockReset();
  });

  it("blocks source creation until a campaign is selected", () => {
    renderWithClient(<SourcePanel campaignId={undefined} sources={[]} />);

    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByPlaceholderText("https://example.com/feed.xml")).toBeDisabled();
    expect(screen.getByRole("button", { name: /add source/i })).toBeDisabled();
  });

  it("creates whitelisted enabled sources for the selected campaign", async () => {
    const user = userEvent.setup();
    createSource.mockResolvedValue(source({ type: "api", url: "https://example.com/data.json" }));
    const { queryClient } = renderWithClient(<SourcePanel campaignId="campaign-1" sources={[]} />);
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await user.selectOptions(screen.getByRole("combobox"), "api");
    await user.type(screen.getByPlaceholderText("https://example.com/feed.xml"), "https://example.com/data.json");
    await user.click(screen.getByRole("button", { name: /add source/i }));

    await waitFor(() =>
      expect(createSource).toHaveBeenCalledWith("campaign-1", {
        type: "api",
        url: "https://example.com/data.json",
        crawlPolicy: "whitelist_only",
        enabled: true
      })
    );
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["sources"] }));
  });
});
