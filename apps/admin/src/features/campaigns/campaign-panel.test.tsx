import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Campaign } from "@auto-fb/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api-client.js";
import { renderWithClient } from "../../test/render.js";
import { CampaignPanel } from "./campaign-panel.js";

vi.mock("../../lib/api-client.js", () => ({
  api: {
    campaigns: vi.fn(),
    createCampaign: vi.fn()
  }
}));

const campaigns = vi.mocked(api.campaigns);
const createCampaign = vi.mocked(api.createCampaign);

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "camp_1",
    name: "Launch",
    topic: "AI operations",
    language: "vi",
    brandVoice: "helpful, concise, practical",
    targetPageId: "page_1",
    llmProvider: "mock",
    llmModel: "mock-copywriter-v1",
    status: "ACTIVE",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides
  };
}

describe("CampaignPanel", () => {
  beforeEach(() => {
    campaigns.mockReset().mockResolvedValue([campaign(), campaign({ id: "camp_2", name: "Evergreen", topic: "Operations" })]);
    createCampaign.mockReset();
  });

  it("lists campaigns and reports the selected campaign", async () => {
    const onSelect = vi.fn();

    renderWithClient(<CampaignPanel selectedCampaignId="camp_1" onSelect={onSelect} onCreated={vi.fn()} />);

    await userEvent.click(await screen.findByTitle("Select Evergreen"));

    expect(screen.getByText("Launch")).toBeInTheDocument();
    expect(screen.getByText("Operations")).toBeInTheDocument();
    expect(onSelect).toHaveBeenCalledWith("camp_2");
  });

  it("creates a campaign with provider-specific model selection and refreshes the list", async () => {
    const user = userEvent.setup();
    const created = campaign({ id: "camp_new", name: "New launch" });
    const onCreated = vi.fn();
    createCampaign.mockResolvedValue(created);
    const { queryClient } = renderWithClient(<CampaignPanel selectedCampaignId={undefined} onSelect={vi.fn()} onCreated={onCreated} />);
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await user.type(screen.getByPlaceholderText("Campaign name"), "New launch");
    await user.type(screen.getByPlaceholderText("Topic"), "AI workflows");
    await user.type(screen.getByPlaceholderText("Facebook Page ID"), "page_new");
    await user.selectOptions(screen.getAllByRole("combobox")[0]!, "mock");
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() =>
      expect(createCampaign.mock.calls[0]?.[0]).toEqual({
        name: "New launch",
        topic: "AI workflows",
        language: "vi",
        brandVoice: "helpful, concise, practical",
        targetPageId: "page_new",
        llmProvider: "mock",
        llmModel: "mock-copywriter-v1"
      })
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("camp_new"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["campaigns"] });
  });

  it("validates required campaign fields before creating a campaign", async () => {
    const user = userEvent.setup();
    renderWithClient(<CampaignPanel selectedCampaignId={undefined} onSelect={vi.fn()} onCreated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /create/i }));

    expect(await screen.findByText("Campaign name must be at least 2 characters.")).toBeInTheDocument();
    expect(screen.getByText("Topic must be at least 2 characters.")).toBeInTheDocument();
    expect(screen.getByText("Facebook Page ID is required.")).toBeInTheDocument();
    expect(createCampaign).not.toHaveBeenCalled();
  });

  it("does not expose campaign creation controls without permission", async () => {
    renderWithClient(<CampaignPanel canCreate={false} selectedCampaignId={undefined} onSelect={vi.fn()} onCreated={vi.fn()} />);

    expect(await screen.findByText("Launch")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create/i })).not.toBeInTheDocument();
  });
});
