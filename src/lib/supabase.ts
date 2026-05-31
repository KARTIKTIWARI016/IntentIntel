export function supabaseStatus() {
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.supabase_url ??
    "";
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.supabase_publishable_key ??
    process.env.supabase ??
    "";
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.supabase_secret_key ??
    "";
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const postgresDatabase = /^postgres(ql)?:\/\//.test(databaseUrl);

  return {
    configured: Boolean(url && (publishableKey || secretKey)),
    urlConfigured: Boolean(url),
    keyConfigured: Boolean(publishableKey),
    secretKeyConfigured: Boolean(secretKey),
    databaseConfigured: postgresDatabase,
    persistentHistory: postgresDatabase && databaseUrl.includes("supabase"),
  };
}
