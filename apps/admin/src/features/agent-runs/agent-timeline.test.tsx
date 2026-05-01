import { screen, within } from "@testing-library/react";
import type { AgentRun } from "@auto-fb/shared";
import { describe, expect, it } from "vitest";
import { AgentTimeline } from "./agent-timeline.js";
import { render } from "@testing-library/react";

function run(overrides: Partial<AgentRun>): AgentRun {
  return {
    id: "run-1",
    campaignId: "campaign-1",
    graphRunId: "graph-1",
    nodeName: "collect_content",
    inputJson: {},
    outputJson: {},
    status: "SUCCESS",
    createdAt: "2026-05-01T00:00:00.000Z",
    ...overrides
  };
}

describe("AgentTimeline", () => {
  it("renders an empty state when there are no agent runs", () => {
    render(<AgentTimeline runs={[]} />);

    expect(screen.getByText("No agent runs")).toBeInTheDocument();
  });

  it("orders agent runs chronologically", () => {
    render(
      <AgentTimeline
        runs={[
          run({ id: "run-2", nodeName: "qa_check", status: "FAILED", createdAt: "2026-05-01T00:10:00.000Z" }),
          run({ id: "run-1", nodeName: "collect_content", createdAt: "2026-05-01T00:01:00.000Z" })
        ]}
      />
    );

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]!).getByText("collect_content")).toBeInTheDocument();
    expect(within(items[1]!).getByText("qa_check")).toBeInTheDocument();
    expect(within(items[1]!).getByText("FAILED")).toBeInTheDocument();
  });
});
