import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Leaf, ArrowLeft, UserPlus, Mail, CheckCircle } from 'lucide-react';
import api from '../api.js';

const STEPS = ['Email & OTP', 'Create Account'];

const SignupPage = () => {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [phone, setPhone] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Detect role from email
  const detectRole = (em) => {
    const lower = em.toLowerCase();
    if (!lower.endsWith('@psgtech.ac.in')) return null;
    const local = lower.split('@')[0];
    if (local.indexOf('.') === 3) return 'Tutor';
    return 'Student';
  };
  const detectedRole = detectRole(email);

  const handleSendOtp = async () => {
    if (!email.toLowerCase().endsWith('@psgtech.ac.in')) {
      setError('Only @psgtech.ac.in email addresses are allowed.'); return;
    }
    setLoading(true); setError('');
    try {
      await api.post('/auth/send-otp', { email });
      setOtpSent(true);
      setSuccess('OTP sent to your email. Please check your inbox.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP.');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) { setError('Please enter the 6-digit OTP.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/verify-otp', { email, otp });
      setOtpVerified(true);
      setSuccess('Email verified! Now create your password.');
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP.');
    } finally { setLoading(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPw) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/signup', { email, password, full_name: fullName, phone });
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate('/'), 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #344E41 0%, #3A5A40 35%, #588157 70%, #A3B18A 100%)' }}>
      
      {/* Bg elements */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute bottom-[-5%] left-[-5%] w-72 h-72 rounded-full bg-white/5 blur-3xl" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center gap-4 px-8 py-5 bg-black/15 backdrop-blur-sm z-10">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          <Leaf className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-sm">PSG Tech Internship Portal</span>
        <Link to="/" className="ml-auto flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 mt-16 animate-slide-up">
        
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 px-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 ${i <= step ? 'text-white' : 'text-white/30'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                  ${i < step ? 'bg-sage border-sage text-white' : i === step ? 'bg-fern border-fern text-white' : 'border-white/20 text-white/30'}`}>
                  {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 rounded-full transition-all ${i < step ? 'bg-sage' : 'bg-white/20'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
          
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 border border-white/25 mb-4">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-1">Create Account</h2>
            <p className="text-white/50 text-sm">
              {step === 0 ? 'Verify your PSG Tech email' : 'Set up your credentials'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl text-red-200 text-sm animate-slide-in">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-200 text-sm animate-slide-in">
              ✅ {success}
            </div>
          )}

          {/* Step 0: Email + OTP */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">
                  PSG Tech Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  disabled={otpSent}
                  placeholder="rollno@psgtech.ac.in"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-sage/50 disabled:opacity-60"
                />
                {detectedRole && email.endsWith('@psgtech.ac.in') && (
                  <p className="mt-1.5 text-xs text-sage">
                    Detected role: <strong className="text-white">{detectedRole}</strong>
                  </p>
                )}
              </div>

              {!otpSent ? (
                <button onClick={handleSendOtp} disabled={loading || !email}
                  className="w-full py-3 bg-gradient-to-r from-fern to-hunter text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 shadow-lg hover:shadow-xl">
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Mail className="w-4 h-4" /> Send OTP</>}
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">
                      Enter OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                      placeholder="6-digit OTP"
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-sage/50 tracking-[0.3em] text-center text-lg font-bold"
                    />
                  </div>
                  <button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6}
                    className="w-full py-3 bg-gradient-to-r from-fern to-hunter text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                    {loading
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <><CheckCircle className="w-4 h-4" /> Verify OTP</>}
                  </button>
                  <button onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
                    className="w-full text-center text-white/40 hover:text-white/70 text-xs py-1 transition-colors">
                    Resend OTP
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Create Account */}
          {step === 1 && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Full Name</label>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-sage/50" />
              </div>
              <div>
                <label className="block text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Phone (Optional)</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-sage/50" />
              </div>
              <div>
                <label className="block text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} required value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Min 8 characters"
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-sage/50" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 p-1">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Confirm Password</label>
                <input type="password" required value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); setError(''); }}
                  placeholder="Repeat your password"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-sage/50" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-fern to-hunter text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 shadow-lg hover:shadow-xl mt-2">
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><UserPlus className="w-4 h-4" /> Create Account</>}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-4">
          Already have an account? <Link to="/" className="text-sage hover:text-white transition-colors">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
