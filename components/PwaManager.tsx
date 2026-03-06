'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaManager() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showIosBanner, setShowIosBanner] = useState(false);

  useEffect(() => {
    let frameId = 0;

    // Detect standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    // Detect iOS
    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;

    if (isIos) {
      let shouldShowIosBanner = false;
      try {
        const dismissed = localStorage.getItem(
          'weather-ios-install-dismissed'
        );
        shouldShowIosBanner = !dismissed;
      } catch {
        shouldShowIosBanner = true;
      }

      if (shouldShowIosBanner) {
        frameId = window.requestAnimationFrame(() => {
          setShowIosBanner(true);
        });
      }
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch((err) => console.warn('SW registration failed:', err));
    }

    // Capture Android/Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowAndroidBanner(false);
      setInstallPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowAndroidBanner(false);
    setShowIosBanner(false);
    try {
      localStorage.setItem('weather-ios-install-dismissed', '1');
    } catch {}
  };

  // Android/Chrome install banner
  if (showAndroidBanner && installPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 surface-card rounded-[24px] p-4 flex items-center gap-3 shadow-lg">
        <span className="text-2xl shrink-0">🌤️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold theme-heading">Install Weather Vibe</p>
          <p className="text-xs theme-muted">Add to home screen for quick access.</p>
        </div>
        <button
          onClick={handleInstall}
          className="organic-button text-sm px-3 py-1.5 shrink-0"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="theme-muted text-xl leading-none shrink-0 px-1"
        >
          ×
        </button>
      </div>
    );
  }

  // iOS instructions banner (shown once, dismissible)
  if (showIosBanner) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 surface-card rounded-[24px] p-4 shadow-lg">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-bold theme-heading">Add to Home Screen</p>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="theme-muted text-xl leading-none shrink-0 px-1"
          >
            ×
          </button>
        </div>
        <p className="text-xs theme-muted leading-relaxed">
          Tap the{' '}
          <span className="font-semibold">Share</span>{' '}
          <span aria-hidden>⎋</span> button in Safari, then choose{' '}
          <span className="font-semibold">Add to Home Screen</span>.
        </p>
      </div>
    );
  }

  return null;
}
