import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { Home, ShieldCheck, QrCode, Key, User, ArrowRight, Sparkles, Lock, Mail, CheckCircle2, AlertCircle, HelpCircle, RefreshCw, ChevronLeft } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import CasaMiraLogo from '../components/CasaMiraLogo';

export default function Login() {
  const navigate = useNavigate();
  const { setUserAndToken, switchDemoRole } = useAuth();

  const [activeTab, setActiveTab] = useState<'SIGN_IN' | 'SIGN_UP' | 'GOOGLE'>('SIGN_IN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleInstantDemoLogin = async (role: string) => {
    setLoading(true);
    setError('');
    try {
      const success = await switchDemoRole(role);
      if (success) {
        if (role === 'SUPERADMIN' || role === 'ADMIN' || role === 'PMO' || role === 'HOA-BOD') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        setError('Failed to switch demo role. Please check network connection.');
      }
    } catch (err: any) {
      setError('Error switching demo role');
    } finally {
      setLoading(false);
    }
  };

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up Form State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');

  // Email Confirmation State
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState('');
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [generatedCodePreview, setGeneratedCodePreview] = useState('');

  // Forgot Password Modal State
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmailInput, setForgotEmailInput] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Handle Email & Password / Username Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail) {
      setError('Please enter your Email or Phase, Block & Lot Username');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      // First try email login
      let res = await fetch('/api/auth/login-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInEmail.trim(), password: signInPassword.trim() })
      });

      if (!res.ok) {
        // Fallback to username/house PIN login
        res = await fetch('/api/auth/login-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: signInEmail.trim(), password: signInPassword.trim() })
        });
      }

      const data = await res.json();

      if (res.ok && data.user) {
        setUserAndToken(data.user, data.token || `custom-token-${data.user.uid}`);
        
        // If email isn't verified yet and account has an email, prompt for confirmation
        if (data.user.email && data.user.isEmailVerified === false) {
          setPendingVerifyEmail(data.user.email);
          setGeneratedCodePreview(data.user.emailVerificationCode || '123456');
          setShowVerificationModal(true);
        } else {
          navigate('/');
        }
        return;
      }

      setError(data.error || 'Invalid account credentials or access PIN.');
    } catch (err) {
      console.error('Sign In error:', err);
      setError('Failed to connect to authentication server');
    } finally {
      setLoading(false);
    }
  };

  // Handle New Account Sign Up via Email & Pass
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!signUpEmail.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    if (signUpPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/register-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signUpName.trim(),
          email: signUpEmail.trim(),
          password: signUpPassword.trim()
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUserAndToken(data.user, data.token);
        setPendingVerifyEmail(data.user.email);
        setGeneratedCodePreview(data.verificationCode || '123456');
        setShowVerificationModal(true);
        setSuccessMsg('Account created! A confirmation code was dispatched to your email.');
      } else {
        setError(data.error || 'Failed to create account.');
      }
    } catch (err) {
      console.error('Sign Up error:', err);
      setError('Error submitting registration request.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Email Code Verification
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCodeInput.trim()) {
      setError('Please enter the 6-digit confirmation code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingVerifyEmail,
          code: verificationCodeInput.trim()
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUserAndToken(data.user, data.token);
        setShowVerificationModal(false);
        navigate('/');
      } else {
        setError(data.error || 'Invalid verification code.');
      }
    } catch (err) {
      console.error('Verify error:', err);
      setError('Unable to verify code with server.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password Request
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmailInput.trim()) return;

    setLoading(true);
    setForgotSuccess('');
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmailInput.trim() })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setForgotSuccess(`Password Reset Instructions Sent! Temporary Access PIN: [ ${data.tempPin} ]`);
      } else {
        setError(data.error || 'Unable to reset password for this email.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Failed to process password request.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      if (result.user) {
        const res = await fetch('/api/auth/register-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: result.user.displayName || 'Google Resident',
            email: result.user.email || `google-${result.user.uid}@casamirasouth.com`,
            password: `G-${result.user.uid.slice(0, 8)}`
          })
        });
        const data = await res.json();
        if (data.user) {
          setUserAndToken(data.user, data.token);
        }
      }
      navigate('/');
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setError('Google Authentication failed. Please try Email & Password login.');
    }
  };

  const setDemoAccount = (demoUsername: string, demoPin: string) => {
    setSignInEmail(demoUsername);
    setSignInPassword(demoPin);
    setError('');
    setActiveTab('SIGN_IN');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-slate-800 relative overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-teal-500/10 via-slate-100/50 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-80 h-80 bg-teal-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 px-4">
        <div className="mx-auto flex justify-center">
          <CasaMiraLogo className="w-16 h-16" variant="badge" animate={true} />
        </div>
        <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
          Casa Mira South
        </h2>
        <p className="mt-1 text-xs font-semibold text-slate-500 max-w-xs mx-auto">
          Homeowners Association Portal
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 border border-slate-200/80 rounded-3xl sm:px-8">
          
          {/* Tab Switcher */}
          <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-2xl mb-6 text-[11px]">
            <button
              type="button"
              onClick={() => { setActiveTab('SIGN_IN'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2.5 rounded-xl font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'SIGN_IN'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5 text-teal-400" /> Sign In
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('SIGN_UP'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2.5 rounded-xl font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'SIGN_UP'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-amber-400" /> Sign Up
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('GOOGLE'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2.5 rounded-xl font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'GOOGLE'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Google
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {successMsg}
            </div>
          )}

          {/* TAB 1: SIGN IN (EMAIL & PASSWORD / HO USERNAME) */}
          {activeTab === 'SIGN_IN' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Email Address or House Username *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="e.g. maria.santos@gmail.com or P3A2B15L21"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Password / Access PIN *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmailInput(signInEmail.includes('@') ? signInEmail : '');
                      setForgotSuccess('');
                      setShowForgotPasswordModal(true);
                    }}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-900 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Password or PIN"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 flex items-center justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-md text-xs font-black text-white bg-slate-900 hover:bg-slate-800 focus:outline-none transition-all gap-2"
              >
                {loading ? 'Authenticating Account...' : (
                  <>Log In <ArrowRight className="w-4 h-4 text-teal-400" /></>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: SIGN UP VIA EMAIL */}
          {activeTab === 'SIGN_UP' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-semibold leading-snug flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Sign up with your email. A 6-digit confirmation code will be sent for account verification.</span>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan dela Cruz"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min. 4 chars"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 px-4 rounded-xl shadow-md text-xs font-black text-white bg-slate-900 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Sending Confirmation...' : (
                  <>Create Account & Send Email Code <ArrowRight className="w-4 h-4 text-amber-400" /></>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: GOOGLE SIGN IN */}
          {activeTab === 'GOOGLE' && (
            <div className="space-y-4 text-center py-4">
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Log in or sign up seamlessly using your official Google Account.
              </p>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex justify-center py-3.5 px-4 border border-slate-200 rounded-2xl shadow-sm text-xs font-extrabold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none transition-all gap-3 items-center"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Sign In or Sign Up with Google
              </button>
            </div>
          )}

          {/* Standalone Guard Scanner Quick Action */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-4">
            {/* Instant Demo Accounts Picker for Seamless Testing */}
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl text-left border border-slate-800 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Instant Demo Access
                </span>
                <span className="text-[9px] px-1.5 py-0.5 bg-amber-400/20 text-amber-300 font-bold rounded">
                  1-CLICK LOGIN
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 mb-3 leading-snug">
                Click any role to test the live platform with full permissions:
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleInstantDemoLogin('SUPERADMIN')}
                  disabled={loading}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-[11px] font-bold text-left transition-all flex flex-col cursor-pointer border border-slate-700"
                >
                  <span className="text-amber-400 font-black">👑 SuperAdmin</span>
                  <span className="text-[9.5px] text-slate-400 font-normal truncate">PMO Head Mendoza</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInstantDemoLogin('ADMIN')}
                  disabled={loading}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-[11px] font-bold text-left transition-all flex flex-col cursor-pointer border border-slate-700"
                >
                  <span className="text-teal-300 font-black">🛡️ HOA Admin</span>
                  <span className="text-[9.5px] text-slate-400 font-normal truncate">Ana Patricia Roxas</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInstantDemoLogin('RESIDENT')}
                  disabled={loading}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-[11px] font-bold text-left transition-all flex flex-col cursor-pointer border border-slate-700"
                >
                  <span className="text-sky-300 font-black">🏠 Resident</span>
                  <span className="text-[9.5px] text-slate-400 font-normal truncate">Maria Clara Santos</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInstantDemoLogin('PMO')}
                  disabled={loading}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-[11px] font-bold text-left transition-all flex flex-col cursor-pointer border border-slate-700"
                >
                  <span className="text-emerald-300 font-black">🏢 PMO Staff</span>
                  <span className="text-[9.5px] text-slate-400 font-normal truncate">Officer Miguel Tan</span>
                </button>
              </div>
            </div>

            <Link
              to="/verify-pass"
              className="w-full py-3 px-4 bg-teal-50/80 hover:bg-teal-100/80 border border-teal-200/80 text-teal-800 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <QrCode className="w-4 h-4 text-teal-600" />
              Guard QR Gate Pass Scanner (Non-Login)
            </Link>
            <p className="text-[10px] font-medium text-slate-400">
              For security guards & gate officers to verify proof of residency.
            </p>
          </div>

        </div>
      </div>

      {/* MODAL 1: EMAIL CONFIRMATION CODE MODAL */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-teal-700">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center">
                <Mail className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Email Confirmation Required</h3>
                <p className="text-xs text-slate-500">Sent to: <strong className="text-slate-900">{pendingVerifyEmail}</strong></p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Please enter the 6-digit email confirmation code sent to your inbox to verify your email address.
            </p>

            <form onSubmit={handleVerifyCode} className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                  6-Digit Confirmation Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 889901"
                  value={verificationCodeInput}
                  onChange={(e) => setVerificationCodeInput(e.target.value)}
                  className="w-full text-center tracking-[0.5em] text-lg font-mono font-black py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              {/* Demo Helper Box */}
              <div className="p-3 bg-teal-50/80 border border-teal-200/80 rounded-2xl text-[11px] text-teal-900 flex items-center justify-between">
                <div>
                  <p className="font-bold">Demo Email Code Preview:</p>
                  <p className="font-mono text-xs font-black text-teal-700">{generatedCodePreview || '123456'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setVerificationCodeInput(generatedCodePreview || '123456')}
                  className="px-2.5 py-1 bg-teal-700 text-white rounded-lg font-bold text-[10px] hover:bg-teal-800"
                >
                  Auto-Fill Code
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVerificationModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-md"
                >
                  {loading ? 'Verifying...' : 'Verify Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FORGOT PASSWORD RESET MODAL */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset Access PIN / Password</h3>
                <p className="text-xs text-slate-500">Request account reset instructions via email</p>
              </div>
            </div>

            {forgotSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-emerald-900 leading-snug">{forgotSuccess}</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPasswordModal(false);
                    setSignInEmail(forgotEmailInput);
                  }}
                  className="w-full py-2 bg-emerald-700 text-white font-bold text-xs rounded-xl"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your registered email address below. We will send password reset instructions and your temporary access PIN.
                </p>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
                    Registered Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. maria.santos@gmail.com"
                    value={forgotEmailInput}
                    onChange={(e) => setForgotEmailInput(e.target.value)}
                    className="w-full py-3 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-md"
                  >
                    {loading ? 'Sending...' : 'Send Reset PIN'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Login Footer Attribution */}
      <footer className="mt-8 py-4 text-center relative z-10">
        <p className="text-[11px] font-medium text-slate-400">
          © 2026 Kieth Ryan Gonzales - AI Systems Design & Automated Web Development.
        </p>
      </footer>
    </div>
  );
}
