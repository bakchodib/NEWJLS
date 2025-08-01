
'use client';

import { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import type { Business, Customer } from '@/types';

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

const createDummyCustomers = async (businessId: string) => {
    const batch = writeBatch(db);
    const dummyCustomers: Omit<Customer, 'id'>[] = [
        {
            businessId,
            name: 'Rohit Sharma',
            phone: '9876543210',
            address: '123 Cricket Lane, Mumbai',
            customerPhoto: 'https://placehold.co/100x100.png',
            aadharNumber: '123456789012',
            aadharImage: 'https://placehold.co/400x250.png',
            panNumber: 'ABCDE1234F',
            panImage: 'https://placehold.co/400x250.png',
            guarantorName: 'Virat Kohli',
            guarantorPhone: '9876543211'
        },
        {
            businessId,
            name: 'Sunita Devi',
            phone: '9876543212',
            address: '456 Ganga Nagar, Jaipur',
            customerPhoto: 'https://placehold.co/100x100.png',
            aadharNumber: '234567890123',
            aadharImage: 'https://placehold.co/400x250.png',
            panNumber: 'FGHIJ5678K',
            panImage: 'https://placehold.co/400x250.png',
            guarantorName: 'Geeta Kumari',
            guarantorPhone: '9876543213'
        },
        {
            businessId,
            name: 'Amit Kumar',
            phone: '9876543214',
            address: '789 Yamuna Vihar, Delhi',
            customerPhoto: 'https://placehold.co/100x100.png',
            aadharNumber: '345678901234',
            aadharImage: 'https://placehold.co/400x250.png',
            panNumber: 'LMNOP9012L',
            panImage: 'https://placehold.co/400x250.png',
            guarantorName: 'Sumit Singh',
            guarantorPhone: '9876543215'
        },
        {
            businessId,
            name: 'Priya Patel',
            phone: '9876543216',
            address: '101 Sabarmati Road, Ahmedabad',
            customerPhoto: 'https://placehold.co/100x100.png',
            aadharNumber: '456789012345',
            aadharImage: 'https://placehold.co/400x250.png',
            panNumber: 'QRSTU3456M',
            panImage: 'https://placehold.co/400x250.png',
            guarantorName: 'Rina Patel',
            guarantorPhone: '9876543217'
        },
        {
            businessId,
            name: 'Sandeep Singh',
            phone: '9876543218',
            address: '212 Golden Temple Road, Amritsar',
            customerPhoto: 'https://placehold.co/100x100.png',
            aadharNumber: '567890123456',
            aadharImage: 'https://placehold.co/400x250.png',
            panNumber: 'VWXYZ7890N',
            panImage: 'https://placehold.co/400x250.png',
            guarantorName: 'Manpreet Kaur',
            guarantorPhone: '9876543219'
        }
    ];

    dummyCustomers.forEach(customerData => {
        const customerId = `cust_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`;
        const customerDocRef = doc(db, 'customers', customerId);
        batch.set(customerDocRef, { ...customerData, id: customerId });
    });

    await batch.commit();
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

          // If no businesses exist for this admin, create the first one with dummy data
          if (fetchedBusinesses.length === 0) {
              const firstBusiness: Business = { 
                  id: 'biz_101', 
                  name: 'JLS FINACE LTD', 
                  ownerId: uid 
              };
              await setDoc(doc(db, 'businesses', firstBusiness.id), firstBusiness);
              await createDummyCustomers(firstBusiness.id); // Create dummy customers
              fetchedBusinesses = [firstBusiness];
          }
          
          setBusinesses(fetchedBusinesses);
          
          // Set selected business if not already set or invalid
          const currentSelected = getSelectedBusinessFromStorage();
          if (!currentSelected || !fetchedBusinesses.some(b => b.id === currentSelected.id)) {
              setSelectedBusiness(fetchedBusinesses[0] || null);
          } else {
             // ensure selected business state is in sync with latest from db
             const updatedSelected = fetchedBusinesses.find(b => b.id === currentSelected.id);
             setSelectedBusiness(updatedSelected || fetchedBusinesses[0] || null);
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
