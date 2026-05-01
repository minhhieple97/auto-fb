import { render, screen } from "@testing-library/react";
import type { PublishedPost } from "@auto-fb/shared";
import { describe, expect, it } from "vitest";
import { PublishedHistory } from "./published-history.js";

function post(overrides: Partial<PublishedPost> = {}): PublishedPost {
  return {
    id: "post_1",
    postDraftId: "draft_1",
    facebookPageId: "page_1",
    facebookPostId: "fb_1",
    status: "PUBLISHED",
    publishPayload: {},
    publishedAt: "2026-05-01T00:00:00.000Z",
    createdAt: "2026-05-01T00:00:00.000Z",
    ...overrides
  };
}

describe("PublishedHistory", () => {
  it("shows an empty state when there are no published posts", () => {
    render(<PublishedHistory posts={[]} />);

    expect(screen.getByText("No published posts")).toBeInTheDocument();
  });

  it("renders successful and failed publish attempts", () => {
    const failedPost: PublishedPost = {
      id: "post_2",
      postDraftId: "draft_2",
      facebookPageId: "page_1",
      status: "FAILED",
      publishPayload: {},
      errorMessage: "Meta rejected post",
      createdAt: "2026-05-01T00:00:00.000Z"
    };

    render(
      <PublishedHistory
        posts={[
          post(),
          failedPost
        ]}
      />
    );

    expect(screen.getByText("PUBLISHED")).toBeInTheDocument();
    expect(screen.getByText("fb_1")).toBeInTheDocument();
    expect(screen.getByText("FAILED")).toBeInTheDocument();
    expect(screen.getByText("Meta rejected post")).toBeInTheDocument();
  });
});
