import { useState } from 'react';
import { ACTIVITY_TYPES } from '../../utils/routineTemplates';

function TimelineEditor({ routine, onChange, childAge }) {
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [isAddingNap, setIsAddingNap] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);

  // Generate hourly timeline
  const generateTimeline = () => {
    const timeline = [];
    for (let hour = 0; hour < 24; hour++) {
      timeline.push({
        hour,
        time: `${hour.toString().padStart(2, '0')}:00`,
        blocks: []
      });
    }
    return timeline;
  };

  const timeline = generateTimeline();

  // Helper to convert time string to minutes
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Helper to convert minutes to time string
  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Add routine blocks to timeline
  const getTimelineWithBlocks = () => {
    const blocks = [];
    
    // Add wake up and bedtime
    blocks.push({
      type: 'wake',
      startTime: routine.wakeUpTime,
      endTime: routine.wakeUpTime,
      label: '🌅 Wake Up',
      color: '#FFD60A'
    });
    
    blocks.push({
      type: 'bedtime',
      startTime: routine.bedtime,
      endTime: routine.bedtime,
      label: '🌙 Bedtime',
      color: '#5856D6'
    });
    
    // Add meals
    Object.entries(routine.mealTimes).forEach(([meal, time]) => {
      if (time && meal !== 'snacks') {
        blocks.push({
          type: 'meal',
          startTime: time,
          endTime: minutesToTime(timeToMinutes(time) + 30),
          label: `${meal === 'breakfast' ? '🥣' : meal === 'lunch' ? '🥗' : '🍽️'} ${meal.charAt(0).toUpperCase() + meal.slice(1)}`,
          color: '#FF9500'
        });
      }
    });
    
    // Add snacks
    routine.mealTimes.snacks?.forEach((time, index) => {
      blocks.push({
        type: 'snack',
        startTime: time,
        endTime: minutesToTime(timeToMinutes(time) + 15),
        label: `🍎 Snack`,
        color: '#FF9500'
      });
    });
    
    // Add nap times
    routine.napTimes?.forEach((nap, index) => {
      blocks.push({
        type: 'nap',
        startTime: nap.startTime,
        endTime: minutesToTime(timeToMinutes(nap.startTime) + nap.duration),
        label: '😴 Nap Time',
        color: '#5AC8FA',
        data: nap
      });
    });
    
    // Add free play periods
    routine.freePlayPeriods?.forEach((period, index) => {
      const activityLabels = period.activities?.map(a => ACTIVITY_TYPES[a]?.icon || '').join(' ');
      blocks.push({
        type: 'activity',
        startTime: period.startTime,
        endTime: minutesToTime(timeToMinutes(period.startTime) + period.duration),
        label: `${activityLabels} Free Play`,
        color: '#34C759',
        data: period
      });
    });
    
    return blocks.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  };

  const timelineBlocks = getTimelineWithBlocks();

  const handleAddNap = () => {
    const newNap = {
      startTime: '13:00',
      duration: 90,
      isFlexible: true
    };
    onChange({
      ...routine,
      napTimes: [...(routine.napTimes || []), newNap]
    });
    setIsAddingNap(false);
  };

  const handleAddActivity = () => {
    const newActivity = {
      startTime: '10:00',
      duration: 60,
      activities: ['free_choice']
    };
    onChange({
      ...routine,
      freePlayPeriods: [...(routine.freePlayPeriods || []), newActivity]
    });
    setIsAddingActivity(false);
  };

  const handleRemoveBlock = (block) => {
    if (block.type === 'nap') {
      onChange({
        ...routine,
        napTimes: routine.napTimes.filter(nap => nap.startTime !== block.startTime)
      });
    } else if (block.type === 'activity') {
      onChange({
        ...routine,
        freePlayPeriods: routine.freePlayPeriods.filter(period => period.startTime !== block.startTime)
      });
    } else if (block.type === 'snack') {
      onChange({
        ...routine,
        mealTimes: {
          ...routine.mealTimes,
          snacks: routine.mealTimes.snacks.filter(time => time !== block.startTime)
        }
      });
    }
  };

  const handleAddSnack = () => {
    const newSnackTime = '15:00';
    onChange({
      ...routine,
      mealTimes: {
        ...routine.mealTimes,
        snacks: [...(routine.mealTimes.snacks || []), newSnackTime]
      }
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Visual Timeline</h3>
        <div style={styles.actions}>
          <button style={styles.addButton} onClick={() => setIsAddingNap(true)}>
            + Add Nap
          </button>
          <button style={styles.addButton} onClick={() => setIsAddingActivity(true)}>
            + Add Activity
          </button>
          <button style={styles.addButton} onClick={handleAddSnack}>
            + Add Snack
          </button>
        </div>
      </div>

      <div style={styles.timeline}>
        <div style={styles.timelineScroll}>
          {timeline.map((hour) => (
            <div key={hour.hour} style={styles.hourRow}>
              <div style={styles.hourLabel}>{hour.time}</div>
              <div style={styles.hourContent}>
                {timelineBlocks
                  .filter(block => {
                    const blockStart = timeToMinutes(block.startTime);
                    const blockEnd = timeToMinutes(block.endTime || block.startTime);
                    const hourStart = hour.hour * 60;
                    const hourEnd = (hour.hour + 1) * 60;
                    return (blockStart < hourEnd && blockEnd > hourStart);
                  })
                  .map((block, index) => {
                    const blockStart = timeToMinutes(block.startTime);
                    const hourStart = hour.hour * 60;
                    const topOffset = Math.max(0, blockStart - hourStart);
                    const duration = timeToMinutes(block.endTime || block.startTime) - timeToMinutes(block.startTime);
                    
                    return (
                      <div
                        key={`${block.type}-${block.startTime}-${index}`}
                        style={{
                          ...styles.timelineBlock,
                          backgroundColor: block.color,
                          top: `${(topOffset / 60) * 100}%`,
                          height: block.type === 'wake' || block.type === 'bedtime' ? '4px' : `${(duration / 60) * 100}%`,
                          minHeight: block.type === 'wake' || block.type === 'bedtime' ? '4px' : '20px'
                        }}
                        onClick={() => setSelectedBlock(block)}
                      >
                        <span style={styles.blockLabel}>{block.label}</span>
                        {(block.type === 'nap' || block.type === 'activity' || block.type === 'snack') && (
                          <button
                            style={styles.removeBlockButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveBlock(block);
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Nap Modal */}
      {isAddingNap && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h4 style={styles.modalTitle}>Add Nap Time</h4>
            <div style={styles.modalForm}>
              <label style={styles.label}>Start Time</label>
              <input type="time" defaultValue="13:00" style={styles.input} />
              <label style={styles.label}>Duration (minutes)</label>
              <input type="number" defaultValue="90" style={styles.input} />
              <div style={styles.modalActions}>
                <button style={styles.cancelButton} onClick={() => setIsAddingNap(false)}>
                  Cancel
                </button>
                <button style={styles.saveButton} onClick={handleAddNap}>
                  Add Nap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Activity Modal */}
      {isAddingActivity && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h4 style={styles.modalTitle}>Add Activity Period</h4>
            <div style={styles.modalForm}>
              <label style={styles.label}>Start Time</label>
              <input type="time" defaultValue="10:00" style={styles.input} />
              <label style={styles.label}>Duration (minutes)</label>
              <input type="number" defaultValue="60" style={styles.input} />
              <label style={styles.label}>Activity Type</label>
              <select style={styles.input}>
                <option value="free_choice">Free Choice</option>
                <option value="outdoor">Outdoor Play</option>
                <option value="creative">Creative Time</option>
                <option value="educational">Learning Time</option>
              </select>
              <div style={styles.modalActions}>
                <button style={styles.cancelButton} onClick={() => setIsAddingActivity(false)}>
                  Cancel
                </button>
                <button style={styles.saveButton} onClick={handleAddActivity}>
                  Add Activity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    margin: 0
  },
  actions: {
    display: 'flex',
    gap: '10px'
  },
  addButton: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  timeline: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '8px',
    border: '1px solid #E5E5EA'
  },
  timelineScroll: {
    maxHeight: '400px',
    overflowY: 'auto'
  },
  hourRow: {
    display: 'flex',
    borderBottom: '1px solid #F0F0F0',
    minHeight: '60px'
  },
  hourLabel: {
    width: '60px',
    padding: '10px',
    fontSize: '12px',
    color: '#666',
    borderRight: '1px solid #F0F0F0',
    backgroundColor: '#FAFAFA'
  },
  hourContent: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'white'
  },
  timelineBlock: {
    position: 'absolute',
    left: '10px',
    right: '10px',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '12px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'opacity 0.2s',
    overflow: 'hidden'
  },
  blockLabel: {
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  removeBlockButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    border: 'none',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    fontSize: '12px',
    color: 'white',
    cursor: 'pointer',
    flexShrink: 0
  },
  modal: {
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
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 20px 0'
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#666'
  },
  input: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    fontSize: '16px',
    backgroundColor: 'white',
    outline: 'none'
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    backgroundColor: 'white',
    color: '#666',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  saveButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#34C759',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export default TimelineEditor;