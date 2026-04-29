import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { Code, Loader2 } from 'lucide-react';

const friendlyError = (code) => {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Invalid email or password.';
    case 'auth/email-already-in-use': return 'An account with this email already exists.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user': return 'Google sign-in was cancelled.';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
    default: return 'Something went wrong. Please try again.';
  }
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      if (isLogin) {
        const { user } = await signInWithEmailAndPassword(auth, email, password);

        if (!user.emailVerified) {
          setError('Please verify your email before logging in. Check your inbox.');
          await auth.signOut();
          return;
        }

        const token = await user.getIdToken();
        localStorage.setItem('token', token);
        navigate('/');
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(user);
        await auth.signOut();
        setInfo('Verification email sent! Please check your inbox, then log in.');
        setIsLogin(true);
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setInfo('');
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      const token = await user.getIdToken();
      localStorage.setItem('token', token);
      navigate('/');
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setGoogleLoading(false);
    }
  };

  const switchTab = (toLogin) => {
    setIsLogin(toLogin);
    setError('');
    setInfo('');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-main)',
      backgroundImage: `
        radial-gradient(at 0% 0%, rgba(59,130,246,0.12) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(139,92,246,0.18) 0px, transparent 50%)
      `,
    }}>
      <div style={{
        width: '100%', maxWidth: '400px', padding: '40px 36px',
        background: 'var(--bg-panel)', backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-light)', borderRadius: '16px',
        boxShadow: 'var(--shadow-md)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            marginBottom: '14px',
          }}>
            <Code size={26} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            CodeInsight
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '6px' }}>
            {isLogin ? 'Sign in to your workspace' : 'Create your account'}
          </p>
        </div>

        {/* Tab toggle */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.05)',
          borderRadius: '10px', padding: '3px', marginBottom: '22px',
        }}>
          {[['Login', true], ['Register', false]].map(([label, val]) => (
            <button
              key={label}
              onClick={() => switchTab(val)}
              style={{
                flex: 1, padding: '8px', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500,
                transition: 'all 0.2s',
                background: isLogin === val ? 'rgba(139,92,246,0.3)' : 'transparent',
                color: isLogin === val ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />

          {error && <Banner type="error">{error}</Banner>}
          {info  && <Banner type="info">{info}</Banner>}

          <button type="submit" disabled={loading} style={primaryBtn(loading)}>
            {loading && <Loader2 size={15} className="lucide-spin" />}
            {loading
              ? (isLogin ? 'Signing in…' : 'Creating account…')
              : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          margin: '18px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          or
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          style={{
            width: '100%', padding: '11px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px', color: 'var(--text-main)',
            fontSize: '0.92rem', fontWeight: 500,
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            opacity: googleLoading ? 0.7 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          {googleLoading
            ? <Loader2 size={15} className="lucide-spin" />
            : <GoogleIcon />}
          {googleLoading ? 'Connecting…' : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
};

/* ── Small helpers ── */

const Banner = ({ type, children }) => (
  <div style={{
    background: type === 'error' ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)',
    border: `1px solid ${type === 'error' ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.3)'}`,
    borderRadius: '8px', padding: '10px 14px',
    color: type === 'error' ? '#fca5a5' : '#6ee7b7',
    fontSize: '0.85rem', lineHeight: '1.5',
  }}>
    {children}
  </div>
);

const primaryBtn = (disabled) => ({
  marginTop: '2px', padding: '12px',
  background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
  border: 'none', borderRadius: '10px', color: 'white',
  fontSize: '0.95rem', fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.75 : 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  transition: 'opacity 0.2s',
});

const inputStyle = {
  padding: '11px 14px',
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px', color: 'white',
  fontSize: '0.92rem', outline: 'none', width: '100%',
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.5 5C9.6 39.5 16.3 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.2 5.2C40.8 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
  </svg>
);

export default Auth;
