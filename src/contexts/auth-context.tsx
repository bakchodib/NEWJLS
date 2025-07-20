
'use client';

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

type Role = 'admin' | 'agent' | 'customer';

interface AppUser {
  uid: string;
  role: Role | null;
  name?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  logout: () => void;
  role: Role | null; // Keep for compatibility with existing components
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/', '/login'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const appUser: AppUser = {
            uid: firebaseUser.uid,
            role: userData.role as Role,
            name: userData.name,
          };
          setUser(appUser);
           // If user is logged in and on a public page, redirect to dashboard
          if (PUBLIC_PATHS.includes(pathname)) {
            router.replace('/dashboard');
          }
        } else {
          // User exists in Auth but not in Firestore users collection
          setUser(null);
          await signOut(auth); // Sign out user if they have no role document
          router.replace('/login');
        }
      } else {
        setUser(null);
        // If user is not logged in and not on a public page, redirect to login
        if (!PUBLIC_PATHS.includes(pathname)) {
           router.replace('/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname]);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const value = { user, loading, logout, role: user?.role || null };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
