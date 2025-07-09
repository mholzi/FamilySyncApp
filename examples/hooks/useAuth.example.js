import { useState, useEffect, useContext, createContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

/**
 * Authentication hook pattern for FamilySync
 * 
 * PATTERN: Use this structure for authentication state management
 * - Context provider for global auth state
 * - Real-time auth state monitoring
 * - User profile integration
 * - Proper loading and error states
 * - Cleanup on unmount
 */

// Create auth context
const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  signIn: () => {},
  signUp: () => {},
  signOut: () => {},
  updateProfile: () => {}
});

/**
 * AuthProvider component - wrap your app with this
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const profileData = userDoc.data();
            setUser({
              ...firebaseUser,
              profile: profileData
            });
          } else {
            console.error('User profile not found in Firestore');
            setUser(firebaseUser);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError(error.message);
        setUser(firebaseUser); // Set user even if profile fetch fails
      } finally {
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const { signInUser } = await import('../firebase/auth');
      const result = await signInUser(email, password);
      
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const { signUpUser } = await import('../firebase/auth');
      const result = await signUpUser(userData);
      
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { signOutUser } = await import('../firebase/auth');
      await signOutUser();
      
      // Clear local state
      setUser(null);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }
      
      setLoading(true);
      setError(null);
      
      const { updateDoc, serverTimestamp } = await import('firebase/firestore');
      const userDocRef = doc(db, 'users', user.uid);
      
      await updateDoc(userDocRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setUser(prevUser => ({
        ...prevUser,
        profile: {
          ...prevUser.profile,
          ...updates
        }
      }));
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use authentication context
 * @returns {Object} Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

/**
 * Custom hook for protected routes
 * @param {string} redirectTo - Path to redirect if not authenticated
 * @returns {Object} Auth state with redirect logic
 */
export const useRequireAuth = (redirectTo = '/login') => {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login if not authenticated
      window.location.href = redirectTo;
    }
  }, [user, loading, redirectTo]);
  
  return { user, loading };
};

/**
 * Custom hook for role-based access control
 * @param {string|Array} allowedRoles - Allowed roles for access
 * @returns {Object} Auth state with role checking
 */
export const useRoleAccess = (allowedRoles) => {
  const { user, loading } = useAuth();
  
  const hasAccess = user && user.profile && (
    Array.isArray(allowedRoles) 
      ? allowedRoles.includes(user.profile.role)
      : user.profile.role === allowedRoles
  );
  
  return {
    user,
    loading,
    hasAccess,
    role: user?.profile?.role
  };
};

/**
 * Custom hook for family-specific authentication
 * @returns {Object} Auth state with family information
 */
export const useFamilyAuth = () => {
  const { user, loading, error } = useAuth();
  
  const hasFamilyAccess = user && user.profile && user.profile.familyId;
  
  return {
    user,
    loading,
    error,
    hasFamilyAccess,
    familyId: user?.profile?.familyId
  };
};