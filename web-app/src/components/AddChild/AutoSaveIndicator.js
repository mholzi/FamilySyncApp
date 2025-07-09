import { useState, useEffect } from 'react';

function AutoSaveIndicator({ saveStatus }) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (saveStatus) {
      setIsVisible(true);
      
      // Auto-hide after showing for a while
      if (saveStatus === 'saved') {
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, 2000);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [saveStatus]);
  
  if (!isVisible) return null;
  
  return (
    <div style={styles.container}>
      <div style={{
        ...styles.indicator,
        ...(saveStatus === 'saving' ? styles.saving : {}),
        ...(saveStatus === 'saved' ? styles.saved : {}),
        ...(saveStatus === 'error' ? styles.error : {})
      }}>
        {saveStatus === 'saving' && (
          <>
            <span style={styles.icon}>💾</span>
            <span style={styles.text}>Saving...</span>
          </>
        )}
        {saveStatus === 'saved' && (
          <>
            <span style={styles.icon}>✅</span>
            <span style={styles.text}>All changes saved</span>
          </>
        )}
        {saveStatus === 'error' && (
          <>
            <span style={styles.icon}>⚠️</span>
            <span style={styles.text}>Save failed - retrying...</span>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    top: '70px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    pointerEvents: 'none'
  },
  
  indicator: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    border: '1px solid #E5E5EA',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease'
  },
  
  saving: {
    borderColor: '#007AFF',
    color: '#007AFF'
  },
  
  saved: {
    borderColor: '#34C759',
    color: '#34C759'
  },
  
  error: {
    borderColor: '#FF3B30',
    color: '#FF3B30'
  },
  
  icon: {
    fontSize: '16px'
  },
  
  text: {
    whiteSpace: 'nowrap'
  }
};

export default AutoSaveIndicator;