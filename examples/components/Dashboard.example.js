import React from 'react';
import styles from './Dashboard.module.css';
import { useAuth } from '../../hooks/useAuth';
import { useFamilyData } from '../../hooks/useFamilyData';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import ErrorMessage from '../ErrorMessage/ErrorMessage';
import TaskCard from '../TaskCard/TaskCard';
import EventCard from '../EventCard/EventCard';

/**
 * Dashboard component following FamilySync patterns
 * 
 * PATTERN: Use this structure for page-level components
 * - Custom hooks for data fetching
 * - Loading and error states
 * - Responsive card-based layout
 * - Proper error boundaries
 */
const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { 
    tasks, 
    events, 
    children, 
    loading: dataLoading, 
    error 
  } = useFamilyData(user?.familyId);

  // Show loading state
  if (authLoading || dataLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <ErrorMessage 
          error={error} 
          onRetry={() => window.location.reload()} 
        />
      </div>
    );
  }

  // Show empty state if no user
  if (!user) {
    return (
      <div className={styles.emptyContainer}>
        <p>Please log in to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1>Welcome, {user.displayName}</h1>
        <p className={styles.subtitle}>Here's what's happening today</p>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.cardGrid}>
          {/* Tasks Section */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>My Tasks Today</h2>
            <div className={styles.cardContent}>
              {tasks.length === 0 ? (
                <p className={styles.emptyMessage}>No tasks for today</p>
              ) : (
                <div className={styles.taskList}>
                  {tasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task}
                      onComplete={(taskId) => {
                        // Handle task completion
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Events Section */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Upcoming Events</h2>
            <div className={styles.cardContent}>
              {events.length === 0 ? (
                <p className={styles.emptyMessage}>No upcoming events</p>
              ) : (
                <div className={styles.eventList}>
                  {events.map(event => (
                    <EventCard 
                      key={event.id} 
                      event={event}
                      onEdit={(eventId) => {
                        // Handle event editing
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Children Overview */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Children's Overview</h2>
            <div className={styles.cardContent}>
              {children.length === 0 ? (
                <p className={styles.emptyMessage}>No children added yet</p>
              ) : (
                <div className={styles.childrenGrid}>
                  {children.map(child => (
                    <div key={child.id} className={styles.childCard}>
                      <img 
                        src={child.profilePictureUrl || '/default-avatar.png'} 
                        alt={`${child.name}'s profile`}
                        className={styles.childAvatar}
                      />
                      <h3 className={styles.childName}>{child.name}</h3>
                      <p className={styles.childStatus}>
                        {child.latestLogEntry || 'No recent activity'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;