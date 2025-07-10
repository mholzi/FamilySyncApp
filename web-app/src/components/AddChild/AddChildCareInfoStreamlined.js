import { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { doc, setDoc, updateDoc, getDoc, getDocs, collection, query, where, onSnapshot, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { COMMON_ALLERGIES, COMMON_MEDICATIONS, filterSuggestions } from '../../utils/dashboardStates';
import BasicRoutineBuilder from '../RoutineBuilder/BasicRoutineBuilder';
import AddChildSchoolScheduleTable from './AddChildSchoolScheduleTable';
import RecurringActivityBuilder from '../Activities/RecurringActivityBuilder';
import { getNextOccurrences, formatRecurrenceDescription } from '../../utils/recurringActivityTemplates';

function AddChildCareInfoStreamlined({ childData, onNext, onBack, onSkip, onCancel, isEditing = false, onSaveStatusChange }) {
  const [formData, setFormData] = useState({
    // Phone number (edit mode only)
    phoneNumber: childData.phoneNumber || '',
    
    // Essential care info
    allergies: childData.allergies || [],
    medications: childData.medications || [],
    
    // Optional care preferences 
    carePreferences: childData.carePreferences || {
      napTimes: [],
      bedtime: null,
      mealPreferences: [],
      dailyRoutine: null,
      weeklyActivities: []
    },
    
    // School schedule
    schoolSchedule: childData.schoolSchedule || null,
    scheduleType: childData.scheduleType || 'kindergarten',
    pickupPerson: childData.pickupPerson || null,
    schoolInfo: childData.schoolInfo || null,
    
    // Emergency contacts moved to family level
  });

  const [expandedSections, setExpandedSections] = useState({
    routine: false,
    schoolSchedule: false,
    recurringActivities: false
  });

  const [inputStates, setInputStates] = useState({
    allergyInput: '',
    medicationInput: '',
    quickNotes: ''
  });

  const [suggestions, setSuggestions] = useState({
    allergies: [],
    medications: []
  });
  
  const [familyAllergies, setFamilyAllergies] = useState([]);
  const [familyMedications, setFamilyMedications] = useState([]);

  const [showRoutineBuilder, setShowRoutineBuilder] = useState(false);
  const [showSchoolScheduleBuilder, setShowSchoolScheduleBuilder] = useState(false);
  const [showRecurringActivityBuilder, setShowRecurringActivityBuilder] = useState(false);
  const [recurringActivities, setRecurringActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  // Save state handled globally in parent component
  const [, setIsSaving] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);

  // Get family ID and fetch family allergies/medications on component mount
  useEffect(() => {
    const fetchFamilyData = async () => {
      try {
        // Try to get familyId from childData first
        let currentFamilyId = childData.familyId;
        
        // If not available, fetch from user document
        if (!currentFamilyId && auth.currentUser) {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            currentFamilyId = userDoc.data().familyId;
          }
        }

        if (currentFamilyId) {
          setFamilyId(currentFamilyId);
          
          // Fetch all children in the family to get their allergies and medications
          const childrenQuery = query(
            collection(db, 'children'),
            where('familyId', '==', currentFamilyId)
          );
          
          const childrenSnapshot = await getDocs(childrenQuery);
          const allAllergies = new Set();
          const allMedications = new Set();
          
          childrenSnapshot.docs.forEach(doc => {
            const childData = doc.data();
            // Skip the current child if editing
            if (doc.id === childData.id) return;
            
            // Collect allergies
            if (childData.allergies && Array.isArray(childData.allergies)) {
              childData.allergies.forEach(allergy => {
                if (allergy.name) {
                  allAllergies.add(allergy.name.toLowerCase());
                }
              });
            }
            
            // Collect medications
            if (childData.medications && Array.isArray(childData.medications)) {
              childData.medications.forEach(medication => {
                if (medication.name) {
                  allMedications.add(medication.name.toLowerCase());
                }
              });
            }
          });
          
          setFamilyAllergies(Array.from(allAllergies));
          setFamilyMedications(Array.from(allMedications));
        }
      } catch (error) {
        console.error('Error fetching family data:', error);
      }
    };

    fetchFamilyData();
  }, [childData]);

  // Fetch recurring activities for the current child
  useEffect(() => {
    if (!familyId || !childData?.id) {
      setRecurringActivities([]);
      return;
    }

    let unsubscribe = null;

    try {
      const activitiesQuery = query(
        collection(db, 'recurringActivities'),
        where('familyId', '==', familyId),
        where('assignedChildren', 'array-contains', childData.id)
      );

      unsubscribe = onSnapshot(
        activitiesQuery, 
        (snapshot) => {
          try {
            const activitiesData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setRecurringActivities(activitiesData);
          } catch (error) {
            console.warn('Error processing recurring activities snapshot:', error);
            setRecurringActivities([]);
          }
        },
        (error) => {
          console.warn('Error fetching recurring activities:', error);
          setRecurringActivities([]);
        }
      );
    } catch (error) {
      console.warn('Error setting up recurring activities listener:', error);
      setRecurringActivities([]);
    }

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('Error unsubscribing from recurring activities:', error);
        }
      }
    };
  }, [familyId, childData?.id]);

  // Update form data when childData changes (for editing mode)
  useEffect(() => {
    if (childData && (childData.schoolSchedule || childData.scheduleType || childData.allergies?.length || childData.medications?.length)) {
      console.log('Updating form data with childData:', childData);
      setFormData(prev => ({
        ...prev,
        allergies: childData.allergies || prev.allergies,
        medications: childData.medications || prev.medications,
        carePreferences: childData.carePreferences || prev.carePreferences,
        schoolSchedule: childData.schoolSchedule || prev.schoolSchedule,
        scheduleType: childData.scheduleType || prev.scheduleType,
        emergencyContacts: childData.emergencyContacts || prev.emergencyContacts
      }));
    }
  }, [childData]);

  // Set up real-time listener for edit mode to sync changes immediately
  useEffect(() => {
    if (!isEditing || !childData?.id) return;

    console.log('Setting up real-time listener for child:', childData.id);
    
    const childRef = doc(db, 'children', childData.id);
    const unsubscribe = onSnapshot(childRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const updatedData = docSnapshot.data();
        console.log('Real-time update received for child:', updatedData);
        
        setFormData(prev => ({
          ...prev,
          phoneNumber: updatedData.phoneNumber || prev.phoneNumber,
          allergies: updatedData.allergies || prev.allergies,
          medications: updatedData.medications || prev.medications,
          carePreferences: updatedData.carePreferences || prev.carePreferences,
          schoolSchedule: updatedData.schoolSchedule || prev.schoolSchedule,
          scheduleType: updatedData.scheduleType || prev.scheduleType,
          pickupPerson: updatedData.pickupPerson || prev.pickupPerson,
          schoolInfo: updatedData.schoolInfo || prev.schoolInfo
        }));
      }
    }, (error) => {
      console.error('Error listening to child updates:', error);
    });

    return () => {
      console.log('Cleaning up real-time listener for child:', childData.id);
      unsubscribe();
    };
  }, [isEditing, childData?.id]);

  // Load existing draft data on component mount
  useEffect(() => {
    const loadDraftData = async () => {
      // Skip draft loading for editing mode (no tempId)
      if (!auth.currentUser || !childData.tempId) {
        setIsLoadingDraft(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (!userDoc.exists()) {
          setIsLoadingDraft(false);
          return;
        }
        
        const familyId = userDoc.data().familyId;
        if (!familyId) {
          setIsLoadingDraft(false);
          return;
        }

        const draftRef = doc(db, 'families', familyId, 'childDrafts', childData.tempId);
        const draftDoc = await getDoc(draftRef);
        
        if (draftDoc.exists()) {
          const draftData = draftDoc.data();
          console.log('Loading existing draft data:', draftData);
          
          // Merge draft data with current form data
          setFormData(prev => ({
            allergies: draftData.allergies || prev.allergies,
            medications: draftData.medications || prev.medications,
            carePreferences: {
              ...prev.carePreferences,
              ...(draftData.carePreferences || {}),
              quickNotes: draftData.carePreferences?.quickNotes || ''
            },
            emergencyContacts: draftData.emergencyContacts || prev.emergencyContacts,
            schoolSchedule: draftData.schoolSchedule || prev.schoolSchedule,
            scheduleType: draftData.scheduleType || prev.scheduleType,
            scheduleLastModified: draftData.scheduleLastModified || null
          }));

          // Update input states if quick notes exist
          if (draftData.carePreferences?.quickNotes) {
            setInputStates(prev => ({
              ...prev,
              quickNotes: draftData.carePreferences.quickNotes
            }));
          }
        }
      } catch (error) {
        console.warn('Could not load draft data:', error);
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadDraftData();
  }, [childData.tempId]);

  // Save care data to Firestore immediately
  const saveCareDataToFirestore = async (updatedData) => {
    if (!auth.currentUser) {
      console.log('Cannot save: no user authenticated');
      return false;
    }

    // Handle editing mode differently - save directly to child document
    if (!childData.tempId && childData.id) {
      try {
        setIsSaving(true);
        if (onSaveStatusChange) onSaveStatusChange('saving');
        
        console.log('Editing mode: saving care data to child document', childData.id);
        
        // Update existing child document directly
        const childRef = doc(db, 'children', childData.id);
        await updateDoc(childRef, {
          phoneNumber: updatedData.phoneNumber || '',
          allergies: updatedData.allergies || [],
          medications: updatedData.medications || [],
          carePreferences: {
            napTimes: updatedData.carePreferences?.napTimes || [],
            bedtime: updatedData.carePreferences?.bedtime || null,
            mealPreferences: updatedData.carePreferences?.mealPreferences || [],
            dailyRoutine: updatedData.carePreferences?.dailyRoutine || null,
            weeklyActivities: updatedData.carePreferences?.weeklyActivities || [],
            quickNotes: updatedData.carePreferences?.quickNotes || '',
            lastModified: updatedData.carePreferences?.lastModified || null
          },
          schoolSchedule: updatedData.schoolSchedule || null,
          scheduleType: updatedData.scheduleType || null,
          pickupPerson: updatedData.pickupPerson || null,
          schoolInfo: updatedData.schoolInfo || null,
          scheduleLastModified: updatedData.scheduleLastModified || null,
          lastUpdated: new Date()
        });

        console.log('✅ Care data saved to existing child document');
        if (onSaveStatusChange) onSaveStatusChange('saved');
        setTimeout(() => {
          if (onSaveStatusChange) onSaveStatusChange(null);
        }, 2000);
        return true;
        
      } catch (error) {
        console.error('❌ Error saving care data to child document:', error);
        if (onSaveStatusChange) onSaveStatusChange('error');
        
        // Auto-retry after 2 seconds
        setTimeout(() => {
          saveCareDataToFirestore(updatedData);
        }, 2000);
        return false;
      } finally {
        setIsSaving(false);
      }
    }

    // Handle new child mode - save to draft document
    if (!childData.tempId) {
      console.log('No tempId and no child ID - cannot save');
      return false;
    }

    try {
      setIsSaving(true);
      if (onSaveStatusChange) onSaveStatusChange('saving');
      
      // Get user's family document
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }
      
      const familyId = userDoc.data().familyId;
      if (!familyId) {
        throw new Error('No family ID found for user');
      }

      // Save to child's draft document in Firestore using setDoc with merge
      const childDraftRef = doc(db, 'families', familyId, 'childDrafts', childData.tempId);
      
      await setDoc(childDraftRef, {
        // Preserve existing basic info
        name: childData.name || '',
        dateOfBirth: childData.dateOfBirth || null,
        phoneNumber: childData.phoneNumber || '',
        profilePictureUrl: childData.profilePictureUrl || null,
        tempId: childData.tempId,
        // Update care info
        allergies: updatedData.allergies || [],
        medications: updatedData.medications || [],
        carePreferences: {
          napTimes: updatedData.carePreferences?.napTimes || [],
          bedtime: updatedData.carePreferences?.bedtime || null,
          mealPreferences: updatedData.carePreferences?.mealPreferences || [],
          dailyRoutine: updatedData.carePreferences?.dailyRoutine || null,
          weeklyActivities: updatedData.carePreferences?.weeklyActivities || [],
          quickNotes: updatedData.carePreferences?.quickNotes || '',
          lastModified: updatedData.carePreferences?.lastModified || null
        },
        schoolSchedule: updatedData.schoolSchedule || childData.schoolSchedule || null,
        scheduleType: updatedData.scheduleType || childData.scheduleType || null,
        pickupPerson: updatedData.pickupPerson || childData.pickupPerson || null,
        schoolInfo: updatedData.schoolInfo || childData.schoolInfo || null,
        scheduleLastModified: updatedData.scheduleLastModified || null,
        // Metadata
        lastUpdated: new Date(),
        step: 'careInfo',
        createdBy: auth.currentUser.uid,
        familyId: familyId
      }, { merge: true });

      if (onSaveStatusChange) onSaveStatusChange('saved');
      setTimeout(() => {
        if (onSaveStatusChange) onSaveStatusChange(null);
      }, 2000);
      return true;
      
    } catch (error) {
      console.error('Error saving care data:', error);
      if (onSaveStatusChange) onSaveStatusChange('error');
      
      // Auto-retry after 2 seconds
      setTimeout(() => {
        saveCareDataToFirestore(updatedData);
      }, 2000);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setInputStates(prev => ({ ...prev, [field]: value }));
    
    if (field === 'allergyInput') {
      // Combine common allergies with family-specific ones
      const allAllergySuggestions = [...COMMON_ALLERGIES, ...familyAllergies];
      setSuggestions(prev => ({
        ...prev,
        allergies: filterSuggestions(value, allAllergySuggestions)
      }));
    } else if (field === 'medicationInput') {
      // Combine common medications with family-specific ones
      const allMedicationSuggestions = [...COMMON_MEDICATIONS, ...familyMedications];
      setSuggestions(prev => ({
        ...prev,
        medications: filterSuggestions(value, allMedicationSuggestions)
      }));
    }
  };

  const addItem = async (type, value) => {
    if (!value.trim()) return;
    
    const newItem = {
      id: Date.now().toString(),
      name: value.trim(),
      ...(type === 'allergies' ? { severity: 'mild' } : {}),
      ...(type === 'medications' ? { dosage: '', frequency: 'as needed' } : {})
    };

    const updatedFormData = {
      ...formData,
      [type]: [...formData[type], newItem]
    };

    setFormData(updatedFormData);

    // Save to database immediately
    await saveCareDataToFirestore(updatedFormData);

    const inputField = type === 'allergies' ? 'allergyInput' : 'medicationInput';
    setInputStates(prev => ({ ...prev, [inputField]: '' }));
    setSuggestions(prev => ({ ...prev, [type]: [] }));
  };

  const removeItem = async (type, id) => {
    const updatedFormData = {
      ...formData,
      [type]: formData[type].filter(item => item.id !== id)
    };

    setFormData(updatedFormData);

    // Save to database immediately
    await saveCareDataToFirestore(updatedFormData);
  };

  const addSuggestion = (type, suggestion) => {
    addItem(type, suggestion);
  };

  const handleKeyPress = (e, type) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputField = type === 'allergies' ? 'allergyInput' : 'medicationInput';
      addItem(type, inputStates[inputField]);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleRoutineSave = async (routine) => {
    const updatedFormData = {
      ...formData,
      carePreferences: {
        ...formData.carePreferences,
        dailyRoutine: routine.dailyRoutine,
        lastModified: routine.lastModified
      }
    };

    setFormData(updatedFormData);

    // Save routine data to database immediately
    await saveCareDataToFirestore(updatedFormData);
    
    setShowRoutineBuilder(false);
  };

  const handleSchoolScheduleSave = async (scheduleData) => {
    const updatedFormData = {
      ...formData,
      schoolSchedule: scheduleData.schoolSchedule,
      scheduleType: scheduleData.scheduleType,
      pickupPerson: scheduleData.pickupPerson,
      schoolInfo: scheduleData.schoolInfo,
      scheduleLastModified: scheduleData.lastModified
    };

    setFormData(updatedFormData);

    // Save school schedule data to database immediately
    await saveCareDataToFirestore(updatedFormData);
    
    setShowSchoolScheduleBuilder(false);
  };

  const handleSaveActivity = async (activityData) => {
    try {
      if (editingActivity) {
        // Update existing activity
        const finalActivity = {
          ...activityData,
          updatedAt: Timestamp.now()
        };
        await updateDoc(doc(db, 'recurringActivities', editingActivity.id), finalActivity);
      } else {
        // Create new activity
        const finalActivity = {
          ...activityData,
          familyId,
          createdBy: auth.currentUser.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        await addDoc(collection(db, 'recurringActivities'), finalActivity);
      }

      setShowRecurringActivityBuilder(false);
      setEditingActivity(null);
      setSelectedActivity(null);
    } catch (error) {
      console.error('Error saving activity:', error);
      throw error;
    }
  };

  const handleEditActivity = (activity) => {
    setEditingActivity(activity);
    setSelectedActivity(null);
    setShowRecurringActivityBuilder(true);
  };

  const handleDeleteActivity = async (activity) => {
    if (window.confirm(`Are you sure you want to delete "${activity.name}"? This cannot be undone.`)) {
      try {
        console.log('Attempting to delete activity:', activity.id, 'for family:', activity.familyId);
        await deleteDoc(doc(db, 'recurringActivities', activity.id));
        console.log('Activity deleted successfully');
        setSelectedActivity(null);
      } catch (error) {
        console.error('Error deleting activity:', error);
        console.error('Activity data:', activity);
        alert('Failed to delete activity. Please try again.');
      }
    }
  };

  const handleSave = () => {
    const completeData = {
      ...formData,
      carePreferences: {
        ...formData.carePreferences,
        quickNotes: inputStates.quickNotes
      }
    };
    console.log('Saving streamlined care data:', completeData);
    
    if (isEditing && onCancel) {
      // In edit mode, call onCancel to close the modal after saving
      onCancel();
    } else {
      // In add mode, continue to next step
      onNext(completeData);
    }
  };

  const handleSkipStep = () => {
    onSkip(formData);
  };

  // Helper function to convert time string to minutes for sorting
  const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Render routine schedule in chronological order
  const renderRoutineSchedule = (routine) => {
    const scheduleItems = [];

    // Add wake up time
    if (routine.wakeUpTime) {
      scheduleItems.push({
        time: routine.wakeUpTime,
        minutes: timeToMinutes(routine.wakeUpTime),
        icon: '🌅',
        label: 'Wake up',
        type: 'wake'
      });
    }

    // Add breakfast
    if (routine.mealTimes?.breakfast) {
      scheduleItems.push({
        time: routine.mealTimes.breakfast,
        minutes: timeToMinutes(routine.mealTimes.breakfast),
        icon: '🥣',
        label: 'Breakfast',
        type: 'meal'
      });
    }

    // Add lunch times (array)
    if (routine.mealTimes?.lunch && Array.isArray(routine.mealTimes.lunch)) {
      routine.mealTimes.lunch.forEach((lunchTime, index) => {
        if (lunchTime) {
          scheduleItems.push({
            time: lunchTime,
            minutes: timeToMinutes(lunchTime),
            icon: '🥗',
            label: routine.mealTimes.lunch.length > 1 ? `Lunch ${index + 1}` : 'Lunch',
            type: 'meal'
          });
        }
      });
    }

    // Add nap times
    if (routine.napTimes && Array.isArray(routine.napTimes)) {
      routine.napTimes.forEach((nap, index) => {
        if (nap.startTime) {
          scheduleItems.push({
            time: nap.startTime,
            minutes: timeToMinutes(nap.startTime),
            icon: '😴',
            label: routine.napTimes.length > 1 ? `Nap ${index + 1}` : 'Nap',
            detail: `${nap.duration} min`,
            type: 'nap'
          });
        }
      });
    }

    // Add snack times
    if (routine.mealTimes?.snacks && Array.isArray(routine.mealTimes.snacks)) {
      routine.mealTimes.snacks.forEach((snackTime, index) => {
        if (snackTime) {
          scheduleItems.push({
            time: snackTime,
            minutes: timeToMinutes(snackTime),
            icon: '🍎',
            label: routine.mealTimes.snacks.length > 1 ? `Snack ${index + 1}` : 'Snack',
            type: 'snack'
          });
        }
      });
    }

    // Add dinner
    if (routine.mealTimes?.dinner) {
      scheduleItems.push({
        time: routine.mealTimes.dinner,
        minutes: timeToMinutes(routine.mealTimes.dinner),
        icon: '🍽️',
        label: 'Dinner',
        type: 'meal'
      });
    }

    // Add bedtime
    if (routine.bedtime) {
      scheduleItems.push({
        time: routine.bedtime,
        minutes: timeToMinutes(routine.bedtime),
        icon: '🌙',
        label: 'Bedtime',
        type: 'sleep'
      });
    }

    // Sort by time
    scheduleItems.sort((a, b) => a.minutes - b.minutes);

    return (
      <div style={styles.scheduleGrid}>
        {scheduleItems.map((item, index) => (
          <div key={`${item.type}-${index}`} style={styles.scheduleItem}>
            <div style={styles.scheduleIcon}>{item.icon}</div>
            <div style={styles.scheduleContent}>
              <div style={styles.scheduleTime}>{item.time}</div>
              <div style={styles.scheduleLabel}>
                {item.label}
                {item.detail && <span style={styles.scheduleDetail}> ({item.detail})</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render school schedule summary
  const renderSchoolSchedule = (schedule) => {
    if (!schedule) return null;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayLabels = {
      monday: 'Mon',
      tuesday: 'Tue', 
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri'
    };

    const scheduleItems = [];

    days.forEach(day => {
      if (schedule[day] && schedule[day].length > 0) {
        schedule[day].forEach(block => {
          scheduleItems.push({
            day: dayLabels[day],
            type: block.type,
            startTime: block.startTime,
            endTime: block.endTime,
            isKinderbetreuung: block.type === 'Kinderbetreuung'
          });
        });
      }
    });

    if (scheduleItems.length === 0) {
      return <div style={styles.noScheduleText}>No schedule set</div>;
    }

    return (
      <div style={styles.schoolScheduleItems}>
        {scheduleItems.map((item, index) => (
          <div key={index} style={styles.schoolScheduleItem}>
            <div style={styles.schoolDayLabel}>{item.day}</div>
            <div style={styles.schoolTimeRange}>
              {item.startTime} - {item.endTime}
            </div>
            <div style={{
              ...styles.schoolTypeLabel,
              ...(item.isKinderbetreuung ? styles.kinderbetreuungLabel : {})
            }}>
              {item.type}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render recurring activities list
  const renderRecurringActivities = () => {
    if (recurringActivities.length === 0) {
      return (
        <div style={styles.noActivitiesText}>
          No activities set up for this child yet.
        </div>
      );
    }

    return (
      <div style={styles.activitiesList}>
        {recurringActivities.map((activity) => {
          const nextOccurrence = getNextOccurrences(activity, 1)[0];
          return (
            <div key={activity.id} style={styles.activityItem} onClick={() => setSelectedActivity(activity)}>
              <div style={styles.activityHeader}>
                <div style={styles.activityName}>{activity.name}</div>
                <div style={styles.activityTime}>
                  {activity.time} ({activity.duration} min)
                </div>
              </div>
              <div style={styles.activityDetails}>
                <div style={styles.activityLocation}>
                  {activity.location.name || activity.location.address}
                </div>
                <div style={styles.activityRecurrence}>
                  {formatRecurrenceDescription(activity.recurrence)}
                </div>
                {nextOccurrence && (
                  <div style={styles.activityNext}>
                    Next: {nextOccurrence.date.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render activity detail modal
  const renderActivityDetail = (activity) => {
    if (!activity) return null;

    const nextOccurrences = getNextOccurrences(activity, 5);

    return (
      <div style={styles.modalOverlay} onClick={() => setSelectedActivity(null)}>
        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>{activity.name}</h2>
            <div style={styles.modalActions}>
              <button 
                style={styles.editButton} 
                onClick={() => handleEditActivity(activity)}
              >
                Edit
              </button>
              <button 
                style={styles.deleteButton} 
                onClick={() => handleDeleteActivity(activity)}
              >
                Delete
              </button>
              <button style={styles.modalClose} onClick={() => setSelectedActivity(null)}>✕</button>
            </div>
          </div>
          
          <div style={styles.modalBody}>
            <div style={styles.activityInfoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Time:</span>
                <span>{activity.time} ({activity.duration} minutes)</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Schedule:</span>
                <span>{formatRecurrenceDescription(activity.recurrence)}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Location:</span>
                <span>{activity.location.name || activity.location.address}</span>
              </div>
              {activity.contact?.name && (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Contact:</span>
                  <span>{activity.contact.name} ({activity.contact.role})</span>
                </div>
              )}
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Drop-off:</span>
                <span>{activity.transportation?.dropoff === 'parent' ? 'Parent' : activity.transportation?.dropoff === 'au_pair' ? 'Au Pair' : 'Child alone'}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Pick-up:</span>
                <span>{activity.transportation?.pickup === 'parent' ? 'Parent' : activity.transportation?.pickup === 'au_pair' ? 'Au Pair' : 'Child alone'}</span>
              </div>
            </div>

            {nextOccurrences.length > 0 && (
              <div style={styles.occurrencesSection}>
                <h3 style={styles.occurrencesTitle}>Upcoming Occurrences</h3>
                <div style={styles.occurrencesList}>
                  {nextOccurrences.map((occurrence, index) => (
                    <div key={index} style={styles.occurrenceItem}>
                      <div style={styles.occurrenceDate}>
                        {occurrence.date.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div style={styles.occurrenceTime}>
                        {occurrence.time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activity.requirements?.items?.length > 0 && (
              <div style={styles.itemsSection}>
                <h3 style={styles.itemsTitle}>Items to Bring</h3>
                <ul style={styles.itemsList}>
                  {activity.requirements.items.filter(Boolean).map((item, index) => (
                    <li key={index} style={styles.itemsListItem}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {activity.requirements?.notes && (
              <div style={styles.notesSection}>
                <h3 style={styles.notesTitle}>Notes</h3>
                <p style={styles.notesText}>{activity.requirements.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Show routine builder if active
  if (showRoutineBuilder) {
    return (
      <BasicRoutineBuilder
        childData={childData}
        initialRoutine={formData.carePreferences?.dailyRoutine}
        onSave={handleRoutineSave}
        onCancel={() => setShowRoutineBuilder(false)}
      />
    );
  }

  // Show school schedule builder if active
  if (showSchoolScheduleBuilder) {
    return (
      <AddChildSchoolScheduleTable
        childData={childData}
        initialData={{
          schoolSchedule: formData.schoolSchedule,
          scheduleType: formData.scheduleType,
          pickupPerson: formData.pickupPerson,
          schoolInfo: formData.schoolInfo
        }}
        onNext={handleSchoolScheduleSave}
        onBack={() => setShowSchoolScheduleBuilder(false)}
      />
    );
  }

  // Show recurring activity builder if active
  if (showRecurringActivityBuilder) {
    return (
      <RecurringActivityBuilder
        children={childData ? [childData] : []}
        onSave={handleSaveActivity}
        onCancel={() => {
          setShowRecurringActivityBuilder(false);
          setEditingActivity(null);
        }}
        editingActivity={editingActivity}
        primaryChildId={childData?.id}
      />
    );
  }

  // Show loading indicator while draft data is loading
  if (isLoadingDraft) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={onBack}>←</button>
          <h1 style={styles.title}>Care Details & Setup</h1>
          <div style={styles.saveStatusContainer}>
            <div style={{ ...styles.saveStatus, ...styles.saveStatusSaving }}>
              📋
            </div>
          </div>
        </div>
        <div style={styles.content}>
          <div style={styles.loadingState}>
            <div style={styles.loadingIcon}>📋</div>
            <h2 style={styles.loadingTitle}>Loading care details...</h2>
            <p style={styles.loadingText}>Checking for existing data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack}>←</button>
        <h1 style={styles.title}>
          {isEditing ? `Editing: ${childData.name}'s Profile` : 'Care Details & Setup'}
        </h1>
        <div style={styles.saveStatusContainer}>
          {/* Save status removed - handled globally */}
        </div>
      </div>
      
      {/* Edit Mode Header with Child Info */}
      {isEditing && (
        <div style={styles.editModeHeader}>
          <div style={styles.childProfileHeader}>
            <div style={styles.childAvatar}>
              {childData.profilePictureUrl ? (
                <img 
                  src={childData.profilePictureUrl} 
                  alt={childData.name}
                  style={styles.childAvatarImage}
                />
              ) : (
                <span>{childData.name?.charAt(0)?.toUpperCase() || 'C'}</span>
              )}
            </div>
            <div style={styles.childInfo}>
              <h2 style={styles.childName}>{childData.name}</h2>
              <p style={styles.childAge}>
                {childData.dateOfBirth ? `${Math.floor((new Date() - new Date(childData.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))} years old` : 'Age not set'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div style={styles.content}>
        {!isEditing && (
          <div style={styles.progressIndicator}>
            <div style={styles.progressBar}>
              <div style={styles.progressFill}></div>
            </div>
            <div style={styles.progressText}>Step 2 of 2</div>
          </div>
        )}

        <div style={styles.iconSection}>
          <div style={styles.careIcon}>🏥</div>
          <h2 style={styles.subtitle}>Care Details for {childData.name}</h2>
          <p style={styles.infoText}>
            Let's gather essential care information and set up daily routines
          </p>
        </div>

        <div style={styles.formSection}>
          {/* Essential Care Section - Always Visible */}
          <div style={styles.essentialSection}>
            <h3 style={styles.sectionTitle}>Essential Care Information</h3>
            
            {/* Phone Number - Edit Mode Only */}
            {isEditing && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Phone Number <span style={styles.optional}>(optional)</span>
                </label>
                <input
                  type="tel"
                  style={styles.quickInput}
                  value={childData.phoneNumber || ''}
                  onChange={(e) => {
                    const updatedData = { ...formData, phoneNumber: e.target.value };
                    setFormData(updatedData);
                    // Auto-save with debounce
                    clearTimeout(window.phoneNumberSaveTimeout);
                    window.phoneNumberSaveTimeout = setTimeout(() => {
                      saveCareDataToFirestore(updatedData);
                    }, 1000);
                  }}
                  placeholder="+49 176 12345678"
                />
                <div style={styles.helpText}>
                  For older children or emergency contact when au pair is out
                </div>
              </div>
            )}
            
            {/* Allergies - Quick Add */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Allergies <span style={styles.optional}>(tap to add if any)</span>
              </label>
              <div style={styles.quickAddContainer}>
                <input
                  type="text"
                  style={styles.quickInput}
                  value={inputStates.allergyInput}
                  onChange={(e) => handleInputChange('allergyInput', e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'allergies')}
                  placeholder="e.g., peanuts, dairy..."
                />
                {inputStates.allergyInput && (
                  <button 
                    style={styles.quickAddButton}
                    onClick={() => addItem('allergies', inputStates.allergyInput)}
                  >
                    Add
                  </button>
                )}
              </div>
              
              {/* Quick suggestions */}
              {suggestions.allergies.length > 0 && (
                <div style={styles.quickSuggestions}>
                  {suggestions.allergies.slice(0, 3).map(suggestion => (
                    <button
                      key={suggestion}
                      style={styles.suggestionChip}
                      onClick={() => addSuggestion('allergies', suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {formData.allergies.length > 0 && (
                <div style={styles.itemsList}>
                  {formData.allergies.map(allergy => (
                    <div key={allergy.id} style={styles.itemChip}>
                      <span>{allergy.name}</span>
                      <button 
                        style={styles.removeChip}
                        onClick={() => removeItem('allergies', allergy.id)}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Medications - Quick Add */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Medications <span style={styles.optional}>(tap to add if any)</span>
              </label>
              <div style={styles.quickAddContainer}>
                <input
                  type="text"
                  style={styles.quickInput}
                  value={inputStates.medicationInput}
                  onChange={(e) => handleInputChange('medicationInput', e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'medications')}
                  placeholder="e.g., vitamins, inhalers..."
                />
                {inputStates.medicationInput && (
                  <button 
                    style={styles.quickAddButton}
                    onClick={() => addItem('medications', inputStates.medicationInput)}
                  >
                    Add
                  </button>
                )}
              </div>

              {suggestions.medications.length > 0 && (
                <div style={styles.quickSuggestions}>
                  {suggestions.medications.slice(0, 3).map(suggestion => (
                    <button
                      key={suggestion}
                      style={styles.suggestionChip}
                      onClick={() => addSuggestion('medications', suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {formData.medications.length > 0 && (
                <div style={styles.itemsList}>
                  {formData.medications.map(medication => (
                    <div key={medication.id} style={styles.itemChip}>
                      <span>{medication.name}</span>
                      <button 
                        style={styles.removeChip}
                        onClick={() => removeItem('medications', medication.id)}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Optional Sections - Expandable */}
          <div style={styles.optionalSections}>
            <h3 style={styles.sectionTitle}>Optional Setup <span style={styles.optional}>(can be added later)</span></h3>
            
            {/* Daily Routine Section */}
            <div style={styles.expandableCard}>
              <button 
                style={styles.expandHeader}
                onClick={() => toggleSection('routine')}
              >
                <div style={styles.expandInfo}>
                  <span style={styles.expandTitle}>
                    🌅 Daily Routine
                    {formData.carePreferences?.dailyRoutine && <span style={styles.completed}>✓</span>}
                  </span>
                  <span style={styles.expandSubtitle}>
                    {formData.carePreferences?.dailyRoutine 
                      ? 'Routine set up' 
                      : 'Set wake time, meals, naps, bedtime'
                    }
                  </span>
                </div>
                <span style={styles.expandIcon}>
                  {expandedSections.routine ? '▼' : '▶'}
                </span>
              </button>
              
              {expandedSections.routine && (
                <div style={styles.expandContent}>
                  {!formData.carePreferences?.dailyRoutine ? (
                    <button
                      style={styles.actionButton}
                      onClick={() => setShowRoutineBuilder(true)}
                    >
                      Create Daily Routine
                    </button>
                  ) : (
                    <div style={styles.routineSummary}>
                      <div style={styles.routineSchedule}>
                        {renderRoutineSchedule(formData.carePreferences.dailyRoutine)}
                      </div>
                      <button
                        style={styles.editButton}
                        onClick={() => setShowRoutineBuilder(true)}
                      >
                        Edit Routine
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* School Schedule Section */}
            <div style={styles.expandableCard}>
              <button 
                style={styles.expandHeader}
                onClick={() => toggleSection('schoolSchedule')}
              >
                <div style={styles.expandInfo}>
                  <div style={styles.expandTitleRow}>
                    <span style={styles.expandTitle}>
                      {formData.scheduleType === 'kindergarten' ? '🧸 Kindergarten Schedule' : '📚 School Schedule'}
                      {formData.schoolSchedule && <span style={styles.completed}>✓</span>}
                    </span>
                  </div>
                  <span style={styles.expandSubtitle}>
                    {formData.schoolSchedule 
                      ? `${formData.scheduleType === 'kindergarten' ? 'Kindergarten' : 'School'} schedule configured` 
                      : `Set ${formData.scheduleType === 'kindergarten' ? 'flexible kindergarten' : 'structured school'} times`
                    }
                  </span>
                </div>
                <span style={styles.expandIcon}>
                  {expandedSections.schoolSchedule ? '▼' : '▶'}
                </span>
              </button>
              
              {expandedSections.schoolSchedule && (
                <div style={styles.expandContent}>
                  {!formData.schoolSchedule ? (
                    <>
                      <p style={styles.expandDescription}>
                        {formData.scheduleType === 'kindergarten' 
                          ? 'Configure flexible kindergarten hours that may vary by day'
                          : 'Set up structured school schedule with consistent daily hours'
                        }
                      </p>
                      <button 
                        style={styles.actionButton}
                        onClick={() => setShowSchoolScheduleBuilder(true)}
                      >
                        Set Up {formData.scheduleType === 'kindergarten' ? 'Kindergarten' : 'School'} Schedule
                      </button>
                    </>
                  ) : (
                    <div style={styles.schoolSummary}>
                      <div style={styles.scheduleTypeDisplay}>
                        {formData.scheduleType === 'kindergarten' ? '🧸 Kindergarten' : '📚 School'} Schedule
                      </div>
                      <div style={styles.schoolScheduleGrid}>
                        {renderSchoolSchedule(formData.schoolSchedule)}
                      </div>
                      <button
                        style={styles.editButton}
                        onClick={() => setShowSchoolScheduleBuilder(true)}
                      >
                        Edit Schedule
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recurring Activities Section */}
            <div style={styles.expandableCard}>
              <button 
                style={styles.expandHeader}
                onClick={() => toggleSection('recurringActivities')}
              >
                <div style={styles.expandInfo}>
                  <div style={styles.expandTitleRow}>
                    <span style={styles.expandTitle}>
                      🏃 Recurring Activities
                      {recurringActivities.length > 0 && <span style={styles.completed}>✓</span>}
                    </span>
                  </div>
                  <span style={styles.expandSubtitle}>
                    {recurringActivities.length > 0 
                      ? `${recurringActivities.length} activity(s) scheduled` 
                      : 'Set up sports, lessons, and regular appointments'
                    }
                  </span>
                </div>
                <span style={styles.expandIcon}>
                  {expandedSections.recurringActivities ? '▼' : '▶'}
                </span>
              </button>
              
              {expandedSections.recurringActivities && (
                <div style={styles.expandContent}>
                  {renderRecurringActivities()}
                  <button
                    style={styles.actionButton}
                    onClick={() => setShowRecurringActivityBuilder(true)}
                  >
                    Add New Activity
                  </button>
                </div>
              )}
            </div>

            {/* Emergency Contacts moved to family level - see Family Management */}
          </div>

          {/* Quick Notes */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Quick Notes <span style={styles.optional}>(optional)</span>
            </label>
            <textarea
              style={styles.textarea}
              value={inputStates.quickNotes}
              onChange={(e) => handleInputChange('quickNotes', e.target.value)}
              placeholder="Any other important information about your child..."
              rows={3}
            />
          </div>
        </div>
      </div>

      <div style={styles.buttonSection}>
        {isEditing ? (
          // Edit mode: Show Cancel and Save
          <>
            <button style={styles.skipButton} onClick={onCancel}>
              Cancel
            </button>
            <button style={styles.continueButton} onClick={handleSave}>
              Save Changes
            </button>
          </>
        ) : (
          // Add mode: Show Skip for Now and Continue
          <>
            <button style={styles.skipButton} onClick={handleSkipStep}>
              Skip for Now
            </button>
            <button style={styles.continueButton} onClick={handleSave}>
              Continue
            </button>
          </>
        )}
      </div>
      
      {/* Activity Detail Modal */}
      {selectedActivity && renderActivityDetail(selectedActivity)}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: 'var(--md-sys-color-surface)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    position: 'relative',
    overflow: 'hidden'
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    backgroundColor: 'var(--md-sys-color-surface-container)',
    boxShadow: 'var(--md-sys-elevation-level1)'
  },
  
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: 'var(--md-sys-color-primary)'
  },
  
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    margin: 0
  },
  
  saveStatusContainer: {
    width: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  saveStatus: {
    fontSize: '16px',
    transition: 'all 0.3s ease'
  },
  
  saveStatusSaving: {
    animation: 'pulse 1.5s infinite'
  },
  
  saveStatusSuccess: {
    color: '#34C759'
  },
  
  saveStatusError: {
    color: 'var(--md-sys-color-error)'
  },
  
  content: {
    flex: 1,
    padding: '20px',
    paddingBottom: '180px', // Increased to account for fixed footer
    overflowY: 'auto',
    overflowX: 'hidden',
    height: '100%'
  },
  
  progressIndicator: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    width: '100%'
  },
  
  progressBar: {
    flex: '1 1 auto',
    height: '4px',
    backgroundColor: 'var(--md-sys-color-surface-variant)',
    borderRadius: '2px',
    overflow: 'hidden',
    minWidth: '0'
  },
  
  progressFill: {
    width: '66%',
    height: '100%',
    backgroundColor: 'var(--md-sys-color-primary)',
    borderRadius: '2px'
  },
  
  progressText: {
    flex: '0 0 auto',
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  },
  
  iconSection: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  
  careIcon: {
    fontSize: '48px',
    marginBottom: '15px'
  },
  
  subtitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    margin: '0 0 10px 0'
  },
  
  infoText: {
    fontSize: '16px',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: '1.4',
    margin: 0
  },
  
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  
  essentialSection: {
    backgroundColor: 'var(--md-sys-color-surface-container)',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: 'var(--md-sys-elevation-level2)'
  },
  
  optionalSections: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    margin: '0 0 20px 0'
  },
  
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '20px'
  },
  
  label: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '8px'
  },
  
  optional: {
    fontSize: '14px',
    fontWeight: '400',
    color: '#666'
  },
  
  helpText: {
    fontSize: '12px',
    color: 'var(--md-sys-color-outline)',
    marginTop: '4px',
    lineHeight: '1.4'
  },
  
  quickAddContainer: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  
  quickInput: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    fontSize: '16px',
    backgroundColor: 'var(--md-sys-color-surface-container)',
    outline: 'none'
  },
  
  quickAddButton: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  
  quickSuggestions: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px',
    flexWrap: 'wrap'
  },
  
  suggestionChip: {
    backgroundColor: 'var(--md-sys-color-surface)',
    border: '1px solid var(--md-sys-color-outline)',
    borderRadius: '16px',
    padding: '6px 12px',
    fontSize: '12px',
    color: 'var(--md-sys-color-primary)',
    cursor: 'pointer'
  },
  
  itemsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '10px'
  },
  
  itemChip: {
    backgroundColor: 'var(--md-sys-color-primary-container)',
    borderRadius: '16px',
    padding: '6px 12px',
    fontSize: '14px',
    color: 'var(--md-sys-color-on-primary-container)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  
  removeChip: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--md-sys-color-on-primary-container)',
    fontSize: '16px',
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  expandableCard: {
    backgroundColor: 'var(--md-sys-color-surface-container)',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: 'var(--md-sys-elevation-level2)'
  },
  
  expandHeader: {
    width: '100%',
    padding: '16px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    textAlign: 'left'
  },
  
  expandInfo: {
    flex: 1
  },
  
  expandTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  completed: {
    color: 'var(--md-sys-color-primary)',
    fontSize: '14px'
  },
  
  expandSubtitle: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginTop: '2px',
    display: 'block'
  },
  
  expandIcon: {
    color: 'var(--md-sys-color-outline)',
    fontSize: '12px',
    marginLeft: '10px'
  },
  
  expandContent: {
    padding: '0 20px 20px 20px',
    borderTop: '1px solid var(--md-sys-color-outline-variant)'
  },
  
  expandDescription: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: '0 0 15px 0',
    lineHeight: '1.4'
  },
  
  actionButton: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    width: '100%'
  },
  
  editButton: {
    backgroundColor: 'var(--md-sys-color-surface)',
    color: 'var(--md-sys-color-primary)',
    border: '1px solid var(--md-sys-color-outline)',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  
  routineSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },

  routineSchedule: {
    marginBottom: '5px'
  },

  scheduleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '8px',
    marginBottom: '10px'
  },

  scheduleItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: '8px',
    border: '1px solid #E5E5EA'
  },

  scheduleIcon: {
    fontSize: '16px',
    minWidth: '20px',
    textAlign: 'center'
  },

  scheduleContent: {
    flex: 1,
    minWidth: 0
  },

  scheduleTime: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--md-sys-color-primary)',
    lineHeight: 1
  },

  scheduleLabel: {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface)',
    lineHeight: 1.2,
    marginTop: '2px'
  },

  scheduleDetail: {
    color: 'var(--md-sys-color-on-surface-variant)',
    fontWeight: '400'
  },

  schoolSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },

  scheduleTypeDisplay: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--md-sys-color-primary)',
    marginBottom: '5px'
  },

  schoolScheduleGrid: {
    marginBottom: '10px'
  },

  schoolScheduleItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  schoolScheduleItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: '8px',
    border: '1px solid #E5E5EA'
  },

  schoolDayLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    minWidth: '35px'
  },

  schoolTimeRange: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--md-sys-color-primary)',
    minWidth: '80px'
  },

  schoolTypeLabel: {
    fontSize: '11px',
    padding: '4px 8px',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    borderRadius: '12px',
    fontWeight: '500'
  },

  kinderbetreuungLabel: {
    backgroundColor: 'var(--md-sys-color-tertiary)'
  },

  noScheduleText: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px'
  },

  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center'
  },

  loadingIcon: {
    fontSize: '48px',
    marginBottom: '20px'
  },

  loadingTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    margin: '0 0 10px 0'
  },

  loadingText: {
    fontSize: '16px',
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: 0
  },
  
  textarea: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    fontSize: '16px',
    backgroundColor: 'var(--md-sys-color-surface-container)',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  
  buttonSection: {
    position: 'fixed',
    bottom: '70px', // Add space for bottom navigation
    left: 0,
    right: 0,
    padding: '20px',
    backgroundColor: 'var(--md-sys-color-surface-container)',
    borderTop: '1px solid #E5E5EA',
    display: 'flex',
    gap: '15px',
    zIndex: 100 // Ensure it appears above other elements
  },
  
  skipButton: {
    flex: 1,
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    backgroundColor: 'var(--md-sys-color-surface-container)',
    color: 'var(--md-sys-color-outline)',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  
  continueButton: {
    flex: 2,
    padding: '15px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },

  // Enhanced schedule type styles
  expandTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%'
  },
  
  scheduleTypeBadge: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-primary)',
    padding: '4px 8px',
    borderRadius: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  // Recurring Activities Styles
  noActivitiesText: {
    fontSize: '14px',
    color: 'var(--md-sys-color-outline)',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: '8px',
    marginBottom: '15px'
  },

  activitiesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '15px'
  },

  activityItem: {
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: '8px',
    padding: '12px',
    cursor: 'pointer',
    border: '1px solid var(--md-sys-color-outline-variant)',
    transition: 'all 0.2s ease'
  },

  activityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },

  activityName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000'
  },

  activityTime: {
    fontSize: '14px',
    color: 'var(--md-sys-color-primary)',
    fontWeight: '500'
  },

  activityDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },

  activityLocation: {
    fontSize: '14px',
    color: '#666'
  },

  activityRecurrence: {
    fontSize: '12px',
    color: 'var(--md-sys-color-outline)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  activityNext: {
    fontSize: '12px',
    color: 'var(--md-sys-color-tertiary)',
    fontWeight: '500'
  },

  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--md-sys-color-scrim)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },

  modalContent: {
    backgroundColor: 'var(--md-sys-color-surface-container)',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #E5E5EA'
  },

  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    margin: 0,
    flex: 1
  },

  modalActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },

  editButtonSecondary: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  deleteButton: {
    backgroundColor: 'var(--md-sys-color-error)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  modalClose: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: 'var(--md-sys-color-outline)',
    padding: '5px'
  },

  modalBody: {
    padding: '20px',
    overflow: 'auto'
  },

  activityInfoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',
    marginBottom: '20px'
  },

  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },

  infoLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--md-sys-color-outline)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  occurrencesSection: {
    marginBottom: '20px'
  },

  occurrencesTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '12px'
  },

  occurrencesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  occurrenceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: '8px'
  },

  occurrenceDate: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#000'
  },

  occurrenceTime: {
    fontSize: '14px',
    color: 'var(--md-sys-color-primary)'
  },

  itemsSection: {
    marginBottom: '20px'
  },

  itemsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '12px'
  },

  itemsListSecondary: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  itemsListItem: {
    padding: '8px 12px',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#000'
  },

  notesSection: {
    marginBottom: '20px'
  },

  notesTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '12px'
  },

  notesText: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: '1.5',
    margin: 0
  },
  
  // Edit Mode Header Styles
  editModeHeader: {
    backgroundColor: 'var(--md-sys-color-surface-container)',
    padding: '15px 20px',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)',
    marginBottom: '10px'
  },
  
  childProfileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  
  childAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '30px',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '600',
    overflow: 'hidden'
  },
  
  childAvatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  
  childInfo: {
    flex: 1
  },
  
  childName: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    margin: '0 0 4px 0'
  },
  
  childAge: {
    fontSize: '14px',
    color: 'var(--md-sys-color-outline)',
    margin: 0
  }
};

// Add CSS animation for pulse effect
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
      100% { opacity: 1; transform: scale(1); }
    }
  `;
  if (!document.head.querySelector('style[data-pulse]')) {
    style.setAttribute('data-pulse', 'true');
    document.head.appendChild(style);
  }
}


export default AddChildCareInfoStreamlined;