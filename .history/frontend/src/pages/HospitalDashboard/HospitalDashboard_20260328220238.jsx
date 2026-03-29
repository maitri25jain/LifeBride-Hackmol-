import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboard, recipients, donors, alerts, accounts } from '../../api';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ORGANS = ['KIDNEY', 'LIVER', 'HEART', 'CORNEA', 'LUNGS', 'PANCREAS', 'INTESTINES'];
const URGENCY = ['CRITICAL', 'URGENT', 'STANDARD'];
const GENDERS = ['male', 'female', 'other'];
const VIABILITY = { HEART: '4h', LUNGS: '4h', LIVER: '12h', KIDNEY: '24h', PANCREAS: '12h', CORNEA: '72h', INTESTINES: '8h' };

export default function HospitalDashboard() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const data = await dashboard.getStats();
      setStats(data);
    } catch (err) {
      if (err.status === 401) { logout(); navigate('/hospital/login'); }
    }
    setLoading(false);
  }, [logout, navigate]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'recipients', label: '🏥 Recipients' },
    { id: 'donors', label: '🫀 Donors' },
    { id: 'matching', label: '🧠 AI Matching' },
    { id: 'alerts', label: '🩸 Blood Alerts' },
    ...(isAdmin ? [{ id: 'accounts', label: '👥 Accounts' }] : []),
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-deep)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-6 py-3" style={{ background: 'rgba(6,9,15,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🫀</span>
            <span className="text-lg font-bold font-display" style={{ color: 'var(--red-400)' }}>LifeBridge</span>
            <span className="badge badge-verified">Hospital</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.name}</span>
            <span className="badge badge-info">{user?.role}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{user?.hospital_name}</span>
            <button onClick={() => { logout(); navigate('/'); }} className="btn-ghost text-sm">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 stagger">
            <StatCard label="Active Recipients" value={stats.recipients?.active ?? 0} color="var(--red-400)" icon="🏥" />
            <StatCard label="Critical" value={stats.recipients?.critical ?? 0} color="var(--amber-400)" icon="⚡" />
            <StatCard label="Total Donors" value={stats.donors?.total ?? 0} color="var(--green-400)" icon="🫀" />
            <StatCard label="Blood Units" value={stats.blood_inventory?.total_units ?? 0} color="var(--blue-400)" icon="🩸" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--bg-raised)' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-lg text-sm font-semibold font-display transition-all cursor-pointer whitespace-nowrap"
              style={{
                background: activeTab === tab.id ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab stats={stats} />}
        {activeTab === 'recipients' && <RecipientsTab />}
        {activeTab === 'donors' && <DonorsTab />}
        {activeTab === 'matching' && <MatchingTab />}
        {activeTab === 'alerts' && <AlertsTab />}
        {activeTab === 'accounts' && isAdmin && <AccountsTab />}
      </main>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ════════════════════════════════════════════════════════════
function OverviewTab({ stats }) {
  return (
    <div className="animate-fadeUp">
      <h2 className="text-xl font-bold font-display mb-4">Command Centre</h2>
      <div className="card text-center py-10">
        <p className="text-3xl mb-3">🎯</p>
        <p className="text-lg font-semibold font-display mb-2">Welcome to LifeBridge Hospital Dashboard</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Use the tabs above to manage recipients, register donors, run AI matching, and broadcast blood alerts.
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// RECIPIENTS TAB — POST /api/recipients + GET /api/recipients
// ════════════════════════════════════════════════════════════
function RecipientsTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    full_name: '', age: 45, gender: 'male', blood_type: 'B+',
    organ_needed: 'KIDNEY', urgency_level: 'CRITICAL', contact_phone: '', notes: '',
    hla_typing: {}, waitlist_days: 30, weight: 60, pra_level: 0, previous_transplants: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setList(await recipients.list()); } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await recipients.create({ ...form, age: Number(form.age), waitlist_days: Number(form.waitlist_days), weight: Number(form.weight), pra_level: Number(form.pra_level), previous_transplants: Number(form.previous_transplants) });
      setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
    setSaving(false);
  }

  return (
    <div className="animate-fadeUp">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold font-display">Recipients (Patients)</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          {showForm ? 'Cancel' : '+ Add Recipient'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 animate-fadeUp">
          <h3 className="font-semibold font-display mb-4">Register New Patient</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="label">Full Name</label><input className="input-field" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required /></div>
            <div><label className="label">Age</label><input className="input-field" type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} /></div>
            <div><label className="label">Gender</label><select className="select-field" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>{GENDERS.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
            <div><label className="label">Blood Type</label><select className="select-field" value={form.blood_type} onChange={e => setForm(f => ({ ...f, blood_type: e.target.value }))}>{BLOOD_TYPES.map(b => <option key={b}>{b}</option>)}</select></div>
            <div><label className="label">Organ Needed</label><select className="select-field" value={form.organ_needed} onChange={e => setForm(f => ({ ...f, organ_needed: e.target.value }))}>{ORGANS.map(o => <option key={o}>{o}</option>)}</select></div>
            <div><label className="label">Urgency</label><select className="select-field" value={form.urgency_level} onChange={e => setForm(f => ({ ...f, urgency_level: e.target.value }))}>{URGENCY.map(u => <option key={u}>{u}</option>)}</select></div>
            <div><label className="label">Contact Phone</label><input className="input-field" value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} /></div>
            <div><label className="label">Waitlist Days</label><input className="input-field" type="number" value={form.waitlist_days} onChange={e => setForm(f => ({ ...f, waitlist_days: e.target.value }))} /></div>
            <div><label className="label">Weight (kg)</label><input className="input-field" type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} /></div>
          </div>
          <div className="mt-3"><label className="label">Notes</label><input className="input-field" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" /></div>
          {error && <div className="mt-3 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--red-glow)', color: 'var(--red-400)' }}>{error}</div>}
          <button type="submit" className="btn-primary mt-4" disabled={saving}>{saving ? 'Saving...' : 'Register Patient'}</button>
        </form>
      )}

      {loading ? <Loader /> : list.length === 0 ? (
        <div className="card text-center py-10"><p style={{ color: 'var(--text-muted)' }}>No recipients registered yet.</p></div>
      ) : (
        <div className="space-y-3 stagger">
          {list.map(r => (
            <div key={r.id} className="card !p-4 animate-fadeUp flex items-center justify-between">
              <div>
                <div className="font-semibold font-display">{r.full_name}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {r.blood_type} · {r.organ_needed} · Age {r.age} · Waitlist {r.waitlist_days || 0}d
                </div>
              </div>
              <span className={`badge badge-${r.urgency_level?.toLowerCase()}`}>{r.urgency_level}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// DONORS TAB — POST /api/donors + GET /api/donors
// ════════════════════════════════════════════════════════════
function DonorsTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    full_name: '', age: 35, gender: 'male', blood_type: 'B+', aadhaar_number: '',
    organs_available: ['KIDNEY'], donor_type: 'deceased', consent_text: 'I consent to organ donation.',
    notes: '', hla_typing: {}, harvest_time: '', donor_weight: 70, donor_cause_of_death: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setList(await donors.list()); } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function toggleOrgan(org) {
    setForm(f => ({
      ...f,
      organs_available: f.organs_available.includes(org)
        ? f.organs_available.filter(o => o !== org)
        : [...f.organs_available, org],
    }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        age: Number(form.age),
        donor_weight: Number(form.donor_weight) || null,
        harvest_time: form.harvest_time ? new Date(form.harvest_time).toISOString() : null,
      };
      await donors.create(payload);
      setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
    setSaving(false);
  }

  return (
    <div className="animate-fadeUp">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold font-display">Organ Donors</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">{showForm ? 'Cancel' : '+ Register Donor'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 animate-fadeUp">
          <h3 className="font-semibold font-display mb-4">Register New Donor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="label">Full Name</label><input className="input-field" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required /></div>
            <div><label className="label">Age</label><input className="input-field" type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} /></div>
            <div><label className="label">Gender</label><select className="select-field" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>{GENDERS.map(g => <option key={g}>{g}</option>)}</select></div>
            <div><label className="label">Blood Type</label><select className="select-field" value={form.blood_type} onChange={e => setForm(f => ({ ...f, blood_type: e.target.value }))}>{BLOOD_TYPES.map(b => <option key={b}>{b}</option>)}</select></div>
            <div><label className="label">Donor Type</label><select className="select-field" value={form.donor_type} onChange={e => setForm(f => ({ ...f, donor_type: e.target.value }))}><option value="deceased">Deceased</option><option value="living">Living</option></select></div>
            <div><label className="label">Weight (kg)</label><input className="input-field" type="number" value={form.donor_weight} onChange={e => setForm(f => ({ ...f, donor_weight: e.target.value }))} /></div>
            <div><label className="label">Aadhaar Number</label><input className="input-field" value={form.aadhaar_number} onChange={e => setForm(f => ({ ...f, aadhaar_number: e.target.value }))} placeholder="12 digits" required /></div>
            <div><label className="label">Harvest Time</label><input className="input-field" type="datetime-local" value={form.harvest_time} onChange={e => setForm(f => ({ ...f, harvest_time: e.target.value }))} /></div>
            <div><label className="label">Cause of Death</label><input className="input-field" value={form.donor_cause_of_death} onChange={e => setForm(f => ({ ...f, donor_cause_of_death: e.target.value }))} placeholder="Optional" /></div>
          </div>
          <div className="mt-3">
            <label className="label">Organs Available</label>
            <div className="flex flex-wrap gap-2">
              {ORGANS.map(org => (
                <button key={org} type="button" onClick={() => toggleOrgan(org)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                  style={{
                    background: form.organs_available.includes(org) ? 'var(--red-600)' : 'var(--bg-base)',
                    color: form.organs_available.includes(org) ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${form.organs_available.includes(org) ? 'var(--red-500)' : 'var(--border)'}`,
                  }}>{org}</button>
              ))}
            </div>
          </div>
          <div className="mt-3"><label className="label">Consent Text</label><input className="input-field" value={form.consent_text} onChange={e => setForm(f => ({ ...f, consent_text: e.target.value }))} required /></div>
          {error && <div className="mt-3 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--red-glow)', color: 'var(--red-400)' }}>{error}</div>}
          <button type="submit" className="btn-primary mt-4" disabled={saving}>{saving ? 'Saving...' : 'Register Donor'}</button>
        </form>
      )}

      {loading ? <Loader /> : list.length === 0 ? (
        <div className="card text-center py-10"><p style={{ color: 'var(--text-muted)' }}>No donors registered yet.</p></div>
      ) : (
        <div className="space-y-3 stagger">
          {list.map(d => (
            <div key={d.id} className="card !p-4 animate-fadeUp flex items-center justify-between">
              <div>
                <div className="font-semibold font-display">{d.full_name}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {d.blood_type} · {d.organs_available?.join(', ')} · {d.donor_type} · Age {d.age}
                </div>
              </div>
              <span className={`badge ${d.status === 'available' ? 'badge-active' : 'badge-info'}`}>{d.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MATCHING TAB — POST /api/donors/match/organ + /match/blood
// ════════════════════════════════════════════════════════════
function MatchingTab() {
  const [organResult, setOrganResult] = useState(null);
  const [bloodResult, setBloodResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingOrgan, setLoadingOrgan] = useState(false);
  const [loadingBlood, setLoadingBlood] = useState(false);
  const [error, setError] = useState('');

  async function runOrganMatch() {
    setError('');
    setLoadingOrgan(true);
    try {
      const result = await donors.matchOrgan();
      setOrganResult(result);
    } catch (err) { setError(err.message); }
    setLoadingOrgan(false);
  }

  async function runBloodMatch() {
    setError('');
    setLoadingBlood(true);
    try {
      const result = await donors.matchBlood();
      setBloodResult(result);
    } catch (err) { setError(err.message); }
    setLoadingBlood(false);
  }

  useEffect(() => {
    donors.matchHistory().then(d => setHistory(d.history || [])).catch(() => {});
  }, [organResult]);

  return (
    <div className="animate-fadeUp">
      <h2 className="text-xl font-bold font-display mb-6">AI Matching Engine</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Organ Match */}
        <div className="card" style={{ borderTop: '2px solid var(--red-400)' }}>
          <h3 className="font-semibold font-display mb-2">🧠 Organ Matching</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Matches ALL available donors with ALL active recipients across all hospitals. Scores ABO/HLA compatibility, cold ischemia viability, urgency, and waitlist priority.
          </p>
          <button onClick={runOrganMatch} className="btn-primary w-full" disabled={loadingOrgan}>
            {loadingOrgan ? <><span className="w-4 h-4 border-2 rounded-full animate-spin inline-block mr-2" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />Running AI Engine...</> : '🧠 Run Organ Match'}
          </button>
        </div>

        {/* Blood Match */}
        <div className="card" style={{ borderTop: '2px solid var(--green-400)' }}>
          <h3 className="font-semibold font-display mb-2">🩸 Blood Matching</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Finds eligible blood donors (citizens who pledged) for active blood alerts at your hospital. Filters by ABO compatibility, distance, and eligibility.
          </p>
          <button onClick={runBloodMatch} className="btn-emerald w-full" disabled={loadingBlood}>
            {loadingBlood ? 'Running...' : '🩸 Run Blood Match'}
          </button>
        </div>
      </div>

      {error && <div className="mb-6 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--red-glow)', color: 'var(--red-400)' }}>{error}</div>}

      {/* Organ Results */}
      {organResult && (
        <div className="mb-8 animate-fadeUp">
          <div className="card !p-4 mb-4" style={{ background: 'var(--green-glow)', borderColor: 'rgba(16,185,129,0.2)' }}>
            <span className="font-semibold font-display" style={{ color: 'var(--green-400)' }}>
              ✓ Organ match complete — {organResult.total_donors} donors matched against {organResult.total_recipients} recipients
            </span>
          </div>
          {organResult.results?.map((r, i) => (
            <div key={i} className="card mb-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-semibold font-display">{r.donor_name}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>· {r.organ}</span>
                </div>
              </div>
              <div className="space-y-2">
                {r.matches?.matches?.slice(0, 5).map((m, j) => (
                  <div key={j} className="card-surface !p-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Recipient {m.recipient_id?.slice(0, 8)}...</span>
                      <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                        {m.distance_km}km · {m.transport_time_mins}min transit · {Math.round(m.viability_remaining_mins)}min remaining
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${m.is_feasible ? 'badge-active' : 'badge-critical'}`}>
                        {m.is_feasible ? 'Feasible' : 'Too far'}
                      </span>
                      <span className="text-lg font-bold font-mono" style={{ color: m.total_score > 0.5 ? 'var(--green-400)' : 'var(--amber-400)' }}>
                        {(m.total_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Blood Results */}
      {bloodResult && (
        <div className="mb-8 animate-fadeUp">
          <div className="card !p-4 mb-4" style={{ background: 'var(--green-glow)', borderColor: 'rgba(16,185,129,0.2)' }}>
            <span className="font-semibold font-display" style={{ color: 'var(--green-400)' }}>
              ✓ Blood match complete — {bloodResult.blood_donors_checked} donors checked for {bloodResult.alerts_processed} alert(s)
            </span>
          </div>
          {bloodResult.results?.map((r, i) => (
            <div key={i} className="card mb-3">
              <div className="font-semibold font-display mb-2">{r.blood_type} Alert</div>
              {r.matches?.matches?.length > 0 ? (
                <div className="space-y-1">
                  {r.matches.matches.map((m, j) => (
                    <div key={j} className="card-surface !p-2 flex items-center justify-between text-sm">
                      <span>Donor {m.donor_id?.slice(0, 8)}...</span>
                      <span>{m.distance_km}km away</span>
                      <span className={`badge ${m.is_eligible ? 'badge-active' : 'badge-critical'}`}>
                        {m.is_eligible ? 'Eligible' : 'Cooldown'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No matching donors found.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Match History */}
      {history.length > 0 && (
        <div>
          <h3 className="font-semibold font-display mb-3">Match History</h3>
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="card !p-3 flex items-center justify-between text-sm">
                <span className="badge badge-info">{h.type}</span>
                <span>{h.donor_count} donors · {h.recipient_count} recipients</span>
                <span style={{ color: 'var(--text-muted)' }}>{h.run_at}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ALERTS TAB — POST /api/alerts + GET /api/alerts
// ════════════════════════════════════════════════════════════
function AlertsTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ blood_type: 'O-', urgency: 'critical', units_needed: 3, radius_km: 10 });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { const d = await alerts.list(); setList(d.alerts || []); } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const result = await alerts.create({ ...form, units_needed: Number(form.units_needed), radius_km: Number(form.radius_km) });
      setCreated(result);
      load();
    } catch (err) { setError(err.message); }
    setCreating(false);
  }

  async function handleClose(alertId) {
    try { await alerts.close(alertId); load(); } catch (err) { alert(err.message); }
  }

  return (
    <div className="animate-fadeUp">
      <h2 className="text-xl font-bold font-display mb-6">Blood Alert Broadcast</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold font-display mb-4">📲 Create Emergency Alert</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Blood Type</label><select className="select-field" value={form.blood_type} onChange={e => setForm(f => ({ ...f, blood_type: e.target.value }))}>{BLOOD_TYPES.map(b => <option key={b}>{b}</option>)}</select></div>
              <div><label className="label">Urgency</label><select className="select-field" value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}><option value="critical">Critical</option><option value="urgent">Urgent</option><option value="normal">Normal</option></select></div>
              <div><label className="label">Units Needed</label><input className="input-field" type="number" min={1} value={form.units_needed} onChange={e => setForm(f => ({ ...f, units_needed: e.target.value }))} /></div>
              <div><label className="label">Radius (km)</label><input className="input-field" type="number" value={form.radius_km} onChange={e => setForm(f => ({ ...f, radius_km: e.target.value }))} /></div>
            </div>
            {error && <div className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--red-glow)', color: 'var(--red-400)' }}>{error}</div>}
            <button type="submit" className="btn-primary w-full" disabled={creating}>
              {creating ? 'Broadcasting...' : '📲 Broadcast Alert'}
            </button>
          </form>
          {created && (
            <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--green-glow)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--green-400)' }}>✓ {created.message}</span>
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold font-display mb-3">Your Alerts</h3>
          {loading ? <Loader /> : list.length === 0 ? (
            <div className="card text-center py-6"><p style={{ color: 'var(--text-muted)' }}>No alerts yet.</p></div>
          ) : (
            <div className="space-y-3">
              {list.map(a => (
                <div key={a.id} className="card !p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xl font-bold font-mono" style={{ color: 'var(--red-400)' }}>{a.blood_type}</span>
                      <span className="text-sm ml-2" style={{ color: 'var(--text-muted)' }}>· {a.units_needed} units</span>
                    </div>
                    <span className={`badge badge-${a.urgency}`}>{a.urgency}</span>
                  </div>
                  <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Responders: <span className="font-bold">{a.responder_count}</span>
                  </div>
                  {a.responders?.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {a.responders.map((r, i) => (
                        <div key={i} className="text-xs p-1.5 rounded" style={{ background: 'var(--bg-base)' }}>
                          Citizen {typeof r === 'string' ? r.slice(0, 8) : r}...
                        </div>
                      ))}
                    </div>
                  )}
                  {a.is_active && (
                    <button onClick={() => handleClose(a.id)} className="btn-ghost text-xs" style={{ color: 'var(--amber-400)' }}>
                      Close Alert
                    </button>
                  )}
                  {!a.is_active && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Closed</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ACCOUNTS TAB — Admin only
// ════════════════════════════════════════════════════════════
function AccountsTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { const d = await accounts.listCoordinators(); setList(d.coordinators || []); } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try { await accounts.createCoordinator(form); setShowForm(false); load(); }
    catch (err) { setError(err.message); }
    setSaving(false);
  }

  async function toggleActive(id, currentActive) {
    try { await accounts.updateCoordinator(id, { is_active: !currentActive }); load(); }
    catch (err) { alert(err.message); }
  }

  return (
    <div className="animate-fadeUp">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold font-display">Coordinator Accounts</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">{showForm ? 'Cancel' : '+ Add Coordinator'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 animate-fadeUp">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="label">Full Name</label><input className="input-field" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required /></div>
            <div><label className="label">Email</label><input className="input-field" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
            <div><label className="label">Password</label><input className="input-field" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required /></div>
          </div>
          {error && <div className="mt-3 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--red-glow)', color: 'var(--red-400)' }}>{error}</div>}
          <button type="submit" className="btn-primary mt-4" disabled={saving}>{saving ? 'Creating...' : 'Create Coordinator'}</button>
        </form>
      )}

      {loading ? <Loader /> : list.length === 0 ? (
        <div className="card text-center py-10"><p style={{ color: 'var(--text-muted)' }}>No coordinators yet.</p></div>
      ) : (
        <div className="space-y-3">
          {list.map(c => (
            <div key={c.id} className="card !p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold font-display">{c.full_name}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.email}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${c.is_active ? 'badge-active' : 'badge-critical'}`}>{c.is_active ? 'Active' : 'Deactivated'}</span>
                <button onClick={() => toggleActive(c.id, c.is_active)} className="btn-ghost text-xs">
                  {c.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared Components ──
function StatCard({ label, value, color, icon }) {
  return (
    <div className="card animate-fadeUp !p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider font-display" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-3xl font-bold font-mono" style={{ color }}>{value}</div>
    </div>
  );
}

function Loader() {
  return <div className="flex justify-center py-10"><div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--red-500)' }} /></div>;
}