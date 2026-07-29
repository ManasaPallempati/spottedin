import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { sanitizeReturnTo } from '../auth/returnTo';
import { isValidEmail, isValidProfileHandle } from '../auth/validation';
import { isSupabaseConfigured } from '../data/supabase';
import './Login.css';

type View = 'login' | 'register' | 'forgot' | 'confirm';

const EMPTY_REGISTER = {
  name: '',
  handle: '',
  email: '',
  password: '',
  city: '',
  bio: '',
  avatarEmoji: '🙂',
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    status,
    user,
    errorMessage,
    pendingEmail,
    signUp,
    signIn,
    resendConfirmation,
    requestPasswordReset,
  } = useAuth();

  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(EMPTY_REGISTER);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const routeState = (
    typeof location.state === 'object' && location.state !== null ? location.state : {}
  ) as { returnTo?: unknown };
  const requestedPath = sanitizeReturnTo(routeState.returnTo, '');

  useEffect(() => {
    if (status === 'authenticated' && user) {
      navigate(requestedPath || `/seller/${user.sellerId}`, { replace: true });
    }
  }, [status, user, requestedPath, navigate]);

  // signIn against an unverified account rejects AND flips status; make sure
  // the resend UI is what the user sees, whichever path got them here.
  useEffect(() => {
    if (status === 'unconfirmed') setView('confirm');
  }, [status]);

  function switchView(next: View) {
    setView(next);
    setError('');
    setNotice('');
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await signIn(email, password);
      // Navigation happens via the authenticated-status effect above.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log in');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (!register.name.trim()) {
      setError('Enter your name');
      return;
    }
    if (!isValidProfileHandle(register.handle)) {
      setError('Handle must be 3–30 letters, numbers, dots, or underscores');
      return;
    }
    if (!isValidEmail(register.email)) {
      setError('Enter a valid email address');
      return;
    }
    if (register.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const { needsConfirmation } = await signUp(register);
      if (needsConfirmation) setView('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Enter a valid email address');
      return;
    }
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await requestPasswordReset(email);
      setNotice(`If an account exists for ${email.trim()}, a password reset link is on its way.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request a password reset');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await resendConfirmation(pendingEmail ?? email);
      setNotice('Confirmation email sent. Check your inbox and spam folder.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the confirmation email');
    } finally {
      setSubmitting(false);
    }
  }

  const setField = (field: keyof typeof register, value: string) => {
    setRegister((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="login-screen">
      <div className="login-screen__brand">
        <span className="login-screen__logo" aria-hidden="true">🛍️</span>
        <h1>Maanster Market</h1>
        <p className="login-screen__tagline">Pre-loved. Re-loved.</p>
      </div>

      {status === 'error' && errorMessage && (
        <p className="login-screen__error" role="alert">
          {errorMessage} — the link may have expired. Log in below or request a new one.
        </p>
      )}

      {!isSupabaseConfigured && (
        <p className="login-screen__demo" role="note">
          Demo mode: no auth server is configured. Accounts live only in this
          browser and are not secure production accounts.
        </p>
      )}

      {(view === 'login' || view === 'register') && (
        <div className="login-screen__tabs" aria-label="Account action">
          <button
            type="button"
            aria-pressed={view === 'login'}
            className={view === 'login' ? 'is-active' : ''}
            onClick={() => switchView('login')}
          >
            Log in
          </button>
          <button
            type="button"
            aria-pressed={view === 'register'}
            className={view === 'register' ? 'is-active' : ''}
            onClick={() => switchView('register')}
          >
            Create profile
          </button>
        </div>
      )}

      {view === 'login' && (
        <form className="login-screen__form" onSubmit={handleLogin}>
          <label className="field-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            className="input"
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
          <label className="field-label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="login-screen__error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
          {isSupabaseConfigured && (
            <button type="button" className="login-screen__link" onClick={() => switchView('forgot')}>
              Forgot password?
            </button>
          )}
        </form>
      )}

      {view === 'register' && (
        <form className="login-screen__form" onSubmit={handleRegister}>
          <div className="login-screen__profile-row">
            <div className="login-screen__avatar-field">
              <label className="field-label" htmlFor="avatar">Avatar</label>
              <input
                id="avatar"
                className="input"
                value={register.avatarEmoji}
                onChange={(e) => setField('avatarEmoji', e.target.value.slice(0, 4))}
                aria-label="Avatar emoji"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="name">Full name</label>
              <input
                id="name"
                className="input"
                autoComplete="name"
                maxLength={80}
                value={register.name}
                onChange={(e) => setField('name', e.target.value)}
                required
              />
            </div>
          </div>
          <label className="field-label" htmlFor="handle">Profile handle</label>
          <input
            id="handle"
            className="input"
            placeholder="@your.handle"
            maxLength={31}
            value={register.handle}
            onChange={(e) => setField('handle', e.target.value)}
            required
          />
          <label className="field-label" htmlFor="register-email">Email</label>
          <input
            id="register-email"
            className="input"
            type="email"
            autoComplete="email"
            value={register.email}
            onChange={(e) => setField('email', e.target.value)}
            required
          />
          <label className="field-label" htmlFor="register-password">Password</label>
          <input
            id="register-password"
            className="input"
            type="password"
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={register.password}
            onChange={(e) => setField('password', e.target.value)}
            required
          />
          <label className="field-label" htmlFor="city">City</label>
          <input
            id="city"
            className="input"
            autoComplete="address-level2"
            maxLength={80}
            value={register.city}
            onChange={(e) => setField('city', e.target.value)}
          />
          <label className="field-label" htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            className="textarea"
            maxLength={160}
            placeholder="What do you sell?"
            value={register.bio}
            onChange={(e) => setField('bio', e.target.value)}
          />
          {error && <p className="login-screen__error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Creating profile…' : 'Create profile'}
          </button>
          <p className="login-screen__hint">
            {isSupabaseConfigured
              ? 'We’ll email you a confirmation link. Your account works after you confirm.'
              : 'Demo accounts are saved only in this browser. No email is sent.'}
          </p>
        </form>
      )}

      {view === 'forgot' && (
        <form className="login-screen__form" onSubmit={handleForgot}>
          <h2 className="login-screen__panel-title">Reset your password</h2>
          <label className="field-label" htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            className="input"
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
          {error && <p className="login-screen__error" role="alert">{error}</p>}
          {notice && <p className="login-screen__notice" role="status">{notice}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
          <button type="button" className="login-screen__link" onClick={() => switchView('login')}>
            Back to log in
          </button>
        </form>
      )}

      {view === 'confirm' && (
        <div className="login-screen__form">
          <h2 className="login-screen__panel-title">Confirm your email</h2>
          <p className="login-screen__copy">
            {pendingEmail
              ? `We sent a confirmation link to ${pendingEmail}. Open it to activate your account, then log in.`
              : 'Your email address is not confirmed yet. Enter it below to resend the confirmation link.'}
          </p>
          {!pendingEmail && (
            <>
              <label className="field-label" htmlFor="confirm-email">Email</label>
              <input
                id="confirm-email"
                className="input"
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </>
          )}
          {error && <p className="login-screen__error" role="alert">{error}</p>}
          {notice && <p className="login-screen__notice" role="status">{notice}</p>}
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={submitting}
            onClick={() => void handleResend()}
          >
            {submitting ? 'Sending…' : 'Resend confirmation email'}
          </button>
          <button type="button" className="login-screen__link" onClick={() => switchView('login')}>
            Back to log in
          </button>
        </div>
      )}
    </div>
  );
}
