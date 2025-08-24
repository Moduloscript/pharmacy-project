'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  rootId?: string;
}

export function Portal({ children, rootId = 'cart-portal-root' }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Create or get the portal root element
    let portalRoot = document.getElementById(rootId);
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = rootId;
      // Don't assign a huge z-index here – let children control their own stacking
      // This avoids creating a parent stacking context that eclipses global UI (e.g. toasts)
      document.body.appendChild(portalRoot);
    }

    return () => {
      // Clean up if this was the last portal using this root
      const root = document.getElementById(rootId);
      if (root && root.childNodes.length === 0) {
        document.body.removeChild(root);
      }
    };
  }, [rootId]);

  if (!mounted) {
    return null;
  }

  const portalRoot = document.getElementById(rootId);
  if (!portalRoot) {
    return null;
  }

  return createPortal(children, portalRoot);
}
