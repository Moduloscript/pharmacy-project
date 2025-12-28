'use client';

import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Session-related types
export interface CartSession {
  id: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  status: 'active' | 'checkout' | 'completed' | 'expired';
  orderId?: string;
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'cancelled';
}

export interface SessionMetadata {
  userAgent: string;
  tabId: string;
  version: number;
}

export interface CartSessionState {
  session: CartSession;
  metadata: SessionMetadata;
}

// Session configuration
export const SESSION_CONFIG = {
  ACTIVE_EXPIRY_MS: 48 * 60 * 60 * 1000,        // 48 hours for active browsing
  CHECKOUT_EXPIRY_MS: 2 * 60 * 60 * 1000,       // 2 hours during checkout
  PAYMENT_PENDING_MS: 30 * 60 * 1000,           // 30 minutes for payment completion
  ABANDONED_CART_MS: 7 * 24 * 60 * 60 * 1000,   // 7 days for abandoned cart recovery
  HEARTBEAT_INTERVAL: 30 * 1000,                // 30 seconds cross-tab sync
  CLEANUP_INTERVAL: 15 * 60 * 1000,             // 15 minutes cleanup check
  ACTIVITY_EXTENSION: 60 * 60 * 1000,           // 1 hour activity extension
} as const;

// Utilities for session management
export class SessionManager {
  /**
   * Generate a new unique session ID
   */
  static generateSessionId(): string {
    return `cart_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a new tab ID
   */
  static generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new cart session
   */
  static createSession(status: CartSession['status'] = 'active'): CartSession {
    const now = new Date();
    const expiryMs = status === 'checkout' 
      ? SESSION_CONFIG.CHECKOUT_EXPIRY_MS 
      : SESSION_CONFIG.ACTIVE_EXPIRY_MS;

    return {
      id: this.generateSessionId(),
      createdAt: now,
      lastActivity: now,
      expiresAt: new Date(now.getTime() + expiryMs),
      status,
    };
  }

  /**
   * Create session metadata
   */
  static createMetadata(): SessionMetadata {
    return {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      tabId: this.generateTabId(),
      version: 1,
    };
  }

  /**
   * Check if a session is expired
   */
  static isExpired(session: CartSession): boolean {
    return new Date() > new Date(session.expiresAt);
  }

  /**
   * Check if a session is active (not expired and not completed)
   */
  static isActive(session: CartSession): boolean {
    return !this.isExpired(session) && !['completed', 'expired'].includes(session.status);
  }

  /**
   * Update session activity timestamp and extend expiration
   */
  static updateActivity(session: CartSession): CartSession {
    const now = new Date();
    return {
      ...session,
      lastActivity: now,
      expiresAt: new Date(now.getTime() + SESSION_CONFIG.ACTIVITY_EXTENSION),
    };
  }

  /**
   * Transition session to checkout status
   */
  static startCheckout(session: CartSession, orderId?: string): CartSession {
    const now = new Date();
    return {
      ...session,
      status: 'checkout',
      orderId,
      lastActivity: now,
      expiresAt: new Date(now.getTime() + SESSION_CONFIG.CHECKOUT_EXPIRY_MS),
    };
  }

  /**
   * Mark session as completed (triggers cart clearing)
   */
  static completeSession(session: CartSession): CartSession {
    return {
      ...session,
      status: 'completed',
      paymentStatus: 'completed',
      lastActivity: new Date(),
    };
  }

  /**
   * Mark payment as failed and restore active status
   */
  static failPayment(session: CartSession): CartSession {
    const now = new Date();
    return {
      ...session,
      status: 'active',
      paymentStatus: 'failed',
      lastActivity: now,
      expiresAt: new Date(now.getTime() + SESSION_CONFIG.ACTIVE_EXPIRY_MS),
    };
  }

  /**
   * Clean up legacy cart storage in localStorage (we now use sessionStorage only)
   */
  static cleanupExpiredSessions(): void {
    try {
      if (typeof localStorage === 'undefined') return;

      const keys = Object.keys(localStorage);

      // Remove old per-session cart mirrors from localStorage
      keys
        .filter((key) => key.startsWith('benpharm-cart-items-'))
        .forEach((key) => {
          try { localStorage.removeItem(key); } catch {}
        });

      // Remove legacy session copy in localStorage (session uses sessionStorage now)
      try { localStorage.removeItem('benpharm-cart-session'); } catch {}
    } catch (error) {
      console.warn('Failed to cleanup legacy cart storage:', error);
    }
  }

  /**
   * Migrate legacy cart data to session-aware format
   */
  static migrateLegacyCart(items: any[]): CartSessionState | null {
    if (!items || items.length === 0) return null;

    return {
      session: this.createSession('active'),
      metadata: this.createMetadata(),
    };
  }

  /**
   * Handle cross-tab synchronization conflict
   */
  static resolveConflict(
    localState: CartSessionState,
    remoteState: CartSessionState
  ): CartSessionState {
    // Use the state with higher version number, or the most recent activity
    if (localState.metadata.version > remoteState.metadata.version) {
      return localState;
    } else if (remoteState.metadata.version > localState.metadata.version) {
      return remoteState;
    } else {
      // Same version, use most recent activity
      const localActivity = new Date(localState.session.lastActivity).getTime();
      const remoteActivity = new Date(remoteState.session.lastActivity).getTime();
      return localActivity > remoteActivity ? localState : remoteState;
    }
  }

  /**
   * Check if current tab should be the master tab for cleanup operations
   */
  static shouldBeMasterTab(tabId: string): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;

      const currentMaster = localStorage.getItem('benpharm-cart-master-tab');
      const masterExpiry = localStorage.getItem('benpharm-cart-master-expiry');

      // If no master or master expired, become master
      if (!currentMaster || !masterExpiry || Date.now() > parseInt(masterExpiry)) {
        localStorage.setItem('benpharm-cart-master-tab', tabId);
        localStorage.setItem('benpharm-cart-master-expiry', (Date.now() + 60000).toString()); // 1 minute
        return true;
      }

      return currentMaster === tabId;
    } catch {
      return false;
    }
  }
}

// Base session state atom (tab-scoped)
// Base session state atom (tab-scoped)
interface Storage<T> {
  getItem: (key: string, initialValue: T) => T;
  setItem: (key: string, newValue: T) => void;
  removeItem: (key: string) => void;
}

const sessionStateStorage: Storage<CartSessionState | null> = {
  getItem: (_key: string, initialValue: CartSessionState | null) => {
    try {
      if (typeof window === 'undefined') return initialValue
      const fromSession = sessionStorage.getItem('benpharm-cart-session')
      if (fromSession != null) return JSON.parse(fromSession)
      // No longer falling back to localStorage - sessions are strictly per-tab now
      return initialValue
    } catch {
      return initialValue
    }
  },
  setItem: (_key: string, newValue: CartSessionState | null) => {
    try {
      if (typeof window === 'undefined') return
      const str = JSON.stringify(newValue)
      sessionStorage.setItem('benpharm-cart-session', str)
    } catch {}
  },
  removeItem: (_key: string) => {
    try {
      if (typeof window === 'undefined') return
      sessionStorage.removeItem('benpharm-cart-session')
    } catch {}
  }
}

export const cartSessionStateAtom = atomWithStorage<CartSessionState | null>(
  'benpharm-cart-session',
  null,
  sessionStateStorage
);

// Derived atoms
export const currentSessionAtom = atom(
  (get) => {
    const state = get(cartSessionStateAtom);
    return state && 'session' in state ? state.session : null;
  }
);

export const sessionMetadataAtom = atom(
  (get) => {
    const state = get(cartSessionStateAtom); 
    return state && 'metadata' in state ? state.metadata : null;
  }
);

export const isSessionActiveAtom = atom(
  (get) => {
    const session = get(currentSessionAtom);
    return session ? SessionManager.isActive(session) : false;
  }
);

// Session action atoms
export const initializeSessionAtom = atom(
  null,
  (get, set) => {
    const currentState = get(cartSessionStateAtom);

    // If there's no session or it's not active, start a fresh one
    // If there's no session or it's not active, start a fresh one
    if (!currentState || !('session' in currentState) || !SessionManager.isActive(currentState.session)) {
      // Clean up any legacy localStorage mirrors and stale keys
      SessionManager.cleanupExpiredSessions();
      const newState = {
        session: SessionManager.createSession(),
        metadata: SessionManager.createMetadata(),
      };
      set(cartSessionStateAtom, newState);
      return;
    }

    // Otherwise just update activity
    if (!('session' in currentState)) return;
    const updatedSession = SessionManager.updateActivity(currentState.session);
    set(cartSessionStateAtom, {
      ...currentState,
      session: updatedSession,
      metadata: {
        ...currentState.metadata,
        version: currentState.metadata.version + 1,
      },
    });
  }
);

export const updateSessionActivityAtom = atom(
  null,
  (get, set) => {
    const currentState = get(cartSessionStateAtom);
    if (!currentState || !('session' in currentState) || !SessionManager.isActive(currentState.session)) return;

    const updatedSession = SessionManager.updateActivity(currentState.session);
    set(cartSessionStateAtom, {
      ...currentState,
      session: updatedSession,
      metadata: {
        ...currentState.metadata,
        version: currentState.metadata.version + 1,
      },
    });
  }
);

export const startCheckoutSessionAtom = atom(
  null,
  (get, set, orderId?: string) => {
    const currentState = get(cartSessionStateAtom);
    if (!currentState || !('session' in currentState)) return;

    const checkoutSession = SessionManager.startCheckout(currentState.session, orderId);
    set(cartSessionStateAtom, {
      ...currentState,
      session: checkoutSession,
      metadata: {
        ...currentState.metadata,
        version: currentState.metadata.version + 1,
      },
    });
  }
);

export const completeSessionAtom = atom(
  null,
  (get, set) => {
    const currentState = get(cartSessionStateAtom);
    if (!currentState || !('session' in currentState)) return;

    const completedSession = SessionManager.completeSession(currentState.session);
    set(cartSessionStateAtom, {
      ...currentState,
      session: completedSession,
      metadata: {
        ...currentState.metadata,
        version: currentState.metadata.version + 1,
      },
    });
  }
);

export const failPaymentAtom = atom(
  null,
  (get, set) => {
    const currentState = get(cartSessionStateAtom);
    if (!currentState || !('session' in currentState)) return;

    const failedSession = SessionManager.failPayment(currentState.session);
    set(cartSessionStateAtom, {
      ...currentState,
      session: failedSession,
      metadata: {
        ...currentState.metadata,
        version: currentState.metadata.version + 1,
      },
    });
  }
);
