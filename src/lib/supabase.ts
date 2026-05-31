export function supabaseStatus() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.supabase ??
    "";

  return {
    configured: Boolean(url && publishableKey),
    urlConfigured: Boolean(url),
    keyConfigured: Boolean(publishableKey),
  };
}
