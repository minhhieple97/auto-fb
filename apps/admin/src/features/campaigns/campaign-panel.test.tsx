import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Fanpage } from "@auto-fb/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api-client.js";
import { renderWithClient } from "../../test/render.js";
import { CampaignPanel } from "./campaign-panel.js";

vi.mock("../../lib/api-client.js", () => ({
  api: {
    createFanpage: vi.fn(),
    fanpages: vi.fn(),
    testFanpageConnection: vi.fn()
  }
}));

const fanpages = vi.mocked(api.fanpages);
const createFanpage = vi.mocked(api.createFanpage);
const testFanpageConnection = vi.mocked(api.testFanpageConnection);

function fanpage(overrides: Partial<Fanpage> = {}): Fanpage {
  return {
    id: "fanpage_1",
    campaignId: "camp_1",
    name: "Launch",
    facebookPageId: "page_1",
    environment: "sandbox",
    topic: "AI operations",
    language: "vi",
    brandVoice: "helpful, concise, practical",
    llmProvider: "mock",
    llmModel: "mock-copywriter-v1",
    scheduleConfig: {
      enabled: false,
      postsPerDay: 1,
      intervalMinutes: 1440,
      startTimeLocal: "09:00",
      timezone: "Asia/Saigon"
    },
    hasPageAccessToken: true,
    pageAccessTokenMask: "****1234",
    status: "ACTIVE",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides
  };
}

describe("CampaignPanel fanpage management", () => {
  beforeEach(() => {
    fanpages.mockReset().mockResolvedValue([
      fanpage(),
      fanpage({ id: "fanpage_2", campaignId: "camp_2", name: "Evergreen", environment: "production", topic: "Operations" })
    ]);
    createFanpage.mockReset();
    testFanpageConnection.mockReset().mockResolvedValue({ ok: true, facebookPageId: "page_1", environment: "sandbox", pageName: "Launch" });
  });

  it("lists fanpages and reports the selected fanpage", async () => {
    const onSelect = vi.fn();

    renderWithClient(<CampaignPanel selectedFanpageId="fanpage_1" onSelect={onSelect} onCreated={vi.fn()} />);

    await userEvent.click(await screen.findByTitle("Select Evergreen"));

    expect(screen.getByText("Launch")).toBeInTheDocument();
    expect(screen.getAllByText("Production").length).toBeGreaterThan(0);
    expect(onSelect).toHaveBeenCalledWith("fanpage_2");
  });

  it("creates a fanpage with token, environment, provider, and schedule controls", async () => {
    const user = userEvent.setup();
    const created = fanpage({ id: "fanpage_new", name: "New launch" });
    const onCreated = vi.fn();
    createFanpage.mockResolvedValue(created);
    const { queryClient } = renderWithClient(<CampaignPanel selectedFanpageId={undefined} onSelect={vi.fn()} onCreated={onCreated} />);
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await user.type(screen.getByPlaceholderText("Fanpage name"), "New launch");
    await user.type(screen.getByPlaceholderText("Facebook Page ID"), "page_new");
    await user.type(screen.getByPlaceholderText("Page Access Token"), "token_1234");
    await user.type(screen.getByPlaceholderText("Topic"), "AI workflows");
    await user.selectOptions(screen.getAllByRole("combobox")[1]!, "mock");
    await user.click(screen.getByLabelText("Schedule draft generation"));
    await user.clear(screen.getByLabelText("Posts per day"));
    await user.type(screen.getByLabelText("Posts per day"), "2");
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() =>
      expect(createFanpage.mock.calls[0]?.[0]).toMatchObject({
        name: "New launch",
        facebookPageId: "page_new",
        environment: "sandbox",
        topic: "AI workflows",
        pageAccessToken: "token_1234",
        llmProvider: "mock",
        llmModel: "mock-copywriter-v1",
        scheduleConfig: expect.objectContaining({ enabled: true, postsPerDay: 2 })
      })
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("fanpage_new"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["fanpages"] });
  });

  it("tests a saved fanpage Graph API connection", async () => {
    const user = userEvent.setup();
    renderWithClient(<CampaignPanel selectedFanpageId="fanpage_1" onSelect={vi.fn()} onCreated={vi.fn()} />);

    const buttons = await screen.findAllByRole("button", { name: /test graph api connection/i });
    await user.click(buttons[0]!);

    await waitFor(() => expect(testFanpageConnection).toHaveBeenCalledWith("fanpage_1"));
    expect(await screen.findByText("Connected to Launch")).toBeInTheDocument();
  });

  it("does not expose fanpage creation controls without permission", async () => {
    renderWithClient(<CampaignPanel canCreate={false} selectedFanpageId={undefined} onSelect={vi.fn()} onCreated={vi.fn()} />);

    expect(await screen.findByText("Launch")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create/i })).not.toBeInTheDocument();
  });
});
