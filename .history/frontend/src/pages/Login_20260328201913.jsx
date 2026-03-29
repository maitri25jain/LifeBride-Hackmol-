import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Building2, User } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState('hospital');
  const [formData, setFormData] = useState({ username: '', password: '', phone: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      if (role === 'hospital') {
        // Hits your teammate's /api/auth/login endpoint
        const res = await api.post('/auth/login', { 
          username: formData.username, 
          password: formData.password 
        });
        localStorage.setItem('token', res.data.access_token);
        navigate('/hospital');
      } else {
        // Citizen bypass for the demo
        navigate('/citizen');
      }
    } catch (error) {
    console.error(error);
      alert("Login failed. Check if your teammate's backend is running!");
    }
  };

  return (
    <div className="flex items-center justify-center mt-20 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">Sign in to LifeBridge</h1>
        
        {/* Role Toggle */}
        <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-lg">
          <button 
            type="button"
            onClick={() => setRole('hospital')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-semibold transition-all ${role === 'hospital' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
          >
            <Building2 size={18} /> Hospital
          </button>
          <button 
            type="button"
            onClick={() => setRole('citizen')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-semibold transition-all ${role === 'citizen' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}
          >
            <User size={18} /> Citizen
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {role === 'hospital' ? (
            <>
              <input type="text" placeholder="Hospital ID (e.g. h-aiims-delhi)" className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" onChange={e => setFormData({...formData, username: e.target.value})} required />
              <input type="password" placeholder="Password" className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" onChange={e => setFormData({...formData, password: e.target.value})} required />
            </>
          ) : (
            <input type="tel" placeholder="Phone Number (for OTP)" className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:ring-2 focus:ring-red-500 outline-none" onChange={e => setFormData({...formData, phone: e.target.value})} required />
          )}
          <button type="submit" className={`w-full text-white font-bold py-3 rounded-xl transition-all shadow-md ${role === 'hospital' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-red-600 hover:bg-red-700'}`}>
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}