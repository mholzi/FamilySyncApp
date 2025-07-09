import { useState } from 'react';

function AddChildSchoolScheduleTable({ childData, initialData, onNext, onBack }) {
  // Get schedule type from childData since it's set in the add/edit child screen
  const scheduleType = childData?.scheduleType || initialData?.scheduleType || 'kindergarten';
  const [schedule, setSchedule] = useState(initialData?.schoolSchedule || {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: []
  });
  
  const [quickSetTime, setQuickSetTime] = useState({ start: '09:00', end: '15:00' });
  
  // School information state
  const [schoolInfo, setSchoolInfo] = useState(initialData?.schoolInfo || {
    address: '',
    travelTime: ''
  });
  
  // Pickup person state for each day
  const [pickupPerson, setPickupPerson] = useState(initialData?.pickupPerson || {
    monday: 'parent',
    tuesday: 'parent',
    wednesday: 'parent',
    thursday: 'parent',
    friday: 'parent'
  });

  // Delivery person state for each day
  const [deliveryPerson, setDeliveryPerson] = useState(initialData?.deliveryPerson || {
    monday: 'parent',
    tuesday: 'parent',
    wednesday: 'parent',
    thursday: 'parent',
    friday: 'parent'
  });
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const dayLabels = {
    monday: 'Mon',
    tuesday: 'Tue', 
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri'
  };
  
  const scheduleTypes = {
    kindergarten: {
      label: 'Kindergarten',
      color: '#34C759',
      defaultBlocks: ['Kindergarten']
    },
    school: {
      label: 'School',
      color: '#007AFF', 
      defaultBlocks: ['School', 'Kinderbetreuung']
    }
  };

  // Apply quick time setting to all weekdays
  const applyQuickSet = () => {
    const newSchedule = { ...schedule };
    const block = {
      id: Date.now(),
      type: scheduleTypes[scheduleType].defaultBlocks[0],
      startTime: quickSetTime.start,
      endTime: quickSetTime.end,
      color: scheduleTypes[scheduleType].color
    };
    
    days.forEach(day => {
      newSchedule[day] = [block];
    });
    
    setSchedule(newSchedule);
  };

  // Clear all schedule
  const clearSchedule = () => {
    const newSchedule = {};
    days.forEach(day => {
      newSchedule[day] = [];
    });
    setSchedule(newSchedule);
  };

  // Update schedule for a specific day (simplified for table view)
  const updateDaySchedule = (day, field, value) => {
    if (!value) {
      // If no value, clear the day
      setSchedule(prev => ({
        ...prev,
        [day]: []
      }));
      return;
    }

    setSchedule(prev => {
      const currentDaySchedule = prev[day] || [];
      let updatedBlock;

      if (currentDaySchedule.length === 0) {
        // Create new block for this day
        updatedBlock = {
          id: Date.now() + Math.random(),
          type: scheduleTypes[scheduleType].defaultBlocks[0],
          startTime: field === 'startTime' ? value : '09:00',
          endTime: field === 'endTime' ? value : '15:00',
          color: scheduleTypes[scheduleType].color
        };
      } else {
        // Update existing block
        updatedBlock = {
          ...currentDaySchedule[0],
          [field]: value
        };
      }

      return {
        ...prev,
        [day]: [updatedBlock]
      };
    });
  };

  // Clear schedule for a specific day
  const clearDaySchedule = (day) => {
    setSchedule(prev => ({
      ...prev,
      [day]: []
    }));
  };

  // Check if there is any schedule
  const hasSchedule = Object.values(schedule).some(daySchedule => 
    daySchedule && daySchedule.length > 0 && daySchedule[0].startTime && daySchedule[0].endTime
  );

  const handleContinue = () => {
    const scheduleData = {
      scheduleType,
      schoolSchedule: schedule,
      schoolInfo,
      pickupPerson,
      deliveryPerson,
      lastModified: new Date().toISOString()
    };
    onNext(scheduleData);
  };

  const handleSave = () => {
    const scheduleData = {
      scheduleType,
      schoolSchedule: schedule,
      schoolInfo,
      pickupPerson,
      deliveryPerson,
      lastModified: new Date().toISOString()
    };
    onNext(scheduleData);
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.introSection}>
          <div style={styles.schoolIcon}>🏫</div>
          <h2 style={styles.subtitle}>Set {childData?.name || 'Child'}'s Weekly Schedule</h2>
          <p style={styles.description}>
            Configure kindergarten or school times for each weekday. You can set different times per day and specify who picks up your child.
          </p>
        </div>

        {/* School Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>School Information</h3>
          <div style={styles.schoolInfoGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>School Address</label>
              <input
                type="text"
                value={schoolInfo.address}
                onChange={(e) => setSchoolInfo(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main St, City, State"
                style={styles.textInput}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Travel Time (minutes)</label>
              <input
                type="number"
                value={schoolInfo.travelTime}
                onChange={(e) => setSchoolInfo(prev => ({ ...prev, travelTime: e.target.value }))}
                placeholder="15"
                min="1"
                max="120"
                style={styles.numberInput}
              />
            </div>
          </div>
        </div>

        {/* Quick Set Tools */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Quick Setup</h3>
          <div style={styles.quickSetRow}>
            <input
              type="time"
              value={quickSetTime.start}
              onChange={(e) => setQuickSetTime(prev => ({ ...prev, start: e.target.value }))}
              style={styles.timeInput}
            />
            <span style={styles.timeSeparator}>to</span>
            <input
              type="time"
              value={quickSetTime.end}
              onChange={(e) => setQuickSetTime(prev => ({ ...prev, end: e.target.value }))}
              style={styles.timeInput}
            />
            <button style={styles.quickButton} onClick={applyQuickSet}>
              Apply to All Days
            </button>
            <button style={styles.clearButton} onClick={clearSchedule}>
              Clear All
            </button>
          </div>
        </div>

        {/* Weekly Schedule Table */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Weekly Schedule</h3>
          <p style={styles.helpText}>
            Set school start and end times for each day. Leave times empty for days off.
          </p>
          
          <div style={styles.scheduleTable}>
            <div style={styles.tableHeader}>
              <div style={styles.headerCell}>Day</div>
              <div style={styles.headerCell}>Start Time</div>
              <div style={styles.headerCell}>End Time</div>
              <div style={styles.headerCell}>Delivery Person</div>
              <div style={styles.headerCell}>Pickup Person</div>
              <div style={styles.headerCell}>Actions</div>
            </div>
            
            {days.map(day => {
              const daySchedule = schedule[day] || [];
              const hasSchedule = daySchedule.length > 0;
              const mainBlock = hasSchedule ? daySchedule[0] : null;
              
              return (
                <div key={day} style={styles.tableRow}>
                  <div style={styles.dayCell}>
                    <div style={styles.dayName}>{dayLabels[day]}</div>
                    <div style={styles.dayFullName}>{day.charAt(0).toUpperCase() + day.slice(1)}</div>
                  </div>
                  
                  <div style={styles.timeCell}>
                    <input
                      type="time"
                      value={mainBlock?.startTime || ''}
                      onChange={(e) => updateDaySchedule(day, 'startTime', e.target.value)}
                      style={styles.timeInput}
                      placeholder="09:00"
                    />
                  </div>
                  
                  <div style={styles.timeCell}>
                    <input
                      type="time"
                      value={mainBlock?.endTime || ''}
                      onChange={(e) => updateDaySchedule(day, 'endTime', e.target.value)}
                      style={styles.timeInput}
                      placeholder="15:00"
                    />
                  </div>
                  
                  <div style={styles.pickupCell}>
                    <select
                      value={deliveryPerson[day]}
                      onChange={(e) => setDeliveryPerson(prev => ({ ...prev, [day]: e.target.value }))}
                      style={{
                        ...styles.pickupSelect,
                        opacity: (!hasSchedule || !mainBlock?.startTime || !mainBlock?.endTime) ? 0.5 : 1
                      }}
                      disabled={!hasSchedule || !mainBlock?.startTime || !mainBlock?.endTime}
                    >
                      <option value="parent">Parent</option>
                      <option value="aupair">Au Pair</option>
                      <option value="alone">Kid goes alone</option>
                    </select>
                  </div>
                  
                  <div style={styles.pickupCell}>
                    <select
                      value={pickupPerson[day]}
                      onChange={(e) => setPickupPerson(prev => ({ ...prev, [day]: e.target.value }))}
                      style={{
                        ...styles.pickupSelect,
                        opacity: (!hasSchedule || !mainBlock?.startTime || !mainBlock?.endTime) ? 0.5 : 1
                      }}
                      disabled={!hasSchedule || !mainBlock?.startTime || !mainBlock?.endTime}
                    >
                      <option value="parent">Parent</option>
                      <option value="aupair">Au Pair</option>
                      <option value="alone">Kid comes home alone</option>
                    </select>
                  </div>
                  
                  <div style={styles.actionsCell}>
                    {hasSchedule && mainBlock?.startTime && mainBlock?.endTime ? (
                      <button
                        style={styles.clearDayButton}
                        onClick={() => clearDaySchedule(day)}
                        title="Clear this day"
                      >
                        Clear
                      </button>
                    ) : (
                      <span style={styles.noDaySchedule}>No school</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule Summary */}
        {hasSchedule && (
          <div style={styles.summary}>
            <h3 style={styles.summaryTitle}>Schedule Summary</h3>
            
            {/* School Information Summary */}
            {(schoolInfo.address || schoolInfo.travelTime) && (
              <div style={styles.summarySection}>
                <h4 style={styles.summarySubtitle}>School Information</h4>
                {schoolInfo.address && (
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>Address:</span>
                    <span style={styles.summaryValue}>{schoolInfo.address}</span>
                  </div>
                )}
                {schoolInfo.travelTime && (
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>Travel Time:</span>
                    <span style={styles.summaryValue}>{schoolInfo.travelTime} minutes</span>
                  </div>
                )}
              </div>
            )}

            {/* Weekly Schedule Summary */}
            <div style={styles.summarySection}>
              <h4 style={styles.summarySubtitle}>Weekly Schedule</h4>
              {days.map(day => {
                const daySchedule = schedule[day] || [];
                if (daySchedule.length === 0 || !daySchedule[0].startTime || !daySchedule[0].endTime) return null;
                
                return (
                  <div key={day} style={styles.summaryDay}>
                    <span style={styles.summaryDayName}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}:
                    </span>
                    <span style={styles.summarySchedule}>
                      {daySchedule[0].startTime} - {daySchedule[0].endTime}
                    </span>
                    <span style={styles.pickupInfo}>
                      | Delivery: {deliveryPerson[day] === 'parent' ? 'Parent' : deliveryPerson[day] === 'aupair' ? 'Au Pair' : deliveryPerson[day] === 'alone' ? 'Kid goes alone' : 'Unknown'}
                      | Pickup: {pickupPerson[day] === 'parent' ? 'Parent' : pickupPerson[day] === 'aupair' ? 'Au Pair' : pickupPerson[day] === 'alone' ? 'Kid comes home alone' : 'Unknown'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={styles.buttonContainer}>
        <button style={styles.secondaryButton} onClick={onBack}>
          Back
        </button>
        <button style={styles.primaryButton} onClick={handleSave}>
          Save and Continue
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'var(--font-family-sans)',
    overflow: 'hidden'
  },
  
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: 'var(--space-6)',
    paddingBottom: '100px'
  },

  introSection: {
    textAlign: 'center',
    marginBottom: 'var(--space-8)'
  },

  schoolIcon: {
    fontSize: '48px',
    marginBottom: 'var(--space-4)'
  },

  subtitle: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-4)',
    margin: 0
  },

  description: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--text-secondary)',
    lineHeight: 'var(--line-height-relaxed)',
    maxWidth: '600px',
    margin: '0 auto'
  },

  section: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-6)',
    marginBottom: 'var(--space-6)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border-light)'
  },

  sectionTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-4)',
    margin: '0 0 var(--space-4) 0'
  },

  schoolInfoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 200px',
    gap: 'var(--space-4)'
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)'
  },

  label: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)'
  },

  textInput: {
    padding: 'var(--space-3)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-base)',
    transition: 'var(--transition-fast)',
    outline: 'none'
  },

  numberInput: {
    padding: 'var(--space-3)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-base)',
    transition: 'var(--transition-fast)',
    outline: 'none'
  },

  quickSetRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    flexWrap: 'wrap'
  },

  timeInput: {
    padding: 'var(--space-2) var(--space-3)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-base)',
    minWidth: '120px'
  },

  timeSeparator: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--text-secondary)',
    fontWeight: 'var(--font-weight-medium)'
  },

  quickButton: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-4)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },

  clearButton: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-4)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },

  helpText: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-4)',
    lineHeight: 'var(--line-height-normal)'
  },

  // Table styles
  scheduleTable: {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden'
  },

  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '120px 120px 120px 180px 180px 100px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid var(--border-light)'
  },

  headerCell: {
    padding: 'var(--space-3)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    textAlign: 'center',
    borderRight: '1px solid var(--border-light)'
  },

  tableRow: {
    display: 'grid',
    gridTemplateColumns: '120px 120px 120px 180px 180px 100px',
    borderBottom: '1px solid var(--border-light)',
    transition: 'var(--transition-fast)'
  },

  dayCell: {
    padding: 'var(--space-3)',
    borderRight: '1px solid var(--border-light)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },

  dayName: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--text-primary)'
  },

  dayFullName: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)'
  },

  timeCell: {
    padding: 'var(--space-2)',
    borderRight: '1px solid var(--border-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  pickupCell: {
    padding: 'var(--space-2)',
    borderRight: '1px solid var(--border-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  pickupSelect: {
    padding: 'var(--space-2)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-xs)',
    width: '100%',
    maxWidth: '160px'
  },

  actionsCell: {
    padding: 'var(--space-2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  clearDayButton: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--space-1) var(--space-2)',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },

  noDaySchedule: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic'
  },

  // Summary styles
  summary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-6)',
    marginTop: 'var(--space-6)'
  },

  summaryTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-4)',
    margin: '0 0 var(--space-4) 0'
  },

  summarySection: {
    marginBottom: 'var(--space-4)'
  },

  summarySubtitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-2)',
    margin: '0 0 var(--space-2) 0'
  },

  summaryItem: {
    display: 'flex',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-1)'
  },

  summaryLabel: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-secondary)',
    minWidth: '100px'
  },

  summaryValue: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-primary)'
  },

  summaryDay: {
    display: 'flex',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-1)',
    alignItems: 'center'
  },

  summaryDayName: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    minWidth: '80px'
  },

  summarySchedule: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-primary)',
    fontFamily: 'monospace'
  },

  pickupInfo: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)',
    marginLeft: 'var(--space-2)'
  },

  // Button styles
  buttonContainer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'var(--white)',
    borderTop: '1px solid var(--border-light)',
    padding: 'var(--space-4) var(--space-6)',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-4)',
    zIndex: 10
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3) var(--space-6)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    minWidth: '120px'
  },

  primaryButton: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3) var(--space-6)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    minWidth: '120px'
  }
};

export default AddChildSchoolScheduleTable;