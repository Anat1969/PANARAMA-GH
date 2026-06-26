// Supabase client configuration.
//
// The project URL is derived from the project ref. The anon / publishable key is
// the PUBLIC client key — it is designed to be embedded in front-end apps, so it
// is safe to commit. Replace the placeholder below with your project's
// publishable key (Supabase dashboard → Project Settings → API → "anon"/publishable).
//
// You can also override either value at build time with Vite env vars
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.

const ENV = import.meta.env as Record<string, string | undefined>

export const SUPABASE_URL =
  ENV.VITE_SUPABASE_URL || 'https://slcpldoaaagkoozpbjsk.supabase.co'

export const SUPABASE_ANON_KEY =
  ENV.VITE_SUPABASE_ANON_KEY || 'REPLACE_WITH_PUBLISHABLE_ANON_KEY'

/** True once a real key has been provided (so the UI can prompt to configure). */
export const SUPABASE_CONFIGURED =
  SUPABASE_ANON_KEY !== 'REPLACE_WITH_PUBLISHABLE_ANON_KEY' &&
  SUPABASE_ANON_KEY.length > 20

export const STORAGE_BUCKET = 'panarama-projects'
