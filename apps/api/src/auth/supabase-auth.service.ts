import { Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type SupabaseActor = {
  id: string;
  email?: string;
};

@Injectable()
export class SupabaseAuthService {
  private readonly supabaseUrl: string | undefined;
  private readonly apiKey: string | undefined;

  constructor(config: ConfigService) {
    this.supabaseUrl = config.get<string>("SUPABASE_URL")?.replace(/\/$/, "");
    this.apiKey =
      config.get<string>("SUPABASE_SECRET_KEY") ??
      config.get<string>("SUPABASE_SERVICE_ROLE_KEY") ??
      config.get<string>("SUPABASE_SERVICE_KEY") ??
      config.get<string>("SUPABASE_ANON_KEY");
  }

  async authenticateAuthorizationHeader(authorization: string | undefined): Promise<SupabaseActor> {
    const token = bearerToken(authorization);
    if (!token) {
      throw new UnauthorizedException("Missing Supabase bearer token");
    }
    if (!this.supabaseUrl || !this.apiKey) {
      throw new InternalServerErrorException("SUPABASE_URL and a Supabase API key are required for authenticated workflow endpoints");
    }

    let response: Response;
    try {
      response = await fetch(`${this.supabaseUrl}/auth/v1/user`, {
        headers: {
          Accept: "application/json",
          apikey: this.apiKey,
          Authorization: `Bearer ${token}`
        }
      });
    } catch (error) {
      throw new UnauthorizedException(`Unable to validate Supabase token: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (!response.ok) {
      throw new UnauthorizedException("Invalid Supabase bearer token");
    }

    const body = (await response.json().catch(() => undefined)) as unknown;
    if (!isRecord(body) || typeof body.id !== "string") {
      throw new UnauthorizedException("Supabase auth user response did not include a user id");
    }

    const email = typeof body.email === "string" ? body.email : undefined;
    return email ? { id: body.id, email } : { id: body.id };
  }
}

function bearerToken(authorization: string | undefined): string | undefined {
  if (!authorization) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
