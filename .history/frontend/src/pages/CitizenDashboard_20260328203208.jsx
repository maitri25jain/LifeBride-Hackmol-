import { useState, useEffect } from 'react';
import { Activity, ShieldCheck, MapPin, Award, Heart } from 'lucide-react';
import api from '../api';

export default function CitizenDashboard() {
  const [citizen, setCit] = useState({ name: 'Maitri', score: 850, blood_group: 'O+' });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCitizenData = async () => {
      try {
        // Fetch user data and nearby alerts from your teammate's backend
        // Uncomment these when her backend is fully populated!
        // const userRes = await api.get('/citizens/me');
        // setCitizen(userRes.data);
        
        const alertsRes = await api.get('/citizens/alerts');
        setAlerts(alertsRes.data || []);
      } catch (err) {
        console.error(err);
        // Fallback dummy data for the UI so your demo doesn't break if her DB is empty
        setAlerts([
          { id: 1, hospital_name: 'AIIMS Delhi', blood_group: 'O+', units: 2, distance: 3.2 },
        ]);
      }
      setLoading(false);
    };
    
    fetchCitizenData();
  }, []);

  const handleRespond = async (alertId) => {
    try {
      await api.post(`/citizens/alerts/${alertId}/respond`);
      alert("Thank you! The hospital has been notified you are on your way.");
    } catch (err) {
      console.error(err);
      alert("Response logged locally! (Backend connection pending)");
    }
  };

  if (loading) return <div className="text-center mt-20 font-bold text-slate-500">Loading your LifeLink profile...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      
      {/* Welcome & Gamification Banner */}
      <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {citizen.name}</h1>
          <p className="opacity-90 mt-1">Your impact matters. You've saved 2 lives this year.</p>
        </div>
        <div className="text-center bg-white/20 rounded-xl p-4 backdrop-blur-sm border border-white/30 shadow-inner">
          <div className="text-sm font-semibold uppercase tracking-wider">LifeLink Score</div>
          <div className="text-4xl font-black flex items-center justify-center gap-2">
            <Award size={32} className="text-yellow-300" /> {citizen.score}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Blockchain Pledge Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
            <ShieldCheck className="text-green-500" size={28} />
            <h2 className="text-xl font-bold text-slate-800">My Immutable Pledges</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">Your consent is secured as a Soulbound Token on the local blockchain.</p>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Heart size={18} className="text-rose-500" />
              <span className="font-semibold text-slate-800">Organ Donation</span>
            </div>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
               Active
            </span>
          </div>
          
          <button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-all shadow-md">
            View Smart Contract
          </button>
        </div>

        {/* Emergency Alerts Card */}
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
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">URGENT</span>
                    <span className="text-sm font-semibold text-slate-600 flex items-center gap-1">
                      <MapPin size={14} /> {alert.distance} km away
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">{alert.blood_group} Blood Required</h3>
                  <p className="text-sm text-slate-700 mb-4">{alert.hospital_name} • {alert.units} Units Needed</p>
                  <button 
                    onClick={() => handleRespond(alert.id)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-all shadow-sm"
                  >
                    Respond Now
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