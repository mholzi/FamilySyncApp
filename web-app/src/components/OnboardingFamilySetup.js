import { useState, useEffect } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useFamily } from '../hooks/useFamily';

function OnboardingFamilySetup({ user, onComplete, onBack }) {
  const { userData } = useFamily(user.uid);
  const [familyName, setFamilyName] = useState('');
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Auto-detect and set smart defaults
    const setupDefaults = () => {
      // Detect browser language
      const browserLang = navigator.language.toLowerCase();
      const detectedLanguage = browserLang.startsWith('de') ? 'de' : 'en';
      setLanguage(detectedLanguage);

      // Detect timezone
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detectedTimezone);

      // Pre-fill family name from user data
      if (userData?.name) {
        setFamilyName(`${userData.name}'s Family`);
      }
    };

    setupDefaults();
  }, [userData]);

  const handleComplete = async () => {
    if (!familyName.trim()) {
      setError('Please enter a family name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update family data
      await updateDoc(doc(db, 'families', userData.familyId), {
        name: familyName.trim(),
        defaultLanguage: language,
        timezone: timezone,
        updatedAt: Timestamp.now()
      });

      // Mark onboarding as complete
      await updateDoc(doc(db, 'users', user.uid), {
        hasCompletedOnboarding: true,
        onboardingCompletedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Show success message and complete
      setTimeout(() => {
        onComplete();
      }, 1000);

    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <button 
            onClick={onBack}
            style={styles.backButton}
          >
            ←
          </button>
          <span style={styles.progress}>1 of 1 ✨ Almost done!</span>
          <div></div>
        </div>

        {/* Title */}
        <h1 style={styles.title}>🏠 Your Family</h1>

        {/* Form */}
        <div style={styles.form}>
          {/* Family Name */}
          <div style={styles.field}>
            <label style={styles.label}>Family Name</label>
            <div style={styles.inputContainer}>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                style={styles.input}
                placeholder="Enter family name"
              />
              {familyName && <span style={styles.checkmark}>✓</span>}
            </div>
          </div>

          {/* Language & Timezone */}
          <div style={styles.field}>
            <label style={styles.label}>🌍 Language & Timezone</label>
            <div style={styles.row}>
              <div style={styles.selectContainer}>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={styles.select}
                >
                  <option value="en">🇬🇧 English</option>
                  <option value="de">🇩🇪 Deutsch</option>
                </select>
              </div>
              <div style={styles.timezoneInfo}>
                <span style={styles.timezoneText}>{timezone || 'Detecting...'}</span>
                {timezone && <span style={styles.checkmark}>✓</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {familyName && timezone && (
          <div style={styles.successMessage}>
            ✨ Perfect! You're ready!
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={styles.error}>{error}</div>
        )}

        {/* Action */}
        <button 
          onClick={handleComplete}
          disabled={loading || !familyName.trim()}
          style={{
            ...styles.doneButton,
            opacity: (loading || !familyName.trim()) ? 0.5 : 1,
            cursor: (loading || !familyName.trim()) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Setting up...' : 'Done ✓'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backgroundColor: 'white'
  },
  content: {
    maxWidth: '350px',
    width: '100%'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    color: '#007AFF',
    cursor: 'pointer'
  },
  progress: {
    fontSize: '14px',
    color: '#8E8E93',
    fontWeight: '500'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 30px 0',
    textAlign: 'center'
  },
  form: {
    marginBottom: '30px'
  },
  field: {
    marginBottom: '25px'
  },
  label: {
    display: 'block',
    fontSize: '16px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '8px'
  },
  inputContainer: {
    position: 'relative'
  },
  input: {
    width: '100%',
    padding: '12px 40px 12px 12px',
    fontSize: '16px',
    border: '1px solid #E5E5EA',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  checkmark: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#34C759',
    fontSize: '16px',
    fontWeight: '600'
  },
  row: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  selectContainer: {
    flex: 1
  },
  select: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #E5E5EA',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  timezoneInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#666',
    position: 'relative'
  },
  timezoneText: {
    fontSize: '12px'
  },
  successMessage: {
    textAlign: 'center',
    fontSize: '16px',
    color: '#34C759',
    fontWeight: '500',
    marginBottom: '25px',
    padding: '12px',
    backgroundColor: '#F0F9F0',
    borderRadius: '8px'
  },
  error: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#FF3B30',
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: '#FFF0F0',
    borderRadius: '8px'
  },
  doneButton: {
    width: '100%',
    backgroundColor: '#34C759',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(52, 199, 89, 0.3)'
  }
};

export default OnboardingFamilySetup;