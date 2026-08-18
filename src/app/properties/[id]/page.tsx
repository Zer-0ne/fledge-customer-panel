'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Property, PropertyAddress } from '@/types';
import { fetchPropertyDetail, fetchExactPropertyAddress } from '@/lib/api/services/discovery';
import { formatAddress } from '@/lib/formatting';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';
import { LocationMap } from '@/components/map/location-map';
import {
  MapPin,
  Eye,
  Check,
  ArrowLeft,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [property, setProperty] = React.useState<Property | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Exact address state
  const [exactAddress, setExactAddress] = React.useState<PropertyAddress | null>(null);
  const [isRevealingAddress, setIsRevealingAddress] = React.useState(false);
  const [addressError, setAddressError] = React.useState<string | null>(null);

  let isAuthenticated = false;
  try {
    const auth = useAuth();
    isAuthenticated = auth.isAuthenticated;
  } catch {
    // Rendered outside AuthProvider
  }

  React.useEffect(() => {
    if (!id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Invalid property ID.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchPropertyDetail(id)
      .then((data) => {
        if (!data) {
          setError('Property not found.');
        } else {
          setProperty(data);
          if (data.exactAddress) {
            setExactAddress(data.exactAddress);
          }
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to fetch property details.';
        setError(msg);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleRevealExactAddress = async () => {
    if (!isAuthenticated) {
      showToast({
        title: 'Authentication Required',
        description: 'Please log in to view exact property addresses.',
        variant: 'info',
      });
      router.push('/login');
      return;
    }

    setIsRevealingAddress(true);
    setAddressError(null);

    try {
      const address = await fetchExactPropertyAddress(id);
      if (address) {
        setExactAddress(address);
        showToast({
          title: 'Address Revealed',
          description: 'Verified exact address successfully retrieved.',
          variant: 'success',
        });
      } else {
        setAddressError('Exact address is not available or requires authorized interest status.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve exact address.';
      setAddressError(msg);
      showToast({
        title: 'Access Restricted',
        description: 'Exact address is restricted to confirmed tenant requests.',
        variant: 'error',
      });
    } finally {
      setIsRevealingAddress(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <ErrorState
          title="Property Not Found"
          description={error || 'The requested property could not be found.'}
          onRetry={() => router.push('/search')}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Navigation */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      {/* Property Header */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize bg-primary/5 text-primary border-primary/20">
                {property.type || 'Property'}
              </Badge>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {property.name}
            </h1>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 text-primary shrink-0" />
              <span>
                {[property.city, property.state].filter(Boolean).join(', ')}
              </span>
            </p>
          </div>
        </div>

        {property.description && (
          <p className="text-sm text-muted-foreground pt-2 border-t border-border/40">
            {property.description}
          </p>
        )}
      </div>

      {/* Approximate Location Map */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <MapPin className="size-5 text-primary" />
          Approximate Location Map
        </h2>
        <LocationMap
          centerLat={Number(property.approximateLocation?.latitude ?? property.exactAddress?.latitude ?? 28.689)}
          centerLng={Number(property.approximateLocation?.longitude ?? property.exactAddress?.longitude ?? 77.2105)}
          heightClass="h-[360px]"
          title={`${property.name} - Approximate Neighborhood`}
        />
      </div>

      {/* Amenities Section */}
      {property.amenities && property.amenities.length > 0 && (
        <div className="rounded-3xl border border-border/60 bg-card p-6 space-y-4">
          <h2 className="text-xl font-bold text-foreground">Property Amenities</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {property.amenities.map((amenity, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-xl bg-muted/50 px-3.5 py-2.5 text-xs font-medium text-foreground"
              >
                <Check className="size-4 text-emerald-500 shrink-0" />
                <span className="capitalize">{amenity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exact Address Privacy / Authorization Card */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/30 p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Verified Property Location</h2>
            <p className="text-xs text-muted-foreground">
              Exact street addresses are protected for privacy and safety.
            </p>
          </div>
        </div>

        {exactAddress ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Verified Exact Address:
            </span>
            <p className="text-sm font-medium text-foreground">
              {formatAddress(exactAddress)}
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Registered customers can request exact address details for verified visits and contact share requests.
            </p>

            {addressError && (
              <p className="text-xs text-destructive bg-destructive/10 p-3 rounded-xl">
                {addressError}
              </p>
            )}

            <Button
              onClick={handleRevealExactAddress}
              disabled={isRevealingAddress}
              className="gap-2 rounded-xl"
            >
              {isRevealingAddress ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Verifying Access...
                </>
              ) : (
                <>
                  <Eye className="size-4" />
                  Reveal Exact Address
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
