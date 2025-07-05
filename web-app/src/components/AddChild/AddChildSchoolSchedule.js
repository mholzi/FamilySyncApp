import { useState, useRef, useEffect } from 'react';

function AddChildSchoolSchedule({ childData, initialData, onNext, onBack }) {
  const [scheduleType, setScheduleType] = useState(initialData?.scheduleType || 'kindergarten');
  const [schedule, setSchedule] = useState(initialData?.schoolSchedule || {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: []
  });
  
  const [quickSetTime, setQuickSetTime] = useState({ start: '09:00', end: '15:00' });
  const [isDragging, setIsDragging] = useState(false);
  const [dragData, setDragData] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [resizingBlock, setResizingBlock] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null); // 'top' or 'bottom'
  
  const calendarRef = useRef(null);
  
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

  // Convert time string to minutes since midnight
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes to time string
  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
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

  // Add a new time block to a specific day
  const addTimeBlock = (day, type = null) => {
    const blockType = type || scheduleTypes[scheduleType].defaultBlocks[0];
    const newBlock = {
      id: Date.now() + Math.random(),
      type: blockType,
      startTime: '09:00',
      endTime: '12:00',
      color: scheduleTypes[scheduleType].color
    };
    
    setSchedule(prev => ({
      ...prev,
      [day]: [...prev[day], newBlock].sort((a, b) => 
        timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      )
    }));
  };

  // Remove a time block
  const removeTimeBlock = (day, blockId) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day].filter(block => block.id !== blockId)
    }));
  };

  // Update time block
  const updateTimeBlock = (day, blockId, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day].map(block => 
        block.id === blockId ? { ...block, [field]: value } : block
      ).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    }));
  };

  // Handle drag start
  const handleDragStart = (e, day, block) => {
    setIsDragging(true);
    setDragData({ day, block, startY: e.clientY });
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle resize start
  const handleResizeStart = (e, day, block, handle) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingBlock({ day, block, startY: e.clientY });
    setResizeHandle(handle);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  // Handle resize move
  const handleResizeMove = (e) => {
    if (!resizingBlock || !resizeHandle) return;
    
    // Find the specific calendar container for the day being resized
    const dayGrids = document.querySelectorAll('[data-calendar-container]');
    let targetGrid = null;
    
    // Find which day grid contains the mouse position
    for (const grid of dayGrids) {
      const rect = grid.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right) {
        targetGrid = grid;
        break;
      }
    }
    
    if (!targetGrid) return;
    
    const rect = targetGrid.getBoundingClientRect();
    const newMinutes = calculateTimeFromPosition(e, rect);
    const { day, block } = resizingBlock;
    
    if (resizeHandle === 'top') {
      // Resize from top (change start time)
      const endMinutes = timeToMinutes(block.endTime);
      const newStartMinutes = Math.min(newMinutes, endMinutes - 15); // Minimum 15 minutes
      const clampedStartMinutes = Math.max(420, newStartMinutes); // 7 AM minimum
      updateTimeBlock(day, block.id, 'startTime', minutesToTime(clampedStartMinutes));
    } else if (resizeHandle === 'bottom') {
      // Resize from bottom (change end time)
      const startMinutes = timeToMinutes(block.startTime);
      const newEndMinutes = Math.max(newMinutes, startMinutes + 15); // Minimum 15 minutes
      const clampedEndMinutes = Math.min(1080, newEndMinutes); // 6 PM maximum
      updateTimeBlock(day, block.id, 'endTime', minutesToTime(clampedEndMinutes));
    }
  };

  // Handle resize end
  const handleResizeEnd = () => {
    setResizingBlock(null);
    setResizeHandle(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  // Cleanup effect for resize event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Calculate time from mouse position
  const calculateTimeFromPosition = (e, containerRect) => {
    const relativeY = e.clientY - containerRect.top;
    const hourHeight = containerRect.height / 11; // 7 AM to 6 PM = 11 hours
    const totalMinutes = (relativeY / hourHeight) * 660; // 660 minutes = 11 hours
    const minutes = Math.round(totalMinutes / 15) * 15 + 420; // Round to 15-minute intervals, start at 7 AM (420 minutes)
    return Math.max(420, Math.min(1080, minutes)); // Clamp between 7 AM and 6 PM
  };

  // Handle drop
  const handleDrop = (e, targetDay) => {
    e.preventDefault();
    if (!dragData) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const newStartMinutes = calculateTimeFromPosition(e, rect);
    const duration = timeToMinutes(dragData.block.endTime) - timeToMinutes(dragData.block.startTime);
    const newEndMinutes = newStartMinutes + duration;

    // Remove from original day
    if (dragData.day !== targetDay) {
      removeTimeBlock(dragData.day, dragData.block.id);
    }

    // Add to new day with new time
    setSchedule(prev => ({
      ...prev,
      [targetDay]: [
        ...prev[targetDay].filter(block => block.id !== dragData.block.id),
        {
          ...dragData.block,
          startTime: minutesToTime(newStartMinutes),
          endTime: minutesToTime(Math.min(1080, newEndMinutes))
        }
      ].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    }));

    setIsDragging(false);
    setDragData(null);
  };

  // Handle continue
  const handleContinue = () => {
    const scheduleData = {
      scheduleType,
      schoolSchedule: schedule,
      lastModified: new Date().toISOString()
    };
    onNext(scheduleData);
  };

  // Validate schedule
  const hasSchedule = Object.values(schedule).some(daySchedule => daySchedule.length > 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack}>
          ←
        </button>
        <h1 style={styles.title}>School Schedule</h1>
        <div style={styles.placeholder}></div>
      </div>

      <div style={styles.content}>
        <div style={styles.introSection}>
          <div style={styles.schoolIcon}>🏫</div>
          <h2 style={styles.subtitle}>Set {childData?.name || 'Child'}'s Weekly Schedule</h2>
          <p style={styles.description}>
            Configure kindergarten or school times for each weekday. You can set different times per day and add gaps as needed.
          </p>
        </div>

        {/* Schedule Type Selector */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Schedule Type</h3>
          <div style={styles.typeButtons}>
            {Object.entries(scheduleTypes).map(([key, type]) => (
              <button
                key={key}
                style={{
                  ...styles.typeButton,
                  ...(scheduleType === key ? styles.typeButtonActive : {})
                }}
                onClick={() => setScheduleType(key)}
              >
                {type.label}
              </button>
            ))}
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

        {/* Weekly Calendar */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Weekly Schedule</h3>
          <p style={styles.helpText}>
            Drag time blocks to move them. Drag edges to resize. Click + to add blocks. Times from 7 AM to 6 PM.
          </p>
          
          <div style={styles.calendar} ref={calendarRef}>
            <div style={styles.timeColumn}>
              <div style={styles.timeHeader}></div>
              {Array.from({ length: 11 }, (_, i) => {
                const hour = i + 7; // 7 AM to 5 PM (6 PM is at the end)
                const displayHour = hour > 12 ? hour - 12 : hour;
                const ampm = hour >= 12 ? 'PM' : 'AM';
                return (
                  <div key={hour} style={styles.timeSlot}>
                    {`${displayHour}:00 ${ampm}`}
                  </div>
                );
              })}
              <div style={styles.timeSlot}>6:00 PM</div>
            </div>

            {days.map(day => (
              <div key={day} style={styles.dayColumn}>
                <div style={styles.dayHeader}>
                  <span style={styles.dayLabel}>{dayLabels[day]}</span>
                  <div style={styles.dayActions}>
                    <button 
                      style={styles.addButton}
                      onClick={() => addTimeBlock(day)}
                    >
                      +
                    </button>
                    {scheduleType === 'school' && (
                      <button 
                        style={styles.addBetreuungButton}
                        onClick={() => addTimeBlock(day, 'Kinderbetreuung')}
                        title="Add Kinderbetreuung"
                      >
                        K
                      </button>
                    )}
                  </div>
                </div>
                
                <div 
                  style={styles.dayGrid}
                  data-calendar-container
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                >
                  {schedule[day].map(block => {
                    const startMinutes = timeToMinutes(block.startTime);
                    const endMinutes = timeToMinutes(block.endTime);
                    // Calculate positioning: 7 AM = 420 minutes, 6 PM = 1080 minutes, total range = 660 minutes
                    const topPercent = ((startMinutes - 420) / 660) * 100; // 420 = 7 AM, 660 = 11 hours
                    const heightPercent = ((endMinutes - startMinutes) / 660) * 100;
                    
                    return (
                      <div
                        key={block.id}
                        style={{
                          ...styles.timeBlock,
                          backgroundColor: block.type === 'Kinderbetreuung' ? '#FF9500' : block.color,
                          top: `${topPercent}%`,
                          height: `${heightPercent}%`,
                          border: resizingBlock?.block?.id === block.id 
                            ? '2px solid rgba(255, 255, 255, 0.8)' 
                            : 'none',
                          transform: resizingBlock?.block?.id === block.id 
                            ? 'scale(1.02)' 
                            : 'scale(1)',
                          transition: resizingBlock?.block?.id === block.id 
                            ? 'none' 
                            : 'transform 0.2s ease, border 0.2s ease',
                          zIndex: resizingBlock?.block?.id === block.id ? 10 : 1
                        }}
                      >
                        {/* Top resize handle */}
                        <div 
                          style={{
                            ...styles.resizeHandle,
                            backgroundColor: resizingBlock?.block?.id === block.id && resizeHandle === 'top' 
                              ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 0, 0.2)', // Yellow background to make it visible
                            border: '2px solid red' // Temporary - to make it very obvious
                          }}
                          onMouseDown={(e) => {
                            console.log('🔥 TOP RESIZE HANDLE CLICKED!', { day, blockId: block.id });
                            e.stopPropagation();
                            e.preventDefault();
                            alert('Top handle clicked!'); // Immediate feedback
                            handleResizeStart(e, day, block, 'top');
                          }}
                          onPointerDown={(e) => {
                            console.log('🔥 TOP RESIZE HANDLE POINTER DOWN!');
                            e.stopPropagation();
                            e.preventDefault();
                            handleResizeStart(e, day, block, 'top');
                          }}
                          onTouchStart={(e) => {
                            console.log('🔥 TOP RESIZE HANDLE TOUCH START!');
                            e.stopPropagation();
                            e.preventDefault();
                            handleResizeStart(e, day, block, 'top');
                          }}
                          onClick={(e) => {
                            console.log('🔥 TOP RESIZE HANDLE CLICK!');
                            e.stopPropagation();
                          }}
                          onMouseEnter={(e) => {
                            console.log('🔥 TOP RESIZE HANDLE HOVER!');
                            e.target.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
                          }}
                          title="🔥 TOP RESIZE HANDLE - Drag to adjust start time"
                        >
                          <div style={{
                            ...styles.resizeIndicator,
                            backgroundColor: 'red', // Make it very obvious
                            height: '4px'
                          }}>TOP</div>
                        </div>
                        
                        {/* Draggable content area */}
                        <div 
                          style={styles.blockDragArea}
                          draggable
                          onDragStart={(e) => handleDragStart(e, day, block)}
                        >
                          <div style={styles.blockHeader}>
                            <span style={styles.blockType}>{block.type}</span>
                            <button 
                              style={styles.removeBlockButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTimeBlock(day, block.id);
                              }}
                            >
                              ×
                            </button>
                          </div>
                          
                          <div style={styles.blockContent}>
                            <div style={styles.blockTimeDisplay}>
                              {block.startTime} - {block.endTime}
                            </div>
                            <div style={styles.blockTimes}>
                              <input
                                type="time"
                                value={block.startTime}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updateTimeBlock(day, block.id, 'startTime', e.target.value);
                                }}
                                style={styles.blockTimeInput}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <input
                                type="time"
                                value={block.endTime}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updateTimeBlock(day, block.id, 'endTime', e.target.value);
                                }}
                                style={styles.blockTimeInput}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Bottom resize handle */}
                        <div 
                          style={{
                            ...styles.resizeHandle,
                            bottom: '0',
                            top: 'auto',
                            backgroundColor: resizingBlock?.block?.id === block.id && resizeHandle === 'bottom' 
                              ? 'rgba(255, 255, 255, 0.3)' : 'transparent'
                          }}
                          onMouseDown={(e) => {
                            console.log('Bottom resize handle mousedown');
                            e.stopPropagation();
                            e.preventDefault();
                            handleResizeStart(e, day, block, 'bottom');
                          }}
                          onMouseEnter={(e) => {
                            if (!resizingBlock) {
                              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!resizingBlock) {
                              e.target.style.backgroundColor = 'transparent';
                            }
                          }}
                          title="Drag to adjust end time"
                        >
                          <div style={{
                            ...styles.resizeIndicator,
                            backgroundColor: resizingBlock?.block?.id === block.id && resizeHandle === 'bottom'
                              ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.8)'
                          }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule Summary */}
        {hasSchedule && (
          <div style={styles.summary}>
            <h3 style={styles.summaryTitle}>Schedule Summary</h3>
            {days.map(day => (
              schedule[day].length > 0 && (
                <div key={day} style={styles.summaryDay}>
                  <strong>{dayLabels[day]}:</strong>
                  {schedule[day].map((block, index) => (
                    <span key={block.id} style={styles.summaryBlock}>
                      {index > 0 && ', '}
                      {block.type} ({block.startTime}-{block.endTime})
                    </span>
                  ))}
                </div>
              )
            ))}
          </div>
        )}
      </div>

      <div style={styles.buttonSection}>
        <button style={styles.skipButton} onClick={() => onNext({})}>
          Skip for Now
        </button>
        <button 
          style={{
            ...styles.continueButton,
            ...(hasSchedule ? {} : styles.continueButtonDisabled)
          }}
          onClick={handleContinue}
          disabled={!hasSchedule}
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
    marginBottom: '30px',
    backgroundColor: 'white',
    padding: '30px 20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  schoolIcon: {
    fontSize: '48px',
    marginBottom: '15px'
  },
  subtitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 10px 0'
  },
  description: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.4',
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
  typeButtons: {
    display: 'flex',
    gap: '10px'
  },
  typeButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    backgroundColor: 'white',
    color: '#666',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    color: 'white',
    borderColor: '#007AFF'
  },
  quickSetRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },
  timeInput: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #E5E5EA',
    fontSize: '14px',
    backgroundColor: 'white'
  },
  timeSeparator: {
    fontSize: '14px',
    color: '#666'
  },
  quickButton: {
    backgroundColor: '#34C759',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  helpText: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '15px',
    lineHeight: '1.4'
  },
  calendar: {
    display: 'flex',
    border: '1px solid #E5E5EA',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: 'white'
  },
  timeColumn: {
    width: '60px',
    borderRight: '1px solid #E5E5EA'
  },
  timeHeader: {
    height: '50px',
    borderBottom: '1px solid #E5E5EA'
  },
  timeSlot: {
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: '#666',
    borderBottom: '1px solid #F0F0F0'
  },
  dayColumn: {
    flex: 1,
    borderRight: '1px solid #E5E5EA',
    position: 'relative'
  },
  dayHeader: {
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px',
    borderBottom: '1px solid #E5E5EA',
    backgroundColor: '#F8F9FA'
  },
  dayLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#333'
  },
  dayActions: {
    display: 'flex',
    gap: '4px'
  },
  addButton: {
    width: '20px',
    height: '20px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  addBetreuungButton: {
    width: '20px',
    height: '20px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#FF9500',
    color: 'white',
    fontSize: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayGrid: {
    height: '440px', // 11 hours * 40px
    position: 'relative',
    backgroundColor: '#FAFAFA'
  },
  timeBlock: {
    position: 'absolute',
    left: '4px',
    right: '4px',
    borderRadius: '4px',
    padding: '0',
    minHeight: '40px',
    display: 'flex',
    flexDirection: 'column',
    fontSize: '10px',
    color: 'white',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    zIndex: 1,
    overflow: 'visible',
    pointerEvents: 'auto'
  },
  blockHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px'
  },
  blockType: {
    fontSize: '10px',
    fontWeight: '600',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  removeBlockButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    border: 'none',
    borderRadius: '10px',
    width: '16px',
    height: '16px',
    fontSize: '12px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  blockContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '4px'
  },
  blockTimeDisplay: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    lineHeight: '1.2',
    marginBottom: '2px'
  },
  blockTimes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  blockTimeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    border: 'none',
    borderRadius: '3px',
    padding: '3px 5px',
    fontSize: '11px',
    color: '#333',
    minWidth: '50px',
    textAlign: 'center'
  },
  blockDragArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    cursor: 'move',
    padding: '4px',
    paddingTop: '12px',
    paddingBottom: '12px',
    margin: '12px 0'
  },
  resizeHandle: {
    position: 'absolute',
    left: '-2px',
    right: '-2px',
    height: '16px',
    top: '-2px',
    cursor: 'ns-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    border: '2px solid red',
    borderRadius: '4px',
    pointerEvents: 'auto' // Ensure it can receive events
  },
  resizeIndicator: {
    width: '30px',
    height: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '2px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
  },
  summary: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  summaryTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 15px 0'
  },
  summaryDay: {
    fontSize: '14px',
    color: '#333',
    marginBottom: '8px',
    lineHeight: '1.4'
  },
  summaryBlock: {
    color: '#666',
    marginLeft: '8px'
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
  continueButtonDisabled: {
    backgroundColor: '#C7C7CC',
    cursor: 'not-allowed'
  }
};

export default AddChildSchoolSchedule;