import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { updateEmail, updatePassword, updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

/**
 * Update user profile data in Firestore
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Upload and update user profile picture
 */
export const uploadProfilePicture = async (userId, file) => {
  try {
    // Validate file
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('Please select a valid image file');
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('Image must be less than 5MB');
    }

    // Create a reference to the storage location
    const storageRef = ref(storage, `users/${userId}/profile.jpg`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Update the user's profile in Firestore
    await updateUserProfile(userId, {
      profilePictureUrl: downloadURL
    });

    return { success: true, url: downloadURL };
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update Firebase Auth profile (display name, etc.)
 */
export const updateAuthProfile = async (user, updates) => {
  try {
    await updateProfile(user, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating auth profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update user email in Firebase Auth
 */
export const updateUserEmail = async (user, newEmail) => {
  try {
    await updateEmail(user, newEmail);
    return { success: true };
  } catch (error) {
    console.error('Error updating email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update user password in Firebase Auth
 */
export const updateUserPassword = async (user, newPassword) => {
  try {
    await updatePassword(user, newPassword);
    return { success: true };
  } catch (error) {
    console.error('Error updating password:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user initials for display
 */
export const getUserInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Format user role for display
 */
export const formatUserRole = (role) => {
  switch (role) {
    case 'parent':
      return 'Host Parent';
    case 'aupair':
      return 'Au Pair';
    default:
      return 'Family Member';
  }
};

/**
 * Validate phone number format
 */
export const validatePhoneNumber = (phone) => {
  if (!phone) return true; // Optional field
  
  // Basic international phone number validation
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate user preferences object with defaults
 */
export const getDefaultUserPreferences = () => ({
  language: 'en',
  theme: 'system',
  notifications: true,
  defaultView: 'dashboard',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
});

/**
 * Update user preferences
 */
export const updateUserPreferences = async (userId, preferences) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      preferences: {
        ...preferences
      },
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating preferences:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user name by user ID (for existing code compatibility)
 */
export const getUserName = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.name || 'Unknown User';
    } else {
      return 'Unknown User';
    }
  } catch (error) {
    console.error('Error getting user name:', error);
    return 'Unknown User';
  }
};

/**
 * Safely parse Firestore timestamp or JavaScript date
 */
export const parseFirestoreDate = (timestamp) => {
  if (!timestamp) return null;
  
  try {
    // Handle Firestore Timestamp objects
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // Handle JavaScript Date objects
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // Handle timestamp strings/numbers
    return new Date(timestamp);
  } catch (error) {
    console.error('Error parsing timestamp:', error);
    return null;
  }
};

/**
 * Format a date for display
 */
export const formatDate = (timestamp, options = {}) => {
  const date = parseFirestoreDate(timestamp);
  if (!date) return 'Unknown';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};