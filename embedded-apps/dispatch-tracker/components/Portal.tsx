import React, { useEffect, useRef } from 'react';

let createPortal: any = null;
try {
  // react-dom is only available for web builds; require dynamically so
  // bundlers don't choke for native targets.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  createPortal = require('react-dom').createPortal;
} catch (e) {
  createPortal = null;
}

export default function Portal({ children }: { children: React.ReactNode }) {
  const hostRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!createPortal || typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.setAttribute('data-portal', 'true');
    document.body.appendChild(el);
    hostRef.current = el;
    return () => {
      if (hostRef.current && hostRef.current.parentNode) hostRef.current.parentNode.removeChild(hostRef.current);
    };
  }, []);

  if (!createPortal || typeof document === 'undefined') return <>{children}</>;
  return createPortal(children, hostRef.current ?? document.body);
}
