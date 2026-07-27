import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithOtp } from '../data/store';
import './Login.css';

type Step = 'phone' | 'otp';

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handlePhoneSubmit(e: FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setStep('otp');
  }

  function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    const digits = otp.replace(/\D/g, '');
    if (digits.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    setError('');
    setSubmitting(true);
    loginWithOtp(phone.replace(/\D/g, ''), digits);
    navigate('/', { replace: true });
  }

  return (
    <div className="login-screen">
      <div className="login-screen__brand">
        <span className="login-screen__logo" aria-hidden="true">🛍️</span>
        <h1>Maanster Market</h1>
        <p className="login-screen__tagline">Pre-loved. Re-loved.</p>
      </div>

      {step === 'phone' ? (
        <form className="login-screen__form" onSubmit={handlePhoneSubmit}>
          <label className="field-label" htmlFor="phone">Mobile number</label>
          <div className="login-screen__phone-row">
            <span className="login-screen__prefix">+91</span>
            <input
              id="phone"
              className="input"
              type="tel"
              inputMode="numeric"
              placeholder="98765 43210"
              value={phone}
              maxLength={10}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              autoFocus
            />
          </div>
          {error && <p className="login-screen__error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block">Send OTP</button>
          <p className="login-screen__hint">Any 10-digit number works in this demo.</p>
        </form>
      ) : (
        <form className="login-screen__form" onSubmit={handleOtpSubmit}>
          <label className="field-label" htmlFor="otp">
            Enter OTP sent to +91 {phone}
          </label>
          <input
            id="otp"
            className="input login-screen__otp-input"
            type="tel"
            inputMode="numeric"
            placeholder="••••••"
            value={otp}
            maxLength={6}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoFocus
          />
          {error && <p className="login-screen__error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Verifying…' : 'Verify & continue'}
          </button>
          <button
            type="button"
            className="login-screen__edit-phone"
            onClick={() => {
              setStep('phone');
              setOtp('');
              setError('');
            }}
          >
            Edit number
          </button>
          <p className="login-screen__hint">Any 6-digit code works in this demo.</p>
        </form>
      )}
    </div>
  );
}
