import { ConfigService } from "@nestjs/config";
import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { adminPermissions, permissionsForRole, type AdminProfile } from "@auto-fb/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequirePermissions } from "../src/auth/permissions.decorator.js";
import { PermissionsGuard } from "../src/auth/permissions.guard.js";
import { SupabaseAuthService } from "../src/auth/supabase-auth.service.js";
import { jsonResponse } from "./helpers.js";

const ownerProfile: AdminProfile = {
  authUserId: "user_1",
  email: "admin@example.com",
  role: "owner",
  status: "active",
  permissions: permissionsForRole("owner")
};

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
      }),
      {
        getAdminProfileForAuthUser: vi.fn().mockResolvedValue(ownerProfile)
      } as never
    );

    await expect(service.authenticateAuthorizationHeader("Bearer jwt-1")).resolves.toEqual({
      ...ownerProfile,
      id: "user_1",
      authUserId: "user_1"
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
      }),
      {
        getAdminProfileForAuthUser: vi.fn()
      } as never
    );

    await expect(service.authenticateAuthorizationHeader(undefined)).rejects.toThrow("Missing Supabase bearer token");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ message: "invalid" }, { status: 401 }));
    await expect(service.authenticateAuthorizationHeader("Bearer jwt-1")).rejects.toThrow("Invalid Supabase bearer token");
  });

  it("rejects valid Supabase users that are not active admin users", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ id: "user_1", email: "reader@example.com" }));
    const service = new SupabaseAuthService(
      new ConfigService({
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SECRET_KEY: "server-key"
      }),
      {
        getAdminProfileForAuthUser: vi.fn().mockResolvedValue(undefined)
      } as never
    );

    await expect(service.authenticateAuthorizationHeader("Bearer jwt-1")).rejects.toThrow(ForbiddenException);
  });
});

describe("PermissionsGuard", () => {
  it("allows admin actors with the required permission", () => {
    class Controller {
      @RequirePermissions(adminPermissions.manageCampaigns)
      handle() {
        return undefined;
      }
    }
    const guard = new PermissionsGuard(new Reflector());

    expect(guard.canActivate(executionContext({ ...ownerProfile, id: "user_1" }, Controller.prototype.handle, Controller))).toBe(true);
  });

  it("blocks admin actors without the required permission", () => {
    class Controller {
      @RequirePermissions(adminPermissions.manageCampaigns)
      handle() {
        return undefined;
      }
    }
    const guard = new PermissionsGuard(new Reflector());
    const viewer = {
      ...ownerProfile,
      id: "user_2",
      authUserId: "user_2",
      email: "viewer@example.com",
      role: "viewer" as const,
      permissions: permissionsForRole("viewer")
    };

    expect(() => guard.canActivate(executionContext(viewer, Controller.prototype.handle, Controller))).toThrow("Insufficient admin permissions");
  });
});

function executionContext(user: unknown, handler: () => void, controller: object) {
  return {
    getClass: () => controller,
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => ({ headers: {}, user })
    })
  } as never;
}
