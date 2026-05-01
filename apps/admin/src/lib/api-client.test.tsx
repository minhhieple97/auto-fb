import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, api } from "./api-client.js";

const authTokenMock = vi.hoisted(() => vi.fn());

vi.mock("./supabase.js", () => ({
  getAuthAccessToken: authTokenMock
}));

describe("api client auth headers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authTokenMock.mockReset();
  });

  it("adds the Supabase access token as a bearer authorization header", async () => {
    authTokenMock.mockReturnValue("jwt-1");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } })
    );

    await api.campaigns();

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer jwt-1");
  });

  it("does not add authorization when no Supabase access token exists", async () => {
    authTokenMock.mockReturnValue(undefined);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } })
    );

    await api.campaigns();

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).has("authorization")).toBe(false);
  });

  it("surfaces API error messages from JSON error payloads", async () => {
    authTokenMock.mockReturnValue("jwt-1");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Campaign not found" }), { status: 404, headers: { "content-type": "application/json" } })
    );

    await expect(api.campaigns()).rejects.toThrow("Campaign not found");
    await expect(api.campaigns()).rejects.toBeInstanceOf(ApiClientError);
  });

  it("loads the current admin profile", async () => {
    authTokenMock.mockReturnValue("jwt-1");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          authUserId: "user-1",
          email: "admin@example.com",
          role: "owner",
          status: "active",
          permissions: ["read:dashboard_data"]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    await expect(api.me()).resolves.toMatchObject({ email: "admin@example.com", role: "owner" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/auth/me");
  });

  it("posts search agent requests under the selected campaign", async () => {
    authTokenMock.mockReturnValue("jwt-1");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          query: "AI automation",
          provider: "gemini",
          model: "gemini-2.5-flash",
          searchQueries: ["AI automation"],
          results: []
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    await api.searchAgent("camp_1", { query: "AI automation", limit: 10, provider: "gemini", model: "gemini-2.5-flash" });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/campaigns/camp_1/agent-search/search");
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe("POST");
  });
});
