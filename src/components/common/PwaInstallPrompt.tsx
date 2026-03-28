import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';

const INSTALL_DISMISSED_KEY = 'expense-tracker-pwa-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandaloneMode() {
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true;
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isIOSDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function canUseNativePrompt() {
  return 'BeforeInstallPromptEvent' in window || /Android/i.test(navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => localStorage.getItem(INSTALL_DISMISSED_KEY) === '1');

  const showIOSHelp = useMemo(() => {
    return isMobileDevice() && isIOSDevice() && !isStandaloneMode() && !isDismissed;
  }, [isDismissed]);

  useEffect(() => {
    if (!isMobileDevice() || isStandaloneMode() || isDismissed) {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsOpen(true);
    };

    const handleAppInstalled = () => {
      setIsOpen(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (showIOSHelp || !canUseNativePrompt()) {
      setIsOpen(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isDismissed, showIOSHelp]);

  const closeAndRemember = () => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    setIsDismissed(true);
    setIsOpen(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome !== 'accepted') {
        setIsOpen(false);
      }
    } finally {
      setDeferredPrompt(null);
      setIsInstalling(false);
    }
  };

  const hasNativeInstall = deferredPrompt !== null;

  return (
    <Modal
      description="Install this app on your phone for faster access, offline support, and a full-screen experience."
      onClose={closeAndRemember}
      open={isOpen}
      title="Install Expense Tracker"
      variant="sheet"
    >
      <div className="pwa-install-content">
        {hasNativeInstall ? (
          <p className="helper-text">
            Tap <strong>Install now</strong> to add the app to your home screen.
          </p>
        ) : (
          <p className="helper-text">
            On iPhone/iPad: open the browser share menu, then tap <strong>Add to Home Screen</strong>.
          </p>
        )}

        <div className="inline-actions">
          <button className="secondary-button" onClick={closeAndRemember} type="button">
            Maybe later
          </button>
          {hasNativeInstall ? (
            <button className="primary-button" disabled={isInstalling} onClick={() => void handleInstall()} type="button">
              {isInstalling ? 'Opening prompt...' : 'Install now'}
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}