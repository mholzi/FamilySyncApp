import React, { useState } from 'react';
import { useFamily } from '../hooks/useFamily';
import { useCalendar } from '../hooks/useCalendar';
import { useReminders } from '../hooks/useReminders';
import CalendarDayView from '../components/Calendar/CalendarDayView';
import CalendarAgendaView from '../components/Calendar/CalendarAgendaView';
import CalendarMultiChildView from '../components/Calendar/CalendarMultiChildView';
import CalendarChildSelector from '../components/Calendar/CalendarChildSelector';
import LoadingProgress from '../components/LoadingProgress';
import ReminderAlert from '../components/ReminderAlert';

const CalendarPage = ({ user, recurringActivities = [], children: propsChildren, familyData: propsFamilyData, userData: propsUserData, onNavigate }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('day'); // 'day', 'agenda', 'multi'
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedChildren, setSelectedChildren] = useState('all');
  
  // Use existing hooks to get family data if not provided via props
  const { userData: hookUserData, familyData: hookFamilyData, children: hookChildren, loading: familyLoading } = useFamily(user.uid);
  
  // Use props if provided, otherwise fall back to hook data
  const userData = propsUserData || hookUserData;
  const familyData = propsFamilyData || hookFamilyData;
  const children = propsChildren || hookChildren;
  
  // Now we can use userData safely
  const { events, loading: eventsLoading } = useCalendar(userData?.familyId, user.uid);
  
  // Determine user role
  const userRole = userData?.role || (familyData?.parentUids?.includes(user.uid) ? 'parent' : 'aupair');
  
  // Initialize reminder system
  const { activeReminders, dismissReminder, snoozeReminder } = useReminders(events);
  
  const loading = familyLoading || eventsLoading;

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <LoadingProgress
          isVisible={true}
          title="Loading Calendar"
          subtitle="Fetching your family's schedule..."
        />
      </div>
    );
  }

  // Handle date navigation
  const goToPreviousDay = () => {
    const previousDay = new Date(selectedDate);
    previousDay.setDate(selectedDate.getDate() - 1);
    setSelectedDate(previousDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(selectedDate.getDate() + 1);
    setSelectedDate(nextDay);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };


  return (
    <div style={styles.container}>
      {/* Date Header Block */}
      <div style={styles.dateHeader}>
        <div style={styles.dateSection}>
          <h1 style={styles.dateTitle}>
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h1>
          <p style={styles.dateSubtitle}>
            {selectedDate.toLocaleDateString() === new Date().toLocaleDateString() ? 'Today' : 
             selectedDate.toLocaleDateString() === new Date(Date.now() + 24*60*60*1000).toLocaleDateString() ? 'Tomorrow' :
             selectedDate.getFullYear().toString()}
          </p>
        </div>
        <button 
          style={styles.addEventButton}
          onClick={() => setShowQuickAdd(true)}
        >
          <span>+</span>
          Event
        </button>
      </div>

      {/* Divider */}
      <div style={styles.divider} />

      {/* Navigation and View Controls */}
      <div style={styles.controlsHeader}>
        {/* Left side: Date Navigation (only for day view) */}
        <div style={styles.leftControls}>
          {currentView === 'day' && (
            <div style={styles.dateNavigation}>
              <button style={styles.navButton} onClick={goToPreviousDay}>
                ‹
              </button>
              <button style={styles.todayButton} onClick={goToToday}>
                Today
              </button>
              <button style={styles.navButton} onClick={goToNextDay}>
                ›
              </button>
            </div>
          )}
        </div>

        {/* Right side: View Switcher (Day/Agenda toggle) */}
        <div style={styles.rightControls}>
          <div style={styles.viewToggle}>
            <button
              style={{
                ...styles.toggleButton,
                ...(currentView === 'day' ? styles.toggleButtonActive : {})
              }}
              onClick={() => setCurrentView('day')}
            >
              Day
            </button>
            <button
              style={{
                ...styles.toggleButton,
                ...(currentView === 'agenda' ? styles.toggleButtonActive : {})
              }}
              onClick={() => setCurrentView('agenda')}
            >
              Agenda
            </button>
            {children && children.length > 1 && (
              <button
                style={{
                  ...styles.toggleButton,
                  ...(currentView === 'multi' ? styles.toggleButtonActive : {})
                }}
                onClick={() => setCurrentView('multi')}
              >
                Multi
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Views */}
      {currentView === 'day' && (
        <CalendarDayView
          familyData={familyData}
          children={children}
          userData={userData}
          userRole={userRole}
          recurringActivities={recurringActivities}
          selectedDate={selectedDate}
          showQuickAdd={showQuickAdd}
          setShowQuickAdd={setShowQuickAdd}
          calendarEvents={events}
        />
      )}
      
      {currentView === 'agenda' && (
        <CalendarAgendaView
          familyData={familyData}
          children={children}
          userData={userData}
          userRole={userRole}
          recurringActivities={recurringActivities}
          calendarEvents={events}
        />
      )}
      
      {currentView === 'multi' && children && children.length > 1 && (
        <>
          {/* Child Selector for Multi View */}
          <CalendarChildSelector
            children={children}
            selectedChildren={selectedChildren}
            onSelectionChange={setSelectedChildren}
            userRole={userRole}
          />
          <CalendarMultiChildView
            familyData={familyData}
            children={selectedChildren === 'all' ? children : children.filter(child => selectedChildren.includes(child.id))}
            userData={userData}
            userRole={userRole}
            recurringActivities={recurringActivities}
            selectedDate={selectedDate}
            calendarEvents={events}
          />
        </>
      )}

      {/* Reminder Alerts */}
      {activeReminders.map(reminder => (
        <ReminderAlert
          key={reminder.id}
          notification={reminder}
          onDismiss={() => dismissReminder(reminder.id)}
          onSnooze={(minutes) => snoozeReminder(reminder.id, minutes)}
        />
      ))}
    </div>
  );
};

const styles = {
  container: {
    height: 'calc(100vh - 64px)',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--md-sys-color-background)',
    fontFamily: 'var(--md-sys-typescale-body-large-font)'
  },
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--md-sys-color-background)'
  },
  // New Date Header Block
  dateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    padding: '20px',
    boxShadow: 'var(--md-sys-elevation-level1)'
  },
  dateSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  dateTitle: {
    font: 'var(--md-sys-typescale-headline-small-font)',
    color: 'var(--md-sys-color-on-surface)',
    margin: 0
  },
  dateSubtitle: {
    font: 'var(--md-sys-typescale-body-medium-font)',
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: 0
  },
  addEventButton: {
    padding: '12px 24px',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    font: 'var(--md-sys-typescale-label-large-font)',
    cursor: 'pointer',
    boxShadow: 'var(--md-sys-elevation-level1)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  // Divider
  divider: {
    height: '1px',
    backgroundColor: 'var(--md-sys-color-outline-variant)',
    margin: 0
  },
  // Controls Header (Navigation + View Toggle)
  controlsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    padding: '16px 20px',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)'
  },
  leftControls: {
    display: 'flex',
    alignItems: 'center'
  },
  rightControls: {
    display: 'flex',
    alignItems: 'center'
  },
  // Date Navigation (moved to left side)
  dateNavigation: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  navButton: {
    width: '44px',
    height: '44px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    font: 'var(--md-sys-typescale-title-medium-font)',
    color: 'var(--md-sys-color-on-surface)',
    cursor: 'pointer',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  todayButton: {
    padding: '12px 24px',
    backgroundColor: 'var(--md-sys-color-primary)',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    font: 'var(--md-sys-typescale-label-large-font)',
    color: 'var(--md-sys-color-on-primary)',
    cursor: 'pointer',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    boxShadow: 'var(--md-sys-elevation-level1)'
  },
  // New Toggle Buttons (same style as Aupair/Family toggle)
  viewToggle: {
    display: 'flex',
    gap: '4px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    padding: '4px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    border: '1px solid var(--md-sys-color-outline-variant)'
  },
  toggleButton: {
    padding: '8px 12px',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    backgroundColor: 'transparent',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    whiteSpace: 'nowrap'
  },
  toggleButtonActive: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    boxShadow: 'var(--md-sys-elevation-level1)'
  }
};

export default CalendarPage;