'use client';

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'admin' | 'agent' | 'customer';

interface AuthContextType {
  role: Role | null;
  setRole: (role: Role) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedRole = localStorage.getItem('userRole') as Role | null;
      if (storedRole) {
        setRoleState(storedRole);
      }
    } catch (error) {
      console.error('Failed to access local storage', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const setRole = (newRole: Role) => {
    try {
      localStorage.setItem('userRole', newRole);
    } catch (error) {
      console.error('Failed to access local storage', error);
    }
    setRoleState(newRole);
    router.push('/dashboard');
  };

  const logout = () => {
    try {
      localStorage.removeItem('userRole');
    } catch (error) {
      console.error('Failed to access local storage', error);
    }
    setRoleState(null);
    router.push('/');
  };

  const value = { role, setRole, logout, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
