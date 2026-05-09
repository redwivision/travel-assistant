import { createClient } from "@supabase/supabase-js";

// ─── Environment Variables ────────────────────────────────────────────────────
// These must be set in your .env file (Vite prefix: VITE_)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
}

// ─── Supabase Client ──────────────────────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Trip {
  id: number;
  user_id: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface VisaInfo {
  visaRequired: boolean;
  requiredDocuments: string[];
  notes: string;
}

export interface SafetyInfo {
  safetyLevel: "Low" | "Medium" | "High";
  sources: { name: string; rating: string; lastUpdated: string }[];
  generalAdvice: string;
}

export interface WeatherDay {
  date: string;
  tempHigh: number;
  tempLow: number;
  condition: string;
}

export interface WeatherForecast {
  destination: string;
  forecast: WeatherDay[];
}

export interface ElectricalInfo {
  plugType: string;
  voltage: string;
  frequency: string;
}

// ─── Helper: Call an Edge Function ───────────────────────────────────────────
async function callEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>,
  authRequired = false
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, // Base authorization for public functions
  };

  if (authRequired) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated. Please log in.");
    headers["Authorization"] = `Bearer ${session.access_token}`; // Override with strict auth session
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Edge function ${name} failed`);
  }

  return res.json() as Promise<T>;
}

// ─── Public Edge Function Helpers ────────────────────────────────────────────

/**
 * Get visa requirements for a given citizenship → destination pair.
 * Defaults to Ethiopian citizenship.
 */
export async function getVisaInfo(destination: string, citizenship = "ethiopia"): Promise<VisaInfo> {
  return callEdgeFunction<VisaInfo>("get-visa-info", { citizenship, destination });
}

/**
 * Get safety advisory and level for a destination.
 */
export async function getSafetyInfo(destination: string): Promise<SafetyInfo> {
  return callEdgeFunction<SafetyInfo>("get-safety-info", { destination });
}

/**
 * Get a 7-day weather forecast for a destination.
 * @param start_date - Optional ISO date string (e.g. "2025-06-01"). Defaults to today.
 */
export async function getWeather(destination: string, start_date?: string): Promise<WeatherForecast> {
  return callEdgeFunction<WeatherForecast>("get-weather", { destination, start_date });
}

/**
 * Get plug type, voltage, and frequency for a destination.
 */
export async function getElectricalInfo(destination: string): Promise<ElectricalInfo> {
  return callEdgeFunction<ElectricalInfo>("get-electrical", { destination });
}

// ─── Authenticated Trip Helpers ───────────────────────────────────────────────

/**
 * Save a trip for the currently logged-in user.
 */
export async function saveTrip(params: {
  destination: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
}): Promise<{ trip: Trip }> {
  return callEdgeFunction<{ trip: Trip }>("save-trip", params, true);
}

/**
 * Get all trips for the currently logged-in user.
 */
export async function getTrips(): Promise<{ trips: Trip[] }> {
  return callEdgeFunction<{ trips: Trip[] }>("get-trips", {}, true);
}

/**
 * Delete a trip by ID. Only works if the trip belongs to the current user.
 */
export async function deleteTrip(trip_id: number): Promise<{ success: boolean }> {
  return callEdgeFunction<{ success: boolean }>("delete-trip", { trip_id }, true);
}

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

/** Sign up a new user */
export async function signUp(email: string, password: string, fullName?: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName ?? "" } },
  });
}

/** Sign in with email + password */
export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

/** Sign out the current user */
export async function signOut() {
  return supabase.auth.signOut();
}

/** Get current session (for auth guards) */
export async function getSession() {
  return supabase.auth.getSession();
}

/** Listen to auth state changes */
export function onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  return supabase.auth.onAuthStateChange(callback);
}
