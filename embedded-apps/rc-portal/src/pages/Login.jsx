import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, User, ArrowLeft, RefreshCw, Lock, Sparkles, Database, CheckCircle2 } from 'lucide-react';
import { loginUser, verifyUser } from '../services/odataService';

import TransparentLogo from '../components/TransparentLogo';

export default function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: EmpID, 2: OTP
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const navigate = useNavigate();

  // Handle Resend OTP Countdown Timer
  useEffect(() => {
    let interval = null;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const cleanId = employeeId.trim();
    
    if (!/^\d{5,12}$/.test(cleanId)) {
      setErrorMsg('Please enter a valid numeric Employee ID (5 to 12 digits)');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    
    try {
      const res = await verifyUser(cleanId);
      if (res && res.success) {
        setStep(2);
        setTimer(30);
        setCanResend(false);
      } else {
        setErrorMsg(res?.error || 'Invalid Employee ID. Please verify your ID.');
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Invalid Employee ID';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = () => {
    if (!canResend) return;
    setTimer(30);
    setCanResend(false);
    setErrorMsg('A new OTP code has been sent to your registered mobile/email.');
    setTimeout(() => setErrorMsg(''), 4000);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length < 4) {
      setErrorMsg('Please enter the OTP code received.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await loginUser(employeeId.trim(), cleanOtp);
      if (res && res.success) {
        sessionStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('employeeId', res.login_id || res.loginId || res.LoginId || employeeId.trim());
        if (res.name || res.Name) localStorage.setItem('employeeName', res.name || res.Name);
        if (res.role || res.Role) localStorage.setItem('employeeRole', res.role || res.Role);
        localStorage.setItem('employeeTa', res.ta || res.Ta || '');
        localStorage.setItem('employeeTm', res.tm || res.Tm || '');
        localStorage.setItem('employeeLd', res.ld || res.Ld || '');
        localStorage.setItem('employeeOd', res.od || res.Od || '');
        navigate('/');
      } else {
        setErrorMsg(res?.error || 'Verification failed. Please check the OTP code.');
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Authentication error with SAP Gateway';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      
      {/* Ambient Luxury Background Lights */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#800A36]/30 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-rose-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative z-10 w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-12 backdrop-blur-xl">
        
        {/* Left Side: Brand Panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#800A36] via-[#600727] to-[#40041a] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-[#9E0D43]/30">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300" />
          
          <div>
            {/* Emami Brand Logo */}
            <div className="mb-8 relative inline-block">
              <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-cyan-500/20 rounded-full blur-xl opacity-75 pointer-events-none" />
              <TransparentLogo 
                src="/apps/rc-portal/emami-logo-new.jpg" 
                alt="Emami Group" 
                className="relative z-10 h-16 sm:h-20 w-auto object-contain contrast-125 brightness-115 saturate-135 filter drop-shadow-[0_4px_16px_rgba(255,255,255,0.25)] transition-transform hover:scale-[1.03]"
              />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Resource &amp; Consultant Portal
            </h2>
            <p className="text-xs font-semibold text-rose-100/90 mt-2.5 leading-relaxed">
              Unified Platform for Strategic Vendor Governance, Talent Acquisition &amp; Contract Management.
            </p>
          </div>



          <div className="mt-8 text-[11px] font-semibold text-rose-200/60">
            &copy; {new Date().getFullYear()} Emami Group • All rights reserved
          </div>
        </div>

        {/* Right Side: Login Form Panel */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center bg-slate-900 text-white">
          
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-800/60 text-xs font-bold text-rose-300 mb-3">
              <Lock className="h-3.5 w-3.5 text-rose-400" />
              <span>Secure Employee Authentication</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {step === 1 ? 'Sign In to Your Account' : 'Enter OTP Verification'}
            </h1>
            <p className="text-xs font-medium text-slate-400 mt-1">
              {step === 1 
                ? 'Enter your Employee ID to receive a one-time password' 
                : `OTP sent to contact registered with ID ${employeeId}`}
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/80 p-3.5 text-xs font-bold text-red-200 animate-fadeIn flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 1: Employee ID Entry */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="employeeId" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Employee ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    id="employeeId"
                    type="text"
                    maxLength={12}
                    required
                    value={employeeId}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setEmployeeId(val);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all text-white font-mono text-base font-black tracking-wider placeholder:font-sans placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal"
                    placeholder="e.g. 900007422"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || employeeId.length < 5}
                className="w-full flex items-center justify-center gap-2 bg-[#800A36] hover:bg-[#600727] text-white py-3.5 px-4 rounded-2xl font-black text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-white" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="otp" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Enter OTP Code <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <ShieldCheck className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    id="otp"
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all text-white font-mono text-lg font-black tracking-widest placeholder:text-slate-500 placeholder:font-normal placeholder:tracking-normal"
                    placeholder="Enter OTP (e.g. 1234)"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Didn't receive code?</span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="flex items-center gap-1 font-bold text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Resend OTP
                  </button>
                ) : (
                  <span className="font-bold text-slate-500">Resend in {timer}s</span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !otp}
                className="w-full flex items-center justify-center gap-2 bg-[#800A36] hover:bg-[#600727] text-white py-3.5 px-4 rounded-2xl font-black text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify &amp; Login</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-white" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp('');
                  setErrorMsg('');
                }}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white pt-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Change Employee ID ({employeeId})
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
