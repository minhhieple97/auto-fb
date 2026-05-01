import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AdminPermission } from "@auto-fb/shared";
import { type AuthenticatedRequest } from "./supabase-jwt.guard.js";
import { REQUIRED_PERMISSIONS_KEY } from "./permissions.decorator.js";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<AdminPermission[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException("Missing authenticated admin user");
    }

    const granted = new Set(request.user.permissions);
    const allowed = requiredPermissions.every((permission) => granted.has(permission));
    if (!allowed) {
      throw new ForbiddenException("Insufficient admin permissions");
    }

    return true;
  }
}
