import { createContext, useContext, useState} from 'react';
// We import the helper functions directly from our API file!
import { getStoredUser, isAuthenticated, logout } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());

  // This runs when you successfully verify the OTP in CitizenAuth
  const setCitizenUser = () => {
    // api.js already saved the token to localStorage, we just update the UI state
    setUser(getStoredUser());
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    logout(); // This clears 'lb_token' and 'lb_user'
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, setCitizenUser, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);