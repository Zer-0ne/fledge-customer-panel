'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchOwnProfile } from '@/lib/api/services/account';
import { User } from '@/types';
import { formatDate } from '@/lib/formatting';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { TrustBadge, TrustLevelSection } from '@/components/trust/trust-badge';
import BorderGlow from '@/components/BorderGlow'
import { UserRound } from 'lucide-react';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-medium text-foreground break-words">{value}</dd>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const { user: sessionUser } = useAuth();
  const [profile, setProfile] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [methods, setMethods] = React.useState<{ phoneOtpEnabled: boolean; upiEnabled: boolean } | null>(null);
  const [studentVerified, setStudentVerified] = React.useState(false);
  const [upiVerified, setUpiVerified] = React.useState(false);
  const [collegeEmailVerified, setCollegeEmailVerified] = React.useState<string | null>(null);

  const loadProfile = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchOwnProfile();
      setProfile(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load profile.';
      setError(msg);
      if (sessionUser) setProfile(sessionUser);
    } finally {
      setIsLoading(false);
    }
  }, [sessionUser]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile();
  }, [loadProfile]);

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/proxy/api/v1/auth/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setMethods({ phoneOtpEnabled: d.phoneOtpEnabled ?? d.otpEnabled ?? true, upiEnabled: d.upiEnabled ?? false });
      })
      .catch(() => {});
    // Real verification status (was hardcoded false): student VERIFIED flag
    // from my verifications, UPI from the auth profile's verification method.
    fetch('/api/proxy/api/v1/student-verifications/mine')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list = Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : Array.isArray(d?.data) ? d.data : [];
        if (!cancelled) {
          setStudentVerified(list.some((v: { status?: string; verifiedAt?: string }) => v?.status === 'VERIFIED' || !!v?.verifiedAt));
          const college = (list as Array<{ status?: string; method?: string; collegeEmail?: string }>).find(
            (v) => v?.method === 'COLLEGE_EMAIL_OTP' && v?.status === 'VERIFIED',
          );
          setCollegeEmailVerified(college?.collegeEmail ?? null);
        }
      })
      .catch(() => {});
    fetch('/api/proxy/api/v1/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const method = d?.user?.verificationMethod ?? d?.verificationMethod;
        if (!cancelled) setUpiVerified(method === 'UPI_OTM');
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (error && !profile) {
    return <ErrorState title="Profile unavailable" description={error} onRetry={loadProfile} />;
  }

  const data = profile || sessionUser;

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your account details are read-only. Contact support if you need changes.
        </p>
      </div>

      <BorderGlow className='rounded-2xl!'>
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {data?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.avatarUrl}
                alt=""
                className="size-14 rounded-2xl object-cover"
              />
            ) : (
              <UserRound className="size-7" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
              {data?.displayName || 'User'}
              <TrustBadge badge={data?.trustBadge} />
            </h3>
            <Badge variant="secondary" className="mt-1">
              Read-only profile
            </Badge>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-border/60">
          <Field label="Display name" value={data?.displayName || '—'} />
          <Field label="Email" value={data?.email || 'Not provided'} />
          <Field label="Phone" value={data?.phone || 'Not provided'} />
          <Field label="Member since" value={formatDate(data?.createdAt)} />
          <Field label="College ID" value={data?.collegeId || 'Not set'} />
          <Field label="Campus ID" value={data?.campusId || 'Not set'} />
        </dl>

        {/* ── Verification Section ── */}
        <div className="pt-3 border-t border-border/60 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verification</p>
          <div className="grid gap-2">
            {(methods === null || methods.phoneOtpEnabled) && (
              <VerifyRow icon="📱" label="Phone" done={!!data?.phoneVerifiedAt} route="/settings/verify/phone" />
            )}
            <VerifyRow icon="✉️" label="Email" done={!!data?.emailVerifiedAt} subtitle={data?.emailVerifiedAt ? 'Verified via Google Sign-In' : 'Not verified'} />
            <VerifyRow icon="🏫" label="College Email" done={collegeEmailVerified !== null} route={collegeEmailVerified ? undefined : "/settings/verify/college-email"} subtitle={collegeEmailVerified ?? 'Instant code on your college address'} />
            <VerifyRow icon="🎓" label="Student ID" done={studentVerified} route={studentVerified ? undefined : "/settings/verify/student"} subtitle="Upload college ID card photo" />
            <VerifyRow icon="💳" label="UPI" done={upiVerified} route={upiVerified ? undefined : "/settings/verify/upi"} subtitle={methods?.upiEnabled ? "Verify via ₹1 UPI mandate" : "UPI unavailable in test mode"} />
          </div>
        </div>

        {data?.bio && (
          <div className="pt-2 border-t border-border/60 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bio</p>
            <p className="text-sm text-foreground leading-relaxed">{data.bio}</p>
          </div>
        )}
        <TrustLevelSection badge={data?.trustBadge} />
      </div>
      </BorderGlow>
    </section>
  );
}

function VerifyRow({ icon, label, done, route, subtitle }: { icon: string; label: string; done: boolean; route?: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/40 bg-card/50 px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="text-base">{icon}</span>
        <div>
          <p className="text-sm font-medium">{label}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {done ? (
        <span className="text-xs font-medium text-green-500 flex items-center gap-1">✓ Verified</span>
      ) : route ? (
        <Link href={route} className="text-xs font-medium text-primary hover:underline">Verify →</Link>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}
