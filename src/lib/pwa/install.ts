export interface PwaInstallGuidance {
  title: string;
  description: string;
  steps: string[];
}

interface PwaInstallEnvironment {
  userAgent: string;
  maxTouchPoints?: number;
}

/** Returns truthful manual-install copy when no native prompt is available. */
export function getPwaInstallGuidance({
  userAgent,
  maxTouchPoints = 0,
}: PwaInstallEnvironment): PwaInstallGuidance {
  const isIos =
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  if (isIos) {
    return {
      title: 'Add Fledge to your Home Screen',
      description: 'Install Fledge from your browser share menu.',
      steps: [
        'Tap the Share button in your browser.',
        'Tap Add to Home Screen, then confirm Add.',
      ],
    };
  }

  if (/Firefox/i.test(userAgent)) {
    if (/Android/i.test(userAgent)) {
      return {
        title: 'Install Fledge from Firefox',
        description: 'You can install Fledge without leaving this page.',
        steps: ['Open the Firefox menu (⋮).', 'Tap Install.'],
      };
    }
    return {
      title: 'Install with Chrome or Edge',
      description:
        'Firefox desktop does not currently support installing websites as PWAs. Open this page in Chrome or Edge to install Fledge.',
      steps: [],
    };
  }

  const isDesktopSafari =
    /Safari/i.test(userAgent) &&
    !/Chrome|Chromium|CriOS|Edg|OPR/i.test(userAgent);
  if (isDesktopSafari) {
    return {
      title: 'Add Fledge to your Dock',
      description: 'Safari can add Fledge as an app from this page.',
      steps: ['Open Safari’s File menu.', 'Choose Add to Dock.'],
    };
  }

  return {
    title: 'Install Fledge',
    description: 'Install Fledge directly from this page.',
    steps: [
      'Open the browser menu (⋮).',
      'Choose Install Fledge, Install app, or Add to Home Screen.',
    ],
  };
}
