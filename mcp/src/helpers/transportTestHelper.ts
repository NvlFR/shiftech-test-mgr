import { SupabaseRpcTransport, type TransportAdapter } from "@testmanager/agent-core";

export const transportFor = (fetchImpl: typeof fetch): TransportAdapter => new SupabaseRpcTransport({
  supabaseUrl: "https://example.supabase.co",
  supabaseAnonKey: "test-anon-key",
  fetch: fetchImpl,
});
