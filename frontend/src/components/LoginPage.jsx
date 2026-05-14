// src/pages/Login.jsx
import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:5001/api";

const EyeIcon = ({ open }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.8}
    stroke="currentColor"
    className="w-5 h-5"
  >
    {open ? (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ) : (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58a2 2 0 102.83 2.83" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.88 5.09A10.94 10.94 0 0112 4.5c4.76 0 8.77 3.16 10.07 7.5a10.96 10.96 0 01-4.04 5.19M6.23 6.23A10.95 10.95 0 001.93 12C3.23 16.34 7.24 19.5 12 19.5a10.9 10.9 0 005.27-1.35" />
      </>
    )}
  </svg>
);

// ─── Forgot Password: 3-step flow ───────────────────────────────────────────
function ForgotPasswordFlow({ onBack }) {
  const [step, setStep] = useState(0);
  const [fpEmail, setFpEmail] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpNewPass, setFpNewPass] = useState("");
  const [fpConfirmPass, setFpConfirmPass] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setTimeout(() => setOtpTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimer]);

  // ── Step 0: Send OTP ──
  const handleSendOtp = async () => {
    setError("");
    if (!fpEmail.endsWith("@psgtech.ac.in")) {
      setError("Please enter your PSG college email (@psgtech.ac.in).");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail }),
      });
      const data = await response.json();
      if (response.ok) {
        setOtpTimer(30);
        setStep(1);
      } else {
        setError(data.error || "Failed to send OTP. Please try again.");
      }
    } catch {
      setError("Server error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1: Verify OTP ──
  const handleVerifyOtp = async () => {
    setError("");
    if (fpOtp.length < 4) {
      setError("Please enter the OTP sent to your email.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail, otp: fpOtp }),
      });
      const data = await response.json();
      if (response.ok) {
        setStep(2);
      } else {
        setError(data.error || "Invalid OTP. Please try again.");
      }
    } catch {
      setError("Server error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1: Resend OTP ──
  const handleResendOtp = async () => {
    setError("");
    setOtpTimer(30);
    try {
      const response = await fetch(`${API_BASE}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to resend OTP.");
      }
    } catch {
      setError("Server error. Failed to resend OTP.");
    }
  };

  // ── Step 2: Reset Password ──
  const handleResetPassword = async () => {
    setError("");
    if (fpNewPass.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (fpNewPass !== fpConfirmPass) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail, otp: fpOtp, newPassword: fpNewPass }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to reset password. Please try again.");
      }
    } catch {
      setError("Server error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success Screen ──
  if (success) {
    return (
      <div className="w-full text-center space-y-6">
        <div className="w-16 h-16 bg-fern/10 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-fern" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <h3 className="text-2xl font-black text-forest mb-2">Password Reset!</h3>
          <p className="text-forest/60 text-sm">Your password has been updated successfully.</p>
        </div>
        <button
          onClick={onBack}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-sage via-fern to-hunter text-white font-bold text-lg shadow-xl hover:scale-[1.02] transition-all duration-300"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-fern font-semibold hover:underline"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Login
      </button>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {["Email", "OTP", "New Password"].map((label, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  step > i
                    ? "bg-fern text-white"
                    : step === i
                    ? "bg-hunter text-white"
                    : "bg-sage/20 text-forest/40"
                }`}
              >
                {step > i ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-xs font-semibold hidden sm:block ${step === i ? "text-forest" : "text-forest/40"}`}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${step > i ? "bg-fern" : "bg-sage/20"}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Title */}
      <div>
        <h2 className="text-3xl font-black text-forest mb-1">Forgot Password</h2>
        <p className="text-forest/60 text-sm">
          {step === 0 && "We'll send an OTP to your college email."}
          {step === 1 && `OTP sent to ${fpEmail}. Check your inbox.`}
          {step === 2 && "Create a new password for your account."}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* ── STEP 0: Email ── */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-forest/80 block mb-2">College Email</label>
            <input
              type="email"
              placeholder="yourname@psgtech.ac.in"
              value={fpEmail}
              onChange={(e) => setFpEmail(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-sage/30 bg-white focus:outline-none focus:ring-4 focus:ring-sage/20 focus:border-fern transition-all duration-300"
            />
          </div>
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-sage via-fern to-hunter text-white font-bold text-lg shadow-xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-60 disabled:scale-100"
          >
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </div>
      )}

      {/* ── STEP 1: OTP ── */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-forest/80 block mb-2">Enter OTP</label>
            <input
              type="text"
              placeholder="······"
              maxLength={6}
              value={fpOtp}
              onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full px-5 py-4 rounded-2xl border border-sage/30 bg-white focus:outline-none focus:ring-4 focus:ring-sage/20 focus:border-fern transition-all duration-300 text-center text-2xl tracking-[0.5em] font-bold"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-forest/50">Didn't receive it?</span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={otpTimer > 0}
              className="text-fern font-semibold hover:underline disabled:opacity-40 disabled:no-underline transition-all"
            >
              {otpTimer > 0 ? `Resend in ${otpTimer}s` : "Resend OTP"}
            </button>
          </div>

          <button
            type="button"
            onClick={handleVerifyOtp}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-sage via-fern to-hunter text-white font-bold text-lg shadow-xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-60 disabled:scale-100"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </div>
      )}

      {/* ── STEP 2: New Password ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-forest/80 block mb-2">New Password</label>
            <div className="relative">
              <input
                type={showNewPass ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={fpNewPass}
                onChange={(e) => setFpNewPass(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border border-sage/30 bg-white focus:outline-none focus:ring-4 focus:ring-sage/20 focus:border-fern transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-fern"
              >
                <EyeIcon open={showNewPass} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-forest/80 block mb-2">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPass ? "text" : "password"}
                placeholder="Re-enter new password"
                value={fpConfirmPass}
                onChange={(e) => setFpConfirmPass(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border border-sage/30 bg-white focus:outline-none focus:ring-4 focus:ring-sage/20 focus:border-fern transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-fern"
              >
                <EyeIcon open={showConfirmPass} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetPassword}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-sage via-fern to-hunter text-white font-bold text-lg shadow-xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-60 disabled:scale-100"
          >
            {loading ? "Resetting Password..." : "Reset Password"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Login Page ─────────────────────────────────────────────────────────
export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
    otp: "",
  });
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const timer = setTimeout(() => setOtpTimer((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpTimer]);

  // ── Login submit ──
// ── Login submit ──
const handleLogin = async () => {
  setLoginError("");
  if (!loginData.email || !loginData.password) {
    setLoginError("Please enter your email and password.");
    return;
  }

  setLoginLoading(true);
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email: loginData.email, 
        password: loginData.password 
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect based on role
      const role = data.user.role;
      
      if (role === 'admin') {
        window.location.href = '/admin/dashboard';
      } else if (role === 'tutor') {
        window.location.href = '/tutor/queue';
      } else if (role === 'student') {
        window.location.href = '/student/home';
      } else {
        window.location.href = '/';
      }
    } else {
      setLoginError(data.error || "Invalid email or password.");
    }
  } catch (err) {
    console.error(err);
    setLoginError("Server error. Please check if backend is running.");
  } finally {
    setLoginLoading(false);
  }
};

  // ── Send OTP for Signup ──
  const handleOtp = async () => {
    setSignupError("");
    if (!signupData.email) {
      setSignupError("Please enter your email first.");
      return;
    }
    if (!signupData.email.endsWith("@psgtech.ac.in")) {
      setSignupError("Please use your PSG college email (@psgtech.ac.in).");
      return;
    }
    setOtpLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupData.email }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("OTP Sent Successfully");
        setOtpTimer(30);
      } else {
        setSignupError(data.error || "Failed to send OTP.");
      }
    } catch {
      setSignupError("Server error. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Signup submit ──
  const handleSignup = async () => {
    setSignupError("");
    if (!signupData.name || !signupData.email || !signupData.password || !signupData.otp) {
      setSignupError("Please fill all fields and verify OTP.");
      return;
    }
    if (!signupData.email.endsWith("@psgtech.ac.in")) {
      setSignupError("Please use your PSG college email (@psgtech.ac.in).");
      return;
    }
    if (signupData.password.length < 8) {
      setSignupError("Password must be at least 8 characters.");
      return;
    }
    setSignupLoading(true);
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupData.name,
          email: signupData.email,
          password: signupData.password,
          otp: signupData.otp,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Account created successfully! Please login.");
        setIsSignup(false);
        setSignupData({ name: "", email: "", password: "", otp: "" });
      } else {
        setSignupError(data.error || "Registration failed. Please try again.");
      }
    } catch {
      setSignupError("Server error. Please try again.");
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest via-hunter to-fern flex items-center justify-center overflow-hidden relative px-4 py-6">

      {/* Animated Background Circles */}
      <div className="absolute top-[-120px] left-[-100px] w-72 h-72 bg-sage/20 rounded-full blur-3xl animate-floatSlow" />
      <div className="absolute bottom-[-150px] right-[-100px] w-96 h-96 bg-bone/10 rounded-full blur-3xl animate-floatMedium" />
      <div className="absolute top-[20%] right-[15%] w-48 h-48 bg-fern/20 rounded-full blur-2xl animate-pulseGlow" />

      {/* Main Card */}
      <div className="w-full max-w-5xl bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] overflow-hidden shadow-2xl flex flex-col lg:flex-row animate-fadeUp">

        {/* ── Left Panel ── */}
        <div className="lg:w-1/2 bg-gradient-to-br from-sage via-fern to-hunter relative p-8 flex flex-col justify-between">
          <div className="absolute inset-0 bg-black/10" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 bg-white flex items-center justify-center shadow-xl overflow-hidden p-1">
              <img
                src="https://th.bing.com/th/id/R.52dfa294e8b14d9179989ec4bb4301be?rik=%2fPaLXG0vfXTsVA&riu=http%3a%2f%2fadmissionsinchennai.in%2fadmissions%2fwp-content%2fuploads%2f2016%2f03%2fpsg-logo-1.jpg&ehk=ADYfoaRkJkzEN79HJj6ewIahfYvMUKgJ9JUx%2bhUox6s%3d&risl=&pid=ImgRaw&r=0"
                alt="PSG Logo"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div className="text-white">
              <h2 className="font-bold text-2xl leading-tight">PSG COLLEGE OF TECHNOLOGY</h2>
              {/* <p className="text-sm opacity-90">Technology</p> */}
            </div>
          </div>

          {/* College Image */}
          <div className="relative z-10 flex justify-center items-center py-8">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRotXMt4ujHNblJi6nQ21qJVbW1PKQcf8N2uA&s"
              alt="PSG College of Technology"
              className="rounded-3xl shadow-2xl object-cover w-full max-w-md h-[300px] hover:scale-105 transition duration-500"
            />
          </div>

          {/* Tagline */}
          <div className="relative z-10 text-white">
            <h1 className="text-3xl font-black leading-tight mb-4">Internship Form Automation System</h1>
            {/* <p className="text-white/80 text-sm leading-6">
              Secure access to your academic dashboard, attendance, internship portal, and college services.
            </p> */}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="lg:w-1/2 bg-white/95 backdrop-blur-xl p-8 lg:p-12 flex items-center">
          <div className="w-full">

            {/* ── FORGOT PASSWORD FLOW ── */}
            {showForgotPassword ? (
              <ForgotPasswordFlow onBack={() => setShowForgotPassword(false)} />
            ) : (
              <>
                {/* Login / Sign Up Tabs */}
                <div className="flex bg-sage/10 rounded-2xl p-1 mb-8">
                  <button
                    onClick={() => { setIsSignup(false); setLoginError(""); }}
                    className={`w-1/2 py-3 rounded-xl font-bold transition-all duration-300 ${
                      !isSignup ? "bg-gradient-to-r from-fern to-hunter text-white shadow-lg" : "text-forest"
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => { setIsSignup(true); setSignupError(""); }}
                    className={`w-1/2 py-3 rounded-xl font-bold transition-all duration-300 ${
                      isSignup ? "bg-gradient-to-r from-fern to-hunter text-white shadow-lg" : "text-forest"
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                {/* Form Title */}
                <div className="mb-8 text-center">
                  <h2 className="text-4xl font-black text-forest mb-2">
                    {isSignup ? "Create Account" : "Welcome Back"}
                  </h2>
                  <p className="text-forest/60">
                    {isSignup ? "Create your account" : "Login to continue"}
                  </p>
                </div>

                {/* ── LOGIN FORM ── */}
                {!isSignup ? (
                  <div className="space-y-5">
                    {loginError && (
                      <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                        {loginError}
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-semibold text-forest/80 block mb-2">College Email</label>
                      <input
                        type="email"
                        placeholder="yourname@psgtech.ac.in"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl border border-sage/30 bg-white focus:outline-none focus:ring-4 focus:ring-sage/20 focus:border-fern transition-all duration-300"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-forest/80 block mb-2">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                          className="w-full px-5 py-4 rounded-2xl border border-sage/30 bg-white focus:outline-none focus:ring-4 focus:ring-sage/20 focus:border-fern transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-fern"
                        >
                          <EyeIcon open={showPassword} />
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-fern font-semibold hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleLogin}
                      disabled={loginLoading}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-sage via-fern to-hunter text-white font-bold text-lg shadow-xl hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 disabled:opacity-60 disabled:scale-100"
                    >
                      {loginLoading ? "Logging in..." : "Login"}
                    </button>
                  </div>
                ) : (
                  /* ── SIGNUP FORM ── */
                  <div className="space-y-5">
                    {signupError && (
                      <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                        {signupError}
                      </div>
                    )}

                    {/* <div>
                      <label className="text-sm font-semibold text-forest/80 block mb-2">Full Name</label>
                      <input
                        type="text"
                        placeholder="Enter your name"
                        value={signupData.name}
                        onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl border border-sage/30 bg-white focus:outline-none focus:ring-4 focus:ring-sage/20 focus:border-fern transition-all duration-300"
                      />
                    </div> */}

                    <div>
                      <label className="text-sm font-semibold text-forest/80 block mb-2">College Email</label>
                      <input
                        type="email"
                        placeholder="yourname@psgtech.ac.in"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl border border-sage/30 bg-white focus:outline-none focus:ring-4 focus:ring-sage/20 focus:border-fern transition-all duration-300"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-forest/80 block mb-2">Password</label>
                      <div className="relative">
                        <input
                          type={showSignupPassword ? "text" : "password"}
                          placeholder="Create password (min. 8 chars)"
                          value={signupData.password}
                          onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                          className="w-full px-5 py-4 rounded-2xl border border-sage/30 bg-white focus:outline-none focus:ring-4 focus:ring-sage/20 focus:border-fern transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-fern"
                        >
                          <EyeIcon open={showSignupPassword} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-forest/80 block mb-2">OTP Verification</label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          placeholder="Enter OTP"
                          value={signupData.otp}
                          onChange={(e) => setSignupData({ ...signupData, otp: e.target.value.replace(/\D/g, "") })}
                          maxLength={6}
                          className="flex-1 px-5 py-4 rounded-2xl border border-sage/30 bg-white focus:outline-none focus:ring-4 focus:ring-sage/20 focus:border-fern transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={handleOtp}
                          disabled={otpTimer > 0 || otpLoading}
                          className="px-5 rounded-2xl bg-gradient-to-r from-sage to-fern text-white font-bold shadow-lg hover:from-fern hover:to-hunter hover:shadow-[0_0_30px_rgba(163,177,138,0.45)] hover:scale-105 transition-all duration-300 disabled:opacity-50 whitespace-nowrap">
                          {otpLoading ? "..." : otpTimer > 0 ? `${otpTimer}s` : "Get OTP"}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSignup}
                      disabled={signupLoading}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-sage via-fern to-hunter text-white font-bold text-lg shadow-xl hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 disabled:opacity-60 disabled:scale-100"
                    >
                      {signupLoading ? "Creating Account..." : "Create Account"}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-forest/60">

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}