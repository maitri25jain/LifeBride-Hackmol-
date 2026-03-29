import { useState, useEffect } from 'react';
import { BrainCircuit, Droplets, Activity, Users } from 'lucide-react';
import api from '../api';

export default function HospitalDashboard() {
  const [stats, setStats] = useState(null);
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertData, setAlertData] = useState({ blood_type: 'O-', units_needed: 3, radius_km: 10 });

  // Load Dashboard Stats on Mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        console.error("Failed to load stats", err);
      }
    };
    fetchStats();
  }, []);

  const handleRunMatch = async () => {
    setLoading(true);
    try {
      // Triggers the backend -> AI Engine pipeline
      const res = await api.post('/donors/match/organ');
      setMatches(res.data.results || []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "AI Match failed. Check connections.");
    }
    setLoading(false);
  };

  const handleBroadcast = async () => {
    try {
      await api.post('/alerts/', { ...alertData, urgency: "critical" });
      alert("Emergency Broadcast Sent to Radius!");
    } catch (err) {
      console.error(err);
      alert("Failed to broadcast alert.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Command Center</h1>
          <p className="text-slate-500 mt-1">Transplant & Blood Inventory Tracking</p>
        </div>
        {stats && (
          <div className="flex gap-4">
            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
              <Users size={18} className="text-blue-500"/>
              <span className="font-bold">{stats.recipients.active} Active Waitlist</span>
            </div>
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg font-semibold border border-red-100 flex items-center gap-2">
              <Droplets size={18} />
              {stats.blood_inventory.total_units} Units in Bank
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actions */}
        <div className="space-y-6">
          {/* AI Matching */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
              <BrainCircuit className="text-indigo-600" size={28} />
              <h2 className="text-xl font-bold text-slate-800">AI Organ Match</h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">Evaluate all available donors against active regional waitlists.</p>
            <button onClick={handleRunMatch} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 w-full rounded-xl transition-all shadow-md flex justify-center items-center gap-2">
              {loading ? "Processing Multi-Factor Match..." : "Run Global AI Match"}
            </button>
          </div>

          {/* Blood Broadcast */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <Droplets className="text-red-500" size={28} />
              <h2 className="text-xl font-bold text-slate-800">Blood Alert</h2>
            </div>
            <div className="space-y-3 mb-4">
              <select className="w-full border p-2 rounded-lg bg-slate-50" onChange={e => setAlertData({...alertData, blood_type: e.target.value})}>
                <option value="O-">O-</option><option value="B+">B+</option><option value="A+">A+</option>
              </select>
              <input type="number" placeholder="Units (e.g. 3)" className="w-full border p-2 rounded-lg bg-slate-50" onChange={e => setAlertData({...alertData, units_needed: parseInt(e.target.value)})} />
            </div>
            <button onClick={handleBroadcast} className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-bold py-3 rounded-xl border border-red-200">
              Broadcast Emergency
            </button>
          </div>
        </div>

        {/* AI Results */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <Activity className="text-green-500" size={28} />
            <h2 className="text-xl font-bold text-slate-800">AI Ranked Candidates</h2>
          </div>
          
          {!matches ? (
             <div className="text-center py-20 text-slate-400 font-medium">Awaiting Match Execution...</div>
          ) : matches.length === 0 ? (
             <div className="text-center py-20 text-slate-500 font-medium">No viable matches found.</div>
          ) : (
            <div className="space-y-4">
              {matches.map((batch, i) => (
                <div key={i} className="mb-6">
                  <h3 className="font-bold text-slate-700 mb-2 border-l-4 border-indigo-500 pl-2">
                    Donor: {batch.donor_name} ({batch.organ})
                  </h3>
                  {batch.matches.matches.map((match, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border border-slate-100 bg-slate-50 rounded-xl hover:shadow-md transition-shadow mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-sm">Rank #{idx + 1}</span>
                          <h4 className="font-bold text-lg">{match.recipient_id}</h4>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">Score: {(match.total_score * 100).toFixed(1)}% • Dist: {match.distance_km}km • Feasible: {match.is_feasible ? 'Yes' : 'No'}</p>
                      </div>
                      <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm">Allocate</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}