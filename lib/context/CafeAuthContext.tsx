'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCafe, Cafe } from '@/lib/db';

interface CafeAuthContextType {
  user: any | null;
  cafe: Cafe | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const CafeAuthContext = createContext<CafeAuthContextType | undefined>(undefined);

export const CafeAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Try to load cafe data if available
        const cafeId = localStorage.getItem('current_cafe_id');
        if (cafeId) {
          const cafeData = await getCafe(cafeId);
          setCafe(cafeData);
        }
      } else {
        setUser(null);
        setCafe(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setCafe(null);
    localStorage.removeItem('current_cafe_id');
  };

  return (
    <CafeAuthContext.Provider value={{ user, cafe, loading, logout }}>
      {children}
    </CafeAuthContext.Provider>
  );
};

export const useCafeAuth = () => {
  const context = useContext(CafeAuthContext);
  if (!context) {
    throw new Error('useCafeAuth must be used within CafeAuthProvider');
  }
  return context;
};
