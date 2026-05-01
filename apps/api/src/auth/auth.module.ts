import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PersistenceModule } from "../persistence/persistence.module.js";
import { AuthController } from "./auth.controller.js";
import { PermissionsGuard } from "./permissions.guard.js";
import { SupabaseAuthService } from "./supabase-auth.service.js";
import { SupabaseJwtGuard } from "./supabase-jwt.guard.js";

@Global()
@Module({
  imports: [PersistenceModule],
  controllers: [AuthController],
  providers: [
    SupabaseAuthService,
    SupabaseJwtGuard,
    PermissionsGuard,
    { provide: APP_GUARD, useClass: SupabaseJwtGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard }
  ],
  exports: [SupabaseAuthService, SupabaseJwtGuard, PermissionsGuard]
})
export class AuthModule {}
