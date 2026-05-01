import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./app.js";

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

describe("admin dashboard", () => {
  it("renders campaign, source, draft, timeline, and history surfaces", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } })
    );

    renderApp();

    expect(await screen.findByText("Campaigns")).toBeInTheDocument();
    expect(screen.getByText("Sources")).toBeInTheDocument();
    expect(screen.getByText("Approval inbox")).toBeInTheDocument();
    expect(screen.getByText("Agent timeline")).toBeInTheDocument();
    expect(screen.getByText("Published history")).toBeInTheDocument();
  });
});
