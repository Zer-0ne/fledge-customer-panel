/**
 * Acquisition attribution tracker — parses UTM params from URL,
 * stores in localStorage, and provides attribution data for events.
 */

export interface AcquisitionData {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrerDomain?: string;
  deepLinkId?: string;
  capturedAt: string;
}

const STORAGE_KEY = 'analytics_acquisition';
const ATTRIBUTION_WINDOW_DAYS = 30;

/** Parse UTM parameters from a URL string. */
export function parseUtmFromUrl(url: string): Partial<AcquisitionData> {
  try {
    const params = new URL(url).searchParams;
    const data: Partial<AcquisitionData> = {};
    if (params.get('utm_source')) data.utmSource = params.get('utm_source')!;
    if (params.get('utm_medium')) data.utmMedium = params.get('utm_medium')!;
    if (params.get('utm_campaign')) data.utmCampaign = params.get('utm_campaign')!;
    if (params.get('referrer')) data.referrerDomain = params.get('referrer')!;
    return data;
  } catch {
    return {};
  }
}

/** Parse UTM from current page URL. */
export function parseUtmFromCurrentUrl(): Partial<AcquisitionData> {
  if (typeof window === 'undefined') return {};
  return parseUtmFromUrl(window.location.href);
}

/** Store acquisition data in localStorage. */
export function trackAcquisition(data: Partial<AcquisitionData>): void {
  if (typeof window === 'undefined') return;
  const entry: AcquisitionData = {
    ...data,
    capturedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
}

/** Get stored acquisition data (if within attribution window). */
export function getAcquisitionData(): AcquisitionData | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as AcquisitionData;
    const age = Date.now() - new Date(data.capturedAt).getTime();
    if (age > ATTRIBUTION_WINDOW_DAYS * 86400000) return null;
    return data;
  } catch {
    return null;
  }
}

/** Get referrer domain from document.referrer. */
export function getReferrerDomain(): string | null {
  if (typeof document === 'undefined' || !document.referrer) return null;
  try {
    return new URL(document.referrer).hostname;
  } catch {
    return null;
  }
}

/** Auto-capture acquisition on page load. */
export function autoCaptureAcquisition(): void {
  if (typeof window === 'undefined') return;
  const existing = getAcquisitionData();
  if (existing) return; // Already captured.

  const utm = parseUtmFromCurrentUrl();
  const referrer = getReferrerDomain();
  if (Object.keys(utm).length > 0 || referrer) {
    trackAcquisition({ ...utm, referrerDomain: referrer ?? undefined });
  }
}
