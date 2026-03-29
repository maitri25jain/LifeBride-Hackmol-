import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { citizenAuth } from '../../api';
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function CitizenAuth() {
  const navigate = useNavigate();
  const { setCitizenUser } = useAuth();
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const [regData, setRegData] = useState({
    full_name: '',
    phone: '',
    blood_type: 'B+',
    date_of_birth: '',
    aadhaar: '',
    email: '',
  });

  async function handleLoginSendOTP(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await citizenAuth.loginSendOTP(phone);
      setStep(2);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleLoginVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await citizenAuth.loginVerify(phone, otp);
      setCitizenUser(data);
      navigate('/citizen/dashboard');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleRegisterSendOTP(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await citizenAuth.registerSendOTP(regData);
      setPhone(regData.phone);
      setStep(2);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleRegisterVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await citizenAuth.registerVerify(regData.phone, otp);
      setCitizenUser(data);
      navigate('/citizen/dashboard');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  function updateReg(field, value) {
    setRegData((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: 'var(--bg-deep)' }}
    >
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm mb-6 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Back to home
        </Link>

        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            
            <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>
              {mode === 'login' ? 'Welcome Back' : 'Become a Donor'}
            </h1>
          </div>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            {mode === 'login'
              ? 'Sign in with your phone + OTP'
              : 'Register to pledge organs, blood, or plasma'}
          </p>

          {/* Mode toggle */}
          <div
            className="flex rounded-lg overflow-hidden mb-6"
            style={{ border: '1px solid var(--border)' }}
          >
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setStep(1);
                  setError('');
                }}
                className="flex-1 py-2.5 text-sm font-semibold font-display transition-all cursor-pointer"
                style={{
                  background: mode === m ? 'var(--red-600)' : 'transparent',
                  color: mode === m ? 'white' : 'var(--text-muted)',
                }}
              >
                {m === 'login' ? 'Login' : 'Register'}
              </button>
            ))}
          </div>

          {/* LOGIN STEP 1 */}
          {mode === 'login' && step === 1 && (
            <form onSubmit={handleLoginSendOTP} className="space-y-4 animate-fadeIn">
              <div>
                <label className="label">Phone Number</label>
                <input
                  className="input-field"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  required
                />
              </div>
              {error && <ErrorMsg text={error} />}
              <button
                type="submit"
                className="btn-primary w-full !py-3"
                disabled={loading || !phone}
              >
                {loading ? <Spinner /> : 'Send OTP'}
              </button>
            </form>
          )}

          {/* LOGIN STEP 2 */}
          {mode === 'login' && step === 2 && (
            <form onSubmit={handleLoginVerify} className="space-y-4 animate-fadeIn">
              <div
                className="p-3 rounded-lg text-xs"
                style={{
                  background: 'var(--green-glow)',
                  border: '1px solid rgba(16,185,129,0.2)',
                }}
              >
                <span style={{ color: 'var(--green-400)' }}>
                  OTP sent to {phone}.
                  {/* <span className="font-mono font-bold">123456</span> */}
                </span>
              </div>
              <div>
                <label className="label">Enter OTP</label>
                <input
                  className="input-field text-center text-lg tracking-[0.3em] font-mono"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
              {error && <ErrorMsg text={error} />}
              <button
                type="submit"
                className="btn-primary w-full !py-3"
                disabled={loading || otp.length < 6}
              >
                {loading ? <Spinner /> : 'Verify & Login'}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-ghost w-full text-sm"
              >
                ← Change phone
              </button>
            </form>
          )}

          {/* REGISTER STEP 1 */}
          {mode === 'register' && step === 1 && (
            <form onSubmit={handleRegisterSendOTP} className="space-y-3 animate-fadeIn">
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input-field"
                  value={regData.full_name}
                  onChange={(e) => updateReg('full_name', e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Phone</label>
                  <input
                    className="input-field"
                    type="tel"
                    value={regData.phone}
                    onChange={(e) => updateReg('phone', e.target.value)}
                    placeholder="9876543210"
                    required
                  />
                </div>
                <div>
                  <label className="label">Blood Type</label>
                  <select
                    className="select-field"
                    value={regData.blood_type}
                    onChange={(e) => updateReg('blood_type', e.target.value)}
                  >
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date of Birth</label>
                  <input
                    className="input-field"
                    type="date"
                    value={regData.date_of_birth}
                    onChange={(e) => updateReg('date_of_birth', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Email (optional)</label>
                  <input
                    className="input-field"
                    type="email"
                    value={regData.email}
                    onChange={(e) => updateReg('email', e.target.value)}
                    placeholder="you@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="label">Aadhaar Number</label>
                <input
                  className="input-field"
                  value={regData.aadhaar}
                  onChange={(e) => updateReg('aadhaar', e.target.value)}
                  placeholder="12-digit Aadhaar"
                  maxLength={12}
                  required
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  SHA-256 hashed before storing. Never stored in plain text.
                </p>
              </div>
              {error && <ErrorMsg text={error} />}
              <button
                type="submit"
                className="btn-primary w-full !py-3"
                disabled={
                  loading || !regData.full_name || !regData.phone || !regData.aadhaar
                }
              >
                {loading ? <Spinner /> : 'Register & Send OTP'}
              </button>
            </form>
          )}

          {/* REGISTER STEP 2 */}
          {mode === 'register' && step === 2 && (
            <form onSubmit={handleRegisterVerify} className="space-y-4 animate-fadeIn">
              <div
                className="p-3 rounded-lg text-xs"
                style={{
                  background: 'var(--green-glow)',
                  border: '1px solid rgba(16,185,129,0.2)',
                }}
              >
                <span style={{ color: 'var(--green-400)' }}>
                  Verify your phone to complete registration. 
                  {/* <span className="font-mono font-bold">123456</span> */}
                </span>
              </div>
              <div>
                <label className="label">Enter OTP</label>
                <input
                  className="input-field text-center text-lg tracking-[0.3em] font-mono"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  required
                />
              </div>
              {error && <ErrorMsg text={error} />}
              <button
                type="submit"
                className="btn-primary w-full !py-3"
                disabled={loading || otp.length < 6}
              >
                {loading ? <Spinner /> : '🔗 Verify & Create Account'}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-ghost w-full text-sm"
              >
                ← Back to form
              </button>
            </form>
          )}

          {/* Demo hint */}
          <div
            className="mt-5 p-3 rounded-lg text-xs"
            style={{
              background: 'var(--blue-glow)',
              border: '1px solid rgba(59,130,246,0.15)',
            }}
          >
            <span className="font-semibold font-display" style={{ color: 'var(--blue-400)' }}>
              Demo Credentials
            </span>
            <div className="mt-1" style={{ color: 'var(--text-secondary)' }}>
              Ravi: <span className="font-mono">9876543210</span> · Priya:{' '}
              <span className="font-mono">9876543211</span> · OTP always:{' '}
              <span className="font-mono">123456</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorMsg({ text }) {
  return (
    <div
      className="text-sm px-3 py-2 rounded-lg"
      style={{
        background: 'var(--red-glow)',
        color: 'var(--red-400)',
        border: '1px solid rgba(239,68,68,0.2)',
      }}
    >
      {text}
    </div>
  );
}

function Spinner() {
  return (
    <span className="flex items-center justify-center gap-2">
      <span
        className="w-4 h-4 border-2 rounded-full animate-spin"
        style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}
      />
      Processing...
    </span>
  );
}