/**
 * Validation utilities for FamilySync application
 */

/**
 * Validate child profile data
 * @param {Object} childData - Child profile data
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export const validateChildProfile = (childData) => {
  const errors = {};
  
  // Name validation
  if (!childData.name || !childData.name.trim()) {
    errors.name = 'Name is required';
  } else if (childData.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (childData.name.trim().length > 50) {
    errors.name = 'Name must be less than 50 characters';
  } else if (!/^[a-zA-Z\s\-']+$/.test(childData.name.trim())) {
    errors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes';
  }

  // Date of birth validation
  if (!childData.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required';
  } else {
    const birthDate = childData.dateOfBirth instanceof Date 
      ? childData.dateOfBirth 
      : new Date(childData.dateOfBirth);
    
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    
    if (isNaN(birthDate.getTime())) {
      errors.dateOfBirth = 'Invalid date of birth';
    } else if (birthDate > today) {
      errors.dateOfBirth = 'Date of birth cannot be in the future';
    } else if (birthDate < minDate) {
      errors.dateOfBirth = 'Child must be under 18 years old';
    }
  }

  // Allergies validation (optional, max 500 chars)
  if (childData.allergies && childData.allergies.trim().length > 500) {
    errors.allergies = 'Allergies description must be less than 500 characters';
  }

  // Medical info validation (optional, max 500 chars)
  if (childData.medicalInfo && childData.medicalInfo.trim().length > 500) {
    errors.medicalInfo = 'Medical information must be less than 500 characters';
  }

  // Emergency contact validation (optional)
  if (childData.emergencyContact && childData.emergencyContact.trim().length > 200) {
    errors.emergencyContact = 'Emergency contact must be less than 200 characters';
  }

  // Notes validation (optional, max 500 chars)
  if (childData.notes && childData.notes.trim().length > 500) {
    errors.notes = 'Notes must be less than 500 characters';
  }

  // Profile picture validation (if provided)
  if (childData.profilePictureFile) {
    const file = childData.profilePictureFile;
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
      errors.profilePicture = 'Only JPEG, PNG, and GIF images are allowed';
    } else if (file.size > maxSize) {
      errors.profilePicture = 'Image must be less than 5MB';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
export const validatePhoneNumber = (phone) => {
  if (!phone) return true; // Phone is optional
  
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-()]/g, '');
  
  // Basic international phone number validation
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(cleaned);
};

/**
 * Generate a random invitation code
 * @returns {string} - Random alphanumeric code
 */
export const generateInvitationCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Format as XXXX-XXXX for readability
  return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
};

/**
 * Validate invitation data
 * @param {Object} invitationData - Invitation data
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export const validateInvitation = (invitationData) => {
  const errors = {};

  // Email validation
  if (!invitationData.email || !invitationData.email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(invitationData.email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  // Role validation (if provided)
  if (invitationData.role && !['parent', 'au_pair'].includes(invitationData.role)) {
    errors.role = 'Invalid role selected';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Calculate age from date of birth
 * @param {Date|string} dateOfBirth - Date of birth
 * @returns {Object} { years: number, months: number, display: string }
 */
export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return { years: 0, months: 0, display: '0y' };
  
  const birthDate = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
  const today = new Date();
  
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  
  if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
    years--;
    months += 12;
  }
  
  if (today.getDate() < birthDate.getDate()) {
    months--;
  }
  
  // Format display string
  let display = '';
  if (years > 0) {
    display = `${years}y`;
    if (months > 0) {
      display += ` ${months}m`;
    }
  } else {
    display = `${months}m`;
  }
  
  return { years, months, display };
};