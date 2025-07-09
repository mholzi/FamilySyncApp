import React, { useState } from 'react';
import { useFamily } from '../hooks/useFamily';
import { useCalendar } from '../hooks/useCalendar';
import CalendarDayView from '../components/Calendar/CalendarDayView';
import LoadingProgress from '../components/LoadingProgress';

const CalendarPage = ({ user, recurringActivities = [], children: propsChildren, familyData: propsFamilyData, userData: propsUserData }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Use existing hooks to get family data if not provided via props
  const { userData: hookUserData, familyData: hookFamilyData, children: hookChildren, loading: familyLoading } = useFamily(user.uid);
  
  // Use props if provided, otherwise fall back to hook data
  const userData = propsUserData || hookUserData;
  const familyData = propsFamilyData || hookFamilyData;
  const children = propsChildren || hookChildren;
  
  // Now we can use userData safely
  const { loading: eventsLoading } = useCalendar(userData?.familyId, user.uid);
  
  // Determine user role
  const userRole = userData?.role || (familyData?.parentUids?.includes(user.uid) ? 'parent' : 'aupair');
  
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
      {/* Date Navigation */}
      <div style={styles.dateNavigation}>
        <button style={styles.navButton} onClick={goToPreviousDay}>
          ‹ Previous
        </button>
        <button style={styles.todayButton} onClick={goToToday}>
          Today
        </button>
        <button style={styles.navButton} onClick={goToNextDay}>
          Next ›
        </button>
      </div>

      {/* Calendar Day View */}
      <CalendarDayView
        familyData={familyData}
        children={children}
        userData={userData}
        userRole={userRole}
        recurringActivities={recurringActivities}
        selectedDate={selectedDate}
      />
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)'
  },
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-primary)'
  },
  dateNavigation: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-3)',
    backgroundColor: 'var(--white)',
    borderBottom: '1px solid var(--border-light)'
  },
  navButton: {
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--white)',
    border: '1px solid var(--border-medium)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  todayButton: {
    padding: 'var(--space-2) var(--space-4)',
    backgroundColor: 'var(--primary-purple)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--white)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  }
};

export default CalendarPage;