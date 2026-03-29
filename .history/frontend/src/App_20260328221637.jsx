import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider from './context/AuthContext';
import { useAuth } from './context/useAuth';
import Landing from './pages/Landing/Landing';
import CitizenAuth from './pages/CitizenAuth/CitizenAuth';
import CitizenDashboard from './pages/CitizenDashboard/CitizenDashboard';
import HospitalLogin from './pages/HospitalLogin/HospitalLogin';
import HospitalDashboard from './pages/HospitalDashboard/HospitalDashboard';

function ProtectedCitizen({ children }) {
  const { isCitizen, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return isCitizen ? children : <Navigate to="/citizen/auth" replace />;
}

function ProtectedHospital({ children }) {
  const { isHospital, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return isHospital ? children : <Navigate to="/hospital/login" replace />;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-deep)' }}>
      <div className="text-center">
        <div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: 'var(--border)', borderTopColor: 'var(--red-500)' }} />
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/citizen/auth" element={<CitizenAuth />} />
          <Route path="/citizen/dashboard" element={<ProtectedCitizen><CitizenDashboard /></ProtectedCitizen>} />
          <Route path="/hospital/login" element={<HospitalLogin />} />
          <Route path="/hospital/dashboard" element={<ProtectedHospital><HospitalDashboard /></ProtectedHospital>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}