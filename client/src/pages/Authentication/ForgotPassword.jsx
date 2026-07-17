import React, { useState } from 'react';
import { Infinity, CheckCircle, AlertCircle, Loader2, Mail, KeyRound, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth as authApi, apiErrorMessage } from '../../api/client';

// ── STEP 1: Enter email → OTP sent to email
// ── STEP 2: Enter 6-digit OTP → verified, get resetKey
// ── STEP 3: Enter new password + confirm → password reset

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep]                       = useState(1);
  const [email, setEmail]                     = useState('');
  const [otp, setOtp]                         = useState('');
  const [resetKey, setResetKey]               = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [success, setSuccess]                 = useState(false);
  const [error, setError]                     = useState('');
  const [infoMsg, setInfoMsg]                 = useState('');

  // ── Step 1: Request OTP ──
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    try {
      setLoading(true);
      await authApi.forgotPassword(email);
      setInfoMsg('A 6-digit OTP has been sent to your email.');
      setStep(2);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.verifyOtp(email, otp.trim());
      if (res.resetKey) {
        setResetKey(res.resetKey);
      }
      setInfoMsg('OTP verified! Set your new password.');
      setStep(3);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Reset Password ──
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!resetKey) {
      setError('Session expired. Please start over.');
      return;
    }

    try {
      setLoading(true);
      await authApi.resetPassword(resetKey, password);
      setSuccess(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP (from Step 2) ──
  const handleResendOtp = async () => {
    setError('');
    setInfoMsg('');
    try {
      setLoading(true);
      await authApi.forgotPassword(email);
      setOtp('');
      setInfoMsg('A new OTP has been sent to your email.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        :root {
          --primary-green: #2b9d4e;
          --primary-dark: #1f7a3b;
          --primary-soft: #8fd6a3;
          --page-bg: #F5F6FA;
          --card-bg: #FFFFFF;
          --dark-text: #1A1D23;
          --muted-text: #6B7280;
          --border-medium: rgba(43,157,78,0.15);
          --primary-bg-light: rgba(43,157,78,0.05);
        }
        .fp-container*,.fp-container *::before,.fp-container *::after{box-sizing:border-box;font-family:'Inter',sans-serif}
        .fp-wrap{background:#f0fdf4;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:40px 20px}
        .fp-box{display:flex;width:100%;max-width:1100px;min-height:500px;background:var(--page-bg);border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05)}
        .fp-side{width:380px;background:var(--primary-green);color:#fff;padding:40px;display:flex;flex-direction:column;border-radius:20px 0 0 20px}
        .fp-logo{display:flex;align-items:center;gap:12px;margin-bottom:60px}
        .fp-logo-ico{width:32px;height:32px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center}
        .fp-logo-txt{font-size:22px;font-weight:600}
        .fp-side-foot{margin-top:auto;font-size:12px;color:var(--primary-soft)}
        .fp-main{flex:1;padding:40px 60px;display:flex;align-items:center;justify-content:center;background:var(--page-bg)}
        .fp-form-wrap{width:100%;max-width:440px}
        .fp-title{font-size:28px;font-weight:700;color:var(--dark-text);margin-bottom:6px}
        .fp-sub{font-size:14px;color:var(--muted-text);margin-bottom:32px}
        .fp-group{margin-bottom:20px}
        .fp-label{display:block;font-size:13px;font-weight:600;color:var(--dark-text);margin-bottom:6px}
        .fp-input{width:100%;height:48px;padding:0 16px;border:1px solid var(--border-medium);border-radius:8px;font-size:14px;color:#1a1a1a;background:var(--card-bg);outline:none;transition:all 0.2s}
        .fp-input:focus{border-color:var(--primary-green);box-shadow:0 0 0 3px var(--primary-bg-light)}
        .fp-input.err{border-color:#ef4444}
        .fp-otp-input{text-align:center;font-size:28px;font-weight:700;letter-spacing:12px;color:var(--primary-green)}
        .fp-err{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:12px 14px;display:flex;align-items:center;gap:8px;color:#b91c1c;font-size:13px;margin-bottom:18px}
        .fp-info{background:rgba(43,157,78,0.06);border:1px solid rgba(43,157,78,0.2);border-radius:8px;padding:12px 14px;display:flex;align-items:center;gap:8px;color:#166534;font-size:13px;margin-bottom:18px}
        .fp-btn{height:48px;background:var(--primary-green);color:#fff;font-size:15px;font-weight:600;border:none;border-radius:8px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px}
        .fp-btn:hover:not(:disabled){background:var(--primary-dark)}
        .fp-btn:disabled{opacity:0.65;cursor:not-allowed}
        .fp-row{display:flex;justify-content:space-between;align-items:center;margin-top:24px;gap:16px}
        .fp-link{font-size:14px;color:var(--primary-green);text-decoration:none;font-weight:400;white-space:nowrap;cursor:pointer;background:none;border:none;padding:0}
        .fp-link:hover{text-decoration:underline}
        .fp-success{text-align:center;padding:20px 0}
        .fp-sico{width:68px;height:68px;background:rgba(43,157,78,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px}
        .fp-stitle{font-size:26px;font-weight:700;color:var(--dark-text);margin-bottom:8px}
        .fp-stxt{font-size:14px;color:var(--muted-text);margin-bottom:4px}
        .fp-step-indicator{display:flex;align-items:center;gap:6px;margin-bottom:28px}
        .fp-dot{width:8px;height:8px;border-radius:50%;background:rgba(43,157,78,0.2);transition:all 0.3s}
        .fp-dot.active{background:var(--primary-green);width:24px;border-radius:4px}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        .spin{animation:spin 0.8s linear infinite}
        @media(max-width:768px){.fp-box{flex-direction:column;border-radius:0;min-height:100vh}.fp-side{width:100%;border-radius:0;min-height:auto}.fp-main{padding:30px 20px}}
      `}</style>

      <div className="fp-container">
        <div className="fp-wrap">
          <div className="fp-box">

            {/* ── Sidebar ── */}
            <div className="fp-side">
              <div className="fp-logo">
                <div className="fp-logo-ico">
                  <Infinity size={20} color="#2b9d4e" strokeWidth={3} />
                </div>
                <span className="fp-logo-txt">Bi-Verify</span>
              </div>
              <div className="fp-side-foot">All rights reserved @Bi-Verify</div>
            </div>

            {/* ── Main Content ── */}
            <div className="fp-main">
              <div className="fp-form-wrap">

                {/* ════════ SUCCESS ════════ */}
                {success ? (
                  <div className="fp-success">
                    <div className="fp-sico">
                      <CheckCircle size={34} color="#2b9d4e" />
                    </div>
                    <h2 className="fp-stitle">Password Reset!</h2>
                    <p className="fp-stxt">Your password has been successfully changed.</p>
                    <p className="fp-stxt" style={{ color: '#2b9d4e', fontWeight: 500, marginBottom: 24 }}>
                      You can now log in with your new password.
                    </p>
                    <button className="fp-btn" style={{ width: '100%' }} onClick={() => navigate('/login')}>
                      Return to Login
                    </button>
                  </div>

                ) : step === 1 ? (
                  /* ════════ STEP 1: Enter Email ════════ */
                  <>
                    <div className="fp-step-indicator">
                      <div className="fp-dot active" />
                      <div className="fp-dot" />
                      <div className="fp-dot" />
                    </div>
                    <h1 className="fp-title">Forgot Password?</h1>
                    <p className="fp-sub">Enter your account email to receive a 6-digit OTP.</p>

                    {error && <div className="fp-err"><AlertCircle size={15} />{error}</div>}

                    <form onSubmit={handleRequestOtp}>
                      <div className="fp-group">
                        <label className="fp-label">Email Address</label>
                        <input
                          type="email"
                          className="fp-input"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setError(''); }}
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="fp-row">
                        <button type="submit" className="fp-btn" style={{ flex: 1 }} disabled={loading}>
                          {loading ? <><Loader2 size={16} className="spin" /> Sending…</> : <><Mail size={16} /> Send OTP</>}
                        </button>
                        <a href="/login" className="fp-link">Return to login</a>
                      </div>
                    </form>
                  </>

                ) : step === 2 ? (
                  /* ════════ STEP 2: Enter OTP ════════ */
                  <>
                    <div className="fp-step-indicator">
                      <div className="fp-dot" />
                      <div className="fp-dot active" />
                      <div className="fp-dot" />
                    </div>
                    <h1 className="fp-title">Enter OTP</h1>
                    <p className="fp-sub">We sent a 6-digit code to <strong>{email}</strong></p>

                    {infoMsg && <div className="fp-info"><CheckCircle size={15} />{infoMsg}</div>}
                    {error && <div className="fp-err"><AlertCircle size={15} />{error}</div>}

                    <form onSubmit={handleVerifyOtp}>
                      <div className="fp-group">
                        <label className="fp-label">6-Digit OTP</label>
                        <input
                          type="text"
                          className="fp-input fp-otp-input"
                          placeholder="● ● ● ● ● ●"
                          value={otp}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setOtp(val);
                            setError('');
                          }}
                          required
                          maxLength={6}
                          disabled={loading}
                          autoFocus
                        />
                      </div>
                      <div className="fp-row">
                        <button type="submit" className="fp-btn" style={{ flex: 1 }} disabled={loading || otp.length !== 6}>
                          {loading ? <><Loader2 size={16} className="spin" /> Verifying…</> : <><KeyRound size={16} /> Verify OTP</>}
                        </button>
                        <button type="button" className="fp-link" onClick={handleResendOtp} disabled={loading}>
                          Resend OTP
                        </button>
                      </div>
                      <div style={{ marginTop: 12, textAlign: 'center' }}>
                        <button type="button" className="fp-link" onClick={() => { setStep(1); setError(''); setInfoMsg(''); setOtp(''); }}>
                          ← Change email
                        </button>
                      </div>
                    </form>
                  </>

                ) : (
                  /* ════════ STEP 3: New Password ════════ */
                  <>
                    <div className="fp-step-indicator">
                      <div className="fp-dot" />
                      <div className="fp-dot" />
                      <div className="fp-dot active" />
                    </div>
                    <h1 className="fp-title">Set New Password</h1>
                    <p className="fp-sub">Choose a strong password for your account.</p>

                    {infoMsg && <div className="fp-info"><CheckCircle size={15} />{infoMsg}</div>}
                    {error && <div className="fp-err"><AlertCircle size={15} />{error}</div>}

                    <form onSubmit={handleResetPassword}>
                      <div className="fp-group">
                        <label className="fp-label">New Password</label>
                        <input
                          type="password"
                          className={`fp-input ${error && password.length < 8 ? 'err' : ''}`}
                          placeholder="Min. 8 characters"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError(''); }}
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="fp-group">
                        <label className="fp-label">Confirm Password</label>
                        <input
                          type="password"
                          className={`fp-input ${error && password !== confirmPassword ? 'err' : ''}`}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="fp-row">
                        <button type="submit" className="fp-btn" style={{ flex: 1 }} disabled={loading}>
                          {loading ? <><Loader2 size={16} className="spin" /> Resetting…</> : <><Lock size={16} /> Reset Password</>}
                        </button>
                      </div>
                    </form>
                  </>
                )}

              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
