import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type PwaInstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

export interface PwaInstallState {
  /** Whether "install as an app" is a meaningful action on this platform at all (web only). */
  isSupported: boolean;
  /** Already running as an installed/standalone app. */
  isStandalone: boolean;
  /**
   * False when the page isn't served over HTTPS or localhost (e.g. opened via
   * a plain-http LAN address like `expo start --lan` gives you). Browsers
   * refuse to ever offer an install prompt in that case — no error, no
   * event, it just silently never fires — so this needs to be surfaced
   * explicitly instead of leaving the button looking broken.
   */
  isSecureContext: boolean;
  /** iOS Safari never fires beforeinstallprompt — it needs manual Share-sheet instructions. */
  isIos: boolean;
  /** True once the browser has offered a native install prompt we can trigger. */
  canPromptInstall: boolean;
  /** Triggers the browser's native install prompt. No-op (returns 'unavailable') if none is queued. */
  promptInstall: () => Promise<PwaInstallOutcome>;
}

export function usePwaInstall(): PwaInstallState {
  const isSupported = Platform.OS === 'web';
  const [deferredEvent, setDeferredEvent] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (!isSupported) return;

    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
    );

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredEvent(event);
    };
    const onInstalled = () => {
      setDeferredEvent(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [isSupported]);

  // iPadOS 13+ Safari reports a desktop-Mac user agent, so /ipad/i alone
  // misses it — fall back to the touch-capable "MacIntel" trick to catch it.
  const isIos =
    isSupported &&
    (/iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1));

  const promptInstall = async (): Promise<PwaInstallOutcome> => {
    if (!deferredEvent) return 'unavailable';
    deferredEvent.prompt();
    const choice = await deferredEvent.userChoice;
    setDeferredEvent(null);
    return choice.outcome;
  };

  const isSecureContext = !isSupported || window.isSecureContext;

  return { isSupported, isStandalone, isSecureContext, isIos, canPromptInstall: !!deferredEvent, promptInstall };
}
