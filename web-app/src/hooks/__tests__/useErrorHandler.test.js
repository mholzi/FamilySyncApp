import { renderHook, act } from '@testing-library/react';
import { useErrorHandler, useFirestoreErrorHandler } from '../useErrorHandler';

describe('useErrorHandler', () => {
  it('should initialize with no error and not loading', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error('Test error');
    
    act(() => {
      result.current.handleError(testError);
    });
    
    expect(result.current.error).not.toBeNull();
    expect(result.current.error.message).toBe('Test error');
  });

  it('should clear errors', () => {
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error('Test error');
    
    act(() => {
      result.current.handleError(testError);
    });
    
    expect(result.current.error).not.toBeNull();
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
  });

  it('should handle async operations with success', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const mockAsyncFn = jest.fn().mockResolvedValue('success');
    
    let returnValue;
    await act(async () => {
      returnValue = await result.current.executeAsync(mockAsyncFn);
    });
    
    expect(returnValue).toBe('success');
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle async operations with failure', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error('Async error');
    const mockAsyncFn = jest.fn().mockRejectedValue(testError);
    
    let thrownError;
    await act(async () => {
      try {
        await result.current.executeAsync(mockAsyncFn);
      } catch (error) {
        thrownError = error;
      }
    });
    
    expect(thrownError).toBe(testError);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error.message).toBe('Async error');
    expect(result.current.isLoading).toBe(false);
  });

  it('should call custom error handler when provided', () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useErrorHandler({ onError }));
    const testError = new Error('Test error');
    
    act(() => {
      result.current.handleError(testError);
    });
    
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test error'
      })
    );
  });
});

describe('useFirestoreErrorHandler', () => {
  it('should handle permission-denied errors with user-friendly message', () => {
    const { result } = renderHook(() => useFirestoreErrorHandler());
    const firestoreError = { 
      code: 'permission-denied', 
      message: 'Missing or insufficient permissions' 
    };
    
    act(() => {
      result.current.handleFirestoreError(firestoreError);
    });
    
    expect(result.current.error).not.toBeNull();
    expect(result.current.error.message).toBe('You don\'t have permission to perform this action.');
  });

  it('should handle not-found errors', () => {
    const { result } = renderHook(() => useFirestoreErrorHandler());
    const firestoreError = { 
      code: 'not-found', 
      message: 'Document not found' 
    };
    
    act(() => {
      result.current.handleFirestoreError(firestoreError);
    });
    
    expect(result.current.error.message).toBe('The requested data was not found.');
  });

  it('should handle unknown error codes with default message', () => {
    const { result } = renderHook(() => useFirestoreErrorHandler());
    const firestoreError = { 
      code: 'unknown-error', 
      message: 'Something weird happened' 
    };
    
    act(() => {
      result.current.handleFirestoreError(firestoreError);
    });
    
    expect(result.current.error.message).toBe('Something weird happened');
  });

  it('should preserve original error information', () => {
    const { result } = renderHook(() => useFirestoreErrorHandler());
    const firestoreError = { 
      code: 'permission-denied', 
      message: 'Original message' 
    };
    
    act(() => {
      result.current.handleFirestoreError(firestoreError, 'test operation');
    });
    
    // The error object should contain the enhanced error details, not the original directly
    expect(result.current.error.message).toBe('You don\'t have permission to perform this action.');
    expect(result.current.error.context.operation).toBe('test operation');
    expect(result.current.error.context.firestoreCode).toBe('permission-denied');
  });
});