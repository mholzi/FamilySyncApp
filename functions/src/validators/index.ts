// Validation utilities for FamilySync data

// Common validation patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
const NAME_REGEX = /^[a-zA-Z\s\-']{1,50}$/;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// User profile validation
export function validateUserProfile(data: any): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required');
  } else if (!NAME_REGEX.test(data.name.trim())) {
    errors.push('Name contains invalid characters');
  }

  if (!data.email || !EMAIL_REGEX.test(data.email)) {
    errors.push('Valid email is required');
  }

  if (data.phone && !PHONE_REGEX.test(data.phone)) {
    errors.push('Invalid phone number format');
  }

  if (!data.role || !['parent', 'aupair'].includes(data.role)) {
    errors.push('Invalid role specified');
  }

  if (!data.familyId || typeof data.familyId !== 'string') {
    errors.push('Family ID is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Child profile validation
export function validateChildProfile(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Child name is required');
  } else if (!NAME_REGEX.test(data.name.trim())) {
    errors.push('Child name contains invalid characters');
  }

  if (!data.familyId || typeof data.familyId !== 'string') {
    errors.push('Family ID is required');
  }

  if (data.birthDate) {
    const birthDate = new Date(data.birthDate);
    if (isNaN(birthDate.getTime()) || birthDate > new Date()) {
      errors.push('Invalid birth date');
    }
  }

  if (data.medicalConditions && typeof data.medicalConditions !== 'string') {
    errors.push('Medical conditions must be a string');
  }

  if (data.emergencyContacts && !Array.isArray(data.emergencyContacts)) {
    errors.push('Emergency contacts must be an array');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Task validation
export function validateTask(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Task title is required');
  }

  if (!data.familyId || typeof data.familyId !== 'string') {
    errors.push('Family ID is required');
  }

  if (!data.assignedTo || typeof data.assignedTo !== 'string') {
    errors.push('Task must be assigned to someone');
  }

  if (data.dueDate) {
    const dueDate = new Date(data.dueDate);
    if (isNaN(dueDate.getTime())) {
      errors.push('Invalid due date');
    }
  }

  if (data.priority && !['low', 'medium', 'high'].includes(data.priority)) {
    errors.push('Invalid priority level');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Calendar event validation
export function validateCalendarEvent(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Event title is required');
  }

  if (!data.familyId || typeof data.familyId !== 'string') {
    errors.push('Family ID is required');
  }

  if (!data.startTime || !data.endTime) {
    errors.push('Start and end times are required');
  } else {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      errors.push('Invalid date format');
    } else if (endTime <= startTime) {
      errors.push('End time must be after start time');
    }
  }

  if (data.attendees && !Array.isArray(data.attendees)) {
    errors.push('Attendees must be an array');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Shopping list validation
export function validateShoppingItem(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Item name is required');
  }

  if (!data.familyId || typeof data.familyId !== 'string') {
    errors.push('Family ID is required');
  }

  if (data.quantity && (typeof data.quantity !== 'number' || data.quantity < 1)) {
    errors.push('Quantity must be a positive number');
  }

  if (data.category && typeof data.category !== 'string') {
    errors.push('Category must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Sanitize input data
export function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    return data.trim().replace(/[<>]/g, ''); // Basic XSS prevention
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeInput(item));
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        sanitized[key] = sanitizeInput(data[key]);
      }
    }
    return sanitized;
  }
  
  return data;
}