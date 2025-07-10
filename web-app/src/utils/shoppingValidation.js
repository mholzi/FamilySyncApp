import { Timestamp } from 'firebase/firestore';

// Validate shopping list data structure
export const validateShoppingListData = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid shopping list data: must be an object');
  }

  // Check required fields
  const requiredFields = ['name', 'familyId', 'createdBy'];
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`Invalid shopping list data: ${field} is required`);
    }
  }

  // Validate items structure
  if (data.items && !isValidItemsStructure(data.items)) {
    throw new Error('Invalid items structure: items must be an object with string keys');
  }

  // Validate budget
  if (data.budget !== undefined && (typeof data.budget !== 'number' || data.budget < 0)) {
    throw new Error('Invalid budget: must be a non-negative number');
  }

  // Validate status
  const validStatuses = ['pending', 'active', 'completed', 'needs-approval', 'approved', 'paid-out'];
  if (data.status && !validStatuses.includes(data.status)) {
    throw new Error(`Invalid status: must be one of ${validStatuses.join(', ')}`);
  }

  return true;
};

// Validate items structure (must be object, not array)
const isValidItemsStructure = (items) => {
  if (!items || typeof items !== 'object') {
    return false;
  }

  // Check if it's an array (which is invalid)
  if (Array.isArray(items)) {
    return false;
  }

  // Validate each item
  for (const [key, item] of Object.entries(items)) {
    if (!isValidShoppingItem(item)) {
      return false;
    }
  }

  return true;
};

// Validate individual shopping item
const isValidShoppingItem = (item) => {
  if (!item || typeof item !== 'object') {
    return false;
  }

  // Check required fields
  const requiredFields = ['id', 'name', 'isPurchased', 'addedBy'];
  for (const field of requiredFields) {
    if (item[field] === undefined) {
      return false;
    }
  }

  // Validate types
  if (typeof item.name !== 'string' || item.name.trim() === '') {
    return false;
  }

  if (typeof item.isPurchased !== 'boolean') {
    return false;
  }

  if (typeof item.addedBy !== 'string' || item.addedBy.trim() === '') {
    return false;
  }

  return true;
};

// Validate shopping item input
export const validateShoppingItemInput = (item, userId) => {
  if (!item || typeof item !== 'object') {
    throw new Error('Invalid item: must be an object');
  }

  if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') {
    throw new Error('Invalid item: name is required and must be a non-empty string');
  }

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('Invalid userId: must be a non-empty string');
  }

  // Validate quantity if provided
  if (item.quantity !== undefined && (typeof item.quantity !== 'number' || item.quantity <= 0)) {
    throw new Error('Invalid quantity: must be a positive number');
  }

  return true;
};

// Validate family ID
export const validateFamilyId = (familyId) => {
  if (!familyId || typeof familyId !== 'string' || familyId.trim() === '') {
    throw new Error('Invalid familyId: must be a non-empty string');
  }
  return true;
};

// Validate user ID
export const validateUserId = (userId) => {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('Invalid userId: must be a non-empty string');
  }
  return true;
};

// Sanitize shopping list data for storage
export const sanitizeShoppingListData = (data) => {
  console.log('sanitizeShoppingListData - Input data:', data);
  const sanitized = { ...data };
  
  // Ensure items is always an object
  if (!sanitized.items || typeof sanitized.items !== 'object' || Array.isArray(sanitized.items)) {
    sanitized.items = {};
  }

  // Sanitize string fields
  if (sanitized.name) {
    sanitized.name = sanitized.name.trim();
  }

  // Ensure timestamps are valid
  if (!sanitized.createdAt || !(sanitized.createdAt instanceof Timestamp)) {
    sanitized.createdAt = Timestamp.now();
  }

  if (!sanitized.updatedAt || !(sanitized.updatedAt instanceof Timestamp)) {
    sanitized.updatedAt = Timestamp.now();
  }

  // Convert scheduledFor from Date to Timestamp if needed
  if (sanitized.scheduledFor) {
    // Check if it's already a Timestamp-like object (has seconds and nanoseconds)
    const isTimestamp = sanitized.scheduledFor.seconds !== undefined && 
                       sanitized.scheduledFor.nanoseconds !== undefined;
    
    if (!isTimestamp) {
      if (sanitized.scheduledFor instanceof Date) {
        sanitized.scheduledFor = Timestamp.fromDate(sanitized.scheduledFor);
      } else if (typeof sanitized.scheduledFor === 'string') {
        sanitized.scheduledFor = Timestamp.fromDate(new Date(sanitized.scheduledFor));
      }
    }
  }

  // Ensure boolean fields are set
  if (sanitized.isArchived === undefined) {
    sanitized.isArchived = false;
  }

  if (sanitized.needsReimbursement === undefined) {
    sanitized.needsReimbursement = false;
  }

  console.log('sanitizeShoppingListData - Output data:', sanitized);
  return sanitized;
};

// Sanitize shopping item data
export const sanitizeShoppingItemData = (item, userId) => {
  const sanitized = {
    id: item.id || Date.now().toString(),
    name: item.name.trim(),
    quantity: item.quantity || 1,
    unit: item.unit || '',
    notes: item.notes || '',
    isPurchased: false,
    addedBy: userId,
    purchasedBy: null,
    purchasedAt: null,
    familyItemId: item.familyItemId || null
  };

  return sanitized;
};

// Create error message for user display
export const createUserFriendlyError = (error) => {
  const errorMessage = error.message || 'An unknown error occurred';
  
  // Map technical errors to user-friendly messages
  const errorMappings = {
    'permission-denied': 'You don\'t have permission to access this shopping list',
    'not-found': 'The shopping list was not found',
    'already-exists': 'A shopping list with this name already exists',
    'network-error': 'Network error. Please check your connection and try again',
    'quota-exceeded': 'Storage quota exceeded. Please contact support',
    'unauthenticated': 'Please log in to continue'
  };

  // Check for Firebase error codes
  for (const [code, message] of Object.entries(errorMappings)) {
    if (errorMessage.includes(code)) {
      return message;
    }
  }

  // Check for validation errors
  if (errorMessage.includes('Invalid')) {
    return 'Please check your input and try again';
  }

  // Default fallback
  return 'Something went wrong. Please try again';
};