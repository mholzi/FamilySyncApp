import { useState, useEffect } from 'react';
import { ROUTINE_TEMPLATES, getTemplateByAge } from '../../utils/routineTemplates';
import { validateRoutine } from '../../utils/routineValidation';

function BasicRoutineBuilder({ childData, initialRoutine, onSave, onCancel }) {
  const [isSaving, setIsSaving] = useState(false);
  // Migrate routine data to handle legacy format
  const migrateRoutineData = (routineData) => {
    if (!routineData) {
      return {
        wakeUpTime: '07:00',
        bedtime: '19:30',
        mealTimes: {
          breakfast: '07:30',
          lunch: [],
          dinner: '17:30',
          snacks: []
        },
        napTimes: []
      };
    }

    // Convert legacy lunch string to array format
    const migratedData = { ...routineData };
    if (migratedData.mealTimes) {
      // Handle legacy lunch format (string -> array)
      if (typeof migratedData.mealTimes.lunch === 'string') {
        migratedData.mealTimes.lunch = migratedData.mealTimes.lunch 
          ? [migratedData.mealTimes.lunch] 
          : [];
      } else if (!Array.isArray(migratedData.mealTimes.lunch)) {
        migratedData.mealTimes.lunch = [];
      }
      
      // Ensure snacks is an array
      if (!Array.isArray(migratedData.mealTimes.snacks)) {
        migratedData.mealTimes.snacks = [];
      }
    }

    // Ensure napTimes is an array
    if (!Array.isArray(migratedData.napTimes)) {
      migratedData.napTimes = [];
    }

    return migratedData;
  };

  const [routine, setRoutine] = useState(migrateRoutineData(initialRoutine));

  const [newLunchTime, setNewLunchTime] = useState('12:00');
  const [newSnackTime, setNewSnackTime] = useState('15:00');
  const [newNap, setNewNap] = useState({ startTime: '13:00', duration: 90 });
  const [validation, setValidation] = useState(null);

  // Validate routine when it changes
  useEffect(() => {
    if (childData?.dateOfBirth) {
      const validationResult = validateRoutine(routine, childData.dateOfBirth);
      setValidation(validationResult);
    }
  }, [routine, childData]);

  // Auto-suggest based on age
  useEffect(() => {
    if (childData?.dateOfBirth && !initialRoutine) {
      const template = getTemplateByAge(childData.dateOfBirth);
      if (template) {
        setRoutine(migrateRoutineData(template.dailyRoutine));
      }
    }
  }, [childData, initialRoutine]);

  const updateRoutineField = (field, value) => {
    setRoutine(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateMealTime = (meal, time) => {
    setRoutine(prev => ({
      ...prev,
      mealTimes: {
        ...prev.mealTimes,
        [meal]: time
      }
    }));
  };

  const addLunch = () => {
    if (!newLunchTime) return;
    
    setRoutine(prev => ({
      ...prev,
      mealTimes: {
        ...prev.mealTimes,
        lunch: [...prev.mealTimes.lunch, newLunchTime].sort()
      }
    }));
    setNewLunchTime('12:00');
  };

  const removeLunch = (indexToRemove) => {
    setRoutine(prev => ({
      ...prev,
      mealTimes: {
        ...prev.mealTimes,
        lunch: prev.mealTimes.lunch.filter((_, index) => index !== indexToRemove)
      }
    }));
  };

  const addSnack = () => {
    if (!newSnackTime) return;
    
    setRoutine(prev => ({
      ...prev,
      mealTimes: {
        ...prev.mealTimes,
        snacks: [...prev.mealTimes.snacks, newSnackTime].sort()
      }
    }));
    setNewSnackTime('15:00');
  };

  const removeSnack = (indexToRemove) => {
    setRoutine(prev => ({
      ...prev,
      mealTimes: {
        ...prev.mealTimes,
        snacks: prev.mealTimes.snacks.filter((_, index) => index !== indexToRemove)
      }
    }));
  };

  const addNap = () => {
    if (!newNap.startTime || !newNap.duration) return;

    setRoutine(prev => ({
      ...prev,
      napTimes: [...prev.napTimes, { ...newNap }].sort((a, b) => 
        a.startTime.localeCompare(b.startTime)
      )
    }));
    setNewNap({ startTime: '13:00', duration: 90 });
  };

  const removeNap = (indexToRemove) => {
    setRoutine(prev => ({
      ...prev,
      napTimes: prev.napTimes.filter((_, index) => index !== indexToRemove)
    }));
  };

  const updateNap = (index, field, value) => {
    setRoutine(prev => ({
      ...prev,
      napTimes: prev.napTimes.map((nap, i) => 
        i === index ? { ...nap, [field]: value } : nap
      )
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const routineData = {
        dailyRoutine: routine,
        lastModified: new Date().toISOString()
      };
      await onSave(routineData);
    } catch (error) {
      console.error('Error saving routine:', error);
      alert('Failed to save routine. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadTemplate = (template) => {
    setRoutine(migrateRoutineData(template.dailyRoutine));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Daily Routine for {childData?.name || 'Child'}</h2>
        <p style={styles.subtitle}>
          Set up basic daily schedule - school times and activities will be managed separately
        </p>
      </div>

      {/* Template Selector */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Quick Start Templates</h3>
        <div style={styles.templateButtons}>
          {Object.values(ROUTINE_TEMPLATES).map(template => (
            <button
              key={template.id}
              style={styles.templateButton}
              onClick={() => loadTemplate(template)}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* Basic Times */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Sleep Schedule</h3>
        <div style={styles.timeRow}>
          <div style={styles.timeInput}>
            <label style={styles.label}>🌅 Wake Up Time</label>
            <input
              type="time"
              value={routine.wakeUpTime}
              onChange={(e) => updateRoutineField('wakeUpTime', e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.timeInput}>
            <label style={styles.label}>🌙 Bedtime</label>
            <input
              type="time"
              value={routine.bedtime}
              onChange={(e) => updateRoutineField('bedtime', e.target.value)}
              style={styles.input}
            />
          </div>
        </div>
      </div>

      {/* Meal Times */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Meal Times</h3>
        <div style={styles.mealGrid}>
          <div style={styles.mealInput}>
            <label style={styles.label}>🥣 Breakfast</label>
            <input
              type="time"
              value={routine.mealTimes.breakfast}
              onChange={(e) => updateMealTime('breakfast', e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.mealInput}>
            <label style={styles.label}>🍽️ Dinner</label>
            <input
              type="time"
              value={routine.mealTimes.dinner}
              onChange={(e) => updateMealTime('dinner', e.target.value)}
              style={styles.input}
            />
          </div>
        </div>

        {/* Lunch Times */}
        <div style={styles.subSection}>
          <h4 style={styles.subTitle}>🥗 Lunch Times</h4>
          <p style={styles.helpText}>Add lunch times if not provided at school</p>
          <div style={styles.addItemRow}>
            <input
              type="time"
              value={newLunchTime}
              onChange={(e) => setNewLunchTime(e.target.value)}
              style={styles.input}
            />
            <button style={styles.addButton} onClick={addLunch}>
              Add Lunch
            </button>
          </div>
          
          <div style={styles.itemsList}>
            {routine.mealTimes.lunch.map((lunchTime, index) => (
              <div key={index} style={styles.listItem}>
                <span style={styles.itemTime}>{lunchTime}</span>
                <button 
                  style={styles.removeButton}
                  onClick={() => removeLunch(index)}
                >
                  Remove
                </button>
              </div>
            ))}
            {routine.mealTimes.lunch.length === 0 && (
              <p style={styles.emptyText}>No lunch times set (meals at school)</p>
            )}
          </div>
        </div>

        {/* Snacks */}
        <div style={styles.subSection}>
          <h4 style={styles.subTitle}>🍎 Snack Times</h4>
          <div style={styles.addItemRow}>
            <input
              type="time"
              value={newSnackTime}
              onChange={(e) => setNewSnackTime(e.target.value)}
              style={styles.input}
            />
            <button style={styles.addButton} onClick={addSnack}>
              Add Snack
            </button>
          </div>
          
          <div style={styles.itemsList}>
            {routine.mealTimes.snacks.map((snackTime, index) => (
              <div key={index} style={styles.listItem}>
                <span style={styles.itemTime}>{snackTime}</span>
                <button 
                  style={styles.removeButton}
                  onClick={() => removeSnack(index)}
                >
                  Remove
                </button>
              </div>
            ))}
            {routine.mealTimes.snacks.length === 0 && (
              <p style={styles.emptyText}>No snack times set</p>
            )}
          </div>
        </div>
      </div>

      {/* Nap Times */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>😴 Nap Times</h3>
        
        <div style={styles.addItemRow}>
          <input
            type="time"
            value={newNap.startTime}
            onChange={(e) => setNewNap(prev => ({ ...prev, startTime: e.target.value }))}
            style={styles.input}
            placeholder="Start time"
          />
          <input
            type="number"
            value={newNap.duration}
            onChange={(e) => setNewNap(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
            style={styles.input}
            placeholder="Duration (minutes)"
            min="15"
            max="240"
          />
          <button style={styles.addButton} onClick={addNap}>
            Add Nap
          </button>
        </div>

        <div style={styles.itemsList}>
          {routine.napTimes.map((nap, index) => (
            <div key={index} style={styles.napItem}>
              <div style={styles.napDetails}>
                <input
                  type="time"
                  value={nap.startTime}
                  onChange={(e) => updateNap(index, 'startTime', e.target.value)}
                  style={styles.smallInput}
                />
                <span style={styles.napDuration}>
                  <input
                    type="number"
                    value={nap.duration}
                    onChange={(e) => updateNap(index, 'duration', parseInt(e.target.value) || 0)}
                    style={styles.smallInput}
                    min="15"
                    max="240"
                  />
                  minutes
                </span>
              </div>
              <button 
                style={styles.removeButton}
                onClick={() => removeNap(index)}
              >
                Remove
              </button>
            </div>
          ))}
          {routine.napTimes.length === 0 && (
            <p style={styles.emptyText}>No nap times set</p>
          )}
        </div>
      </div>

      {/* Validation Display */}
      {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div style={styles.validation}>
          <h3 style={styles.validationTitle}>Routine Check</h3>
          
          {validation.errors.length > 0 && (
            <div style={styles.errors}>
              <h4 style={styles.errorTitle}>⚠️ Issues to Fix:</h4>
              {validation.errors.map((error, index) => (
                <div key={index} style={styles.errorItem}>
                  <div>{error.message}</div>
                  {error.suggestion && <small>{error.suggestion}</small>}
                </div>
              ))}
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div style={styles.warnings}>
              <h4 style={styles.warningTitle}>💡 Suggestions:</h4>
              {validation.warnings.map((warning, index) => (
                <div key={index} style={styles.warningItem}>
                  <div>{warning.message}</div>
                  {warning.suggestion && <small>{warning.suggestion}</small>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <button style={styles.cancelButton} onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
        <button 
          style={{
            ...styles.saveButton,
            ...(isSaving ? styles.saveButtonSaving : {})
          }} 
          onClick={handleSave}
          disabled={isSaving || (validation && validation.errors.length > 0)}
        >
          {isSaving ? (
            <>
              <span style={styles.saveSpinner}>💾</span>
              Saving...
            </>
          ) : (
            'Save Routine'
          )}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#F2F2F7',
    minHeight: '100vh'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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
  section: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 15px 0'
  },
  templateButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px'
  },
  templateButton: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    backgroundColor: 'white',
    color: '#007AFF',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  timeRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  timeInput: {
    display: 'flex',
    flexDirection: 'column'
  },
  mealGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  },
  mealInput: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px'
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    fontSize: '16px',
    backgroundColor: 'white',
    outline: 'none'
  },
  smallInput: {
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #E5E5EA',
    fontSize: '14px',
    backgroundColor: 'white',
    outline: 'none',
    width: '80px'
  },
  helpText: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px'
  },
  subSection: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #F0F0F0'
  },
  subTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 15px 0'
  },
  addItemRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'end',
    marginBottom: '15px'
  },
  addButton: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#F2F2F7',
    borderRadius: '8px'
  },
  napItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#F2F2F7',
    borderRadius: '8px'
  },
  napDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  napDuration: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '14px',
    color: '#666'
  },
  itemTime: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#333'
  },
  removeButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #FF3B30',
    backgroundColor: 'white',
    color: '#FF3B30',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  emptyText: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px'
  },
  validation: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  validationTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 15px 0'
  },
  errors: {
    marginBottom: '15px'
  },
  errorTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#D32F2F',
    margin: '0 0 8px 0'
  },
  errorItem: {
    padding: '8px 12px',
    backgroundColor: '#FFF2F2',
    borderRadius: '6px',
    marginBottom: '6px',
    fontSize: '14px',
    color: '#D32F2F'
  },
  warnings: {
    marginBottom: '15px'
  },
  warningTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#F57C00',
    margin: '0 0 8px 0'
  },
  warningItem: {
    padding: '8px 12px',
    backgroundColor: '#FFF8E1',
    borderRadius: '6px',
    marginBottom: '6px',
    fontSize: '14px',
    color: '#F57C00'
  },
  actions: {
    display: 'flex',
    gap: '15px',
    padding: '20px 0'
  },
  cancelButton: {
    flex: 1,
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    backgroundColor: 'white',
    color: '#666',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  saveButton: {
    flex: 2,
    padding: '16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#34C759',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  saveButtonSaving: {
    backgroundColor: '#8E8E93',
    cursor: 'not-allowed'
  },
  saveSpinner: {
    animation: 'pulse 1.5s infinite'
  }
};

export default BasicRoutineBuilder;