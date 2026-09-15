import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Captured at module scope so the one-shot browser event isn't missed while
// React is still mounting. main.tsx imports this module for its side effect.
let deferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('seecen-can-install'));
  });
}

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(() => deferredPrompt != null);

  useEffect(() => {
    const handler = () => setCanInstall(deferredPrompt != null);
    window.addEventListener('seecen-can-install', handler);
    return () => window.removeEventListener('seecen-can-install', handler);
  }, []);

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true);

  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    setCanInstall(false);
    return choice.outcome === 'accepted';
  };

  return { canInstall, install, isStandalone, isIos };
}
