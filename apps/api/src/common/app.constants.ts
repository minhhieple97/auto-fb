export const envKeys = {
  apiPort: "API_PORT",
  facebookPageTokenEncryptionKey: "FACEBOOK_PAGE_TOKEN_ENCRYPTION_KEY",
  fanpageSchedulerIntervalMs: "FANPAGE_SCHEDULER_INTERVAL_MS",
  metaGraphApiVersion: "META_GRAPH_API_VERSION",
  metaPageAccessToken: "META_PAGE_ACCESS_TOKEN",
  nodeEnv: "NODE_ENV",
  port: "PORT",
  publishDryRun: "PUBLISH_DRY_RUN",
  r2AccessKeyId: "R2_ACCESS_KEY_ID",
  r2AccountId: "R2_ACCOUNT_ID",
  r2Bucket: "R2_BUCKET",
  r2PublicBaseUrl: "R2_PUBLIC_BASE_URL",
  r2SecretAccessKey: "R2_SECRET_ACCESS_KEY",
  redisUrl: "REDIS_URL",
  supabaseAnonKey: "SUPABASE_ANON_KEY",
  supabaseSchema: "SUPABASE_SCHEMA",
  supabaseSecretKey: "SUPABASE_SECRET_KEY",
  supabaseServiceKey: "SUPABASE_SERVICE_KEY",
  supabaseServiceRoleKey: "SUPABASE_SERVICE_ROLE_KEY",
  supabaseUrl: "SUPABASE_URL"
} as const;

export const appDefaults = {
  metaGraphApiVersion: "v20.0",
  fanpageSchedulerIntervalMs: 60_000,
  port: 3000,
  publishDryRun: "true",
  r2Bucket: "auto-fb-assets",
  r2Region: "auto",
  supabaseSchema: "public"
} as const;

export const nodeEnvironments = {
  production: "production"
} as const;
