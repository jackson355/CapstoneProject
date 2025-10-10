'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';

import { paths } from '@/paths';
import { useUser } from '@/hooks/use-user';

export interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: number[]; // Array of role IDs that are allowed to access
  redirectTo?: string; // Where to redirect if access denied
}

export function RoleGuard({ children, allowedRoles, redirectTo = paths.dashboard.overview }: RoleGuardProps): React.JSX.Element | null {
  const router = useRouter();
  const { user, error, isLoading } = useUser();
  const [isChecking, setIsChecking] = React.useState<boolean>(true);

  const checkPermissions = React.useCallback((): void => {
    if (isLoading) {
      return;
    }

    if (error) {
      setIsChecking(false);
      return;
    }

    // If user is not authenticated, let AuthGuard handle the redirect
    // We'll just show nothing and let the parent AuthGuard do its job
    if (!user) {
      setIsChecking(false);
      return;
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(user.role_id ?? -1)) {
      router.replace(redirectTo);
      return;
    }

    setIsChecking(false);
  }, [isLoading, error, user, allowedRoles, redirectTo, router]);

  React.useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  if (isChecking) {
    return null;
  }

  if (error) {
    return <Alert color="error">{error}</Alert>;
  }

  // If unauthenticated, let AuthGuard handle redirect; render nothing.
  if (!user) {
    return null;
  }

  // If authenticated but not allowed, we've already scheduled a redirect; render nothing
  if (!allowedRoles.includes(user.role_id ?? -1)) {
    return null;
  }

  return <React.Fragment>{children}</React.Fragment>;
}