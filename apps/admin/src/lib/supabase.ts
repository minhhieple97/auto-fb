import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient | undefined;
let currentAccessToken: string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const missingSupabaseEnv = [
  !supabaseUrl ? "VITE_SUPABASE_URL" : undefined,
  !supabasePublishableKey ? "VITE_SUPABASE_PUBLISHABLE_KEY" : undefined
].filter(Boolean) as string[];

export function getSupabaseClient() {
  if (!isSupabaseConfigured) {
    throw new Error(`Missing Supabase environment: ${missingSupabaseEnv.join(", ")}`);
  }

  supabaseClient ??= createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storageKey: "auto-fb-admin-auth"
    }
  });

  return supabaseClient;
}

export function setCurrentAuthSession(session: Session | null) {
  currentAccessToken = session?.access_token;
}

export function getAuthAccessToken() {
  return currentAccessToken;
}
