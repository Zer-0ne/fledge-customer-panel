'use client';

import * as React from 'react';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getPwaInstallGuidance } from '@/lib/pwa/install';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

const subscribeToClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function isRunningAsInstalledApp() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  );
}

/** Global install control. Header placement keeps it available on every route. */
export function PwaInstallButton() {
  const isClient = React.useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [isHidden, setIsHidden] = React.useState(false);
  const [isPrompting, setIsPrompting] = React.useState(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const [promptEvent, setPromptEvent] =
    React.useState<BeforeInstallPromptEvent | null>(null);

  const isInstalled = isClient && isRunningAsInstalledApp();

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setPromptEvent(null);
      setIsHelpOpen(false);
      setIsHidden(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!promptEvent) {
      setIsHelpOpen(true);
      return;
    }

    setIsPrompting(true);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      setPromptEvent(null);
      setIsHidden(true);
    } catch {
      setPromptEvent(null);
      setIsHelpOpen(true);
    } finally {
      setIsPrompting(false);
    }
  };

  if (!isClient || isInstalled || isHidden) return null;

  const guidance = getPwaInstallGuidance({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
  });

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-8 rounded-full px-0 sm:size-9 lg:w-auto lg:px-3"
        aria-label="Install Fledge"
        title="Install Fledge"
        disabled={isPrompting}
        onClick={handleInstall}
      >
        <Download className="size-4 sm:size-[18px] text-muted-foreground" />
        <span className="hidden lg:inline">
          {isPrompting ? 'Opening…' : 'Install'}
        </span>
      </Button>

      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{guidance.title}</DialogTitle>
            <DialogDescription>{guidance.description}</DialogDescription>
          </DialogHeader>

          {guidance.steps.length > 0 ? (
            <ol className="space-y-2 pl-5 text-sm text-foreground">
              {guidance.steps.map((step) => (
                <li key={step} className="list-decimal pl-1 font-medium">
                  {step}
                </li>
              ))}
            </ol>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
