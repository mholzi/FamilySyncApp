import { useState, useCallback } from 'react';

/**
 * Custom hook for centralized error handling
 * Provides consistent error handling patterns across components
 */
export const useErrorHandler = (options = {}) => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { 
    onError,
    showToast = true,
    logErrors = true 
  } = options;

  const handleError = useCallback((error, context = {}) => {
    const errorInfo = {
      message: error.message || 'An unexpected error occurred',
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context
    };

    // Log error
    if (logErrors) {
      console.error('Error caught by useErrorHandler:', errorInfo);
    }

    // Set error state
    setError(errorInfo);

    // Call custom error handler if provided
    if (onError) {
      onError(errorInfo);
    }

    // Show user-friendly message (could integrate with toast library)
    if (showToast) {
      // TODO: Integrate with toast notification system
      console.warn('Error notification:', errorInfo.message);
    }
  }, [onError, showToast, logErrors]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeAsync = useCallback(async (asyncFunction, context = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncFunction();
      setIsLoading(false);
      return result;
    } catch (error) {
      setIsLoading(false);
      handleError(error, context);
      throw error; // Re-throw to allow component-level handling if needed
    }
  }, [handleError]);

  const executeWithErrorHandling = useCallback((fn, context = {}) => {
    try {
      return fn();
    } catch (error) {
      handleError(error, context);
      return null;
    }
  }, [handleError]);

  return {
    error,
    isLoading,
    handleError,
    clearError,
    executeAsync,
    executeWithErrorHandling
  };
};

/**
 * Higher-order component for automatic error boundary wrapping
 */
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => {
    const ErrorBoundary = require('../components/ErrorBoundary/ErrorBoundary').default;
    
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

/**
 * Hook for Firestore error handling with specific error types
 */
export const useFirestoreErrorHandler = () => {
  const { handleError, ...rest } = useErrorHandler();

  const handleFirestoreError = useCallback((error, operation = 'firestore operation') => {
    let userMessage = 'A database error occurred. Please try again.';

    // Handle specific Firestore error codes
    switch (error.code) {
      case 'permission-denied':
        userMessage = 'You don\'t have permission to perform this action.';
        break;
      case 'not-found':
        userMessage = 'The requested data was not found.';
        break;
      case 'already-exists':
        userMessage = 'This item already exists.';
        break;
      case 'resource-exhausted':
        userMessage = 'Too many requests. Please wait a moment and try again.';
        break;
      case 'unauthenticated':
        userMessage = 'Please sign in to continue.';
        break;
      case 'unavailable':
        userMessage = 'Service temporarily unavailable. Please try again later.';
        break;
      case 'deadline-exceeded':
        userMessage = 'Request timed out. Please try again.';
        break;
      default:
        userMessage = error.message || userMessage;
    }

    // Create enhanced error with user-friendly message
    const enhancedError = new Error(userMessage);
    enhancedError.originalError = error;
    enhancedError.operation = operation;

    handleError(enhancedError, { 
      operation, 
      firestoreCode: error.code,
      originalMessage: error.message 
    });
  }, [handleError]);

  return {
    ...rest,
    handleFirestoreError
  };
};

export default useErrorHandler;