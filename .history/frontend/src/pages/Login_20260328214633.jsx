import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Building2, User, ArrowRight } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState('hospital');
  const [step, setStep] = useState(1); // For Citizen OTP flow
  const [formData, setFormData] = useState({ email: '', password: '', phone: '', otp: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (role === 'hospital') {
        // Hits backend: POST /api/auth/login
        const res = await api.post('/auth/login', { 
          email: formData.email, 
          password: formData.password 
        });
        localStorage.setItem('token', res.data.access_token);
        navigate('/hospital');
      } else {
        if (step === 1) {
          // Hits backend: POST /api/auth/login/send-otp
          await api.post('/auth/login/send-otp', { phone: formData.phone });
          setStep(2);
        } else {
          // Hits backend: POST /api/auth/login/verify
          const res = await api.post('/auth/login/verify', { 
            phone: formData.phone, 
            otp: formData.otp 
          });
          localStorage.setItem('token', res.data.access_token);
          navigate('/citizen');
        }
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || "Authentication failed. Check backend.");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center mt-20 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">Sign in to LifeBridge</h1>
        
        <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-lg">
          <button 
            type="button"
            onClick={() => { setRole('hospital'); setStep(1); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-semibold transition-all ${role === 'hospital' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
          >
            <Building2 size={18} /> Hospital
          </button>
          <button 
            type="button"
            onClick={() => { setRole('citizen'); setStep(1); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-semibold transition-all ${role === 'citizen' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}
          >
            <User size={18} /> Citizen
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {role === 'hospital' ? (
            <>
              <input type="email" placeholder="Email (e.g. admin@aiims.edu)" className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50" onChange={e => setFormData({...formData, email: e.target.value})} required />
              <input type="password" placeholder="Password (e.g. Admin@123)" className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50" onChange={e => setFormData({...formData, password: e.target.value})} required />
            </>
          ) : (
            <>
              <input type="tel" placeholder="Phone (e.g. 9876543210)" disabled={step === 2} className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 disabled:opacity-50" onChange={e => setFormData({...formData, phone: e.target.value})} required />
              {step === 2 && (
                <input type="text" placeholder="Enter OTP (123456)" className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50" onChange={e => setFormData({...formData, otp: e.target.value})} required autoFocus />
              )}
            </>
          )}
          <button type="submit" disabled={loading} className={`w-full text-white font-bold py-3 rounded-xl transition-all shadow-md flex justify-center items-center gap-2 ${role === 'hospital' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {loading ? 'Processing...' : step === 1 && role === 'citizen' ? 'Send OTP' : 'Secure Login'} <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}