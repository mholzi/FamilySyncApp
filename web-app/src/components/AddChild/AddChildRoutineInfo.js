import { useState } from 'react';
import BasicRoutineBuilder from '../RoutineBuilder/BasicRoutineBuilder';

function AddChildRoutineInfo({ childData, onNext, onBack, onSkip }) {
  const [routineData, setRoutineData] = useState(childData.carePreferences?.dailyRoutine || null);
  const [showRoutineBuilder, setShowRoutineBuilder] = useState(false);
  const [hasRoutine, setHasRoutine] = useState(!!routineData);

  const handleRoutineSave = (routine) => {
    setRoutineData(routine.dailyRoutine);
    setHasRoutine(true);
    setShowRoutineBuilder(false);
  };

  const handleSave = () => {
    const updatedCarePreferences = {
      ...childData.carePreferences,
      ...(routineData && { dailyRoutine: routineData })
    };

    onNext({ carePreferences: updatedCarePreferences });
  };

  const handleSkipStep = () => {
    onSkip({ carePreferences: childData.carePreferences || {} });
  };

  // Show routine builder if needed
  if (showRoutineBuilder) {
    return (
      <BasicRoutineBuilder
        childData={childData}
        initialRoutine={routineData}
        onSave={handleRoutineSave}
        onCancel={() => setShowRoutineBuilder(false)}
      />
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack}>
          ←
        </button>
        <h1 style={styles.title}>Daily Routine</h1>
        <div style={styles.placeholder}></div>
      </div>

      <div style={styles.content}>
        <div style={styles.introSection}>
          <div style={styles.introIcon}>🌅</div>
          <h2 style={styles.subtitle}>Set Up {childData.name}'s Daily Routine</h2>
          <p style={styles.infoText}>
            Set basic wake time, meals, naps, and bedtime. School schedules and activities will be managed separately.
          </p>
        </div>

        <div style={styles.routineSection}>
          {!hasRoutine ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>
                Create a daily routine with wake time, meal times, nap times, and bedtime
              </p>
              <button
                style={styles.createButton}
                onClick={() => setShowRoutineBuilder(true)}
              >
                Create Daily Routine
              </button>
            </div>
          ) : (
            <div style={styles.summaryCard}>
              <h4 style={styles.summaryTitle}>Daily Routine ✓</h4>
              <div style={styles.summaryDetails}>
                <div style={styles.summaryItem}>
                  🌅 Wake Up: {routineData.wakeUpTime}
                </div>
                <div style={styles.summaryItem}>
                  🌙 Bedtime: {routineData.bedtime}
                </div>
                <div style={styles.summaryItem}>
                  🥣 Breakfast: {routineData.mealTimes?.breakfast || 'Not set'}
                </div>
                <div style={styles.summaryItem}>
                  🥗 Lunch: {routineData.mealTimes?.lunch?.length > 0 ? `${routineData.mealTimes.lunch.length} time${routineData.mealTimes.lunch.length > 1 ? 's' : ''}` : 'At school'}
                </div>
                <div style={styles.summaryItem}>
                  🍽️ Dinner: {routineData.mealTimes?.dinner || 'Not set'}
                </div>
                <div style={styles.summaryItem}>
                  😴 Naps: {routineData.napTimes?.length || 0}
                </div>
                <div style={styles.summaryItem}>
                  🍎 Snacks: {routineData.mealTimes?.snacks?.length || 0}
                </div>
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

        <div style={styles.noteSection}>
          <h4 style={styles.noteTitle}>What's Next?</h4>
          <p style={styles.noteText}>
            After setting up the basic routine, you'll be able to add:
          </p>
          <ul style={styles.noteList}>
            <li>School schedules (different times for each day)</li>
            <li>Regular activities (football training, music lessons)</li>
            <li>Playdates and social activities</li>
          </ul>
        </div>
      </div>

      <div style={styles.buttonSection}>
        <button style={styles.skipButton} onClick={handleSkipStep}>
          Skip
        </button>
        <button 
          style={styles.saveButton} 
          onClick={handleSave}
        >
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
  placeholder: {
    width: '20px'
  },
  content: {
    flex: 1,
    padding: '20px',
    paddingBottom: '100px'
  },
  introSection: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  introIcon: {
    fontSize: '48px',
    marginBottom: '15px'
  },
  subtitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 15px 0'
  },
  infoText: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
    margin: 0
  },
  routineSection: {
    marginBottom: '30px'
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px 20px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  emptyText: {
    fontSize: '16px',
    color: '#666',
    margin: '0 0 20px 0'
  },
  createButton: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  summaryTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 15px 0'
  },
  summaryDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
    marginBottom: '20px'
  },
  summaryItem: {
    fontSize: '14px',
    color: '#666',
    padding: '8px 0'
  },
  editButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #007AFF',
    backgroundColor: 'white',
    color: '#007AFF',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  noteSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  noteTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 10px 0'
  },
  noteText: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 10px 0'
  },
  noteList: {
    fontSize: '14px',
    color: '#666',
    paddingLeft: '20px',
    margin: 0
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
  saveButton: {
    flex: 2,
    padding: '15px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#34C759',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export default AddChildRoutineInfo;