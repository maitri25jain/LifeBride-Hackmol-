import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  hospitalAuth,
  getStoredUser,
  isAuthenticated as checkAuth,
} from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verify() {
      if (!checkAuth()) {
        setLoading(false);
        return;
      }

      const stored = getStoredUser();

      // Citizen tokens — trust localStorage, validate on API calls
      if (stored?.role === 'citizen') {
        setUser(stored);
        setLoading(false);
        return;
      }

      // Hospital user — verify with GET /auth/me
      try {
        const me = await hospitalAuth.getMe();
        const userData = {
          id: me.id,
          email: me.email,
          name: me.full_name,
          role: me.role,
          hospital_id: me.hospital_id,
          hospital_name: me.hospital_name,
        };
        localStorage.setItem('lb_user', JSON.stringify(userData));
        setUser(userData);
      } catch {
        localStorage.removeItem('lb_token');
        localStorage.removeItem('lb_user');
        setUser(null);
      }
      setLoading(false);
    }
    verify();
  }, []);

  const loginHospital = useCallback(async (email, password) => {
    await hospitalAuth.login(email, password);
    const me = await hospitalAuth.getMe();
    const userData = {
      id: me.id,
      email: me.email,
      name: me.full_name,
      role: me.role,
      hospital_id: me.hospital_id,
      hospital_name: me.hospital_name,
    };
    localStorage.setItem('lb_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const setCitizenUser = useCallback((data) => {
    const userData = {
      id: data.citizen_id,
      name: data.full_name,
      phone: data.phone,
      blood_type: data.blood_type,
      role: 'citizen',
      has_pledge: data.has_pledge,
    };
    localStorage.setItem('lb_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lb_token');
    localStorage.removeItem('lb_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginHospital,
        setCitizenUser,
        logout,
        isAuthenticated: !!user,
        isHospital:
          user?.role === 'hospital_admin' || user?.role === 'coordinator',
        isCitizen: user?.role === 'citizen',
        isAdmin: user?.role === 'hospital_admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}