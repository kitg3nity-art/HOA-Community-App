import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onIdTokenChanged, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  profile: any | null;
  isSuperadminTester: boolean;
  setUserAndToken: (userProfile: any, authToken: string) => void;
  switchDemoRole: (targetRole: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  token: null, 
  profile: null,
  isSuperadminTester: false,
  setUserAndToken: () => {},
  switchDemoRole: async () => false,
  logout: async () => {},
  refreshToken: async () => null 
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cms_custom_token'));
  const [profile, setProfile] = useState<any | null>(() => {
    const saved = localStorage.getItem('cms_custom_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSuperadminTester, setIsSuperadminTester] = useState<boolean>(() => {
    const savedProfile = localStorage.getItem('cms_custom_user');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed?.role === 'SUPERADMIN') return true;
      } catch {}
    }
    return localStorage.getItem('cms_is_superadmin_tester') === 'true';
  });
  const [loading, setLoading] = useState(true);

  const setUserAndToken = (userProfile: any, authToken: string) => {
    setProfile(userProfile);
    setToken(authToken);
    if (userProfile?.role === 'SUPERADMIN') {
      setIsSuperadminTester(true);
      localStorage.setItem('cms_is_superadmin_tester', 'true');
    }
    try {
      localStorage.setItem('cms_custom_user', JSON.stringify(userProfile));
      localStorage.setItem('cms_custom_token', authToken);
    } catch {
      // Ignore storage errors
    }
  };

  const switchDemoRole = async (targetRole: string) => {
    try {
      const res = await fetch('/api/auth/demo-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user && data.token) {
          setIsSuperadminTester(true);
          localStorage.setItem('cms_is_superadmin_tester', 'true');
          setUserAndToken(data.user, data.token);
          return true;
        }
      }
    } catch (err) {
      console.error('Failed to switch demo role:', err);
    }
    return false;
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore signOut errors
    }
    setUser(null);
    setToken(null);
    setProfile(null);
    setIsSuperadminTester(false);
    localStorage.removeItem('cms_custom_user');
    localStorage.removeItem('cms_custom_token');
    localStorage.removeItem('cms_is_superadmin_tester');
  };

  const refreshToken = async () => {
    if (auth.currentUser) {
      try {
        const freshToken = await auth.currentUser.getIdToken(true);
        setToken(freshToken);
        localStorage.setItem('cms_custom_token', freshToken);
        return freshToken;
      } catch (err) {
        console.warn("Failed to refresh token", err);
      }
    }
    return token;
  };

  useEffect(() => {
    // Periodically refresh token every 30 minutes when user is active
    const refreshInterval = setInterval(() => {
      if (auth.currentUser) {
        auth.currentUser.getIdToken(true).then((freshToken) => {
          setToken(freshToken);
          localStorage.setItem('cms_custom_token', freshToken);
        }).catch((e) => {
          console.warn("Auto-token refresh notice:", e);
        });
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const freshToken = await currentUser.getIdToken();
          setToken(freshToken);
          
          // Sync user with backend
          const res = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${freshToken}`
            },
            body: JSON.stringify({
              email: currentUser.email,
              name: currentUser.displayName,
              picture: currentUser.photoURL
            })
          });
          if (res.ok) {
            const data = await res.json();
            setProfile(data.user);
            localStorage.setItem('cms_custom_user', JSON.stringify(data.user));
            localStorage.setItem('cms_custom_token', freshToken);
          }
        } catch(e) {
          console.error("Failed to sync profile", e);
        }
      } else {
        // Only clear if we were using Firebase Auth user
        if (auth.currentUser === null && !localStorage.getItem('cms_custom_token')) {
          setToken(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, token, profile, isSuperadminTester, setUserAndToken, switchDemoRole, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

