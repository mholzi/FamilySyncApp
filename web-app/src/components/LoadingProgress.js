import { useState, useEffect } from 'react';

function LoadingProgress({ 
  isVisible, 
  title = "Saving...", 
  subtitle = "Please wait while we process your request",
  progress = null, // { stage, progress, message }
  allowCancel = false,
  onCancel = () => {}
}) {
  const [dots, setDots] = useState('');

  // Animate dots for loading effect
  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <p style={styles.subtitle}>{subtitle}</p>
        </div>

        {/* Progress Information */}
        {progress ? (
          <div style={styles.progressSection}>
            <div style={styles.progressMessage}>
              {progress.message}{!progress.message.endsWith('!') && dots}
            </div>
            
            {/* Progress Bar */}
            <div style={styles.progressBarContainer}>
              <div 
                style={{
                  ...styles.progressBar,
                  width: `${Math.max(5, progress.progress || 0)}%`
                }}
              />
            </div>
            
            <div style={styles.progressPercent}>
              {Math.round(progress.progress || 0)}%
            </div>

            {/* Stage Indicator */}
            <div style={styles.stageIndicator}>
              <div style={styles.stages}>
                <div style={{
                  ...styles.stage,
                  ...(progress.stage === 'validation' || progress.progress > 0 ? styles.stageActive : {})
                }}>
                  ✓ Validation
                </div>
                <div style={{
                  ...styles.stage,
                  ...(progress.stage === 'processing' || progress.progress > 20 ? styles.stageActive : {})
                }}>
                  🔄 Processing
                </div>
                <div style={{
                  ...styles.stage,
                  ...(progress.stage === 'uploading' || progress.progress > 60 ? styles.stageActive : {})
                }}>
                  ⬆️ Uploading
                </div>
                <div style={{
                  ...styles.stage,
                  ...(progress.stage === 'complete' || progress.progress >= 100 ? styles.stageActive : {})
                }}>
                  ✅ Complete
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.defaultSpinner}>
            <div style={styles.spinner}></div>
            <div style={styles.spinnerText}>Processing{dots}</div>
          </div>
        )}

        {/* Cancel Button */}
        {allowCancel && (
          <button style={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
        )}

        {/* Tips */}
        <div style={styles.tips}>
          <div style={styles.tip}>💡 Large images may take longer to process</div>
          <div style={styles.tip}>📱 Keep this window open while saving</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  content: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
  },
  header: {
    marginBottom: '24px'
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    lineHeight: '1.4'
  },
  progressSection: {
    marginBottom: '24px'
  },
  progressMessage: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '16px',
    minHeight: '20px'
  },
  progressBarContainer: {
    width: '100%',
    height: '8px',
    backgroundColor: '#E5E5EA',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
    minWidth: '8px'
  },
  progressPercent: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px'
  },
  stageIndicator: {
    backgroundColor: '#F2F2F7',
    borderRadius: '8px',
    padding: '12px'
  },
  stages: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px'
  },
  stage: {
    fontSize: '12px',
    color: '#8E8E93',
    fontWeight: '500',
    flex: 1,
    minWidth: '70px'
  },
  stageActive: {
    color: '#007AFF',
    fontWeight: '600'
  },
  defaultSpinner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '24px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E5E5EA',
    borderTop: '4px solid #007AFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  spinnerText: {
    fontSize: '16px',
    color: '#666',
    fontWeight: '500'
  },
  cancelButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #FF3B30',
    backgroundColor: 'white',
    color: '#FF3B30',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginBottom: '20px'
  },
  tips: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  tip: {
    fontSize: '12px',
    color: '#8E8E93',
    textAlign: 'left'
  }
};

// Add CSS animation if not already added
if (typeof document !== 'undefined' && !document.head.querySelector('style[data-loading-spinner]')) {
  const style = document.createElement('style');
  style.setAttribute('data-loading-spinner', 'true');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default LoadingProgress;