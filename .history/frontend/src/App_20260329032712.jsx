import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// 🚨 Notice we are importing BOTH from our new useAuth.jsx file now!
import { AuthProvider, useAuth } from './context/useAuth'; 
import Landing from './pages/Landing/Landing';
import CitizenAuth from './pages/CitizenAuth/CitizenAuth';
import CitizenDashboard from './pages/CitizenDashboard/CitizenDashboard';
import HospitalLogin from './pages/HospitalLogin/HospitalLogin';
import HospitalDashboard from './pages/HospitalDashboard/HospitalDashboard';

function ProtectedCitizen({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/citizen/auth" replace />;
}

function ProtectedHospital({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/hospital/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      {/* This provider is now correctly powering your entire app */}
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