import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { citizens } from '../../api';
import { useAuth } from '../../context/AuthContext';

const ORGANS = ['kidney', 'liver', 'heart', 'lungs', 'cornea', 'pancreas', 'intestine'];

export default function CitizenDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');

  // Pledge form
  const [pledgeForm, setPledgeForm] = useState({ organs: [], donate_blood: true, donate_plasma: false });
  const [pledging, setPledging] = useState(false);
  const [pledgeResult, setPledgeResult] = useState(null);
  const [pledgeError, setPledgeError] = useState('');

  // Alert responding
  const [respondingTo, setRespondingTo] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [me, alertsData] = await Promise.all([
        citizens.getMe(),
        citizens.getAlerts().catch(() => ({ alerts: [] })),
      ]);
      setProfile(me);
      setAlerts(alertsData.alerts || []);
    } catch (err) {
      if (err.status === 401) { logout(); navigate('/citizen/auth'); }
    }
    setLoading(false);
  }, [logout, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Pledge Submission ──
  async function handlePledge(e) {
    e.preventDefault();
    setPledgeError('');
    setPledging(true);
    try {
      const result = await citizens.submitPledge(pledgeForm);
      setPledgeResult(result);
      loadData(); // refresh profile
    } catch (err) {
      setPledgeError(err.message);
    }
    setPledging(false);
  }

  function toggleOrgan(organ) {
    setPledgeForm(prev => ({
      ...prev,
      organs: prev.organs.includes(organ)
        ? prev.organs.filter(o => o !== organ)
        : [...prev.organs, organ],
    }));
  }

  // ── Alert Response ──
  async function handleRespondAlert(alertId) {
    setRespondingTo(alertId);
    try {
      await citizens.respondToAlert(alertId);
      loadData();
    } catch (err) {
      alert(err.message);
    }
    setRespondingTo(null);
  }

  if (loading) return <ScreenLoader />;

  const hasPledge = !!profile?.pledge;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-deep)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-6 py-3" style={{ background: 'rgba(6,9,15,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🫀</span>
            <span className="text-lg font-bold font-display" style={{ color: 'var(--red-400)' }}>LifeBridge</span>
            <span className="badge badge-active">Citizen</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.name}</span>
            <span className="badge badge-info">{profile?.blood_type || user?.blood_type}</span>
            <button onClick={() => { logout(); navigate('/'); }} className="btn-ghost text-sm">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-raised)' }}>
          {[
            { id: 'home', label: '🏠 Home' },
            { id: 'pledge', label: '🔗 Pledge' },
            { id: 'alerts', label: '🩸 Blood Alerts' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold font-display transition-all cursor-pointer`}
              style={{
                background: activeTab === tab.id ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ════ HOME TAB ════ */}
        {activeTab === 'home' && (
          <div className="animate-fadeUp">
            <h2 className="text-2xl font-bold font-display mb-6">
              Welcome, <span style={{ color: 'var(--red-400)' }}>{profile?.full_name}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Card */}
              <div className="card">
                <h3 className="text-sm font-semibold font-display mb-4" style={{ color: 'var(--text-muted)' }}>YOUR IDENTITY</h3>
                <div className="space-y-3">
                  <InfoRow label="Name" value={profile?.full_name} />
                  <InfoRow label="Phone" value={profile?.phone} />
                  <InfoRow label="Blood Type" value={profile?.blood_type} accent />
                  <InfoRow label="Email" value={profile?.email || '—'} />
                  <InfoRow label="Date of Birth" value={profile?.date_of_birth || '—'} />
                </div>
              </div>

              {/* Pledge Status Card */}
              <div className="card" style={hasPledge ? { borderTop: '2px solid var(--green-500)' } : { borderTop: '2px solid var(--amber-500)' }}>
                <h3 className="text-sm font-semibold font-display mb-4" style={{ color: 'var(--text-muted)' }}>PLEDGE STATUS</h3>
                {hasPledge ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="badge badge-verified">🔗 Blockchain Verified</span>
                      <span className="badge badge-active">Active</span>
                    </div>
                    <InfoRow label="Organs" value={profile.pledge.organs?.join(', ') || 'None'} />
                    <InfoRow label="Blood" value={profile.pledge.donate_blood ? 'Yes' : 'No'} />
                    <InfoRow label="Plasma" value={profile.pledge.donate_plasma ? 'Yes' : 'No'} />
                    <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                      <div className="text-xs font-mono truncate" style={{ color: 'var(--blue-400)' }} title={profile.pledge.tx_hash}>
                        TX: {profile.pledge.tx_hash}
                      </div>
                      <div className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                        Token #{profile.pledge.token_id} · {profile.pledge.network}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-4xl mb-3">🔗</p>
                    <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>You haven't pledged yet.</p>
                    <button onClick={() => setActiveTab('pledge')} className="btn-primary text-sm">
                      Make Your Pledge
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════ PLEDGE TAB ════ */}
        {activeTab === 'pledge' && (
          <div className="max-w-xl animate-fadeUp">
            {hasPledge && !pledgeResult ? (
              <div className="card text-center py-10">
                <p className="text-4xl mb-4">✅</p>
                <h3 className="text-xl font-bold font-display mb-2">You've Already Pledged</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Your pledge is active and blockchain-verified.
                </p>
                <div className="mt-4 p-3 rounded-lg inline-block" style={{ background: 'var(--bg-base)' }}>
                  <span className="font-mono text-xs" style={{ color: 'var(--blue-400)' }}>
                    TX: {profile.pledge.tx_hash?.slice(0, 24)}...
                  </span>
                </div>
              </div>
            ) : pledgeResult ? (
              <div className="card animate-fadeUp" style={{ borderTop: '2px solid var(--green-500)' }}>
                <div className="text-center py-4">
                  <p className="text-5xl mb-4">🎉</p>
                  <h3 className="text-2xl font-bold font-display mb-2" style={{ color: 'var(--green-400)' }}>
                    Pledge Recorded on Blockchain!
                  </h3>
                  <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{pledgeResult.message}</p>
                  <div className="text-left card-surface max-w-sm mx-auto space-y-2">
                    <InfoRow label="Organs" value={pledgeResult.organs?.join(', ') || 'None'} />
                    <InfoRow label="Blood" value={pledgeResult.donate_blood ? 'Yes' : 'No'} />
                    <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="text-xs font-mono" style={{ color: 'var(--blue-400)' }}>TX: {pledgeResult.tx_hash}</div>
                      <div className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>Token #{pledgeResult.token_id} · {pledgeResult.network}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <h3 className="text-xl font-bold font-display mb-1">Make Your Pledge</h3>
                <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Select what you'd like to pledge. A soulbound NFT will be minted on the blockchain.
                </p>
                <form onSubmit={handlePledge} className="space-y-5">
                  <div>
                    <label className="label">Select Organs to Pledge</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {ORGANS.map(org => (
                        <button key={org} type="button" onClick={() => toggleOrgan(org)}
                          className="py-2.5 px-3 rounded-lg text-sm font-medium capitalize transition-all cursor-pointer"
                          style={{
                            background: pledgeForm.organs.includes(org) ? 'var(--red-600)' : 'var(--bg-base)',
                            color: pledgeForm.organs.includes(org) ? 'white' : 'var(--text-secondary)',
                            border: `1px solid ${pledgeForm.organs.includes(org) ? 'var(--red-500)' : 'var(--border)'}`,
                          }}>
                          {org}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={pledgeForm.donate_blood}
                        onChange={e => setPledgeForm(p => ({ ...p, donate_blood: e.target.checked }))}
                        className="w-4 h-4 accent-red-500" />
                      <span className="text-sm">Donate Blood</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={pledgeForm.donate_plasma}
                        onChange={e => setPledgeForm(p => ({ ...p, donate_plasma: e.target.checked }))}
                        className="w-4 h-4 accent-red-500" />
                      <span className="text-sm">Donate Plasma</span>
                    </label>
                  </div>
                  {pledgeError && <ErrorMsg text={pledgeError} />}
                  <button type="submit" className="btn-primary w-full !py-3" disabled={pledging || (!pledgeForm.organs.length && !pledgeForm.donate_blood && !pledgeForm.donate_plasma)}>
                    {pledging ? <Spinner /> : '🔗 Mint Pledge on Blockchain'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ════ ALERTS TAB ════ */}
        {activeTab === 'alerts' && (
          <div className="animate-fadeUp">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold font-display">Nearby Blood Alerts</h2>
              {alerts.filter(a => a.is_active).length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--red-500)' }} />
              )}
              <button onClick={loadData} className="btn-ghost text-xs ml-auto">↻ Refresh</button>
            </div>

            {alerts.length === 0 ? (
              <div className="card text-center py-10">
                <p className="text-3xl mb-3">📡</p>
                <p style={{ color: 'var(--text-secondary)' }}>No active alerts nearby.</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Make sure your location is set. Alerts appear when hospitals broadcast emergencies within your radius.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
                {alerts.map(alert => (
                  <div key={alert.id} className={`card animate-fadeUp ${alert.urgency === 'critical' ? 'ring-1' : ''}`}
                    style={alert.urgency === 'critical' ? { ringColor: 'var(--red-500)', borderColor: 'rgba(239,68,68,0.3)' } : {}}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold font-display">{alert.hospital_name}</h4>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {alert.distance_km} km away
                        </p>
                      </div>
                      <span className={`badge badge-${alert.urgency}`}>{alert.urgency}</span>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-2xl font-bold font-mono" style={{ color: 'var(--red-400)' }}>
                        {alert.blood_type}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {alert.units_needed} unit{alert.units_needed > 1 ? 's' : ''} needed
                      </div>
                    </div>
                    {alert.already_responded ? (
                      <div className="text-center py-2 rounded-lg text-sm font-semibold font-display"
                        style={{ background: 'var(--green-glow)', color: 'var(--green-400)' }}>
                        ✓ You responded — thank you!
                      </div>
                    ) : alert.is_active ? (
                      <button onClick={() => handleRespondAlert(alert.id)}
                        disabled={respondingTo === alert.id}
                        className="btn-primary w-full !py-2.5 text-sm">
                        {respondingTo === alert.id ? 'Responding...' : '🩸 I Can Donate'}
                      </button>
                    ) : (
                      <div className="text-center py-2 text-sm" style={{ color: 'var(--text-muted)' }}>Alert closed</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function InfoRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className={`font-medium ${accent ? 'font-mono text-base' : ''}`}
        style={accent ? { color: 'var(--red-400)' } : { color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  );
}
function ErrorMsg({ text }) {
  return <div className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--red-glow)', color: 'var(--red-400)', border: '1px solid rgba(239,68,68,0.2)' }}>{text}</div>;
}
function Spinner() {
  return <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />Processing...</span>;
}
function ScreenLoader() {
  return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-deep)' }}><div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--red-500)' }} /></div>;
}