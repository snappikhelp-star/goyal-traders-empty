import { useState, useEffect, useCallback } from "react";

// Augment the standard Event for the non-standard beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export type PWAInstallState =
  | "installed"    // already running as standalone / already installed
  | "installable"  // browser fired beforeinstallprompt (Chrome / Edge / Android)
  | "ios"          // iOS Safari — guide user to Share → Add to Home Screen
  | "unsupported"; // no install signal (Firefox, old browsers, already installed but non-standalone)

export interface PWAInstallHook {
  state: PWAInstallState;
  isIOS: boolean;
  isDesktop: boolean;
  promptInstall: () => Promise<void>;
}

export function usePWAInstall(): PWAInstallHook {
  const [state, setState] = useState<PWAInstallState>(() => {
    // Evaluate synchronously on mount so there's no flash
    const ua = navigator.userAgent;

    // Check if already running as a PWA (standalone mode)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return "installed";

    // iOS detection: classic iOS UA + iPadOS which reports MacIntel with touch
    const ios =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) return "ios";

    // Default: unknown — becomes installable once beforeinstallprompt fires
    return "unsupported";
  });

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Derived values (stable)
  const isIOS = state === "ios";
  const isDesktop =
    !isIOS && !("ontouchstart" in window) && window.innerWidth >= 768;

  useEffect(() => {
    // Nothing to listen for if already decided
    if (state === "installed" || state === "ios") return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState("installable");
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setState("installed");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [state]);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setState("installed");
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  return { state, isIOS, isDesktop, promptInstall };
}
