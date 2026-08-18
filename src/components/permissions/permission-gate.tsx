'use client';

import * as React from 'react';
import { useAuth } from '@/components/providers/auth-provider';

export interface PermissionGateProps {
  children: React.ReactNode;
  /** Single permission required (any-of when array + requireAll=false). */
  permission?: string | string[];
  /** When true, ALL listed permissions are required (default: any-of). */
  requireAll?: boolean;
  /** Rendered when permission is missing (default: null — nothing shows). */
  fallback?: React.ReactNode;
}

/**
 * Permission-based rendering gate.
 *
 * ```tsx
 * <PermissionGate permission="listing.manage_own">
 *   <CreateListingButton />
 * </PermissionGate>
 * ```
 *
 * `"*"` (super admin wildcard) passes every check. If `permission` is
 * omitted the gate is a passthrough.
 */
export function PermissionGate({
  children,
  permission,
  requireAll = false,
  fallback = null,
}: PermissionGateProps) {
  const { can, canAny } = useAuth();

  if (!permission) {
    return <>{children}</>;
  }

  const allowed = Array.isArray(permission)
    ? requireAll
      ? permission.every((p) => can(p))
      : canAny(permission)
    : can(permission);

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
