import { useState, useEffect } from 'react';
import AddChildBasicInfo from './AddChildBasicInfo';
import AddChildCareInfo from './AddChildCareInfo';
import AddChildComplete from './AddChildComplete';

function AddChildFlow({ user, familyId, existingChildren = [], onComplete, onCancel, isSaving = false }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [childData, setChildData] = useState({
    name: '',
    dateOfBirth: null,
    phoneNumber: '',
    profilePictureUrl: null,
    allergies: [],
    medications: [],
    emergencyContacts: [],
    carePreferences: {
      napTimes: [],
      bedtime: null,
      mealPreferences: []
    }
  });

  const handleNext = (stepData) => {
    setChildData(prev => ({ ...prev, ...stepData }));
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleComplete = (finalData) => {
    const completeChildData = { ...childData, ...finalData };
    onComplete(completeChildData);
  };

  const handleCompleteFlow = (action) => {
    if (action === 'add_another') {
      // Reset form and start over
      setChildData({
        name: '',
        dateOfBirth: null,
        phoneNumber: '',
        profilePictureUrl: null,
        allergies: [],
        medications: [],
        emergencyContacts: [],
        carePreferences: {
          napTimes: [],
          bedtime: null,
          mealPreferences: []
        }
      });
      setCurrentStep(0);
    } else {
      // Go back to dashboard
      onComplete(childData);
    }
  };

  const handleSkip = (stepData = {}) => {
    const finalData = { ...childData, ...stepData };
    // Move to completion step instead of ending flow
    setChildData(finalData);
    setCurrentStep(2);
  };

  // Auto-save draft data as user progresses
  useEffect(() => {
    if (childData.name || childData.dateOfBirth) {
      // Save to localStorage as draft
      localStorage.setItem('childDraft', JSON.stringify(childData));
    }
  }, [childData]);

  // Load draft data on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('childDraft');
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        setChildData(parsedDraft);
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <AddChildBasicInfo
            initialData={childData}
            existingChildren={existingChildren}
            onNext={handleNext}
            onCancel={onCancel}
          />
        );
      case 1:
        return (
          <AddChildCareInfo
            childData={childData}
            onNext={handleComplete}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );
      case 2:
        return (
          <AddChildComplete
            childData={childData}
            onComplete={handleCompleteFlow}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      {renderStep()}
      
      {/* Loading Overlay */}
      {isSaving && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContent}>
            <div style={styles.loadingSpinner}></div>
            <div style={styles.loadingText}>Saving child profile...</div>
            <div style={styles.loadingSubtext}>Uploading photo and creating profile</div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F2F2F7',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    position: 'relative'
  },
  
  // Loading Overlay
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  loadingContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '30px',
    textAlign: 'center',
    maxWidth: '300px',
    width: '90%'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E5E5EA',
    borderTop: '4px solid #007AFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px auto'
  },
  loadingText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '8px'
  },
  loadingSubtext: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.4'
  }
};

// Add CSS animation for spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  if (!document.head.querySelector('style[data-spinner]')) {
    style.setAttribute('data-spinner', 'true');
    document.head.appendChild(style);
  }
}

export default AddChildFlow;