import { Link } from 'react-router-dom';

const STATS = [
  { value: '25,000+', label: 'Organs Wasted Yearly', sub: 'Manual matching delays', color: 'var(--red-400)' },
  { value: '6-8 hrs', label: 'Current Match Time', sub: 'NOTTO phone-call process', color: 'var(--amber-400)' },
  { value: '<30 min', label: 'LifeBridge Target', sub: 'AI + Blockchain verified', color: 'var(--green-400)' },
];

const PILLARS = [
  { icon: '🔗', title: 'Immutable Consent', desc: 'Soulbound ERC-5192 NFTs on Polygon lock donor pledges to Aadhaar-verified identities. Un-tamperable. Court-admissible.', accent: 'var(--blue-400)' },
  { icon: '🧠', title: 'AI Matching Engine', desc: 'Multi-variable scoring — ABO/HLA compatibility, cold ischemia viability clock, equity monitoring. No human bias.', accent: 'var(--red-400)' },
  { icon: '📲', title: 'Emergency Broadcast', desc: 'One-tap blood alerts to compatible donors within 10km. First three confirmed responders get hospital navigation instantly.', accent: 'var(--green-400)' },
];

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden" style={{ background: 'var(--bg-deep)' }}>
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
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 65%)' }} />

        <div className="relative z-10 text-center max-w-4xl animate-fadeUp">
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

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/citizen/auth" className="btn-primary text-lg px-8 py-3.5 rounded-xl animate-pulse-glow">I Want to Save Lives</Link>
            <Link to="/hospital/login" className="btn-secondary text-lg px-8 py-3.5 rounded-xl">Hospital Command Centre</Link>
          </div>
        </div>

        <div className="relative z-10 mt-20 w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-5 stagger">
          {STATS.map((s, i) => (
            <div key={i} className="text-center p-6 rounded-xl animate-fadeUp" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
              <div className="text-3xl font-bold font-mono mb-1" style={{ color: s.color }}>{s.value}</div>
              <div className="text-sm font-semibold font-display mb-0.5">{s.label}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-center mb-4">Three Pillars. Zero Compromise.</h2>
          <p className="text-center mb-16 max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>Each pillar addresses a critical failure in India&apos;s current donation ecosystem.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PILLARS.map((p, i) => (
              <div key={i} className="card transition-all duration-300 hover:-translate-y-1" style={{ borderTop: `2px solid ${p.accent}` }}>
                {/* <div className="text-4xl mb-4">{p.icon}</div> */}
                <h3 className="text-xl font-bold font-display mb-3" style={{ color: p.accent }}>{p.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow */}
      <section className="py-24 px-6" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold font-display mb-16">The Flow</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {[
              { n: '01', t: 'Pledge', d: 'Register and choose what to donate. Consent minted on blockchain.' },
              { n: '02', t: 'Match', d: 'AI scores compatibility, distance, urgency in seconds.' },
              { n: '03', t: 'Verify', d: 'Blockchain confirms pledge is active. No tampering.' },
              { n: '04', t: 'Save', d: 'Organ or blood reaches the patient in time.' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-lg font-mono mb-3" style={{ color: 'var(--text-muted)' }}>{s.n}</div>
                <div className="text-3xl font-bold font-display mb-2" style={{ color: 'var(--red-400)' }}>{s.t}</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
          One Pledge Can Save <span style={{ color: 'var(--red-400)' }}>Eight Lives</span>
        </h2>
        <p className="max-w-lg mx-auto mb-8" style={{ color: 'var(--text-secondary)' }}>
          Your organs, your blood, your decision — secured on blockchain, matched by AI, delivered in time.
        </p>
        <Link to="/citizen/auth" className="btn-primary text-lg px-10 py-4 rounded-xl">Register as a Donor</Link>
      </section>

      <footer className="py-10 px-6 text-center" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>LifeBridge — Built to save lives. Demo build.</p>
      </footer>
    </div>
  );
}