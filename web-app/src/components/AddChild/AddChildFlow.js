import { useState, useEffect } from 'react';
import AddChildBasicInfo from './AddChildBasicInfo';
import AddChildCareInfoStreamlined from './AddChildCareInfoStreamlined';
import AddChildRoutineInfo from './AddChildRoutineInfo';
import AddChildSchoolScheduleTable from './AddChildSchoolScheduleTable';
import AddChildComplete from './AddChildComplete';

function AddChildFlow({ user, familyId, existingChildren = [], editingChild = null, onComplete, onCancel, isSaving = false }) {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Initialize with different data based on edit mode
  const getInitialChildData = () => {
    if (editingChild) {
      // Don't generate tempId for editing mode
      return {
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
      // Reset form and start over with new tempId
      setChildData({
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
          mealPreferences: []
        },
        schoolSchedule: null,
        scheduleType: null
      });
      setCurrentStep(0);
    } else {
      // Go back to dashboard
      onComplete(childData);
    }
  };

  const handleDelete = () => {
    // Pass delete request to parent with child ID
    onComplete({ deleteChild: editingChild.id });
  };

  const handleSkip = (stepData = {}) => {
    const finalData = { ...childData, ...stepData };
    // Move to completion step
    setChildData(finalData);
    if (currentStep === 1) {
      setCurrentStep(2); // Skip to completion
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