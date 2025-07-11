import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';

function useSuperAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const checkSuperAdminAuth = useCallback(async () => {
    const superAdminEmail = process.env.REACT_APP_SUPER_ADMIN_EMAIL || 'mholzi@gmail.com';
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email === superAdminEmail) {
        // User is authenticated and has super admin email
        setUser(currentUser);
        setIsAuthenticated(true);
        
        // In a production app, you'd also check custom claims here
        // const tokenResult = await currentUser.getIdTokenResult();
        // if (tokenResult.claims.superAdmin === true) { ... }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setIsAuthenticated(false);
      setUser(null);
      // Redirect to main app
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = checkSuperAdminAuth();
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [checkSuperAdminAuth]);

  return {
    isAuthenticated,
    loading,
    user,
    checkSuperAdminAuth,
    logout
  };
}

export default useSuperAdminAuth;