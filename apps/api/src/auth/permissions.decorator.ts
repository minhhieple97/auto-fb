import { SetMetadata } from "@nestjs/common";
import type { AdminPermission } from "@auto-fb/shared";

export const REQUIRED_PERMISSIONS_KEY = "requiredAdminPermissions";

export function RequirePermissions(...permissions: AdminPermission[]) {
  return SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
}
