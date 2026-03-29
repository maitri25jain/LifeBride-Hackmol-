import { useState, useEffect } from 'react';
import { Activity, ShieldCheck, MapPin, Award, Heart } from 'lucide-react';
import api from '../api';

export default function CitizenDashboard() {
  const [citizen, setCitizen] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meRes, alertsRes] = await Promise.all([
          api.get('/citizens/me'),
          api.get('/citizens/alerts')
        ]);
        setCitizen(meRes.data);
        setAlerts(alertsRes.data.alerts || []);
      } catch (err) {
        console.error("Failed to load citizen data", err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleRespond = async (alertId) => {
    try {
      await api.post(`/citizens/alerts/${alertId}/respond`);
      alert("Thank you! The hospital coordinator has been notified.");
      // Remove from list or mark as responded
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, already_responded: true } : a));
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to respond.");
    }
  };

  if (loading) return <div className="text-center mt-20 font-bold text-slate-500">Loading your LifeLink profile...</div>;
  if (!citizen) return <div className="text-center mt-20 text-red-500">Error loading profile.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      
      <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {citizen.full_name.split(' ')[0]}</h1>
          <p className="opacity-90 mt-1">Blood Type: <span className="font-bold">{citizen.blood_type}</span></p>
        </div>
        <div className="text-center bg-white/20 rounded-xl p-4 backdrop-blur-sm border border-white/30">
          <div className="text-sm font-semibold uppercase tracking-wider">LifeLink Score</div>
          <div className="text-4xl font-black flex items-center justify-center gap-2">
            <Award size={32} className="text-yellow-300" /> 850
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Immutable Pledges */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
            <ShieldCheck className="text-green-500" size={28} />
            <h2 className="text-xl font-bold text-slate-800">My Pledges</h2>
          </div>
          
          {citizen.pledge ? (
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
               <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center gap-2">
                   <Heart size={18} className="text-rose-500" />
                   <span className="font-semibold text-slate-800">Organ & Blood Consent</span>
                 </div>
                 <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">Verified</span>
               </div>
               <p className="text-xs text-slate-500 break-all font-mono mt-2 bg-slate-200 p-2 rounded">
                 TX: {citizen.pledge.tx_hash}
               </p>
             </div>
          ) : (
            <div className="text-center py-6 text-slate-500">
              <p className="mb-4">You haven't pledged your organs yet.</p>
              <button className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold">Pledge Now on Web3</button>
            </div>
          )}
        </div>

        {/* Nearby Alerts */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -z-10"></div>
          <div className="flex items-center gap-3 mb-4 border-b border-red-50 pb-4">
            <Activity className="text-red-500" size={28} />
            <h2 className="text-xl font-bold text-slate-800">Nearby Emergencies</h2>
          </div>
          
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm font-medium">No active emergencies in your radius.</div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-red-50 border border-red-200 p-4 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">URGENT</span>
                    <span className="text-sm font-semibold text-slate-600 flex items-center gap-1">
                      <MapPin size={14} /> {alert.distance_km} km
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">{alert.blood_type} Blood Required</h3>
                  <p className="text-sm text-slate-700 mb-4">{alert.hospital_name} • {alert.units_needed} Units</p>
                  
                  <button 
                    onClick={() => handleRespond(alert.id)}
                    disabled={alert.already_responded}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white font-bold py-2 rounded-lg transition-all shadow-sm"
                  >
                    {alert.already_responded ? "Response Sent" : "Respond Now"}
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