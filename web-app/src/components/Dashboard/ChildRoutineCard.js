import { useState } from 'react';
import { ACTIVITY_CATEGORIES } from '../../utils/routineTemplates';

function ChildRoutineCard({ child }) {
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  // Get current time info
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];

  // Get routine data
  const routine = child.carePreferences?.dailyRoutine;
  const activities = child.carePreferences?.weeklyActivities || [];

  // Helper to convert time string to minutes for comparison
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Get current/next routine event
  const getCurrentEvent = () => {
    if (!routine) return null;

    const currentMinutes = timeToMinutes(currentTime);
    const events = [];

    // Add meals
    if (routine.mealTimes) {
      Object.entries(routine.mealTimes).forEach(([meal, time]) => {
        if (time && meal !== 'snacks') {
          events.push({
            type: 'meal',
            name: meal.charAt(0).toUpperCase() + meal.slice(1),
            time,
            icon: meal === 'breakfast' ? '🥣' : meal === 'lunch' ? '🥗' : '🍽️'
          });
        }
      });

      // Add snacks
      routine.mealTimes.snacks?.forEach((time) => {
        events.push({
          type: 'snack',
          name: 'Snack',
          time,
          icon: '🍎'
        });
      });
    }

    // Add naps
    routine.napTimes?.forEach((nap, index) => {
      events.push({
        type: 'nap',
        name: 'Nap Time',
        time: nap.startTime,
        duration: nap.duration,
        icon: '😴'
      });
    });

    // Add bedtime
    if (routine.bedtime) {
      events.push({
        type: 'bedtime',
        name: 'Bedtime',
        time: routine.bedtime,
        icon: '🌙'
      });
    }

    // Sort events by time
    events.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    // Find next event
    const nextEvent = events.find(event => timeToMinutes(event.time) > currentMinutes);
    const currentEvent = events.reverse().find(event => timeToMinutes(event.time) <= currentMinutes);

    return nextEvent || currentEvent;
  };

  // Get today's activities
  const getTodaysActivities = () => {
    return activities.filter(activity => 
      activity.schedule.days.includes(currentDay)
    ).sort((a, b) => timeToMinutes(a.schedule.startTime) - timeToMinutes(b.schedule.startTime));
  };

  const nextEvent = getCurrentEvent();
  const todaysActivities = getTodaysActivities();

  if (!routine && activities.length === 0) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <h3 style={styles.childName}>{child.name}'s Schedule</h3>
        </div>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📅</div>
          <p style={styles.emptyText}>No routine set up yet</p>
          <button style={styles.setupButton}>
            Set Up Routine
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.headerInfo}>
          <h3 style={styles.childName}>{child.name}'s Schedule</h3>
          {nextEvent && (
            <div style={styles.nextEvent}>
              <span style={styles.nextEventIcon}>{nextEvent.icon}</span>
              <span style={styles.nextEventText}>
                {nextEvent.name} at {nextEvent.time}
              </span>
            </div>
          )}
        </div>
        <button
          style={styles.expandButton}
          onClick={() => setShowFullSchedule(!showFullSchedule)}
        >
          {showFullSchedule ? '−' : '+'}
        </button>
      </div>

      {/* Quick Overview */}
      <div style={styles.quickInfo}>
        {routine && (
          <div style={styles.routineOverview}>
            <div style={styles.timeBlock}>
              <span style={styles.timeIcon}>🌅</span>
              <span style={styles.timeText}>{routine.wakeUpTime}</span>
            </div>
            {routine.napTimes?.length > 0 && (
              <div style={styles.timeBlock}>
                <span style={styles.timeIcon}>😴</span>
                <span style={styles.timeText}>
                  {routine.napTimes.length} nap{routine.napTimes.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
            <div style={styles.timeBlock}>
              <span style={styles.timeIcon}>🌙</span>
              <span style={styles.timeText}>{routine.bedtime}</span>
            </div>
          </div>
        )}

        {todaysActivities.length > 0 && (
          <div style={styles.todaysActivities}>
            <h4 style={styles.sectionTitle}>Today's Activities</h4>
            {todaysActivities.map((activity) => {
              const category = ACTIVITY_CATEGORIES[activity.category];
              return (
                <div key={activity.id} style={styles.activityItem}>
                  <span style={styles.activityTime}>{activity.schedule.startTime}</span>
                  <span style={styles.activityIcon} style={{ color: category?.color }}>
                    {category?.icon}
                  </span>
                  <span style={styles.activityName}>{activity.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Schedule (expanded) */}
      {showFullSchedule && (
        <div style={styles.fullSchedule}>
          <div style={styles.divider} />
          
          {routine && (
            <div style={styles.scheduleSection}>
              <h4 style={styles.sectionTitle}>Daily Routine</h4>
              <div style={styles.dailyTimeline}>
                <div style={styles.timelineItem}>
                  <span style={styles.timelineTime}>{routine.wakeUpTime}</span>
                  <span style={styles.timelineIcon}>🌅</span>
                  <span style={styles.timelineLabel}>Wake Up</span>
                </div>
                
                {routine.mealTimes?.breakfast && (
                  <div style={styles.timelineItem}>
                    <span style={styles.timelineTime}>{routine.mealTimes.breakfast}</span>
                    <span style={styles.timelineIcon}>🥣</span>
                    <span style={styles.timelineLabel}>Breakfast</span>
                  </div>
                )}
                
                {routine.napTimes?.map((nap, index) => (
                  <div key={index} style={styles.timelineItem}>
                    <span style={styles.timelineTime}>{nap.startTime}</span>
                    <span style={styles.timelineIcon}>😴</span>
                    <span style={styles.timelineLabel}>Nap ({nap.duration} min)</span>
                  </div>
                ))}
                
                {routine.mealTimes?.lunch && (
                  <div style={styles.timelineItem}>
                    <span style={styles.timelineTime}>{routine.mealTimes.lunch}</span>
                    <span style={styles.timelineIcon}>🥗</span>
                    <span style={styles.timelineLabel}>Lunch</span>
                  </div>
                )}
                
                {routine.mealTimes?.dinner && (
                  <div style={styles.timelineItem}>
                    <span style={styles.timelineTime}>{routine.mealTimes.dinner}</span>
                    <span style={styles.timelineIcon}>🍽️</span>
                    <span style={styles.timelineLabel}>Dinner</span>
                  </div>
                )}
                
                <div style={styles.timelineItem}>
                  <span style={styles.timelineTime}>{routine.bedtime}</span>
                  <span style={styles.timelineIcon}>🌙</span>
                  <span style={styles.timelineLabel}>Bedtime</span>
                </div>
              </div>
            </div>
          )}
          
          {activities.length > 0 && (
            <div style={styles.scheduleSection}>
              <h4 style={styles.sectionTitle}>Weekly Activities</h4>
              <div style={styles.weeklyActivities}>
                {activities.map((activity) => {
                  const category = ACTIVITY_CATEGORIES[activity.category];
                  return (
                    <div key={activity.id} style={styles.weeklyActivity}>
                      <div style={styles.activityHeader}>
                        <span style={styles.activityIcon} style={{ color: category?.color }}>
                          {category?.icon}
                        </span>
                        <span style={styles.activityName}>{activity.name}</span>
                      </div>
                      <div style={styles.activityDetails}>
                        <span>{activity.schedule.days.map(d => d.substring(0, 3).toUpperCase()).join(', ')}</span>
                        <span> • </span>
                        <span>{activity.schedule.startTime}</span>
                        <span> • </span>
                        <span>{activity.schedule.duration} min</span>
                      </div>
                      {activity.location.name && (
                        <div style={styles.activityLocation}>
                          📍 {activity.location.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '16px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  headerInfo: {
    flex: 1
  },
  childName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 8px 0'
  },
  nextEvent: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#666'
  },
  nextEventIcon: {
    fontSize: '16px'
  },
  nextEventText: {
    fontWeight: '500'
  },
  expandButton: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '1px solid #E5E5EA',
    backgroundColor: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  quickInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  routineOverview: {
    display: 'flex',
    gap: '20px'
  },
  timeBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  timeIcon: {
    fontSize: '16px'
  },
  timeText: {
    fontSize: '14px',
    color: '#333'
  },
  todaysActivities: {
    backgroundColor: '#F2F2F7',
    borderRadius: '8px',
    padding: '12px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
    margin: '0 0 8px 0'
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 0'
  },
  activityTime: {
    fontSize: '13px',
    color: '#666',
    minWidth: '45px'
  },
  activityIcon: {
    fontSize: '16px'
  },
  activityName: {
    fontSize: '14px',
    color: '#333'
  },
  emptyState: {
    textAlign: 'center',
    padding: '24px'
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '8px'
  },
  emptyText: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 16px 0'
  },
  setupButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  fullSchedule: {
    marginTop: '16px'
  },
  divider: {
    height: '1px',
    backgroundColor: '#E5E5EA',
    margin: '16px 0'
  },
  scheduleSection: {
    marginBottom: '20px'
  },
  dailyTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  timelineItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 0'
  },
  timelineTime: {
    fontSize: '13px',
    color: '#666',
    minWidth: '45px'
  },
  timelineIcon: {
    fontSize: '16px'
  },
  timelineLabel: {
    fontSize: '14px',
    color: '#333'
  },
  weeklyActivities: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  weeklyActivity: {
    backgroundColor: '#F2F2F7',
    borderRadius: '8px',
    padding: '12px'
  },
  activityHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px'
  },
  activityDetails: {
    fontSize: '13px',
    color: '#666',
    paddingLeft: '24px'
  },
  activityLocation: {
    fontSize: '12px',
    color: '#666',
    paddingLeft: '24px',
    marginTop: '4px'
  }
};

export default ChildRoutineCard;