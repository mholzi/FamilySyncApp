import { useState } from 'react';

function AddChildComplete({ childData, onComplete }) {
  const [isAnimating, setIsAnimating] = useState(true);

  useState(() => {
    // Trigger animation after component mounts
    setTimeout(() => setIsAnimating(false), 2000);
  }, []);

  const handleAddAnother = () => {
    onComplete('add_another');
  };

  const handleGoToDashboard = () => {
    onComplete('dashboard');
  };

  const handleEditChild = () => {
    // For now, just go back to basic info step
    // TODO: Implement proper edit functionality
    console.log('Edit child functionality coming soon');
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.celebrationSection}>
          <div style={{
            ...styles.celebrationIcon,
            ...(isAnimating ? styles.celebrationIconAnimated : {})
          }}>
            🎉
          </div>
          <h1 style={styles.title}>
            {childData.name} added successfully!
          </h1>
          
          <div style={styles.sparkles}>
            <div style={styles.sparkle}>✨</div>
            <div style={styles.sparkle}>✨</div>
            <div style={styles.sparkle}>✨</div>
          </div>
        </div>

        <div style={styles.messageSection}>
          <h2 style={styles.subtitle}>Your family is growing!</h2>
          <p style={styles.description}>
            {childData.name}'s profile is ready for your au pair to see.
          </p>
        </div>

        <div style={styles.childSummary}>
          <div style={styles.childCard}>
            <div style={styles.childHeader}>
              <div style={styles.childAvatar}>
                {childData.profilePictureUrl && !childData.profilePictureUrl.startsWith('blob:') ? (
                  <img 
                    src={childData.profilePictureUrl} 
                    alt={`${childData.name} profile`}
                    style={styles.childAvatarImage}
                    onError={(e) => {
                      console.log('Image failed to load:', e.target.src);
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  childData.name ? childData.name.charAt(0).toUpperCase() : 'C'
                )}
              </div>
              <div style={styles.childInfo}>
                <div style={styles.childName}>{childData.name}</div>
                <div style={styles.childAge}>
                  {childData.dateOfBirth ? 
                    `${Math.floor((new Date() - (childData.dateOfBirth instanceof Date ? childData.dateOfBirth : new Date(childData.dateOfBirth))) / (365.25 * 24 * 60 * 60 * 1000))} years old` : 
                    'Age not specified'
                  }
                </div>
              </div>
            </div>
            
            <div style={styles.childDetails}>
              {childData.allergies && childData.allergies.length > 0 && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Allergies:</span>
                  <span style={styles.detailValue}>
                    {childData.allergies.map(a => a.name).join(', ')}
                  </span>
                </div>
              )}
              
              {childData.medications && childData.medications.length > 0 && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Medications:</span>
                  <span style={styles.detailValue}>
                    {childData.medications.map(m => m.name).join(', ')}
                  </span>
                </div>
              )}
              
              {childData.phoneNumber && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Phone:</span>
                  <span style={styles.detailValue}>{childData.phoneNumber}</span>
                </div>
              )}

              {childData.carePreferences?.dailyRoutine && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Daily Routine:</span>
                  <span style={styles.detailValue}>
                    {childData.carePreferences.dailyRoutine.wakeUpTime} - {childData.carePreferences.dailyRoutine.bedtime}
                    {childData.carePreferences.dailyRoutine.napTimes?.length > 0 && 
                      `, ${childData.carePreferences.dailyRoutine.napTimes.length} nap(s)`
                    }
                  </span>
                </div>
              )}

              {childData.schoolSchedule && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>School:</span>
                  <span style={styles.detailValue}>
                    {childData.scheduleType === 'kindergarten' ? 'Kindergarten' : 'School'} schedule set
                  </span>
                </div>
              )}

              {childData.carePreferences?.quickNotes && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Notes:</span>
                  <span style={styles.detailValue}>
                    {childData.carePreferences.quickNotes.length > 50 
                      ? `${childData.carePreferences.quickNotes.substring(0, 50)}...`
                      : childData.carePreferences.quickNotes
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={styles.questionSection}>
          <h3 style={styles.questionTitle}>Do you have another child to add?</h3>
        </div>

        <div style={styles.buttonSection}>
          <button style={styles.primaryButton} onClick={handleAddAnother}>
            Yes, Add Another Child
          </button>
          <button style={styles.secondaryButton} onClick={handleGoToDashboard}>
            No, Go to Dashboard
          </button>
        </div>

        <div style={styles.editSection}>
          <button style={styles.editButton} onClick={handleEditChild}>
            Edit {childData.name}'s Details
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#F2F2F7',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  content: {
    flex: 1,
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center'
  },
  celebrationSection: {
    position: 'relative',
    marginBottom: '30px'
  },
  celebrationIcon: {
    fontSize: '80px',
    marginBottom: '20px',
    transition: 'transform 0.3s ease'
  },
  celebrationIconAnimated: {
    animation: 'bounce 0.6s ease-in-out infinite alternate'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#000',
    margin: '0 0 20px 0',
    lineHeight: '1.2'
  },
  sparkles: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '200px'
  },
  sparkle: {
    fontSize: '24px',
    animation: 'twinkle 1.5s ease-in-out infinite',
    animationDelay: 'calc(var(--i) * 0.3s)'
  },
  messageSection: {
    marginBottom: '30px'
  },
  subtitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 10px 0'
  },
  description: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.5',
    margin: 0
  },
  childSummary: {
    width: '100%',
    maxWidth: '350px',
    marginBottom: '30px'
  },
  childCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
  },
  childHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px'
  },
  childAvatar: {
    width: '50px',
    height: '50px',
    borderRadius: '25px',
    backgroundColor: '#34C759',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: '600',
    marginRight: '15px',
    overflow: 'hidden'
  },
  childAvatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '25px'
  },
  childInfo: {
    textAlign: 'left'
  },
  childName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '4px'
  },
  childAge: {
    fontSize: '14px',
    color: '#8E8E93'
  },
  childDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #F0F0F0'
  },
  detailLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#666'
  },
  detailValue: {
    fontSize: '14px',
    color: '#000',
    textAlign: 'right',
    maxWidth: '200px'
  },
  questionSection: {
    marginBottom: '30px'
  },
  questionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    margin: 0
  },
  buttonSection: {
    width: '100%',
    maxWidth: '350px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '20px'
  },
  primaryButton: {
    padding: '16px 24px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  secondaryButton: {
    padding: '16px 24px',
    borderRadius: '12px',
    border: '1px solid #E5E5EA',
    backgroundColor: 'white',
    color: '#007AFF',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  editSection: {
    marginTop: '20px'
  },
  editButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#8E8E93',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textDecoration: 'underline'
  }
};

// Add CSS animation keyframes
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes bounce {
      0% { transform: translateY(0); }
      100% { transform: translateY(-10px); }
    }
    
    @keyframes twinkle {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }
    
    .sparkle:nth-child(1) { animation-delay: 0s; }
    .sparkle:nth-child(2) { animation-delay: 0.3s; }
    .sparkle:nth-child(3) { animation-delay: 0.6s; }
  `;
  document.head.appendChild(style);
}

export default AddChildComplete;