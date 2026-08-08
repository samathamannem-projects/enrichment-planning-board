import { createClient } from "@supabase/supabase-js";

// These come from Vercel environment variables (VITE_ prefix = exposed to the browser).
// The anon key is a *publishable* client key by design — access is controlled by
// Supabase Row Level Security + auth, not by hiding this value.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// When these aren't set (e.g. local dev before setup), the app falls back to
// localStorage and runs with no login — see EnrichmentBoard.jsx.
export const supabaseEnabled = Boolean(url && key);
export const supabase = supabaseEnabled ? createClient(url, key) : null;
