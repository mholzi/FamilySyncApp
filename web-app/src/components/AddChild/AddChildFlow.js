import { useState, useEffect } from 'react';
import AddChildBasicInfo from './AddChildBasicInfo';
import AddChildCareInfoStreamlined from './AddChildCareInfoStreamlined';
// import AddChildRoutineInfo from './AddChildRoutineInfo';
// import AddChildSchoolScheduleTable from './AddChildSchoolScheduleTable';
import AutoSaveIndicator from './AutoSaveIndicator';

function AddChildFlow({ user, familyId, existingChildren = [], editingChild = null, onComplete, onCancel, isSaving = false }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successChildName, setSuccessChildName] = useState('');
  const [globalSaveStatus, setGlobalSaveStatus] = useState(null); // 'saving', 'saved', 'error'
  
  // Initialize with different data based on edit mode
  const getInitialChildData = () => {
    if (editingChild) {
      // Load existing child data for editing
      return {
        id: editingChild.id,
        name: editingChild.name || '',
        dateOfBirth: editingChild.dateOfBirth || null,
        phoneNumber: editingChild.phoneNumber || '',
        profilePictureUrl: editingChild.profilePictureUrl || null,
        allergies: editingChild.allergies || [],
        medications: editingChild.medications || [],
        emergencyContacts: editingChild.emergencyContacts || [],
        carePreferences: editingChild.carePreferences || {
          napTimes: [],
          bedtime: null,
          mealPreferences: [],
          dailyRoutine: null,
          weeklyActivities: []
        },
        schoolSchedule: editingChild.schoolSchedule || null,
        scheduleType: editingChild.scheduleType || null
      };
    } else {
      // Only generate tempId for new children
      return {
        tempId: `child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
          mealPreferences: [],
          dailyRoutine: null,
          weeklyActivities: []
        },
        schoolSchedule: null,
        scheduleType: null
      };
    }
  };

  const [childData, setChildData] = useState(getInitialChildData());

  const handleNext = (stepData) => {
    setChildData(prev => ({ ...prev, ...stepData }));
    
    // If we're on step 1 (care info), show success and return to dashboard
    if (currentStep === 1) {
      setSuccessChildName(childData.name);
      setShowSuccessMessage(true);
      
      // Show success message for 2 seconds then return to dashboard
      setTimeout(() => {
        onComplete({ ...childData, ...stepData });
      }, 2000);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Removed - no longer needed with 2-step flow

  const handleDelete = () => {
    // Pass delete request to parent with child ID
    onComplete({ deleteChild: editingChild.id });
  };

  const handleSkip = (stepData = {}) => {
    const finalData = { ...childData, ...stepData };
    setChildData(finalData);
    
    // Show success message and return to dashboard
    if (currentStep === 1) {
      setSuccessChildName(childData.name);
      setShowSuccessMessage(true);
      
      setTimeout(() => {
        onComplete(finalData);
      }, 2000);
    }
  };

  // Auto-save draft data as user progresses
  useEffect(() => {
    if (childData.name || childData.dateOfBirth || childData.phoneNumber || childData.scheduleType) {
      // Save to localStorage as draft
      localStorage.setItem('childDraft', JSON.stringify(childData));
    }
  }, [childData]);

  // Load draft data or editing child data on mount
  useEffect(() => {
    if (editingChild) {
      console.log('Loading editing child data:', editingChild);
      
      // Convert Firestore data to component format
      const editData = {
        // Use the existing child ID, not a tempId
        id: editingChild.id,
        name: editingChild.name || '',
        dateOfBirth: editingChild.dateOfBirth?.toDate ? 
          editingChild.dateOfBirth.toDate().toISOString().split('T')[0] : 
          (editingChild.dateOfBirth instanceof Date ? 
            editingChild.dateOfBirth.toISOString().split('T')[0] : 
            editingChild.dateOfBirth || ''),
        phoneNumber: editingChild.phoneNumber || '',
        profilePictureUrl: editingChild.profilePictureUrl || null,
        carePreferences: editingChild.carePreferences || {
          napTimes: [],
          bedtime: null,
          mealPreferences: [],
          dailyRoutine: null,
          weeklyActivities: [],
          quickNotes: ''
        },
        schoolSchedule: editingChild.schoolSchedule || null,
        scheduleType: editingChild.scheduleType || 'kindergarten',
        allergies: editingChild.allergies || [],
        medications: editingChild.medications || [],
        emergencyContacts: editingChild.emergencyContacts || [],
        // Preserve other fields that might exist
        familyId: editingChild.familyId,
        createdBy: editingChild.createdBy,
        createdAt: editingChild.createdAt,
        isActive: editingChild.isActive
      };
      
      console.log('Processed edit data:', editData);
      setChildData(editData);
      
      // For edit mode, jump directly to Step 2 (Care Info)
      setCurrentStep(1);
    } else {
      // For new children, clear any existing draft data and start fresh
      localStorage.removeItem('childDraft');
      setChildData(getInitialChildData());
    }
  }, [editingChild]);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <AddChildBasicInfo
            initialData={childData}
            existingChildren={existingChildren}
            onNext={handleNext}
            onCancel={onCancel}
            onDelete={editingChild ? handleDelete : null}
            isEditing={!!editingChild}
            onSaveStatusChange={setGlobalSaveStatus}
          />
        );
      case 1:
        return (
          <AddChildCareInfoStreamlined
            childData={childData}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
            onCancel={onCancel}
            isEditing={!!editingChild}
            onSaveStatusChange={setGlobalSaveStatus}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      {/* Global Auto-Save Indicator */}
      <AutoSaveIndicator saveStatus={globalSaveStatus} />
      
      {renderStep()}
      
      {/* Success Message */}
      {showSuccessMessage && (
        <div style={styles.successOverlay}>
          <div style={styles.successContent}>
            <div style={styles.successIcon}>✅</div>
            <div style={styles.successText}>
              {editingChild ? 'Changes saved successfully!' : `${successChildName} added successfully!`}
            </div>
            <div style={styles.successSubtext}>Returning to dashboard...</div>
          </div>
        </div>
      )}
      
      {/* Loading Overlay */}
      {isSaving && !showSuccessMessage && (
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
    backgroundColor: 'var(--md-sys-color-surface)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)',
    position: 'relative'
  },
  
  // Loading Overlay
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  loadingContent: {
    backgroundColor: 'var(--md-sys-color-surface-container-high)',
    borderRadius: 'var(--md-sys-shape-corner-large)',
    padding: '30px',
    textAlign: 'center',
    maxWidth: '300px',
    width: '90%',
    boxShadow: 'var(--md-sys-elevation-level3)'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--md-sys-color-surface-variant)',
    borderTop: '4px solid var(--md-sys-color-primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px auto'
  },
  loadingText: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '8px'
  },
  loadingSubtext: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: '1.4'
  },
  
  // Success Message Styles
  successOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  successContent: {
    backgroundColor: 'var(--md-sys-color-surface-container-high)',
    borderRadius: 'var(--md-sys-shape-corner-large)',
    padding: '30px',
    textAlign: 'center',
    maxWidth: '300px',
    width: '90%',
    boxShadow: 'var(--md-sys-elevation-level3)'
  },
  successIcon: {
    fontSize: '48px',
    marginBottom: '15px'
  },
  successText: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '8px'
  },
  successSubtext: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)'
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