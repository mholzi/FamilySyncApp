import React from 'react';

/**
 * Error Fallback UI Component
 * Displays user-friendly error messages with recovery options
 */
const ErrorFallback = ({ error, errorInfo, onRetry, level = 'component' }) => {
  const isApplicationLevel = level === 'application';
  const isPageLevel = level === 'page';

  const getErrorMessage = () => {
    if (isApplicationLevel) {
      return 'Something went wrong with the application. Please try refreshing the page.';
    }
    if (isPageLevel) {
      return 'This page encountered an error. Please try going back or refreshing.';
    }
    return 'This section encountered an error. You can try reloading it or continue using other parts of the app.';
  };

  const getErrorTitle = () => {
    if (isApplicationLevel) {
      return 'Application Error';
    }
    if (isPageLevel) {
      return 'Page Error';
    }
    return 'Something went wrong';
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const styles = {
    container: {
      padding: isApplicationLevel ? '48px 24px' : '24px',
      textAlign: 'center',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      margin: isApplicationLevel ? '20px' : '16px',
      minHeight: isApplicationLevel ? '300px' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    },
    icon: {
      fontSize: isApplicationLevel ? '48px' : '32px',
      marginBottom: '16px'
    },
    title: {
      fontSize: isApplicationLevel ? '24px' : '20px',
      fontWeight: '600',
      color: '#dc2626',
      marginBottom: '8px'
    },
    message: {
      fontSize: '16px',
      color: '#6b7280',
      marginBottom: '24px',
      maxWidth: '500px',
      lineHeight: '1.5'
    },
    buttonContainer: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      justifyContent: 'center'
    },
    button: {
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'background-color 0.2s'
    },
    primaryButton: {
      backgroundColor: '#dc2626',
      color: 'white'
    },
    secondaryButton: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db'
    },
    details: {
      marginTop: '24px',
      padding: '16px',
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      textAlign: 'left',
      fontSize: '12px',
      color: '#6b7280',
      maxWidth: '100%',
      overflow: 'auto'
    },
    detailsToggle: {
      background: 'none',
      border: 'none',
      color: '#6b7280',
      cursor: 'pointer',
      fontSize: '12px',
      textDecoration: 'underline',
      marginTop: '12px'
    }
  };

  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div style={styles.container}>
      <div style={styles.icon}>
        {isApplicationLevel ? '💥' : '⚠️'}
      </div>
      
      <h2 style={styles.title}>
        {getErrorTitle()}
      </h2>
      
      <p style={styles.message}>
        {getErrorMessage()}
      </p>

      <div style={styles.buttonContainer}>
        {onRetry && (
          <button
            style={{...styles.button, ...styles.primaryButton}}
            onClick={onRetry}
          >
            Try Again
          </button>
        )}
        
        {isApplicationLevel && (
          <button
            style={{...styles.button, ...styles.primaryButton}}
            onClick={handleRefresh}
          >
            Refresh Page
          </button>
        )}
        
        {(isPageLevel || isApplicationLevel) && (
          <button
            style={{...styles.button, ...styles.secondaryButton}}
            onClick={handleGoBack}
          >
            Go Back
          </button>
        )}
      </div>

      {process.env.NODE_ENV === 'development' && error && (
        <>
          <button
            style={styles.detailsToggle}
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} Error Details
          </button>
          
          {showDetails && (
            <div style={styles.details}>
              <h4>Error Details (Development Only):</h4>
              <p><strong>Message:</strong> {error.message}</p>
              {error.stack && (
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '10px' }}>
                  {error.stack}
                </pre>
              )}
              {errorInfo && errorInfo.componentStack && (
                <details>
                  <summary>Component Stack</summary>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '10px' }}>
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ErrorFallback;