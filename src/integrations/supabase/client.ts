// Backend switcher.
//
// - No env vars (default): the app runs on the in-browser demo backend with
//   seeded data persisted to localStorage. Zero setup, no accounts, no keys.
// - VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set: the app talks to your own
//   Supabase project (apply the SQL in supabase/migrations first).
//   See SELF_HOSTING.md for the full walkthrough.

import { createClient } from '@supabase/supabase-js';
import { demoSupabase, resetDemoDatabase, exportDemoDatabase, importDemoDatabase, setupMyStoreDatabase } from './demoClient';

/** First-run marker: absent means the onboarding wizard should show. */
export const SETUP_MARKER_KEY = 'seecen-setup';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isDemoMode = !supabaseUrl || !supabaseAnonKey;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = isDemoMode
  ? demoSupabase
  : createClient(supabaseUrl!, supabaseAnonKey!);

/** Wipe the sandbox and reload with a freshly seeded demo database. No-op against a real backend. */
export function resetDemoData() {
  if (!isDemoMode) return;
  resetDemoDatabase();
  try { localStorage.removeItem(SETUP_MARKER_KEY); } catch { /* noop */ }
  window.location.reload();
}

/** Swap the sandbox for the seller's own empty store. Caller reloads. */
export function setupMyStore(storeName: string, city: string) {
  if (!isDemoMode) return;
  setupMyStoreDatabase(storeName, city);
}

/** Serialize the demo database for download. Returns null against a real backend. */
export function exportDemoData(): string | null {
  return isDemoMode ? exportDemoDatabase() : null;
}

/** Replace the demo database with a backup file's contents. Caller reloads on success. */
export function importDemoData(json: string): { ok: boolean; error?: string } {
  if (!isDemoMode) return { ok: false, error: 'Import is only available in demo mode.' };
  return importDemoDatabase(json);
}
