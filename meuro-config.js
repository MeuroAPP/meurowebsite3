// Meuro settings. Fill these in from your Supabase project:
//   Supabase dashboard > Project Settings > API (or "Connect")
// Both values are designed to be public. Your data is protected by the
// database rules in supabase/schema.sql, not by keeping these secret.
// NEVER put the "service_role" or "secret" key here.
export const SUPABASE_URL = "";        // e.g. "https://abcdefghijklmnop.supabase.co"
export const SUPABASE_ANON_KEY = "";   // the "anon" / "publishable" key

// Optional: Google Analytics 4 measurement ID (starts with "G-").
export const GA_MEASUREMENT_ID = "";

// Optional: Cloudflare Turnstile site key, to block robot sign-ups.
// Add the matching secret in Supabase > Authentication > Attack Protection.
export const TURNSTILE_SITE_KEY = "";
