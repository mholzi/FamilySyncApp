import React, { Component } from 'react';
import { toast } from 'react-toastify';

/**
 * Error handling patterns for FamilySync
 * 
 * PATTERN: Use these approaches for comprehensive error handling
 * - Error boundaries for component crashes
 * - Custom error hook for consistent error state
 * - Firebase error transformation
 * - User-friendly error messages
 * - Error logging and reporting
 */

/**
 * Error Boundary component for catching React errors
 * 
 * PATTERN: Wrap critical components with this boundary
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console and external service
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
    
    // Report to error tracking service (e.g., Sentry)
    this.reportError(error, errorInfo);
  }

  reportError = (error, errorInfo) => {
    // Example error reporting
    // In production, you might use Sentry, LogRocket, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // Send to error reporting service
    console.error('Error Report:', errorReport);
    
    // Could also send to Firebase Analytics, Sentry, etc.
    // analytics.logEvent('error', errorReport);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Error details (click to expand)</summary>
            <p><strong>Error:</strong> {this.state.error && this.state.error.toString()}</p>
            <p><strong>Stack:</strong> {this.state.errorInfo.componentStack}</p>
          </details>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Custom hook for error handling
 * 
 * PATTERN: Use this hook for consistent error state management
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const handleError = React.useCallback((error, context = '') => {
    console.error(`Error in ${context}:`, error);
    
    // Transform Firebase errors to user-friendly messages
    const userMessage = transformFirebaseError(error);
    
    setError(userMessage);
    
    // Show toast notification
    toast.error(userMessage);
    
    // Log to external service
    logError(error, context);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const withErrorHandling = React.useCallback(async (asyncFn, context = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await asyncFn();
      return result;
    } catch (error) {
      handleError(error, context);
      throw error; // Re-throw so caller can handle if needed
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  return {
    error,
    loading,
    handleError,
    clearError,
    withErrorHandling
  };
};

/**
 * Transform Firebase errors to user-friendly messages
 * @param {Error} error - The error to transform
 * @returns {string} User-friendly error message
 */
const transformFirebaseError = (error) => {
  if (!error || !error.code) {
    return error?.message || 'An unexpected error occurred';
  }

  switch (error.code) {
    // Auth errors
    case 'auth/user-not-found':
      return 'No account found with this email address';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later';
    
    // Firestore errors
    case 'permission-denied':
      return 'You don\'t have permission to access this data';
    case 'not-found':
      return 'The requested data was not found';
    case 'already-exists':
      return 'This item already exists';
    case 'resource-exhausted':
      return 'Service is temporarily unavailable. Please try again later';
    case 'failed-precondition':
      return 'Operation failed. Please refresh and try again';
    case 'aborted':
      return 'Operation was interrupted. Please try again';
    case 'out-of-range':
      return 'Invalid input provided';
    case 'unimplemented':
      return 'This feature is not yet available';
    case 'internal':
      return 'Internal server error. Please try again later';
    case 'unavailable':
      return 'Service is temporarily unavailable';
    case 'deadline-exceeded':
      return 'Request timed out. Please try again';
    
    // Storage errors
    case 'storage/unauthorized':
      return 'You don\'t have permission to upload files';
    case 'storage/canceled':
      return 'Upload was canceled';
    case 'storage/quota-exceeded':
      return 'Storage quota exceeded';
    case 'storage/invalid-format':
      return 'Invalid file format';
    case 'storage/invalid-event-name':
      return 'Invalid file operation';
    case 'storage/invalid-url':
      return 'Invalid file URL';
    case 'storage/invalid-argument':
      return 'Invalid file argument';
    case 'storage/no-default-bucket':
      return 'No storage bucket configured';
    case 'storage/cannot-slice-blob':
      return 'File upload failed';
    case 'storage/server-file-wrong-size':
      return 'File size mismatch';
    
    // Custom app errors
    case 'app/user-not-in-family':
      return 'You need to join a family to access this feature';
    case 'app/family-not-found':
      return 'Family not found';
    case 'app/invalid-family-code':
      return 'Invalid family invitation code';
    case 'app/feature-disabled':
      return 'This feature is currently disabled';
    
    default:
      return error.message || 'An unexpected error occurred';
  }
};

/**
 * Log error to external service
 * @param {Error} error - The error to log
 * @param {string} context - Context where error occurred
 */
const logError = (error, context) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    code: error.code,
    context,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent
  };
  
  // In production, send to logging service
  console.error('Error Log:', errorLog);
  
  // Example: Send to analytics or error reporting service
  // analytics.logEvent('error', errorLog);
  // Sentry.captureException(error, { extra: errorLog });
};

/**
 * Higher-order component for error handling
 * @param {Component} WrappedComponent - Component to wrap
 * @param {string} componentName - Name for error context
 * @returns {Component} Wrapped component with error handling
 */
export const withErrorBoundary = (WrappedComponent, componentName = 'Component') => {
  return function WithErrorBoundaryComponent(props) {
    return (
      <ErrorBoundary>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
};

/**
 * Async operation wrapper with error handling
 * @param {Function} asyncFn - Async function to wrap
 * @param {string} context - Context for error logging
 * @returns {Function} Wrapped async function
 */
export const withAsyncErrorHandling = (asyncFn, context = '') => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      const userMessage = transformFirebaseError(error);
      toast.error(userMessage);
      logError(error, context);
      throw error;
    }
  };
};

/**
 * Form validation error handler
 * @param {Object} formData - Form data to validate
 * @param {Object} validationRules - Validation rules
 * @returns {Object} Validation results
 */
export const validateForm = (formData, validationRules) => {
  const errors = {};
  
  Object.keys(validationRules).forEach(field => {
    const value = formData[field];
    const rules = validationRules[field];
    
    if (rules.required && (!value || value.trim() === '')) {
      errors[field] = `${field} is required`;
    } else if (rules.minLength && value && value.length < rules.minLength) {
      errors[field] = `${field} must be at least ${rules.minLength} characters`;
    } else if (rules.maxLength && value && value.length > rules.maxLength) {
      errors[field] = `${field} must be no more than ${rules.maxLength} characters`;
    } else if (rules.pattern && value && !rules.pattern.test(value)) {
      errors[field] = rules.message || `${field} format is invalid`;
    } else if (rules.custom && value) {
      const customError = rules.custom(value);
      if (customError) {
        errors[field] = customError;
      }
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export default ErrorBoundary;