import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseAuthService } from "../src/auth/supabase-auth.service.js";
import { jsonResponse } from "./helpers.js";

describe("SupabaseAuthService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the actor from the Supabase auth user endpoint", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ id: "user_1", email: "admin@example.com" }));
    const service = new SupabaseAuthService(
      new ConfigService({
        SUPABASE_URL: "https://project.supabase.co/",
        SUPABASE_SECRET_KEY: "server-key"
      })
    );

    await expect(service.authenticateAuthorizationHeader("Bearer jwt-1")).resolves.toEqual({
      id: "user_1",
      email: "admin@example.com"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/user",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "server-key",
          Authorization: "Bearer jwt-1"
        })
      })
    );
  });

  it("rejects missing and invalid bearer tokens", async () => {
    const service = new SupabaseAuthService(
      new ConfigService({
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SECRET_KEY: "server-key"
      })
    );

    await expect(service.authenticateAuthorizationHeader(undefined)).rejects.toThrow("Missing Supabase bearer token");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ message: "invalid" }, { status: 401 }));
    await expect(service.authenticateAuthorizationHeader("Bearer jwt-1")).rejects.toThrow("Invalid Supabase bearer token");
  });
});
