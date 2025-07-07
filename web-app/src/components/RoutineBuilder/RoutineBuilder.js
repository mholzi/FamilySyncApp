import { useState, useEffect } from 'react';
import { ROUTINE_TEMPLATES, getTemplateByAge, ACTIVITY_TYPES, getAgeGroup } from '../../utils/routineTemplates';
import { validateRoutine } from '../../utils/routineValidation';
import TimelineEditor from './TimelineEditor';

function RoutineBuilder({ childData, initialRoutine, onSave, onCancel }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Get age-appropriate initial routine values
  const getInitialRoutine = () => {
    if (initialRoutine) return initialRoutine;
    
    if (childData?.dateOfBirth) {
      const ageTemplate = getTemplateByAge(childData.dateOfBirth);
      if (ageTemplate) {
        return ageTemplate.dailyRoutine;
      }
    }
    
    // Default fallback
    return {
      wakeUpTime: '07:00',
      bedtime: '19:30',
      mealTimes: {
        breakfast: '07:30',
        lunch: '12:00',
        dinner: '17:30',
        snacks: []
      },
      napTimes: [],
      freePlayPeriods: []
    };
  };
  
  const [routine, setRoutine] = useState(getInitialRoutine());
  const [hasChanges, setHasChanges] = useState(false);
  const [validation, setValidation] = useState(null);
  
  // Determine if child is school age to hide nap functionality
  const ageGroup = getAgeGroup(childData?.dateOfBirth);
  const isSchoolAge = ageGroup === 'schoolAge' || ageGroup === 'teen';

  // Set template based on child's age
  useEffect(() => {
    if (childData?.dateOfBirth && !initialRoutine) {
      const suggestedTemplate = getTemplateByAge(childData.dateOfBirth);
      if (suggestedTemplate) {
        setSelectedTemplate(suggestedTemplate);
        setRoutine(suggestedTemplate.dailyRoutine);
      }
    }
  }, [childData, initialRoutine]);


  const handleRoutineChange = (updatedRoutine) => {
    setRoutine(updatedRoutine);
    setHasChanges(true);
    
    // Validate routine
    if (childData?.dateOfBirth) {
      const validationResult = validateRoutine(updatedRoutine, childData.dateOfBirth);
      setValidation(validationResult);
    }
  };

  const handleSave = () => {
    const routineData = {
      dailyRoutine: routine,
      routineTemplateId: selectedTemplate?.id || 'custom',
      lastModified: new Date().toISOString()
    };
    onSave(routineData);
  };

  const handleReset = () => {
    if (selectedTemplate) {
      setRoutine(selectedTemplate.dailyRoutine);
    } else if (initialRoutine) {
      setRoutine(initialRoutine);
    }
    setHasChanges(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Daily Routine</h2>
        <p style={styles.subtitle}>
          Set up {childData?.name || 'your child'}'s typical daily schedule
        </p>
      </div>


      <div style={styles.routineEditor}>
        <div style={styles.basicTimes}>
          <h3 style={styles.sectionTitle}>Basic Schedule</h3>
          <div style={styles.timeInputs}>
            <div style={styles.timeInput}>
              <label style={styles.label}>Wake Up Time</label>
              <input
                type="time"
                value={routine.wakeUpTime}
                onChange={(e) => handleRoutineChange({
                  ...routine,
                  wakeUpTime: e.target.value
                })}
                style={styles.input}
              />
            </div>
            <div style={styles.timeInput}>
              <label style={styles.label}>Bedtime</label>
              <input
                type="time"
                value={routine.bedtime}
                onChange={(e) => handleRoutineChange({
                  ...routine,
                  bedtime: e.target.value
                })}
                style={styles.input}
              />
            </div>
          </div>
        </div>

        <div style={styles.mealsSection}>
          <h3 style={styles.sectionTitle}>Meal Times</h3>
          <div style={styles.mealGrid}>
            <div style={styles.mealInput}>
              <label style={styles.label}>🥣 Breakfast</label>
              <input
                type="time"
                value={routine.mealTimes.breakfast}
                onChange={(e) => handleRoutineChange({
                  ...routine,
                  mealTimes: { ...routine.mealTimes, breakfast: e.target.value }
                })}
                style={styles.input}
              />
            </div>
            <div style={styles.mealInput}>
              <label style={styles.label}>🥗 Lunch</label>
              <input
                type="time"
                value={routine.mealTimes.lunch}
                onChange={(e) => handleRoutineChange({
                  ...routine,
                  mealTimes: { ...routine.mealTimes, lunch: e.target.value }
                })}
                style={styles.input}
              />
            </div>
            <div style={styles.mealInput}>
              <label style={styles.label}>🍽️ Dinner</label>
              <input
                type="time"
                value={routine.mealTimes.dinner}
                onChange={(e) => handleRoutineChange({
                  ...routine,
                  mealTimes: { ...routine.mealTimes, dinner: e.target.value }
                })}
                style={styles.input}
              />
            </div>
          </div>
        </div>

        <TimelineEditor
          routine={routine}
          onChange={handleRoutineChange}
          childAge={childData?.dateOfBirth}
        />

        {validation && (
          <div style={styles.validationSection}>
            <h3 style={styles.validationTitle}>Routine Analysis</h3>
            
            {validation.summary && (
              <div style={styles.summary}>
                <div style={styles.summaryItem}>
                  🌙 Sleep: {validation.summary.sleepHours} hours
                </div>
                {!isSchoolAge && (
                  <div style={styles.summaryItem}>
                    😴 Naps: {validation.summary.totalNaps}
                  </div>
                )}
                <div style={styles.summaryItem}>
                  🎪 Free Play: {validation.summary.totalFreePlay} min
                </div>
              </div>
            )}

            {validation.errors.length > 0 && (
              <div style={styles.validationErrors}>
                <h4 style={styles.validationSubtitle}>⚠️ Issues to Fix</h4>
                {validation.errors.map((error, index) => (
                  <div key={index} style={styles.errorItem}>
                    <div style={styles.errorMessage}>{error.message}</div>
                    {error.suggestion && (
                      <div style={styles.errorSuggestion}>{error.suggestion}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div style={styles.validationWarnings}>
                <h4 style={styles.validationSubtitle}>💡 Suggestions</h4>
                {validation.warnings.map((warning, index) => (
                  <div key={index} style={styles.warningItem}>
                    <div style={styles.warningMessage}>{warning.message}</div>
                    {warning.suggestion && (
                      <div style={styles.warningSuggestion}>{warning.suggestion}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {validation.isValid && validation.warnings.length === 0 && (
              <div style={styles.validationSuccess}>
                ✅ Routine looks great! All timing and recommendations are good.
              </div>
            )}
          </div>
        )}

        <div style={styles.actions}>
          {hasChanges && (
            <button style={styles.resetButton} onClick={handleReset}>
              Reset Changes
            </button>
          )}
          <button style={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button style={styles.saveButton} onClick={handleSave}>
            Save Routine
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
    height: '100%',
    backgroundColor: '#F2F2F7',
    overflow: 'auto'
  },
  header: {
    padding: '20px',
    backgroundColor: 'white',
    borderBottom: '1px solid #E5E5EA',
    textAlign: 'center'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  routineEditor: {
    flex: 1,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  basicTimes: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 15px 0'
  },
  timeInputs: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px'
  },
  timeInput: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
    marginBottom: '5px'
  },
  input: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    fontSize: '16px',
    backgroundColor: 'white',
    outline: 'none'
  },
  mealsSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  mealGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px'
  },
  mealInput: {
    display: 'flex',
    flexDirection: 'column'
  },
  actions: {
    display: 'flex',
    gap: '10px',
    padding: '20px 0',
    justifyContent: 'flex-end'
  },
  resetButton: {
    padding: '12px 20px',
    borderRadius: '8px',
    border: '1px solid #FF3B30',
    backgroundColor: 'white',
    color: '#FF3B30',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    marginRight: 'auto'
  },
  cancelButton: {
    padding: '12px 20px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    backgroundColor: 'white',
    color: '#666',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  saveButton: {
    padding: '12px 30px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#34C759',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  validationSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  validationTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 15px 0'
  },
  summary: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: '#F2F2F7',
    borderRadius: '8px'
  },
  summaryItem: {
    fontSize: '14px',
    color: '#333'
  },
  validationSubtitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 12px 0'
  },
  validationErrors: {
    marginBottom: '16px'
  },
  errorItem: {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#FFF2F2',
    border: '1px solid #FFE5E5',
    marginBottom: '8px'
  },
  errorMessage: {
    fontSize: '14px',
    color: '#D32F2F',
    fontWeight: '500',
    marginBottom: '4px'
  },
  errorSuggestion: {
    fontSize: '13px',
    color: '#666',
    fontStyle: 'italic'
  },
  validationWarnings: {
    marginBottom: '16px'
  },
  warningItem: {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#FFF8E1',
    border: '1px solid #FFECB3',
    marginBottom: '8px'
  },
  warningMessage: {
    fontSize: '14px',
    color: '#F57C00',
    fontWeight: '500',
    marginBottom: '4px'
  },
  warningSuggestion: {
    fontSize: '13px',
    color: '#666',
    fontStyle: 'italic'
  },
  validationSuccess: {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#E8F5E8',
    border: '1px solid #C8E6C9',
    fontSize: '14px',
    color: '#2E7D32',
    fontWeight: '500'
  }
};

export default RoutineBuilder;