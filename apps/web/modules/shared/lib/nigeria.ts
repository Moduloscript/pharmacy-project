// Nigerian states and Local Government Areas
// Source of truth: apps/web/lib/nigerian-locations.ts
// This module re-exports a normalized mapping so the rest of the app has a single dataset.
import { stateLGAMapping } from '@/lib/nigerian-locations';

// Normalize keys so FCT appears as "Abuja" across the app
const normalized: Record<string, string[]> = {};
for (const [state, lgas] of Object.entries(stateLGAMapping)) {
  const key = state === 'FCT (Abuja)' || state === 'FCT' ? 'Abuja' : state;
  normalized[key] = lgas;
}

export const NIGERIAN_STATES_AND_LGAS: Record<string, string[]> = normalized;

// Derived helpers
export const NIGERIAN_STATES: string[] = Object.keys(NIGERIAN_STATES_AND_LGAS);

export function isValidState(state: string): boolean {
  return !!state && NIGERIAN_STATES.includes(state);
}

export function isValidLGAForState(state: string, lga: string): boolean {
  if (!isValidState(state) || !lga) return false;
  return (NIGERIAN_STATES_AND_LGAS[state] || []).includes(lga);
}
