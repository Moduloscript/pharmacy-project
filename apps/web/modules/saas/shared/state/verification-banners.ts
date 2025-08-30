import { atom } from 'jotai';

// Local UI state (per-session) for dismissing banners
export const emailBannerDismissedAtom = atom(false);
export const pendingBannerDismissedAtom = atom(false);
