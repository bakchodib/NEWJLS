
'use client';

import { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import type { Business } from '@/types';

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
  role: Role | null; 
  businesses: Business[];
  selectedBusiness: Business | null;
  setSelectedBusiness: (business: Business | null) => void;
  refreshBusinesses: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/', '/login'];

// Helper to manage selected business in localStorage
const getSelectedBusinessFromStorage = (): Business | null => {
    if (typeof window === 'undefined') return null;
    const item = window.localStorage.getItem('selectedBusiness');
    return item ? JSON.parse(item) : null;
};

const setSelectedBusinessInStorage = (business: Business | null) => {
    if (typeof window === 'undefined') return;
    if (business) {
        window.localStorage.setItem('selectedBusiness', JSON.stringify(business));
    } else {
        window.localStorage.removeItem('selectedBusiness');
    }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusinessState] = useState<Business | null>(getSelectedBusinessFromStorage());

  const router = useRouter();
  const pathname = usePathname();

  const setSelectedBusiness = (business: Business | null) => {
    setSelectedBusinessState(business);
    setSelectedBusinessInStorage(business);
  };

  const fetchBusinesses = useCallback(async (uid: string) => {
      try {
          const businessesQuery = query(collection(db, "businesses"), where("ownerId", "==", uid));
          const querySnapshot = await getDocs(businessesQuery);
          
          let fetchedBusinesses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));

          // If no businesses exist for this admin, create the first one
          if (fetchedBusinesses.length === 0) {
              const firstBusiness: Business = { 
                  id: 'biz_101', 
                  name: 'JLS FINACE LTD', 
                  ownerId: uid 
              };
              await setDoc(doc(db, 'businesses', firstBusiness.id), firstBusiness);
              fetchedBusinesses = [firstBusiness];
          }
          
          setBusinesses(fetchedBusinesses);
          
          // Set selected business if not already set or invalid
          const currentSelected = getSelectedBusinessFromStorage();
          if (!currentSelected || !fetchedBusinesses.some(b => b.id === currentSelected.id)) {
              setSelectedBusiness(fetchedBusinesses[0] || null);
          }

      } catch (error) {
          console.error("Error fetching businesses: ", error);
          setBusinesses([]);
      }
  }, []);
  
  const refreshBusinesses = useCallback(async () => {
    if (user?.uid) {
        await fetchBusinesses(user.uid);
    }
  }, [user?.uid, fetchBusinesses]);

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

          if (userData.role === 'admin') {
            await fetchBusinesses(firebaseUser.uid);
          }

          if (PUBLIC_PATHS.includes(pathname)) {
            router.replace('/dashboard');
          }
        } else {
          setUser(null);
          await signOut(auth);
          router.replace('/login');
        }
      } else {
        setUser(null);
        setSelectedBusiness(null);
        if (!PUBLIC_PATHS.includes(pathname)) {
           router.replace('/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname, fetchBusinesses]);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setSelectedBusiness(null);
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const value: AuthContextType = { 
      user, 
      loading, 
      logout, 
      role: user?.role || null,
      businesses,
      selectedBusiness,
      setSelectedBusiness,
      refreshBusinesses
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
