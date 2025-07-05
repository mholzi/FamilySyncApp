import { useState, useEffect, useMemo } from 'react';
import { generateChildSchedule } from '../../utils/scheduleGenerator';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';

function EnhancedCalendar({ children, familyData, onEventSelect, onScheduleUpdate }) {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedChild, setSelectedChild] = useState(children[0]?.id || null);
  const [generatedSchedules, setGeneratedSchedules] = useState({});
  const [showConflicts, setShowConflicts] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Generate schedules when child or week changes
  useEffect(() => {
    if (selectedChild && children.length > 0) {
      generateSchedules();
    }
  }, [selectedChild, selectedWeek, children]);

  const generateSchedules = async () => {
    setIsGenerating(true);
    try {
      const childData = children.find(child => child.id === selectedChild);
      if (childData) {
        const result = generateChildSchedule(childData, weekStart);
        setGeneratedSchedules({
          [selectedChild]: result
        });
        
        if (onScheduleUpdate) {
          onScheduleUpdate(result);
        }
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentSchedule = generatedSchedules[selectedChild];
  const selectedChildData = children.find(child => child.id === selectedChild);

  const handlePreviousWeek = () => {
    setSelectedWeek(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setSelectedWeek(prev => addDays(prev, 7));
  };

  const handleEventClick = (event, day) => {
    if (onEventSelect) {
      onEventSelect(event, day, selectedChildData);
    }
  };

  const getEventStyle = (event) => {
    const baseStyle = {
      padding: '4px 8px',
      margin: '2px 0',
      borderRadius: '4px',
      fontSize: '12px',
      cursor: 'pointer',
      border: '1px solid',
      position: 'relative'
    };

    // Color coding by event type
    switch (event.type) {
      case 'school':
        return { ...baseStyle, backgroundColor: '#E3F2FD', borderColor: '#1976D2', color: '#1565C0' };
      case 'meal':
        return { ...baseStyle, backgroundColor: '#F3E5F5', borderColor: '#7B1FA2', color: '#6A1B9A' };
      case 'routine':
        if (event.metadata?.category === 'sleep') {
          return { ...baseStyle, backgroundColor: '#E8F5E8', borderColor: '#388E3C', color: '#2E7D32' };
        }
        return { ...baseStyle, backgroundColor: '#FFF3E0', borderColor: '#F57C00', color: '#EF6C00' };
      case 'activity':
        return { ...baseStyle, backgroundColor: '#FCE4EC', borderColor: '#C2185B', color: '#AD1457' };
      default:
        return { ...baseStyle, backgroundColor: '#F5F5F5', borderColor: '#9E9E9E', color: '#616161' };
    }
  };

  const getConflictIndicator = (day) => {
    if (!currentSchedule?.conflicts) return null;
    
    const dayConflicts = currentSchedule.conflicts.filter(conflict => conflict.day === day);
    if (dayConflicts.length === 0) return null;

    const highPriority = dayConflicts.some(c => c.severity === 'high');
    
    return (
      <div style={{
        ...styles.conflictIndicator,
        backgroundColor: highPriority ? '#FF5252' : '#FFC107'
      }}>
        {dayConflicts.length}
      </div>
    );
  };

  const renderDayColumn = (day, index) => {
    const dayKey = dayNames[index].toLowerCase();
    const daySchedule = currentSchedule?.schedule?.[dayKey];
    const dateStr = format(weekDays[index], 'MMM d');
    const isToday = isSameDay(weekDays[index], new Date());

    return (
      <div key={day} style={styles.dayColumn}>
        <div style={{
          ...styles.dayHeader,
          ...(isToday ? styles.todayHeader : {})
        }}>
          <div style={styles.dayName}>{day.slice(0, 3)}</div>
          <div style={styles.dayDate}>{dateStr}</div>
          {getConflictIndicator(dayKey)}
        </div>
        
        <div style={styles.dayContent}>
          {isGenerating ? (
            <div style={styles.loadingPlaceholder}>
              <div style={styles.loadingSpinner}></div>
              <span>Generating...</span>
            </div>
          ) : (
            <>
              {daySchedule?.events?.map((event, eventIndex) => (
                <div
                  key={event.id}
                  style={getEventStyle(event)}
                  onClick={() => handleEventClick(event, dayKey)}
                  title={`${event.title} (${event.startTime} - ${event.endTime})`}
                >
                  <div style={styles.eventTitle}>{event.title}</div>
                  <div style={styles.eventTime}>
                    {event.startTime} - {event.endTime}
                  </div>
                  {event.metadata?.travelTime && (
                    <div style={styles.travelTime}>
                      🚗 {event.metadata.travelTime}min
                    </div>
                  )}
                  {event.metadata?.preparation?.length > 0 && (
                    <div style={styles.preparationIndicator}>📋</div>
                  )}
                </div>
              ))}
              
              {/* Show free time slots */}
              {daySchedule?.freeTimeSlots?.filter(slot => slot.duration >= 60).map((slot, slotIndex) => (
                <div key={`free-${slotIndex}`} style={styles.freeTimeSlot}>
                  <div style={styles.freeTimeLabel}>Free Time</div>
                  <div style={styles.freeTimeTime}>
                    {slot.startTime} - {slot.endTime} ({Math.round(slot.duration / 60 * 10) / 10}h)
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  };

  if (!children || children.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <h3>No Children Added</h3>
          <p>Add children to your family to generate smart schedules</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header Controls */}
      <div style={styles.header}>
        <div style={styles.childSelector}>
          <label style={styles.selectorLabel}>Child:</label>
          <select
            value={selectedChild || ''}
            onChange={(e) => setSelectedChild(e.target.value)}
            style={styles.select}
          >
            {children.map(child => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.weekNavigation}>
          <button style={styles.navButton} onClick={handlePreviousWeek}>
            ← Previous Week
          </button>
          <span style={styles.weekLabel}>
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </span>
          <button style={styles.navButton} onClick={handleNextWeek}>
            Next Week →
          </button>
        </div>

        <div style={styles.controls}>
          <button 
            style={styles.refreshButton}
            onClick={generateSchedules}
            disabled={isGenerating}
          >
            🔄 Regenerate
          </button>
        </div>
      </div>

      {/* Schedule Metadata */}
      {currentSchedule?.metadata && (
        <div style={styles.metadata}>
          <div style={styles.metadataItem}>
            <span style={styles.metadataLabel}>Activities:</span>
            <span>{currentSchedule.metadata.totalActivities} total</span>
          </div>
          <div style={styles.metadataItem}>
            <span style={styles.metadataLabel}>Free Time:</span>
            <span>{currentSchedule.metadata.totalFreeTimeHours}h</span>
          </div>
          <div style={styles.metadataItem}>
            <span style={styles.metadataLabel}>Balance Score:</span>
            <span style={{
              color: currentSchedule.metadata.balanceScore >= 80 ? '#4CAF50' : 
                     currentSchedule.metadata.balanceScore >= 60 ? '#FF9800' : '#F44336'
            }}>
              {currentSchedule.metadata.balanceScore}/100
            </span>
          </div>
          {currentSchedule.conflicts?.length > 0 && (
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Conflicts:</span>
              <button 
                style={styles.conflictButton}
                onClick={() => setShowConflicts(!showConflicts)}
              >
                {currentSchedule.conflicts.length} issues
              </button>
            </div>
          )}
          {currentSchedule.suggestions?.length > 0 && (
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Suggestions:</span>
              <button 
                style={styles.suggestionButton}
                onClick={() => setShowSuggestions(!showSuggestions)}
              >
                {currentSchedule.suggestions.length} tips
              </button>
            </div>
          )}
        </div>
      )}

      {/* Conflicts Panel */}
      {showConflicts && currentSchedule?.conflicts && (
        <div style={styles.alertPanel}>
          <h4 style={styles.alertTitle}>⚠️ Schedule Conflicts</h4>
          {currentSchedule.conflicts.map((conflict, index) => (
            <div key={index} style={{
              ...styles.alertItem,
              borderLeftColor: conflict.severity === 'high' ? '#F44336' : 
                              conflict.severity === 'medium' ? '#FF9800' : '#FFC107'
            }}>
              <div style={styles.alertMessage}>{conflict.message}</div>
              <div style={styles.alertSuggestion}>{conflict.suggestion}</div>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions Panel */}
      {showSuggestions && currentSchedule?.suggestions && (
        <div style={styles.alertPanel}>
          <h4 style={styles.alertTitle}>💡 Schedule Suggestions</h4>
          {currentSchedule.suggestions.map((suggestion, index) => (
            <div key={index} style={styles.alertItem}>
              <div style={styles.alertMessage}>{suggestion.message}</div>
              <div style={styles.alertSuggestion}>{suggestion.suggestion}</div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar Grid */}
      <div style={styles.calendar}>
        {dayNames.map((day, index) => renderDayColumn(day, index))}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendTitle}>Legend:</div>
        <div style={styles.legendItems}>
          <div style={styles.legendItem}>
            <div style={{...styles.legendColor, backgroundColor: '#E3F2FD', borderColor: '#1976D2'}}></div>
            <span>School</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{...styles.legendColor, backgroundColor: '#F3E5F5', borderColor: '#7B1FA2'}}></div>
            <span>Meals</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{...styles.legendColor, backgroundColor: '#E8F5E8', borderColor: '#388E3C'}}></div>
            <span>Sleep</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{...styles.legendColor, backgroundColor: '#FCE4EC', borderColor: '#C2185B'}}></div>
            <span>Activities</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  
  childSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  selectorLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  
  select: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #E5E5EA',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  
  weekNavigation: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  
  navButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #E5E5EA',
    backgroundColor: 'white',
    color: '#007AFF',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  
  weekLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    minWidth: '200px',
    textAlign: 'center'
  },
  
  controls: {
    display: 'flex',
    gap: '10px'
  },
  
  refreshButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#34C759',
    color: 'white',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  
  metadata: {
    display: 'flex',
    gap: '20px',
    padding: '15px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  
  metadataItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  metadataLabel: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '500'
  },
  
  conflictButton: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#FF5252',
    color: 'white',
    fontSize: '12px',
    cursor: 'pointer'
  },
  
  suggestionButton: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#2196F3',
    color: 'white',
    fontSize: '12px',
    cursor: 'pointer'
  },
  
  alertPanel: {
    backgroundColor: '#FFF9C4',
    border: '1px solid #FFD54F',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px'
  },
  
  alertTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#F57F17',
    margin: '0 0 15px 0'
  },
  
  alertItem: {
    borderLeft: '4px solid #FFC107',
    paddingLeft: '12px',
    marginBottom: '10px'
  },
  
  alertMessage: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '4px'
  },
  
  alertSuggestion: {
    fontSize: '13px',
    color: '#666',
    fontStyle: 'italic'
  },
  
  calendar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px',
    backgroundColor: '#E5E5EA',
    borderRadius: '8px',
    overflow: 'hidden',
    minHeight: '400px'
  },
  
  dayColumn: {
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column'
  },
  
  dayHeader: {
    padding: '12px 8px',
    backgroundColor: '#F8F9FA',
    borderBottom: '1px solid #E5E5EA',
    textAlign: 'center',
    position: 'relative'
  },
  
  todayHeader: {
    backgroundColor: '#E3F2FD',
    borderBottom: '1px solid #1976D2'
  },
  
  dayName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '2px'
  },
  
  dayDate: {
    fontSize: '12px',
    color: '#666'
  },
  
  conflictIndicator: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '18px',
    height: '18px',
    borderRadius: '9px',
    fontSize: '10px',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600'
  },
  
  dayContent: {
    flex: 1,
    padding: '8px',
    minHeight: '300px'
  },
  
  loadingPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#666'
  },
  
  loadingSpinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #E5E5EA',
    borderTop: '2px solid #007AFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '8px'
  },
  
  eventTitle: {
    fontWeight: '500',
    marginBottom: '2px',
    fontSize: '11px'
  },
  
  eventTime: {
    fontSize: '10px',
    opacity: 0.8
  },
  
  travelTime: {
    fontSize: '9px',
    marginTop: '2px',
    opacity: 0.7
  },
  
  preparationIndicator: {
    position: 'absolute',
    top: '2px',
    right: '4px',
    fontSize: '10px'
  },
  
  freeTimeSlot: {
    padding: '6px',
    margin: '2px 0',
    borderRadius: '4px',
    backgroundColor: '#F0F8F0',
    border: '1px dashed #81C784',
    fontSize: '11px'
  },
  
  freeTimeLabel: {
    fontWeight: '500',
    color: '#388E3C',
    marginBottom: '2px'
  },
  
  freeTimeTime: {
    fontSize: '10px',
    color: '#4CAF50'
  },
  
  legend: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px'
  },
  
  legendTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#333'
  },
  
  legendItems: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap'
  },
  
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  
  legendColor: {
    width: '16px',
    height: '16px',
    borderRadius: '3px',
    border: '1px solid'
  },
  
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666'
  }
};

// Add CSS animation for loading spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  if (!document.head.querySelector('style[data-calendar-spinner]')) {
    style.setAttribute('data-calendar-spinner', 'true');
    document.head.appendChild(style);
  }
}

export default EnhancedCalendar;