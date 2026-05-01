import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PostDraft, PublishedPost } from "@auto-fb/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api-client.js";
import { renderWithClient } from "../../test/render.js";
import { DraftInbox } from "./draft-inbox.js";

vi.mock("../../lib/api-client.js", () => ({
  api: {
    approveDraft: vi.fn(),
    rejectDraft: vi.fn()
  }
}));

const approveDraft = vi.mocked(api.approveDraft);
const rejectDraft = vi.mocked(api.rejectDraft);

function draft(overrides: Partial<PostDraft> = {}): PostDraft {
  return {
    id: "draft-1",
    campaignId: "campaign-1",
    contentItemId: "content-1",
    text: "Draft copy ready for approval.",
    status: "PENDING_APPROVAL",
    riskScore: 35,
    riskFlags: ["needs_source_check"],
    approvalStatus: "PENDING",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    contentItem: {
      id: "content-1",
      campaignId: "campaign-1",
      sourceId: "source-1",
      sourceUrl: "https://example.com/article",
      title: "Collected article",
      rawText: "Raw text",
      summary: "Summary",
      imageUrls: [],
      hash: "hash-1",
      createdAt: "2026-05-01T00:00:00.000Z"
    },
    ...overrides
  };
}

function publishedPost(overrides: Partial<PublishedPost> = {}): PublishedPost {
  return {
    id: "post-1",
    postDraftId: "draft-1",
    facebookPageId: "page-1",
    facebookPostId: "dry-run-post-1",
    status: "DRY_RUN_PUBLISHED",
    publishPayload: {},
    createdAt: "2026-05-01T00:00:00.000Z",
    publishedAt: "2026-05-01T00:00:00.000Z",
    ...overrides
  };
}

describe("DraftInbox", () => {
  beforeEach(() => {
    approveDraft.mockReset();
    rejectDraft.mockReset();
  });

  it("shows pending drafts with risk context for human approval", () => {
    renderWithClient(<DraftInbox drafts={[draft()]} onChanged={vi.fn()} />);

    expect(screen.getByText("Collected article")).toBeInTheDocument();
    expect(screen.getByText("Draft copy ready for approval.")).toBeInTheDocument();
    expect(screen.getByText("Risk 35")).toBeInTheDocument();
    expect(screen.getByText("needs_source_check")).toBeInTheDocument();
  });

  it("approves a draft and refreshes draft and publish data", async () => {
    const user = userEvent.setup();
    approveDraft.mockResolvedValue(publishedPost());
    const onChanged = vi.fn().mockResolvedValue(undefined);
    const { queryClient } = renderWithClient(<DraftInbox drafts={[draft()]} onChanged={onChanged} />);
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await user.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => expect(approveDraft).toHaveBeenCalled());
    expect(approveDraft.mock.calls[0]?.[0]).toBe("draft-1");
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["drafts"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["published-posts"] });
  });

  it("rejects a draft and refreshes review data", async () => {
    const user = userEvent.setup();
    rejectDraft.mockResolvedValue(draft({ status: "REJECTED", approvalStatus: "REJECTED" }));
    const onChanged = vi.fn().mockResolvedValue(undefined);
    const { queryClient } = renderWithClient(<DraftInbox drafts={[draft()]} onChanged={onChanged} />);
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await user.click(screen.getByRole("button", { name: /reject/i }));

    await waitFor(() => expect(rejectDraft).toHaveBeenCalled());
    expect(rejectDraft.mock.calls[0]?.[0]).toBe("draft-1");
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["drafts"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["published-posts"] });
  });

  it("does not expose draft review controls without permission", () => {
    renderWithClient(<DraftInbox canReview={false} drafts={[draft()]} onChanged={vi.fn()} />);

    expect(screen.getByText("Draft copy ready for approval.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reject/i })).not.toBeInTheDocument();
  });
});
