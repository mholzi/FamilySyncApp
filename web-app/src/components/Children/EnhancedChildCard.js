import React, { useState } from 'react';
import { getNextOccurrences } from '../../utils/recurringActivityTemplates';

// Default color palette for children
const CHILD_COLORS = [
  { primary: '#7C3AED', light: '#EDE9FE' }, // Purple
  { primary: '#EC4899', light: '#FCE7F3' }, // Pink
  { primary: '#F59E0B', light: '#FEF3C7' }, // Amber
  { primary: '#10B981', light: '#D1FAE5' }, // Emerald
  { primary: '#3B82F6', light: '#DBEAFE' }, // Blue
  { primary: '#06B6D4', light: '#E0F2FE' }, // Cyan
  { primary: '#8B5CF6', light: '#F3E8FF' }, // Violet
  { primary: '#F97316', light: '#FED7AA' }, // Orange
];

// Function to get consistent color for a child based on their ID
const getChildColor = (childId, index = 0) => {
  if (!childId) return CHILD_COLORS[index % CHILD_COLORS.length];
  
  // Create a simple hash from the childId to ensure consistency
  let hash = 0;
  for (let i = 0; i < childId.length; i++) {
    hash = ((hash << 5) - hash) + childId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value to ensure positive index
  const colorIndex = Math.abs(hash) % CHILD_COLORS.length;
  return CHILD_COLORS[colorIndex];
};

const EnhancedChildCard = ({ 
  child, 
  childIndex = 0, // Fallback index if no child ID
  onEditChild,
  userRole = 'parent',
  recurringActivities = [] // Add recurring activities prop
}) => {
  const [imageError, setImageError] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  
  // Get consistent color for this child
  const childColor = getChildColor(child.id, childIndex);
  // Calculate age - unused function
  // const calculateAge = (dateOfBirth) => {
  //   if (!dateOfBirth) return 0;
  //   const birthDate = dateOfBirth.toDate ? dateOfBirth.toDate() : new Date(dateOfBirth);
  //   const today = new Date();
  //   const diffTime = Math.abs(today - birthDate);
  //   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  //   
  //   if (diffDays < 365) {
  //     const months = Math.floor(diffDays / 30);
  //     return months > 0 ? `${months}m` : `${Math.floor(diffDays / 7)}w`;
  //   } else {
  //     const years = Math.floor(diffDays / 365);
  //     const remainingMonths = Math.floor((diffDays % 365) / 30);
  //     return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years}y`;
  //   }
  // };


  // const calculateAgeInMonths = (dateOfBirth) => {
  //   if (!dateOfBirth) return 0;
  //   const birthDate = dateOfBirth.toDate ? dateOfBirth.toDate() : new Date(dateOfBirth);
  //   const today = new Date();
  //   return Math.floor((today - birthDate) / (1000 * 60 * 60 * 24 * 30.44));
  // };

  // Format time for display - unused function
  // const formatTime = (date) => {
  //   if (!date) return '';
  //   const eventDate = date.toDate ? date.toDate() : new Date(date);
  //   return eventDate.toLocaleTimeString('en-US', { 
  //     hour: '2-digit', 
  //     minute: '2-digit',
  //     hour12: false 
  //   });
  // };

  // Convert time string "HH:MM" to minutes since midnight
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Get school events for today
  const getSchoolEvents = () => {
    if (!child.schoolSchedule) return [];
    
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const todaySchedule = child.schoolSchedule[currentDay];
    if (!todaySchedule || todaySchedule.length === 0) return [];
    
    const schoolEvents = [];
    
    // Add school events that haven't ended yet
    todaySchedule.forEach(block => {
      const startMinutes = timeToMinutes(block.startTime);
      const endMinutes = timeToMinutes(block.endTime);
      
      // If school hasn't started yet or is ongoing, show start time
      if (startMinutes > currentTime) {
        schoolEvents.push({
          name: 'School Start',
          time: block.startTime,
          minutes: startMinutes,
          icon: '🏫',
          type: 'school-start'
        });
      }
      
      // If currently in school, show end time
      if (currentTime >= startMinutes && currentTime < endMinutes) {
        schoolEvents.push({
          name: 'School End',
          time: block.endTime,
          minutes: endMinutes,
          icon: '🏠',
          type: 'school-end'
        });
      }
    });
    
    return schoolEvents;
  };

  // Get child's routine times for today from actual child data
  const getChildRoutines = () => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Get child's actual routine data
    const routine = child.carePreferences?.dailyRoutine;
    if (!routine) {
      return []; // No routine data available
    }
    
    const routineEvents = [];
    
    // Note: responsibilities are available in routine.responsibilities if needed

    // Show all routines for visibility and context (no filtering by responsibility)
    
    // Add wake up time
    if (routine.wakeUpTime) {
      routineEvents.push({
        name: 'Wake Up',
        time: routine.wakeUpTime,
        minutes: timeToMinutes(routine.wakeUpTime),
        icon: '☀️'
      });
    }
    
    // Add meal times
    if (routine.mealTimes) {
      // Breakfast
      if (routine.mealTimes.breakfast) {
        routineEvents.push({
          name: 'Breakfast',
          time: routine.mealTimes.breakfast,
          minutes: timeToMinutes(routine.mealTimes.breakfast),
          icon: '🥣'
        });
      }
      
      // Lunch times (can be multiple)
      if (routine.mealTimes.lunch) {
        const lunchTimes = Array.isArray(routine.mealTimes.lunch) 
          ? routine.mealTimes.lunch 
          : [routine.mealTimes.lunch];
        lunchTimes.forEach((lunchTime, index) => {
          routineEvents.push({
            name: lunchTimes.length > 1 ? `Lunch ${index + 1}` : 'Lunch',
            time: lunchTime,
            minutes: timeToMinutes(lunchTime),
            icon: '🥗'
          });
        });
      }
      
      // Dinner
      if (routine.mealTimes.dinner) {
        routineEvents.push({
          name: 'Dinner',
          time: routine.mealTimes.dinner,
          minutes: timeToMinutes(routine.mealTimes.dinner),
          icon: '🍽️'
        });
      }
      
      // Snacks (can be multiple)
      if (routine.mealTimes.snacks) {
        routine.mealTimes.snacks.forEach((snackTime, index) => {
          routineEvents.push({
            name: routine.mealTimes.snacks.length > 1 ? `Snack ${index + 1}` : 'Snack',
            time: snackTime,
            minutes: timeToMinutes(snackTime),
            icon: '🍎'
          });
        });
      }
    }
    
    // Add nap times
    if (routine.napTimes && routine.napTimes.length > 0) {
      routine.napTimes.forEach((nap, index) => {
        if (nap.startTime) {
          routineEvents.push({
            name: routine.napTimes.length > 1 ? `Nap ${index + 1}` : 'Nap Time',
            time: nap.startTime,
            minutes: timeToMinutes(nap.startTime),
            duration: nap.duration,
            icon: '😴'
          });
        }
      });
    }
    
    // Add bedtime
    if (routine.bedtime) {
      routineEvents.push({
        name: 'Bedtime',
        time: routine.bedtime,
        minutes: timeToMinutes(routine.bedtime),
        icon: '🌙'
      });
    }
    
    // Get school events and merge with routine events
    const schoolEvents = getSchoolEvents();
    
    // Get recurring activities for this child
    const activityEvents = [];
    recurringActivities.forEach(activity => {
      // Check if this activity is assigned to the current child
      if (activity.assignedChildren && activity.assignedChildren.includes(child.id)) {
        try {
          // Get next occurrences for this activity
          const nextOccurrences = getNextOccurrences(activity, 3);
          
          nextOccurrences.forEach(occurrence => {
            const occurrenceDate = occurrence.date.toDateString();
            const isToday = occurrenceDate === new Date().toDateString();
            const isTomorrow = occurrenceDate === new Date(Date.now() + 86400000).toDateString();
            
            // Add today's and tomorrow's activities
            if (isToday || isTomorrow) {
              activityEvents.push({
                name: activity.name,
                time: occurrence.time,
                minutes: timeToMinutes(occurrence.time),
                isActivity: true,
                isTomorrow: isTomorrow,
                transportation: activity.transportation
              });
            }
          });
        } catch (error) {
          console.warn('Error processing recurring activity for child card:', error, activity);
        }
      }
    });
    
    const allEvents = [...routineEvents, ...schoolEvents, ...activityEvents];
    
    // Sort by time and filter to show only upcoming events
    let upcomingEvents = allEvents
      .sort((a, b) => a.minutes - b.minutes)
      .filter(event => event.minutes > currentTime);
    
    // If we have less than 3 events for today, add tomorrow's routines
    if (upcomingEvents.length < 3) {
      // Get tomorrow's routines in order
      const tomorrowRoutines = [];
      
      // Add wake up
      if (routine.wakeUpTime) {
        tomorrowRoutines.push({
          name: 'Wake Up',
          time: routine.wakeUpTime,
          minutes: timeToMinutes(routine.wakeUpTime),
          icon: '☀️',
          isTomorrow: true
        });
      }
      
      // Add breakfast
      if (routine.mealTimes?.breakfast) {
        tomorrowRoutines.push({
          name: 'Breakfast',
          time: routine.mealTimes.breakfast,
          minutes: timeToMinutes(routine.mealTimes.breakfast),
          icon: '🥣',
          isTomorrow: true
        });
      }
      
      // Add first snack
      if (routine.mealTimes?.snacks && routine.mealTimes.snacks[0]) {
        tomorrowRoutines.push({
          name: 'Morning Snack',
          time: routine.mealTimes.snacks[0],
          minutes: timeToMinutes(routine.mealTimes.snacks[0]),
          icon: '🍎',
          isTomorrow: true
        });
      }
      
      // Sort tomorrow's routines by time and add as many as needed to reach 3 total
      const sortedTomorrowRoutines = tomorrowRoutines.sort((a, b) => a.minutes - b.minutes);
      const routinesNeeded = 3 - upcomingEvents.length;
      upcomingEvents = upcomingEvents.concat(sortedTomorrowRoutines.slice(0, routinesNeeded));
    }
    
    return upcomingEvents.slice(0, 3); // Return exactly 3 events
  };

  // Check if child is currently marked as sleeping
  const isChildSleeping = () => {
    // Check local state first, then database state
    if (isSleeping) return true;
    
    // Check if it's past bedtime but before wake-up time
    const routine = child.carePreferences?.dailyRoutine;
    if (!routine?.bedtime || !routine?.wakeUpTime) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const bedtimeMinutes = timeToMinutes(routine.bedtime);
    const wakeUpMinutes = timeToMinutes(routine.wakeUpTime);
    
    // Handle bedtime after midnight
    if (wakeUpMinutes < bedtimeMinutes) {
      // Bedtime is before midnight, wake up is after midnight
      return currentTime >= bedtimeMinutes || currentTime < wakeUpMinutes;
    } else {
      // Both times are on the same day
      return currentTime >= bedtimeMinutes && currentTime < wakeUpMinutes;
    }
  };

  // Determine if sleep button should be shown
  const shouldShowSleepButton = () => {
    const routine = child.carePreferences?.dailyRoutine;
    if (!routine?.bedtime || isChildSleeping()) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const bedtimeMinutes = timeToMinutes(routine.bedtime);
    
    // Show button 30 minutes before bedtime until 2 hours after
    const showFrom = bedtimeMinutes - 30;
    const showUntil = bedtimeMinutes + 120;
    
    return currentTime >= showFrom && currentTime <= showUntil;
  };

  // Handle sleep confirmation
  const handleConfirmSleep = async () => {
    setIsSleeping(true);
    // TODO: In a real app, this would also update the database
    // await updateDoc(doc(db, 'children', child.id), { currentStatus: 'sleeping' });
  };

  // Check if child is currently in school
  const isInSchool = () => {
    if (!child.schoolSchedule) return false;
    
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Get today's school schedule
    const todaySchedule = child.schoolSchedule[currentDay];
    if (!todaySchedule || todaySchedule.length === 0) return false;
    
    // Check if current time falls within any school block
    return todaySchedule.some(block => {
      const startMinutes = timeToMinutes(block.startTime);
      const endMinutes = timeToMinutes(block.endTime);
      return currentTime >= startMinutes && currentTime <= endMinutes;
    });
  };

  // Get current status based on routine times
  const getCurrentStatus = () => {
    // Check if child is sleeping first
    if (isChildSleeping()) {
      return { text: 'Sleeping', color: '#6366F1', icon: '😴' };
    }
    
    // Check if child is in school
    if (isInSchool()) {
      return { text: 'In School', color: '#FF9500', icon: '🏫' };
    }
    
    const nextRoutines = getChildRoutines();
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    if (nextRoutines.length === 0) {
      return { text: 'Day complete', color: '#4CAF50', icon: '🟢' };
    }
    
    const nextRoutine = nextRoutines[0];
    const minutesUntilNext = nextRoutine.minutes - currentTime;
    
    if (minutesUntilNext <= 15) {
      return { text: 'Routine soon', color: '#FF9800', icon: '🟡' };
    } else if (minutesUntilNext <= 60) {
      return { text: 'Active', color: '#2196F3', icon: '🔵' };
    } else {
      return { text: 'Free time', color: '#4CAF50', icon: '🟢' };
    }
  };

  const getUserInitials = (name) => {
    if (!name) return 'C';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleImageError = (e) => {
    console.log('Image failed to load:', e.target.src);
    setImageError(true);
  };

  const nextRoutines = getChildRoutines();
  const status = getCurrentStatus();

  return (
    <div style={{
      ...styles.card,
      borderLeft: `4px solid ${childColor.primary}`
    }}>
      {/* Header with child info and status */}
      <div style={styles.header}>
        <div style={styles.childInfo}>
          <div style={styles.profileContainer}>
            {child.profilePictureUrl && !imageError && !child.profilePictureUrl.startsWith('blob:') ? (
              <img 
                src={child.profilePictureUrl} 
                alt={`${child.name} profile`}
                style={styles.profileImage}
                onError={handleImageError}
              />
            ) : (
              <div style={{
                ...styles.profilePlaceholder,
                backgroundColor: childColor.primary,
                color: 'white'
              }}>
                {getUserInitials(child.name)}
              </div>
            )}
          </div>
          <div style={styles.nameSection}>
            <div style={styles.childName}>{child.name}</div>
          </div>
        </div>
        <div style={styles.statusContainer}>
          <div style={{
            ...styles.statusIndicator,
            color: status.color
          }}>
            <span style={styles.statusText}>{status.text}</span>
          </div>
        </div>
      </div>

      {/* Routine times section */}
      <div style={styles.activitiesSection}>
        <div style={styles.activitiesLabel}>Next Events</div>
        
        {nextRoutines.length === 0 ? (
          <div style={styles.noActivities}>
            <span style={styles.noActivitiesIcon}>🌙</span>
            <span style={styles.noActivitiesText}>
              {child.carePreferences?.dailyRoutine ? 'All routines completed for today' : 'No routine schedule set'}
            </span>
          </div>
        ) : (
          <div style={styles.activitiesList}>
            {nextRoutines.map((routine, index) => (
              <div key={`${routine.name}-${routine.time}`} style={styles.activityItem}>
                <div style={styles.activityRow}>
                  <div style={styles.activityName}>
                    {routine.name}
                  </div>
                  <div style={styles.activityTime}>
                    {routine.isTomorrow && (
                      <span style={styles.tomorrowLabel}>Tomorrow </span>
                    )}
                    {routine.time}
                    {routine.duration && (
                      <span style={styles.duration}> ({routine.duration}min)</span>
                    )}
                  </div>
                </div>
                {routine.isActivity && routine.transportation && (
                  <div style={styles.transportationInfo}>
                    {routine.transportation.dropoff === 'au_pair' && '🚗 Drop-off: Au Pair'}
                    {routine.transportation.pickup === 'au_pair' && (
                      routine.transportation.dropoff === 'au_pair' ? ' | Pick-up: Au Pair' : '🚗 Pick-up: Au Pair'
                    )}
                    {routine.transportation.dropoff === 'child_alone' && '🚶 Child goes alone'}
                    {routine.transportation.pickup === 'child_alone' && (
                      routine.transportation.dropoff !== 'child_alone' ? ' | Child returns alone' : ''
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={styles.actions}>
        {/* Sleep confirmation button - Only for au pairs and when bedtime is approaching/passed */}
        {userRole === 'aupair' && shouldShowSleepButton() && (
          <button 
            style={styles.sleepButton}
            onClick={handleConfirmSleep}
            title="Confirm child is sleeping"
          >
            Confirm Sleep
          </button>
        )}
        
        {/* Edit button - Only show for parents */}
        {userRole === 'parent' && (
          <button 
            style={styles.editButton}
            onClick={() => onEditChild && onEditChild(child)}
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    padding: '16px',
    minWidth: '280px',
    maxWidth: '320px',
    boxShadow: 'var(--md-sys-elevation-level1)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    transition: 'var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  
  childInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1
  },
  
  profileContainer: {
    position: 'relative'
  },
  
  profileImage: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    objectFit: 'cover',
    border: '2px solid var(--md-sys-color-outline-variant)'
  },
  
  profilePlaceholder: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '600',
    border: '2px solid var(--md-sys-color-outline-variant)'
  },
  
  nameSection: {
    flex: 1,
    minWidth: 0
  },
  
  childName: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    lineHeight: '1.3',
    marginBottom: '4px',
    textAlign: 'left' // Align name to the left
  },
  
  
  statusContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  
  statusIcon: {
    fontSize: 'var(--font-size-sm)'
  },
  
  statusText: {
    fontSize: '12px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    padding: '4px 8px',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    fontWeight: '500',
    marginTop: '-3px' // Reduce margin from top by 3px
  },
  
  activitiesSection: {
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    padding: '12px',
    minHeight: '60px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  
  activitiesLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface-variant)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  
  noActivities: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0'
  },
  
  noActivitiesIcon: {
    fontSize: 'var(--font-size-lg)'
  },
  
  noActivitiesText: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontStyle: 'italic'
  },
  
  activitiesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  
  activityItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  
  activityRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%'
  },
  
  activityName: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    lineHeight: '1.3',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  
  activityIcon: {
    fontSize: 'var(--font-size-sm)'
  },
  
  duration: {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontWeight: '400'
  },
  
  tomorrowLabel: {
    fontSize: '12px',
    color: 'var(--md-sys-color-tertiary)',
    fontWeight: '500',
    marginRight: '4px'
  },
  
  activityTime: {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontWeight: '500',
    backgroundColor: 'var(--md-sys-color-surface)',
    padding: '4px 8px',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    alignSelf: 'flex-start'
  },
  
  activityArrow: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-tertiary)',
    fontWeight: 'var(--font-weight-bold)',
    margin: '0 var(--space-1)'
  },
  
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '4px'
  },
  
  editButton: {
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    minWidth: '80px',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)'
  },
  
  sleepButton: {
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    minWidth: '80px',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)'
  },

  activityLocation: {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginTop: '4px'
  },

  transportationInfo: {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginTop: '4px',
    padding: '4px 8px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    borderLeft: '3px solid var(--md-sys-color-primary)'
  }
};

export default EnhancedChildCard;