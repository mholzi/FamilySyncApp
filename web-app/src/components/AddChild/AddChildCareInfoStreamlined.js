import { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { COMMON_ALLERGIES, COMMON_MEDICATIONS, filterSuggestions } from '../../utils/dashboardStates';
import BasicRoutineBuilder from '../RoutineBuilder/BasicRoutineBuilder';
import AddChildSchoolSchedule from './AddChildSchoolSchedule';

function AddChildCareInfoStreamlined({ childData, onNext, onBack, onSkip }) {
  const [formData, setFormData] = useState({
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
    
    // Emergency contacts (optional)
    emergencyContacts: childData.emergencyContacts || []
  });

  const [expandedSections, setExpandedSections] = useState({
    routine: false,
    schoolSchedule: false,
    emergencyContacts: false
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

  const [showRoutineBuilder, setShowRoutineBuilder] = useState(false);
  const [showSchoolScheduleBuilder, setShowSchoolScheduleBuilder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'saved', 'error'
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);

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
  }, [childData.tempId, auth.currentUser]);

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
        setSaveStatus('saving');
        
        console.log('Editing mode: saving care data to child document', childData.id);
        
        // Update existing child document directly
        const childRef = doc(db, 'children', childData.id);
        await updateDoc(childRef, {
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
          emergencyContacts: updatedData.emergencyContacts || [],
          schoolSchedule: updatedData.schoolSchedule || null,
          scheduleType: updatedData.scheduleType || null,
          scheduleLastModified: updatedData.scheduleLastModified || null,
          lastUpdated: new Date()
        });

        console.log('✅ Care data saved to existing child document');
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2000);
        return true;
        
      } catch (error) {
        console.error('❌ Error saving care data to child document:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 3000);
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
      setSaveStatus('saving');
      
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
        emergencyContacts: updatedData.emergencyContacts || childData.emergencyContacts || [],
        schoolSchedule: updatedData.schoolSchedule || childData.schoolSchedule || null,
        scheduleType: updatedData.scheduleType || childData.scheduleType || null,
        scheduleLastModified: updatedData.scheduleLastModified || null,
        // Metadata
        lastUpdated: new Date(),
        step: 'careInfo',
        createdBy: auth.currentUser.uid,
        familyId: familyId
      }, { merge: true });

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
      return true;
      
    } catch (error) {
      console.error('Error saving care data:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setInputStates(prev => ({ ...prev, [field]: value }));
    
    if (field === 'allergyInput') {
      setSuggestions(prev => ({
        ...prev,
        allergies: filterSuggestions(value, COMMON_ALLERGIES)
      }));
    } else if (field === 'medicationInput') {
      setSuggestions(prev => ({
        ...prev,
        medications: filterSuggestions(value, COMMON_MEDICATIONS)
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
      scheduleLastModified: scheduleData.lastModified
    };

    setFormData(updatedFormData);

    // Save school schedule data to database immediately
    await saveCareDataToFirestore(updatedFormData);
    
    setShowSchoolScheduleBuilder(false);
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
    onNext(completeData);
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
      <AddChildSchoolSchedule
        childData={childData}
        initialData={{
          schoolSchedule: formData.schoolSchedule,
          scheduleType: formData.scheduleType
        }}
        onNext={handleSchoolScheduleSave}
        onBack={() => setShowSchoolScheduleBuilder(false)}
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
        <h1 style={styles.title}>Care Details & Setup</h1>
        <div style={styles.saveStatusContainer}>
          {saveStatus && (
            <div style={{
              ...styles.saveStatus,
              ...(saveStatus === 'saved' ? styles.saveStatusSuccess : {}),
              ...(saveStatus === 'error' ? styles.saveStatusError : {}),
              ...(saveStatus === 'saving' ? styles.saveStatusSaving : {})
            }}>
              {saveStatus === 'saving' && '💾'}
              {saveStatus === 'saved' && '✅'}
              {saveStatus === 'error' && '⚠️'}
            </div>
          )}
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.progressIndicator}>
          <div style={styles.progressBar}>
            <div style={styles.progressFill}></div>
          </div>
          <div style={styles.progressText}>Step 2 of 3</div>
        </div>

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

            {/* Emergency Contacts Section */}
            <div style={styles.expandableCard}>
              <button 
                style={styles.expandHeader}
                onClick={() => toggleSection('emergencyContacts')}
              >
                <div style={styles.expandInfo}>
                  <span style={styles.expandTitle}>
                    📞 Emergency Contacts
                    {formData.emergencyContacts.length > 0 && <span style={styles.completed}>✓</span>}
                  </span>
                  <span style={styles.expandSubtitle}>
                    {formData.emergencyContacts.length > 0 
                      ? `${formData.emergencyContacts.length} contact(s) added` 
                      : 'Add backup contacts for emergencies'
                    }
                  </span>
                </div>
                <span style={styles.expandIcon}>
                  {expandedSections.emergencyContacts ? '▼' : '▶'}
                </span>
              </button>
              
              {expandedSections.emergencyContacts && (
                <div style={styles.expandContent}>
                  <p style={styles.expandDescription}>
                    People to contact if you're unreachable during an emergency
                  </p>
                  <button style={styles.actionButton}>
                    Add Emergency Contact
                  </button>
                </div>
              )}
            </div>
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
        <button style={styles.skipButton} onClick={handleSkipStep}>
          Skip for Now
        </button>
        <button style={styles.continueButton} onClick={handleSave}>
          Continue
        </button>
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
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#007AFF'
  },
  
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
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
    color: '#FF3B30'
  },
  
  content: {
    flex: 1,
    padding: '20px',
    paddingBottom: '100px'
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
    backgroundColor: '#E5E5EA',
    borderRadius: '2px',
    overflow: 'hidden',
    minWidth: '0'
  },
  
  progressFill: {
    width: '66%',
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: '2px'
  },
  
  progressText: {
    flex: '0 0 auto',
    fontSize: '12px',
    color: '#666',
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
    color: '#000',
    margin: '0 0 10px 0'
  },
  
  infoText: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.4',
    margin: 0
  },
  
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  
  essentialSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  
  optionalSections: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
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
    color: '#000',
    marginBottom: '8px'
  },
  
  optional: {
    fontSize: '14px',
    fontWeight: '400',
    color: '#666'
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
    border: '1px solid #E5E5EA',
    fontSize: '16px',
    backgroundColor: 'white',
    outline: 'none'
  },
  
  quickAddButton: {
    backgroundColor: '#007AFF',
    color: 'white',
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
    backgroundColor: '#F2F2F7',
    border: '1px solid #D1D1D6',
    borderRadius: '16px',
    padding: '6px 12px',
    fontSize: '12px',
    color: '#007AFF',
    cursor: 'pointer'
  },
  
  itemsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '10px'
  },
  
  itemChip: {
    backgroundColor: '#E3F2FD',
    borderRadius: '16px',
    padding: '6px 12px',
    fontSize: '14px',
    color: '#1976D2',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  
  removeChip: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#1976D2',
    fontSize: '16px',
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  expandableCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
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
    color: '#000',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  completed: {
    color: '#34C759',
    fontSize: '14px'
  },
  
  expandSubtitle: {
    fontSize: '14px',
    color: '#666',
    marginTop: '2px',
    display: 'block'
  },
  
  expandIcon: {
    color: '#C7C7CC',
    fontSize: '12px',
    marginLeft: '10px'
  },
  
  expandContent: {
    padding: '0 20px 20px 20px',
    borderTop: '1px solid #F2F2F7'
  },
  
  expandDescription: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 15px 0',
    lineHeight: '1.4'
  },
  
  actionButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    width: '100%'
  },
  
  editButton: {
    backgroundColor: '#F2F2F7',
    color: '#007AFF',
    border: '1px solid #D1D1D6',
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
    backgroundColor: '#F8F9FA',
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
    color: '#007AFF',
    lineHeight: 1
  },

  scheduleLabel: {
    fontSize: '12px',
    color: '#333',
    lineHeight: 1.2,
    marginTop: '2px'
  },

  scheduleDetail: {
    color: '#666',
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
    color: '#007AFF',
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
    backgroundColor: '#F8F9FA',
    borderRadius: '8px',
    border: '1px solid #E5E5EA'
  },

  schoolDayLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#333',
    minWidth: '35px'
  },

  schoolTimeRange: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#007AFF',
    minWidth: '80px'
  },

  schoolTypeLabel: {
    fontSize: '11px',
    padding: '4px 8px',
    backgroundColor: '#007AFF',
    color: 'white',
    borderRadius: '12px',
    fontWeight: '500'
  },

  kinderbetreuungLabel: {
    backgroundColor: '#FF9500'
  },

  noScheduleText: {
    fontSize: '14px',
    color: '#666',
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
    color: '#000',
    margin: '0 0 10px 0'
  },

  loadingText: {
    fontSize: '16px',
    color: '#666',
    margin: 0
  },
  
  textarea: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    fontSize: '16px',
    backgroundColor: 'white',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  
  buttonSection: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '20px',
    backgroundColor: 'white',
    borderTop: '1px solid #E5E5EA',
    display: 'flex',
    gap: '15px'
  },
  
  skipButton: {
    flex: 1,
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    backgroundColor: 'white',
    color: '#8E8E93',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  
  continueButton: {
    flex: 2,
    padding: '15px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#007AFF',
    color: 'white',
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
    color: 'white',
    padding: '4px 8px',
    borderRadius: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
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