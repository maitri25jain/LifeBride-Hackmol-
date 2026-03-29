import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import HospitalDashboard from './pages/HospitalDashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        {/* Global Navbar */}
        <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center border-b border-slate-200">
          <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
            <span className="text-3xl">❤️</span> LifeBridge
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/hospital/*" element={<HospitalDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;