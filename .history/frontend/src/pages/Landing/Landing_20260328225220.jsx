import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-deep)' }}>
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4" style={{ background: 'rgba(6,9,15,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🫀</span>
            <span className="text-xl font-bold font-display" style={{ color: 'var(--red-400)' }}>LifeBridge</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/citizen/auth" className="btn-ghost text-sm font-display">I&apos;m a Donor</Link>
            <Link to="/hospital/login" className="btn-secondary !py-2 !px-4 text-sm">Hospital Login</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl animate-fadeUp">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold font-display mb-8" style={{ background: 'var(--red-glow)', color: 'var(--red-400)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--red-500)' }} />
            Life-Critical Infrastructure for India
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 font-display">
            Every Second Counts.<br />
            <span style={{ color: 'var(--red-400)' }}>LifeBridge</span> Delivers.
          </h1>

          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            AI-matched organ transplants in under 30 minutes. Blockchain-verified consent that can&apos;t be forged. Emergency blood donor alerts within 10km.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/citizen/auth" className="btn-primary text-lg px-8 py-3.5 rounded-xl animate-pulse-glow">I Want to Save Lives</Link>
            <Link to="/hospital/login" className="btn-secondary text-lg px-8 py-3.5 rounded-xl">Hospital Command Centre</Link>
          </div>

          {/* Stats — compact inline */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold font-mono" style={{ color: 'var(--red-400)' }}>25K+</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Organs wasted/yr</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold font-mono" style={{ color: 'var(--amber-400)' }}>6-8h</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Current match time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold font-mono" style={{ color: 'var(--green-400)' }}>&lt;30m</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>LifeBridge target</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}