import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api-client.js";

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
  });
});
