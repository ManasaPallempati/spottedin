import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getAuthCallbackBaseUrl, isSupabaseConfigured, supabase } from '../data/supabase';
import {
  getUser as getLocalUser,
  loginWithPassword,
  logout as localLogout,
  registerUser,
  setSessionUser,
  subscribe,
} from '../data/store';
import {
  claimProfile,
  ensureProfileForUser,
  HandleTakenError,
  updateProfileRemote,
  type ClaimProfileInput,
} from '../data/profiles';
import { normalizeEmail } from './validation';
import { parseAuthCallback, planAuthCallback, scrubAuthCallbackParams } from './callbackParams';
import type { AuthUser, RegisterInput, Seller, UpdateProfileInput } from '../data/types';

export type AuthStatus = 'initializing' | 'authenticated' | 'unconfirmed' | 'signed_out' | 'error';
export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'conflict' | 'error';

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

function mapSupabaseUser(user: SupabaseUser): AuthUser {
  return { id: user.id, email: user.email ?? '', sellerId: user.id };
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  errorMessage: string | null;
  pendingEmail: string | null;
  recoveryPending: boolean;
  profile: Seller | null;
  profileStatus: ProfileStatus;
  profileConflict: ClaimProfileInput | null;
  signUp(input: RegisterInput): Promise<{ needsConfirmation: boolean }>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  resendConfirmation(email?: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
  updateProfile(input: UpdateProfileInput): Promise<Seller>;
  retryClaimProfile(input: ClaimProfileInput): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  // React.StrictMode intentionally mounts, cleans up, and re-runs effects in
  // development. Keep the one-time callback/session work in a promise, but
  // still create a fresh auth subscription on every effect run.
  const initPromise = useRef<Promise<void> | null>(null);
  const callbackFailed = useRef(false);
  const activeSessionUserId = useRef<string | null>(null);
  const profileLoadVersion = useRef(0);

  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [profile, setProfile] = useState<Seller | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('idle');
  const [profileConflict, setProfileConflict] = useState<ClaimProfileInput | null>(null);

  const loadProfile = useCallback(async (supaUser: SupabaseUser) => {
    const version = ++profileLoadVersion.current;
    setProfileStatus('loading');
    const result = await ensureProfileForUser(supaUser.id, supaUser.user_metadata ?? {});
    if (
      activeSessionUserId.current !== supaUser.id
      || profileLoadVersion.current !== version
    ) {
      return;
    }
    if (result.status === 'ready') {
      setProfile(result.profile);
      setProfileStatus('ready');
      setProfileConflict(null);
    } else if (result.status === 'conflict') {
      setProfile(null);
      setProfileStatus('conflict');
      setProfileConflict(result.metadata);
    } else {
      setProfile(null);
      setProfileStatus('error');
      setProfileConflict(null);
    }
  }, []);

  const applySession = useCallback((session: Session | null) => {
    if (session?.user) {
      activeSessionUserId.current = session.user.id;
      const mapped = mapSupabaseUser(session.user);
      setUser(mapped);
      setSessionUser(mapped);
      setStatus('authenticated');
      setErrorMessage(null);
      void loadProfile(session.user);
    } else {
      activeSessionUserId.current = null;
      profileLoadVersion.current += 1;
      setUser(null);
      setSessionUser(null);
      setProfile(null);
      setProfileStatus('idle');
      setProfileConflict(null);
      setRecoveryPending(false);
      setStatus('signed_out');
    }
  }, [loadProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const sync = () => {
        const localUser = getLocalUser();
        setUser(localUser);
        setStatus(localUser ? 'authenticated' : 'signed_out');
      };
      sync();
      return subscribe(sync);
    }

    // Returns true when the callback already resolved a terminal ('error')
    // status, so init() knows not to let a subsequent getSession() call
    // silently overwrite it.
    async function handleCallback(): Promise<boolean> {
      const callback = parseAuthCallback(window.location.search);
      if (!callback) return false;

      let failed = false;
      try {
        const plan = planAuthCallback(callback);
        if (plan.action === 'fail') {
          throw new Error(plan.message);
        }
        if (plan.action === 'verify-otp') {
          const { error } = await supabase!.auth.verifyOtp({
            token_hash: plan.tokenHash,
            type: plan.otpType,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase!.auth.exchangeCodeForSession(plan.code);
          if (error) throw error;
        }
        if (plan.navigateTo) {
          setRecoveryPending(true);
          navigate(plan.navigateTo, { replace: true });
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage(messageOf(err));
        navigate('/login', { replace: true });
        failed = true;
      } finally {
        const scrubbedSearch = scrubAuthCallbackParams(window.location.search);
        const scrubbedUrl = `${window.location.pathname}${scrubbedSearch}${window.location.hash}`;
        window.history.replaceState(null, '', scrubbedUrl);
      }
      return failed;
    }

    async function init(): Promise<void> {
      const failed = await handleCallback();
      // A callback error already set status — don't let a stale/absent
      // session on restore silently overwrite that error state.
      if (failed) {
        callbackFailed.current = true;
        return;
      }
      try {
        const { data, error } = await supabase!.auth.getSession();
        if (error) throw error;
        applySession(data.session);
      } catch (err) {
        setStatus('error');
        setErrorMessage(messageOf(err));
      }
    }

    if (!initPromise.current) {
      initPromise.current = init();
    }

    const { data: subscription } = supabase!.auth.onAuthStateChange((event, session) => {
      // Supabase emits INITIAL_SESSION when a listener is attached. If an
      // explicit callback just failed, restoring an older persisted session
      // must not erase that terminal error. A later real sign-in is allowed
      // to recover normally.
      if (event === 'INITIAL_SESSION' && callbackFailed.current) return;
      if (event === 'SIGNED_IN') callbackFailed.current = false;
      applySession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryPending(true);
        navigate('/reset-password', { replace: true });
      }
    });
    return () => subscription.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = useCallback(async (input: RegisterInput): Promise<{ needsConfirmation: boolean }> => {
    if (!isSupabaseConfigured) {
      const localUser = await registerUser(input);
      setUser(localUser);
      setStatus('authenticated');
      return { needsConfirmation: false };
    }

    const email = normalizeEmail(input.email);
    const { data, error } = await supabase!.auth.signUp({
      email,
      password: input.password,
      options: {
        emailRedirectTo: getAuthCallbackBaseUrl(),
        data: {
          name: input.name.trim(),
          handle: input.handle.trim(),
          city: input.city.trim(),
          bio: input.bio.trim(),
          avatarEmoji: input.avatarEmoji.trim(),
        },
      },
    });
    if (error) throw error;

    if (data.session) {
      applySession(data.session);
      return { needsConfirmation: false };
    }
    setPendingEmail(email);
    setStatus('unconfirmed');
    return { needsConfirmation: true };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    if (!isSupabaseConfigured) {
      const localUser = await loginWithPassword(email, password);
      setUser(localUser);
      setStatus('authenticated');
      return;
    }

    const normalized = normalizeEmail(email);
    const { data, error } = await supabase!.auth.signInWithPassword({ email: normalized, password });
    if (error) {
      if (error.code === 'email_not_confirmed' || /confirm/i.test(error.message)) {
        setPendingEmail(normalized);
        setStatus('unconfirmed');
      }
      throw error;
    }
    applySession(data.session);
  }, [applySession]);

  const signOut = useCallback(async (): Promise<void> => {
    if (!isSupabaseConfigured) {
      await localLogout();
      setUser(null);
      setStatus('signed_out');
      return;
    }
    const { error } = await supabase!.auth.signOut();
    if (error) throw error;
    // onAuthStateChange also emits SIGNED_OUT, but clear synchronously so the
    // login screen cannot race the still-authenticated state after sign-out.
    applySession(null);
  }, [applySession]);

  const resendConfirmation = useCallback(async (email?: string): Promise<void> => {
    if (!isSupabaseConfigured) throw new Error('Email confirmation is not available in local demo mode');
    const target = email ? normalizeEmail(email) : pendingEmail;
    if (!target) throw new Error('No email address to resend a confirmation to');
    const { error } = await supabase!.auth.resend({
      type: 'signup',
      email: target,
      options: { emailRedirectTo: getAuthCallbackBaseUrl() },
    });
    if (error) throw error;
  }, [pendingEmail]);

  const requestPasswordReset = useCallback(async (email: string): Promise<void> => {
    if (!isSupabaseConfigured) throw new Error('Password reset is not available in local demo mode');
    const { error } = await supabase!.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: getAuthCallbackBaseUrl(),
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<void> => {
    if (!isSupabaseConfigured) throw new Error('Password update is not available in local demo mode');
    const { error } = await supabase!.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setRecoveryPending(false);
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput): Promise<Seller> => {
    if (!isSupabaseConfigured || !user) throw new Error('Log in to update your profile');
    const updated = await updateProfileRemote(user.id, input);
    setProfile(updated);
    setProfileStatus('ready');
    setProfileConflict(null);
    return updated;
  }, [user]);

  const retryClaimProfile = useCallback(async (input: ClaimProfileInput): Promise<void> => {
    if (!isSupabaseConfigured || !user) throw new Error('Log in to finish setting up your profile');
    setProfileStatus('loading');
    try {
      const claimed = await claimProfile(user.id, input);
      setProfile(claimed);
      setProfileStatus('ready');
      setProfileConflict(null);
    } catch (err) {
      if (err instanceof HandleTakenError) {
        setProfileStatus('conflict');
        setProfileConflict(input);
      } else {
        setProfileStatus('error');
      }
      throw err;
    }
  }, [user]);

  const value: AuthContextValue = {
    status,
    user,
    errorMessage,
    pendingEmail,
    recoveryPending,
    profile,
    profileStatus,
    profileConflict,
    signUp,
    signIn,
    signOut,
    resendConfirmation,
    requestPasswordReset,
    updatePassword,
    updateProfile,
    retryClaimProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
