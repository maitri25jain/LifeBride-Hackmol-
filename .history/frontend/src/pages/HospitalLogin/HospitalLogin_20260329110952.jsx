import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { hospitalAuth } from "../../api";

export default function HospitalLogin() {
  const navigate = useNavigate();
  const { setCitizenUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await hospitalAuth.login(email, password);
      setCitizenUser();
      navigate('/hospital/dashboard');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--bg-deep)' }}
    >
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm mb-6"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Back to home
        </Link>

        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            {/* <span className="text-2xl">🏥</span> */}
            <h1 className="text-2xl font-bold font-display">Hospital Login</h1>
          </div>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Admin or Coordinator — sign in with email and password
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input-field"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coordinator@aiims.edu"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input-field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div
                className="text-sm px-3 py-2 rounded-lg"
                style={{
                  background: 'var(--red-glow)',
                  color: 'var(--red-400)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary w-full !py-3" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{
                      borderColor: 'rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                    }}
                  />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}