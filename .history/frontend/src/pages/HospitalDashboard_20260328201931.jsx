import { useState } from 'react';
import { BrainCircuit, Droplets, Activity } from 'lucide-react';
import api from '../api';

export default function HospitalDashboard() {
  const [donorId, setDonorId] = useState('');
  const [organType, setOrganType] = useState('HEART');
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRunMatch = async () => {
    setLoading(true);
    try {
      // This hits the teammate's backend, which then calls YOUR AI Engine
      const res = await api.post('/donors/match/organ', { 
        donor_id: donorId,
        organ_type: organType
      });
      setMatches(res.data.matches || []);
    } catch (err) {
        console.error(err);
      alert("Match failed. Ensure backend and AI engine are running.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Hospital Command Center</h1>
        <p className="text-slate-500 mt-1">Transplant Coordination & Blood Inventory</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Actions */}
        <div className="space-y-6">
          {/* AI Matching Trigger */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <BrainCircuit className="text-indigo-600" size={28} />
              <h2 className="text-xl font-bold text-slate-800">AI Organ Match</h2>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Donor ID</label>
                <input type="text" placeholder="e.g. donor-001" className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50" value={donorId} onChange={(e) => setDonorId(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Organ Available</label>
                <select className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50" value={organType} onChange={(e) => setOrganType(e.target.value)}>
                  <option value="HEART">HEART</option>
                  <option value="KIDNEYS">KIDNEYS</option>
                  <option value="LIVER">LIVER</option>
                </select>
              </div>
            </div>
            
            <button 
              onClick={handleRunMatch}
              disabled={loading || !donorId}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md w-full flex justify-center items-center gap-2"
            >
              {loading ? "Running AI..." : "Run AI Match"}
            </button>
          </div>

          {/* Blood Broadcast */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <Droplets className="text-red-500" size={28} />
              <h2 className="text-xl font-bold text-slate-800">Blood Alert Broadcast</h2>
            </div>
            <button className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-bold py-3 rounded-xl transition-all border border-red-200">
              Broadcast Emergency to Radius
            </button>
          </div>
        </div>

        {/* Right Column: AI Results */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <Activity className="text-green-500" size={28} />
            <h2 className="text-xl font-bold text-slate-800">AI Ranked Candidates</h2>
          </div>
          
          {!matches ? (
            <div className="text-center py-20 text-slate-400 font-medium">
              Awaiting Donor Input...
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-20 text-slate-500 font-medium">
              No compatible matches found in radius.
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border border-slate-100 bg-slate-50 rounded-xl hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-sm">Rank #{idx + 1}</span>
                      <h3 className="font-bold text-lg">{match.recipient_id}</h3>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">Score: {(match.total_score * 100).toFixed(1)}% • Distance: {match.distance_km}km</p>
                  </div>
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm">
                    Allocate
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}