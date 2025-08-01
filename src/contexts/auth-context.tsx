
'use client';

import { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, setDoc, writeBatch, or, updateDoc } from 'firebase/firestore';
import type { Business, Customer } from '@/types';

type Role = 'admin' | 'agent' | 'customer';

interface AppUser {
  uid: string;
  role: Role | null;
  name?: string;
  accessibleBusinessIds?: string[];
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
  allBusinesses: Business[];
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
            panNumber: 'ABCDE1234F',
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
            panNumber: 'FGHIJ5678K',
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
            panNumber: 'LMNOP9012L',
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
            panNumber: 'QRSTU3456M',
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
            panNumber: 'VWXYZ7890N',
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
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]); // For admins to manage user access
  const [selectedBusiness, setSelectedBusinessState] = useState<Business | null>(getSelectedBusinessFromStorage());

  const router = useRouter();
  const pathname = usePathname();

  const setSelectedBusiness = (business: Business | null) => {
    setSelectedBusinessState(business);
    setSelectedBusinessInStorage(business);
  };

  const fetchBusinesses = useCallback(async (appUser: AppUser) => {
      try {
          let businessesQuery;
          // Admins who own businesses can see all of them to manage access
          // Other users can only see businesses they are explicitly given access to.
          if (appUser.role === 'admin') {
            const allBusinessesSnapshot = await getDocs(collection(db, "businesses"));
            const allFetched = allBusinessesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
            setAllBusinesses(allFetched);

            const ownedBusinessesQuery = query(collection(db, "businesses"), where("ownerId", "==", appUser.uid));
            const accessibleBusinessesQuery = appUser.accessibleBusinessIds && appUser.accessibleBusinessIds.length > 0
                ? query(collection(db, "businesses"), where("id", "in", appUser.accessibleBusinessIds))
                : null;
            
            const [ownedSnapshot, accessibleSnapshot] = await Promise.all([
                getDocs(ownedBusinessesQuery),
                accessibleBusinessesQuery ? getDocs(accessibleBusinessesQuery) : Promise.resolve({ docs: [] })
            ]);

            const combinedBusinesses = new Map<string, Business>();
            ownedSnapshot.docs.forEach(doc => combinedBusinesses.set(doc.id, { id: doc.id, ...doc.data()} as Business));
            accessibleSnapshot.docs.forEach(doc => combinedBusinesses.set(doc.id, { id: doc.id, ...doc.data()} as Business));
            
            businessesQuery = Array.from(combinedBusinesses.values());

          } else if (appUser.accessibleBusinessIds && appUser.accessibleBusinessIds.length > 0) {
            const accessibleBusinessesQuery = query(collection(db, "businesses"), where("id", "in", appUser.accessibleBusinessIds));
            const snapshot = await getDocs(accessibleBusinessesQuery);
            businessesQuery = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
          } else {
             businessesQuery = [];
          }
          
          let fetchedBusinesses = businessesQuery;

          // If an admin has no businesses, create a default one
          if (appUser.role === 'admin' && fetchedBusinesses.length === 0) {
              const firstBusiness: Business = { 
                  id: 'biz_101', 
                  name: 'JLS FINACE LTD', 
                  ownerId: appUser.uid 
              };
              await setDoc(doc(db, 'businesses', firstBusiness.id), firstBusiness);
              await createDummyCustomers(firstBusiness.id);
              fetchedBusinesses = [firstBusiness];
              // Give the admin access to their newly created business
              const userDocRef = doc(db, 'users', appUser.uid);
              await updateDoc(userDocRef, { accessibleBusinessIds: [firstBusiness.id] });
          }
          
          setBusinesses(fetchedBusinesses);
          
          const currentSelected = getSelectedBusinessFromStorage();
          if (!currentSelected || !fetchedBusinesses.some(b => b.id === currentSelected.id)) {
              setSelectedBusiness(fetchedBusinesses[0] || null);
          } else {
             const updatedSelected = fetchedBusinesses.find(b => b.id === currentSelected.id);
             setSelectedBusiness(updatedSelected || fetchedBusinesses[0] || null);
          }

      } catch (error) {
          console.error("Error fetching businesses: ", error);
          setBusinesses([]);
      }
  }, []);
  
  const refreshBusinesses = useCallback(async () => {
    if (user) {
        await fetchBusinesses(user);
    }
  }, [user, fetchBusinesses]);

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
            accessibleBusinessIds: userData.accessibleBusinessIds || [],
          };
          setUser(appUser);
          await fetchBusinesses(appUser);

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
      refreshBusinesses,
      allBusinesses
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
