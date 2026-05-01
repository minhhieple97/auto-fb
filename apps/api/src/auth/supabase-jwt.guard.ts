import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { SupabaseActor, SupabaseAuthService } from "./supabase-auth.service.js";

export type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: SupabaseActor;
};

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  constructor(@Inject(SupabaseAuthService) private readonly auth: SupabaseAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.user = await this.auth.authenticateAuthorizationHeader(firstHeader(request.headers.authorization));
    return true;
  }
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
