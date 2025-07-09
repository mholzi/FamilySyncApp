import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

/**
 * Firebase Authentication patterns for FamilySync
 * 
 * PATTERN: Use these functions as templates for auth operations
 * - Proper error handling with user-friendly messages
 * - User profile creation after signup
 * - Real-time auth state monitoring
 * - Consistent data structure
 */

/**
 * Sign up a new user and create their profile
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User's email
 * @param {string} userData.password - User's password
 * @param {string} userData.firstName - User's first name
 * @param {string} userData.lastName - User's last name
 * @param {string} userData.role - User's role (Parent, AuPair)
 * @returns {Promise<Object>} User object with profile
 */
export const signUpUser = async (userData) => {
  try {
    const { email, password, firstName, lastName, role } = userData;
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user profile document
    const userProfile = {
      uid: user.uid,
      email: user.email,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      familyId: null, // Will be set when user joins/creates family
      profilePictureUrl: null,
      settings: {
        notifications: true,
        language: 'en',
        theme: 'light'
      }
    };
    
    // Save to Firestore
    await setDoc(doc(db, 'users', user.uid), userProfile);
    
    return {
      user: {
        ...user,
        profile: userProfile
      }
    };
  } catch (error) {
    console.error('Signup error:', error);
    
    // Transform Firebase errors to user-friendly messages
    let userMessage = 'An error occurred during signup. Please try again.';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        userMessage = 'This email is already registered. Please use a different email or try logging in.';
        break;
      case 'auth/weak-password':
        userMessage = 'Password is too weak. Please use at least 6 characters.';
        break;
      case 'auth/invalid-email':
        userMessage = 'Please enter a valid email address.';
        break;
      case 'auth/operation-not-allowed':
        userMessage = 'Email/password accounts are not enabled. Please contact support.';
        break;
      default:
        userMessage = error.message;
    }
    
    throw new Error(userMessage);
  }
};

/**
 * Sign in existing user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} User object with profile
 */
export const signInUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Fetch user profile
    const profileDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!profileDoc.exists()) {
      throw new Error('User profile not found. Please contact support.');
    }
    
    return {
      user: {
        ...user,
        profile: profileDoc.data()
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    
    let userMessage = 'An error occurred during login. Please try again.';
    
    switch (error.code) {
      case 'auth/user-not-found':
        userMessage = 'No account found with this email. Please check your email or sign up.';
        break;
      case 'auth/wrong-password':
        userMessage = 'Incorrect password. Please try again.';
        break;
      case 'auth/invalid-email':
        userMessage = 'Please enter a valid email address.';
        break;
      case 'auth/too-many-requests':
        userMessage = 'Too many failed attempts. Please try again later.';
        break;
      default:
        userMessage = error.message;
    }
    
    throw new Error(userMessage);
  }
};

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw new Error('Failed to log out. Please try again.');
  }
};

/**
 * Monitor authentication state changes
 * @param {Function} callback - Callback function to handle auth state changes
 * @returns {Function} Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        // Fetch user profile
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (profileDoc.exists()) {
          callback({
            user: {
              ...user,
              profile: profileDoc.data()
            }
          });
        } else {
          console.error('User profile not found');
          callback({ user: null });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        callback({ user: null });
      }
    } else {
      callback({ user: null });
    }
  });
};

/**
 * Get current user with profile
 * @returns {Promise<Object|null>} User object with profile or null
 */
export const getCurrentUser = async () => {
  const user = auth.currentUser;
  
  if (!user) {
    return null;
  }
  
  try {
    const profileDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (profileDoc.exists()) {
      return {
        user: {
          ...user,
          profile: profileDoc.data()
        }
      };
    } else {
      console.error('User profile not found');
      return null;
    }
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
};