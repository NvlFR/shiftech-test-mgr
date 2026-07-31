import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRepoCredentialsHandler } from "./handler.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

Deno.serve(createRepoCredentialsHandler({
  async authenticate(accessToken) {
    const auth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data, error } = await auth.auth.getUser(accessToken);
    return error || !data.user ? null : { id: data.user.id };
  },
  manageCredential(args) {
    return admin.rpc("manage_repository_credential", args);
  },
  getRepositoryConnection(args) {
    return admin.rpc("get_repository_connection", args);
  },
  fetchGitHub(input, init) {
    return fetch(input, init);
  },
}));
