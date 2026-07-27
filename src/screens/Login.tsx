import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, loginWithPassword, registerUser } from '../data/store';
import './Login.css';

type Mode = 'login' | 'register';

const EMPTY_REGISTER = {
  name: '',
  handle: '',
  email: '',
  phone: '',
  password: '',
  city: '',
  bio: '',
  avatarEmoji: '🙂',
};

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [register, setRegister] = useState(EMPTY_REGISTER);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (user) navigate(`/seller/${user.sellerId}`, { replace: true });
  }, [navigate]);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError('');
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const user = await loginWithPassword(identifier, loginPassword);
      navigate(`/seller/${user.sellerId}`, { replace: true });
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
    setSubmitting(true);
    setError('');
    try {
      const user = await registerUser(register);
      navigate(`/seller/${user.sellerId}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account');
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

      <div className="login-screen__tabs" aria-label="Account action">
        <button
          type="button"
          aria-pressed={mode === 'login'}
          className={mode === 'login' ? 'is-active' : ''}
          onClick={() => changeMode('login')}
        >
          Log in
        </button>
        <button
          type="button"
          aria-pressed={mode === 'register'}
          className={mode === 'register' ? 'is-active' : ''}
          onClick={() => changeMode('register')}
        >
          Create profile
        </button>
      </div>

      {mode === 'login' ? (
        <form className="login-screen__form" onSubmit={handleLogin}>
          <label className="field-label" htmlFor="identifier">Email or mobile number</label>
          <input
            id="identifier"
            className="input"
            type="text"
            inputMode="text"
            autoComplete="username"
            placeholder="you@example.com or 9876543210"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoFocus
            required
          />
          <label className="field-label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            required
          />
          {error && <p className="login-screen__error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
          <p className="login-screen__hint">Use the email or mobile number you registered with.</p>
        </form>
      ) : (
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
          <label className="field-label" htmlFor="register-phone">Mobile number</label>
          <div className="login-screen__phone-row">
            <span className="login-screen__prefix">+91</span>
            <input
              id="register-phone"
              className="input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              pattern="[6-9][0-9]{9}"
              title="10-digit Indian mobile number starting with 6–9"
              value={register.phone}
              maxLength={10}
              onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              required
            />
          </div>
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
            Demo accounts are saved only in this browser. No SMS or email is sent.
          </p>
        </form>
      )}
    </div>
  );
}
