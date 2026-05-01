import { Controller, Get, Req, UnauthorizedException } from "@nestjs/common";
import type { AdminProfile } from "@auto-fb/shared";
import { type AuthenticatedRequest } from "./supabase-jwt.guard.js";

@Controller("auth")
export class AuthController {
  @Get("me")
  me(@Req() request: AuthenticatedRequest): AdminProfile {
    if (!request.user) {
      throw new UnauthorizedException("Missing authenticated admin user");
    }

    return {
      authUserId: request.user.authUserId,
      email: request.user.email,
      role: request.user.role,
      status: request.user.status,
      permissions: request.user.permissions
    };
  }
}
