import React, { useState, useEffect } from 'react';
import { sound } from '../utils/audio';
import { Mail, User, Lock, ArrowLeft, Clock, ShieldAlert } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

interface AuthPageProps {
  onLogin: (username: string) => void;
}

interface Account {
  email: string;
  username: string;
  passwordHash: string;
}

interface OTPSession {
  username: string;
  email: string;
  otpCode: string;
  expiresAt: number;
}

interface Review {
  username: string;
  stars: number;
  feedback: string;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [view, setView] = useState<'form' | 'forgot' | 'verify' | 'reset'>('form');

  // Input states
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [otpInput, setOtpInput] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // OTP State
  const [activeSession, setActiveSession] = useState<OTPSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showMailbox, setShowMailbox] = useState(false);

  // Reviews Ticker State
  const [reviews, setReviews] = useState<Review[]>([]);

  // Status messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Clear messages on view changes
  useEffect(() => {
    setErrorMsg('');
    setSuccessMsg('');
  }, [view]);

  // Load reviews on mount
  useEffect(() => {
    const loadReviews = async () => {
      const defaultList: Review[] = [
        { username: 'Tavern_Keeper', stars: 5, feedback: 'Verily, a fine tool for a scribe!' },
        { username: 'Merchant_Greg', stars: 5, feedback: 'Delicious dialogue, and the gold count checks out!' },
        { username: 'Green_Slime', stars: 5, feedback: 'I got defeated by words... 10/10!' },
        { username: 'Wizard_Alaric', stars: 5, feedback: 'Spellbinding writing interface!' }
      ];

      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase
            .from('reviews')
            .select('username, stars, feedback')
            .eq('stars', 5)
            .order('created_at', { ascending: false });

          if (data && data.length > 0) {
            setReviews([...data, ...defaultList]);
            return;
          }
        } catch (e) {
          console.error('Failed to fetch reviews from Supabase:', e);
        }
      }

      // Local storage fallback
      try {
        const local = localStorage.getItem('pixelquest_global_reviews');
        if (local) {
          const parsed = JSON.parse(local);
          const fives = parsed.filter((r: any) => r.stars === 5);
          setReviews([...fives, ...defaultList]);
          return;
        }
      } catch (e) {
        console.error('Failed to load local reviews:', e);
      }

      setReviews(defaultList);
    };

    loadReviews();
  }, []);

  // Timer for OTP expiration
  useEffect(() => {
    if (!activeSession) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((activeSession.expiresAt - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining === 0) {
        setErrorMsg('Verification code has expired. Please request a new one.');
        setActiveSession(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const getAccounts = (): Account[] => {
    const data = localStorage.getItem('pixelquest_accounts');
    return data ? JSON.parse(data) : [];
  };

  const saveAccounts = (accounts: Account[]) => {
    localStorage.setItem('pixelquest_accounts', JSON.stringify(accounts));
  };

  // Sound triggers
  const playClick = () => sound.playTypeClick();
  const playSuccess = () => sound.playCoin();
  const playError = () => sound.playHit();

  // Handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();

    if (!loginIdentifier.trim() || !loginPassword) {
      playError();
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (isSupabaseConfigured) {
      // --- SUPABASE LOGIN FLOW ---
      try {
        let emailToAuth = loginIdentifier.trim();
        let displayUsername = loginIdentifier.trim();

        // If the identifier is a username, lookup its email address first
        if (!emailToAuth.includes('@')) {
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('email, username')
            .ilike('username', emailToAuth)
            .maybeSingle();

          if (profileErr) {
            playError();
            setErrorMsg('Database error looking up username.');
            return;
          }
          if (!profile) {
            playError();
            setErrorMsg('No character profile found with that username.');
            return;
          }
          emailToAuth = profile.email;
          displayUsername = profile.username;
        }

        // Authenticate with Supabase Auth
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: emailToAuth,
          password: loginPassword,
        });

        if (authErr) {
          playError();
          setErrorMsg(authErr.message || 'Invalid username/email or password.');
          return;
        }

        // Retrieve final username from profile row if logged in with email
        if (loginIdentifier.includes('@') && authData.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', authData.user.id)
            .maybeSingle();
          if (profile) {
            displayUsername = profile.username;
          }
        }

        playSuccess();
        onLogin(displayUsername);
      } catch (err: any) {
        playError();
        setErrorMsg('Authentication failed: ' + (err.message || err));
      }
    } else {
      // --- LOCAL STORAGE BACKUP FALLBACK ---
      const accounts = getAccounts();
      const cleanId = loginIdentifier.trim().toLowerCase();
      const userAcc = accounts.find(
        (a) => a.username.toLowerCase() === cleanId || a.email.toLowerCase() === cleanId
      );

      if (!userAcc || userAcc.passwordHash !== simpleHash(loginPassword)) {
        playError();
        setErrorMsg('Invalid username/email or password.');
        return;
      }

      playSuccess();
      onLogin(userAcc.username);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();

    if (!signupEmail.trim() || !signupUsername.trim() || !signupPassword || !signupConfirmPassword) {
      playError();
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (signupUsername.length < 3) {
      playError();
      setErrorMsg('Username must be at least 3 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(signupUsername)) {
      playError();
      setErrorMsg('Username must be alphanumeric.');
      return;
    }

    if (!signupEmail.includes('@') || !signupEmail.includes('.')) {
      playError();
      setErrorMsg('Invalid email format.');
      return;
    }

    if (signupPassword.length < 6) {
      playError();
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      playError();
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (isSupabaseConfigured) {
      // --- SUPABASE SIGN UP FLOW ---
      try {
        // 1. Check for duplicates in public.profiles table
        const { data: existing, error: checkErr } = await supabase
          .from('profiles')
          .select('username, email')
          .or(`username.ilike.${signupUsername.trim()},email.ilike.${signupEmail.trim()}`);

        if (checkErr) {
          playError();
          setErrorMsg('Error checking database availability: ' + checkErr.message);
          return;
        }

        if (existing && existing.length > 0) {
          const isUserTaken = existing.some(
            (u) => u.username.toLowerCase() === signupUsername.trim().toLowerCase()
          );
          if (isUserTaken) {
            playError();
            setErrorMsg('Username is already taken.');
            return;
          }
          playError();
          setErrorMsg('Email is already registered.');
          return;
        }

        // 2. Sign up on Supabase Auth
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: signupEmail.trim(),
          password: signupPassword,
          options: {
            data: {
              username: signupUsername.trim(),
            },
          },
        });

        if (signUpErr) {
          playError();
          let errString = signUpErr.message || (typeof signUpErr === 'object' ? JSON.stringify(signUpErr) : String(signUpErr));
          if (errString === '{}' || !errString) {
            errString = 'Registration failed. This is usually due to an SMTP credentials or domain verification error in Supabase. Please check your Supabase "Audit Logs" or browser Network tab for details.';
          }
          setErrorMsg(errString);
          return;
        }

        playSuccess();
        if (signUpData.user && !signUpData.session) {
          setSuccessMsg('Account created! Please check your email inbox to confirm your account before logging in.');
        } else {
          setSuccessMsg('Account created successfully! You can now log in.');
        }
        setActiveTab('login');

        // Clear forms
        setSignupEmail('');
        setSignupUsername('');
        setSignupPassword('');
        setSignupConfirmPassword('');
      } catch (err: any) {
        playError();
        const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
        setErrorMsg('Sign up failed: ' + msg);
      }
    } else {
      // --- LOCAL STORAGE BACKUP FALLBACK ---
      const accounts = getAccounts();
      const emailExists = accounts.some((a) => a.email.toLowerCase() === signupEmail.trim().toLowerCase());
      const userExists = accounts.some((a) => a.username.toLowerCase() === signupUsername.trim().toLowerCase());

      if (emailExists) {
        playError();
        setErrorMsg('Email is already registered.');
        return;
      }

      if (userExists) {
        playError();
        setErrorMsg('Username is already taken.');
        return;
      }

      const newAccount: Account = {
        email: signupEmail.trim(),
        username: signupUsername.trim(),
        passwordHash: simpleHash(signupPassword),
      };

      saveAccounts([...accounts, newAccount]);
      playSuccess();
      setSuccessMsg('Account created successfully! You can now log in.');
      setActiveTab('login');
      
      // Clear forms
      setSignupEmail('');
      setSignupUsername('');
      setSignupPassword('');
      setSignupConfirmPassword('');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();

    if (!forgotIdentifier.trim()) {
      playError();
      setErrorMsg('Please enter your username or email.');
      return;
    }

    if (isSupabaseConfigured) {
      // --- SUPABASE PASSWORD RESET FLOW ---
      try {
        let emailToReset = forgotIdentifier.trim();
        let targetUsername = '';

        if (!emailToReset.includes('@')) {
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('email, username')
            .ilike('username', emailToReset)
            .maybeSingle();

          if (profileErr || !profile) {
            playError();
            setErrorMsg('No character profile found with that username.');
            return;
          }
          emailToReset = profile.email;
          targetUsername = profile.username;
        } else {
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('username')
            .ilike('email', emailToReset)
            .maybeSingle();

          if (profileErr || !profile) {
            playError();
            setErrorMsg('No character profile found with that email.');
            return;
          }
          targetUsername = profile.username;
        }

        // Trigger real Supabase recovery email
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(emailToReset);
        if (resetErr) {
          playError();
          setErrorMsg(resetErr.message);
          return;
        }

        const session: OTPSession = {
          username: targetUsername,
          email: emailToReset,
          otpCode: 'SUPABASE_OTP', // Generated securely by Supabase
          expiresAt: Date.now() + 15 * 60 * 1000,
        };

        setActiveSession(session);
        setShowMailbox(true);
        sound.playLevelUp();
        setView('verify');
        setOtpInput('');
        setSuccessMsg('A real verification email was sent to your inbox!');
      } catch (err: any) {
        playError();
        setErrorMsg('Failed to trigger reset: ' + (err.message || err));
      }
    } else {
      // --- LOCAL STORAGE BACKUP FALLBACK ---
      const accounts = getAccounts();
      const cleanId = forgotIdentifier.trim().toLowerCase();
      const userAcc = accounts.find(
        (a) => a.username.toLowerCase() === cleanId || a.email.toLowerCase() === cleanId
      );

      if (!userAcc) {
        playError();
        setErrorMsg('No account found with that username or email.');
        return;
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const session: OTPSession = {
        username: userAcc.username,
        email: userAcc.email,
        otpCode: otp,
        expiresAt: Date.now() + 15 * 60 * 1000,
      };

      setActiveSession(session);
      setShowMailbox(true);
      sound.playLevelUp();
      setView('verify');
      setOtpInput('');
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();

    if (!activeSession) {
      playError();
      setErrorMsg('No active verification session. Please request a new OTP.');
      setView('forgot');
      return;
    }

    if (isSupabaseConfigured) {
      // --- SUPABASE VERIFY OTP FLOW ---
      try {
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          email: activeSession.email,
          token: otpInput.trim(),
          type: 'recovery',
        });

        if (verifyErr) {
          playError();
          setErrorMsg(verifyErr.message || 'Incorrect or expired OTP code.');
          return;
        }

        playSuccess();
        setView('reset');
        setNewPassword('');
        setConfirmNewPassword('');
      } catch (err: any) {
        playError();
        setErrorMsg('Verification failed: ' + (err.message || err));
      }
    } else {
      // --- LOCAL STORAGE BACKUP FALLBACK ---
      if (otpInput.trim() !== activeSession.otpCode) {
        playError();
        setErrorMsg('Incorrect OTP code. Please try again.');
        return;
      }

      if (Date.now() > activeSession.expiresAt) {
        playError();
        setErrorMsg('OTP code has expired. Please request a new one.');
        setActiveSession(null);
        setView('forgot');
        return;
      }

      playSuccess();
      setView('reset');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();

    if (!activeSession) {
      playError();
      setErrorMsg('Session expired. Please request a new OTP.');
      setView('forgot');
      return;
    }

    if (newPassword.length < 6) {
      playError();
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      playError();
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (isSupabaseConfigured) {
      // --- SUPABASE RESET PASSWORD FLOW ---
      try {
        const { error: updateErr } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateErr) {
          playError();
          setErrorMsg(updateErr.message);
          return;
        }

        // Log out user to force them to log back in with their new password
        await supabase.auth.signOut();

        playSuccess();
        setSuccessMsg('Password reset successful! You can now log in.');
        setView('form');
        setActiveTab('login');
        setActiveSession(null);
      } catch (err: any) {
        playError();
        setErrorMsg('Reset failed: ' + (err.message || err));
      }
    } else {
      // --- LOCAL STORAGE BACKUP FALLBACK ---
      const accounts = getAccounts();
      const updatedAccounts = accounts.map((a) => {
        if (a.username.toLowerCase() === activeSession.username.toLowerCase()) {
          return {
            ...a,
            passwordHash: simpleHash(newPassword),
          };
        }
        return a;
      });

      saveAccounts(updatedAccounts);
      playSuccess();
      setSuccessMsg('Password reset successful! You can now log in.');
      setView('form');
      setActiveTab('login');
      setActiveSession(null);
    }
  };

  // Timer format (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        fontFamily: 'var(--font-ui)',
        color: 'var(--text-primary)',
        position: 'relative',
        zIndex: 50,
      }}
    >
      <div className="crt-overlay" />

      {/* Main card */}
      <div
        className="pixel-panel crt-glow"
        style={{
          width: '420px',
          maxWidth: '90%',
          padding: '24px',
          boxShadow: 'var(--crt-glow)',
          marginBottom: '50px', // Lift slightly to avoid overlapping ticker
        }}
      >
        <div className="pixel-panel-header" style={{ textAlign: 'center', fontSize: '0.9rem' }}>
          ⚔️ Pixel Writer Auth ⚔️
        </div>

        {/* Global Alert Messages */}
        {errorMsg && (
          <div
            className="pixel-panel"
            style={{
              backgroundColor: 'rgba(139, 0, 0, 0.25)',
              borderColor: '#8b0000',
              borderStyle: 'solid',
              borderWidth: '2px',
              color: '#ff8888',
              fontSize: '0.65rem',
              padding: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              lineHeight: '1.4',
            }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            className="pixel-panel"
            style={{
              backgroundColor: 'rgba(31, 153, 31, 0.25)',
              borderColor: '#1f991f',
              borderStyle: 'solid',
              borderWidth: '2px',
              color: '#33ff33',
              fontSize: '0.65rem',
              padding: '8px',
              marginBottom: '16px',
              textAlign: 'center',
              lineHeight: '1.4',
            }}
          >
            {successMsg}
          </div>
        )}

        {/* VIEW: LOGIN & SIGNUP FORMS */}
        {view === 'form' && (
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button
                className={`pixel-btn ${activeTab === 'login' ? 'pixel-btn-accent' : ''}`}
                onClick={() => {
                  playClick();
                  setErrorMsg('');
                  setSuccessMsg('');
                  setActiveTab('login');
                }}
                style={{ flex: 1 }}
              >
                LOG IN
              </button>
              <button
                className={`pixel-btn ${activeTab === 'signup' ? 'pixel-btn-accent' : ''}`}
                onClick={() => {
                  playClick();
                  setErrorMsg('');
                  setSuccessMsg('');
                  setActiveTab('signup');
                }}
                style={{ flex: 1 }}
              >
                SIGN UP
              </button>
            </div>

            {activeTab === 'login' ? (
              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>USERNAME OR EMAIL:</label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={12}
                      style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--border-color)' }}
                    />
                    <input
                      type="text"
                      className="pixel-input"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      style={{ width: '100%', paddingLeft: '32px' }}
                      placeholder="adventurer"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>PASSWORD:</label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={12}
                      style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--border-color)' }}
                    />
                    <input
                      type="password"
                      className="pixel-input"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      style={{ width: '100%', paddingLeft: '32px' }}
                      placeholder="******"
                      maxLength={50}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="pixel-btn pixel-btn-accent"
                  style={{ width: '100%', marginTop: '8px', padding: '12px' }}
                >
                  ENTER TAVERN
                </button>

                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                  <span
                    onClick={() => {
                      playClick();
                      setView('forgot');
                    }}
                    style={{
                      fontSize: '0.6rem',
                      color: 'var(--accent-color)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Forgot password?
                  </span>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>EMAIL ADDRESS:</label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={12}
                      style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--border-color)' }}
                    />
                    <input
                      type="email"
                      className="pixel-input"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      style={{ width: '100%', paddingLeft: '32px' }}
                      placeholder="hero@quest.com"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>CHOOSE USERNAME:</label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={12}
                      style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--border-color)' }}
                    />
                    <input
                      type="text"
                      className="pixel-input"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      style={{ width: '100%', paddingLeft: '32px' }}
                      placeholder="knight_writer"
                      maxLength={30}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>PASSWORD:</label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={12}
                      style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--border-color)' }}
                    />
                    <input
                      type="password"
                      className="pixel-input"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      style={{ width: '100%', paddingLeft: '32px' }}
                      placeholder="******"
                      maxLength={50}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>CONFIRM PASSWORD:</label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={12}
                      style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--border-color)' }}
                    />
                    <input
                      type="password"
                      className="pixel-input"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      style={{ width: '100%', paddingLeft: '32px' }}
                      placeholder="******"
                      maxLength={50}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="pixel-btn pixel-btn-accent"
                  style={{ width: '100%', marginTop: '8px', padding: '12px' }}
                >
                  CREATE CHARACTER
                </button>
              </form>
            )}
          </div>
        )}

        {/* VIEW: FORGOT PASSWORD */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                className="pixel-btn"
                onClick={() => {
                  playClick();
                  setView('form');
                }}
                style={{ padding: '6px' }}
              >
                <ArrowLeft size={14} />
              </button>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>RECOVER PASSWORD</span>
            </div>

            <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Enter the email address or username linked to your character. We will dispatch a verification scroll.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>USERNAME OR EMAIL:</label>
              <div style={{ position: 'relative' }}>
                <User
                  size={12}
                  style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--border-color)' }}
                />
                <input
                  type="text"
                  className="pixel-input"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  style={{ width: '100%', paddingLeft: '32px' }}
                  placeholder="adventurer"
                  maxLength={100}
                />
              </div>
            </div>

            <button
              type="submit"
              className="pixel-btn pixel-btn-accent"
              style={{ width: '100%', padding: '12px' }}
            >
              DISPATCH OTP SCROLL
            </button>
          </form>
        )}

        {/* VIEW: VERIFY OTP */}
        {view === 'verify' && (
          <form onSubmit={handleVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                className="pixel-btn"
                onClick={() => {
                  playClick();
                  setView('forgot');
                }}
                style={{ padding: '6px' }}
              >
                <ArrowLeft size={14} />
              </button>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>VERIFY OTP</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: 'var(--accent-color)',
                fontSize: '0.75rem',
                border: '2px solid var(--accent-color)',
                padding: '8px',
                backgroundColor: 'rgba(229, 169, 34, 0.1)',
              }}
            >
              <Clock size={14} />
              <span>TIME REMAINING: {formatTime(timeRemaining)}</span>
            </div>

            <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              {isSupabaseConfigured
                ? 'We have sent a secure code to your email. Enter the 6-digit OTP code below.'
                : 'We have dispatched a simulated message. Please enter the 6-digit OTP code to authorize reset.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>ENTER 6-DIGIT CODE:</label>
              <input
                type="text"
                className="pixel-input"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ width: '100%', textAlign: 'center', letterSpacing: '4px', fontSize: '1rem' }}
                placeholder="123456"
                maxLength={6}
              />
            </div>

            <button
              type="submit"
              className="pixel-btn pixel-btn-accent"
              style={{ width: '100%', padding: '12px' }}
            >
              AUTHORIZE RESET
            </button>

            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <span
                onClick={() => {
                  playClick();
                  setShowMailbox(true);
                }}
                style={{
                  fontSize: '0.6rem',
                  color: 'var(--accent-color)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {isSupabaseConfigured ? 'Show recovery status scroll' : 'Show mail window again'}
              </span>
            </div>
          </form>
        )}

        {/* VIEW: RESET PASSWORD */}
        {view === 'reset' && (
          <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '8px' }}>
              ENTER NEW PASSWORD
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>NEW PASSWORD:</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={12}
                  style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--border-color)' }}
                />
                <input
                  type="password"
                  className="pixel-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', paddingLeft: '32px' }}
                  placeholder="******"
                  maxLength={50}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>REPEAT NEW PASSWORD:</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={12}
                  style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--border-color)' }}
                />
                <input
                  type="password"
                  className="pixel-input"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  style={{ width: '100%', paddingLeft: '32px' }}
                  placeholder="******"
                  maxLength={50}
                />
              </div>
            </div>

            <button
              type="submit"
              className="pixel-btn pixel-btn-accent"
              style={{ width: '100%', padding: '12px' }}
            >
              SAVE NEW PASSWORD
            </button>
          </form>
        )}
      </div>

      {/* RETRO INBOX MAILBOX OVERLAY */}
      {showMailbox && activeSession && (
        <div className="dialog-backdrop" style={{ zIndex: 60 }}>
          <div
            className="pixel-panel crt-glow"
            style={{
              width: '460px',
              maxWidth: '95%',
              boxShadow: 'var(--crt-glow)',
              padding: '16px',
            }}
          >
            <div
              className="pixel-panel-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
              }}
            >
              <span>{isSupabaseConfigured ? '⚡ SUPABASE DISPATCH' : '📨 INCOMING MAIL'}</span>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '2px solid var(--border-color)',
                padding: '12px',
                fontSize: '0.6rem',
                fontFamily: 'Share Tech Mono, monospace',
                lineHeight: '1.6',
                color: 'var(--text-primary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {isSupabaseConfigured ? (
                <>
                  <div>
                    <strong>PROVIDER:</strong> Supabase Authentication Cloud
                  </div>
                  <div>
                    <strong>RECIPIENT:</strong> {activeSession.email}
                  </div>
                  <div>
                    <strong>STATUS:</strong> REAL E-MAIL DISPATCHED
                  </div>
                  <hr style={{ borderColor: 'var(--border-color)', opacity: 0.3 }} />
                  <div>
                    Greetings Adventurer, <strong>{activeSession.username}</strong>!
                  </div>
                  <div>
                    A secure password recovery scroll has been triggered via your Supabase Cloud project.
                  </div>
                  <div
                    style={{
                      margin: '12px 0',
                      padding: '12px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '2px dashed var(--accent-color)',
                      textAlign: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      color: 'var(--accent-color)',
                    }}
                  >
                    CHECK YOUR REAL EMAIL INBOX FOR THE 6-DIGIT CODE
                  </div>
                  <div>
                    Please inspect your inbox (and spam folder) for the message containing your recovery code,
                    then input it on the verification panel.
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <strong>FROM:</strong> recovery-scroll@pixelwriter.app
                  </div>
                  <div>
                    <strong>TO:</strong> {activeSession.email}
                  </div>
                  <div>
                    <strong>SUBJECT:</strong> OTP Verification Code
                  </div>
                  <hr style={{ borderColor: 'var(--border-color)', opacity: 0.3 }} />
                  <div>
                    Greetings Adventurer, <strong>{activeSession.username}</strong>!
                  </div>
                  <div>
                    A request has been made to recover the credentials for your Pixel Writer character.
                    Please transcribe the following One-Time Password (OTP) to proceed:
                  </div>
                  <div
                    style={{
                      margin: '12px 0',
                      padding: '12px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '2px dashed var(--accent-color)',
                      textAlign: 'center',
                      fontSize: '1.3rem',
                      letterSpacing: '6px',
                      fontWeight: 'bold',
                      color: 'var(--accent-color)',
                    }}
                  >
                    {activeSession.otpCode}
                  </div>
                  <div>
                    This OTP is valid for exactly <strong>15 minutes</strong>. If you did not initiate this scroll dispatch,
                    you may safely burn this letter.
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="pixel-btn pixel-btn-accent"
                onClick={() => {
                  sound.playCoin();
                  setShowMailbox(false);
                }}
              >
                CLOSE WINDOW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5-STAR REVIEWS ARCADE MARQUEE TICKER */}
      {reviews.length > 0 && (
        <div className="arcade-marquee-container">
          <div className="arcade-marquee-text">
            {reviews.map((r, i) => (
              <span key={i} style={{ marginRight: '48px' }}>
                ★{'★'.repeat(r.stars - 1)} "{r.feedback}" - {r.username.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
