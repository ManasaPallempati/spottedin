import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { sanitizeReturnTo } from '../auth/returnTo';
import { isSupabaseConfigured } from '../data/supabase';

interface RequireAuthProps {
  children: ReactElement;
  requireProfile?: boolean;
  requireRecovery?: boolean;
}

export default function RequireAuth({
  children,
  requireProfile = true,
  requireRecovery = false,
}: RequireAuthProps) {
  const location = useLocation();
  const {
    status,
    user,
    profileStatus,
    recoveryPending,
  } = useAuth();
  const returnTo = sanitizeReturnTo(`${location.pathname}${location.search}`);

  // 'initializing' covers both the Supabase session bootstrap and the local
  // demo sync tick — never redirect before we actually know the auth state,
  // or every gated route would flash to /login on load.
  if (status === 'initializing') {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (status === 'authenticated') {
    if (requireRecovery && !recoveryPending) {
      return <Navigate to="/" replace />;
    }

    if (isSupabaseConfigured && requireProfile) {
      if (profileStatus === 'idle' || profileStatus === 'loading') {
        return (
          <div className="auth-loading" role="status" aria-live="polite">
            Loading profile…
          </div>
        );
      }
      if (profileStatus !== 'ready' && user) {
        return <Navigate to={`/seller/${user.sellerId}`} replace />;
      }
    }

    return children;
  }

  if (status === 'unconfirmed') {
    return <Navigate to="/login" replace state={{ returnTo, reason: 'unconfirmed' }} />;
  }

  return <Navigate to="/login" replace state={{ returnTo, reason: status === 'error' ? 'error' : undefined }} />;
}
