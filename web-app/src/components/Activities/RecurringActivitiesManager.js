import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import RecurringActivityBuilder from './RecurringActivityBuilder';
import { 
  formatRecurrenceDescription, 
  getNextOccurrences,
  ACTIVITY_CATEGORIES 
} from '../../utils/recurringActivityTemplates';

const RecurringActivitiesManager = ({ 
  familyId, 
  children = [], 
  userRole = 'parent',
  onClose,
  primaryChildId = null 
}) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  // const [filter, setFilter] = useState('all'); // 'all', 'active', 'inactive' - unused

  // Load activities from Firestore
  useEffect(() => {
    if (!familyId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    let unsubscribe = null;

    try {
      const activitiesQuery = query(
        collection(db, 'recurringActivities'),
        where('familyId', '==', familyId)
      );

      unsubscribe = onSnapshot(
        activitiesQuery, 
        (snapshot) => {
          try {
            const activitiesData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            setActivities(activitiesData);
            setLoading(false);
          } catch (error) {
            console.warn('Error processing activities snapshot:', error);
            setActivities([]);
            setLoading(false);
          }
        },
        (error) => {
          console.warn('Error fetching recurring activities:', error);
          setActivities([]);
          setLoading(false);
        }
      );
    } catch (error) {
      console.warn('Error setting up activities listener:', error);
      setActivities([]);
      setLoading(false);
    }

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('Error unsubscribing from activities:', error);
        }
      }
    };
  }, [familyId]);

  const handleCreateActivity = () => {
    setEditingActivity(null);
    setShowBuilder(true);
  };

  const handleEditActivity = (activity) => {
    setEditingActivity(activity);
    setShowBuilder(true);
  };

  const handleSaveActivity = async (activityData) => {
    try {
      // Convert JavaScript Date objects to Firebase Timestamps
      const finalActivity = {
        ...activityData,
        familyId,
        createdBy: auth.currentUser.uid,
        // Convert any Date objects to Timestamps
        createdAt: editingActivity ? activityData.createdAt : Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Remove any problematic date fields and convert them properly
      if (finalActivity.createdAt instanceof Date) {
        finalActivity.createdAt = Timestamp.fromDate(finalActivity.createdAt);
      }
      if (finalActivity.updatedAt instanceof Date) {
        finalActivity.updatedAt = Timestamp.fromDate(finalActivity.updatedAt);
      }

      console.log('Saving activity with data:', finalActivity);

      if (editingActivity) {
        // Update existing activity
        await updateDoc(doc(db, 'recurringActivities', editingActivity.id), finalActivity);
        console.log('Activity updated successfully');
      } else {
        // Create new activity
        const docRef = await addDoc(collection(db, 'recurringActivities'), finalActivity);
        console.log('Activity created successfully with ID:', docRef.id);
      }

      setShowBuilder(false);
      setEditingActivity(null);
    } catch (error) {
      console.error('Error saving activity:', error);
      throw error;
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (window.confirm('Are you sure you want to delete this activity? This cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'recurringActivities', activityId));
      } catch (error) {
        console.error('Error deleting activity:', error);
        alert('Failed to delete activity. Please try again.');
      }
    }
  };

  // Removed handleToggleActive - no longer supporting active/inactive status

  const getFilteredActivities = () => {
    // Always return all activities - no active/inactive filtering
    return activities;
  };

  // const getChildNames = (childIds) => {
  //   return childIds
  //     .map(id => children.find(child => child.id === id)?.name)
  //     .filter(Boolean)
  //     .join(', ');
  // };

  if (showBuilder) {
    return (
      <RecurringActivityBuilder
        children={children}
        editingActivity={editingActivity}
        onSave={handleSaveActivity}
        onCancel={() => {
          setShowBuilder(false);
          setEditingActivity(null);
        }}
        primaryChildId={primaryChildId}
      />
    );
  }

  if (selectedActivity) {
    return (
      <ActivityDetailView
        activity={selectedActivity}
        children={children}
        onBack={() => setSelectedActivity(null)}
        onEdit={() => handleEditActivity(selectedActivity)}
        onDelete={() => handleDeleteActivity(selectedActivity.id)}
        userRole={userRole}
      />
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={onClose} style={styles.backButton}>←</button>
          <h1 style={styles.title}>Recurring Activities</h1>
        </div>
        {userRole === 'parent' && (
          <button onClick={handleCreateActivity} style={styles.createButton}>
            + New Activity
          </button>
        )}
      </div>


      <div style={styles.content}>
        {loading ? (
          <div style={styles.loading}>Loading activities...</div>
        ) : getFilteredActivities().length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📅</div>
            <h2 style={styles.emptyTitle}>
              No activities yet
            </h2>
            <p style={styles.emptyDescription}>
              {userRole === 'parent' 
                ? 'Create recurring activities like sports practice, music lessons, or regular appointments.'
                : 'Your parents haven\'t set up any recurring activities yet.'
              }
            </p>
            {userRole === 'parent' && (
              <button onClick={handleCreateActivity} style={styles.emptyButton}>
                Create Your First Activity
              </button>
            )}
          </div>
        ) : (
          <div style={styles.activitiesList}>
            {getFilteredActivities().map(activity => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                children={children}
                userRole={userRole}
                onViewDetails={() => setSelectedActivity(activity)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ActivityCard = ({ 
  activity, 
  children, 
  userRole, 
  onViewDetails 
}) => {
  const category = ACTIVITY_CATEGORIES[activity.category];
  const nextOccurrences = getNextOccurrences(activity, 3);
  
  return (
    <div style={styles.activityCard} onClick={onViewDetails}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>
          <span style={styles.activityIcon}>{activity.icon || category?.icon || '📌'}</span>
          <div>
            <h3 style={styles.activityName}>{activity.name}</h3>
            <div style={styles.activityMeta}>
              {category?.label} • {formatRecurrenceDescription(activity.recurrence)}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.cardContent}>
        <div style={styles.infoRow}>
          <span>{activity.time} ({activity.duration} min)</span>
        </div>
        
        <div style={styles.infoRow}>
          <span>{activity.location.name || activity.location.address}</span>
        </div>
        
        {activity.assignedChildren.length > 0 && (
          <div style={styles.infoRow}>
            <span>
              {activity.assignedChildren
                .map(id => children.find(child => child.id === id)?.name)
                .filter(Boolean)
                .join(', ')
              }
            </span>
          </div>
        )}

        {activity.contact.name && (
          <div style={styles.infoRow}>
            <span>{activity.contact.name} ({activity.contact.role})</span>
          </div>
        )}

        {nextOccurrences.length > 0 && (
          <div style={styles.nextOccurrences}>
            <div style={styles.nextTitle}>Next occurrences:</div>
            {nextOccurrences.slice(0, 2).map((occurrence, index) => (
              <div key={index} style={styles.occurrenceItem}>
                {occurrence.date.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })} at {occurrence.time}
              </div>
            ))}
            {nextOccurrences.length > 2 && (
              <div style={styles.moreOccurrences}>
                +{nextOccurrences.length - 2} more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ActivityDetailView = ({ 
  activity, 
  children, 
  onBack, 
  onEdit, 
  onDelete, 
  userRole 
}) => {
  const category = ACTIVITY_CATEGORIES[activity.category];
  const nextOccurrences = getNextOccurrences(activity, 10);
  
  return (
    <div style={styles.detailContainer}>
      <div style={styles.detailHeader}>
        <button onClick={onBack} style={styles.backButton}>←</button>
        <h1 style={styles.detailTitle}>{activity.name}</h1>
        {userRole === 'parent' && (
          <div style={styles.detailActions}>
            <button onClick={onEdit} style={styles.editButton}>Edit</button>
            <button onClick={onDelete} style={styles.deleteButtonLarge}>Delete</button>
          </div>
        )}
      </div>

      <div style={styles.detailContent}>
        <div style={styles.detailSection}>
          <h2 style={styles.sectionTitle}>Activity Information</h2>
          <div style={styles.detailGrid}>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Category:</span>
              <span>{category?.icon} {category?.label}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Time:</span>
              <span>{activity.time} ({activity.duration} minutes)</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Schedule:</span>
              <span>{formatRecurrenceDescription(activity.recurrence)}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Status:</span>
              <span style={{
                color: activity.isActive ? 'var(--secondary-green)' : 'var(--text-tertiary)'
              }}>
                {activity.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.detailSection}>
          <h2 style={styles.sectionTitle}>Location & Contact</h2>
          <div style={styles.locationCard}>
            <h3 style={styles.locationName}>{activity.location.name}</h3>
            <p style={styles.locationAddress}>{activity.location.address}</p>
            {activity.location.notes && (
              <p style={styles.locationNotes}>{activity.location.notes}</p>
            )}
          </div>
          
          {activity.contact.name && (
            <div style={styles.contactCard}>
              <h3 style={styles.contactName}>
                {activity.contact.name} 
                {activity.contact.role && <span style={styles.contactRole}>({activity.contact.role})</span>}
              </h3>
              {activity.contact.phone && (
                <p style={styles.contactInfo}>📞 {activity.contact.phone}</p>
              )}
              {activity.contact.email && (
                <p style={styles.contactInfo}>✉️ {activity.contact.email}</p>
              )}
            </div>
          )}
        </div>

        {activity.requirements.items.length > 0 && (
          <div style={styles.detailSection}>
            <h2 style={styles.sectionTitle}>Items to Bring</h2>
            <ul style={styles.itemsList}>
              {activity.requirements.items.filter(Boolean).map((item, index) => (
                <li key={index} style={styles.itemsListItem}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {activity.requirements.notes && (
          <div style={styles.detailSection}>
            <h2 style={styles.sectionTitle}>Additional Notes</h2>
            <p style={styles.notes}>{activity.requirements.notes}</p>
          </div>
        )}

        {nextOccurrences.length > 0 && activity.isActive && (
          <div style={styles.detailSection}>
            <h2 style={styles.sectionTitle}>Upcoming Occurrences</h2>
            <div style={styles.occurrencesList}>
              {nextOccurrences.map((occurrence, index) => (
                <div key={index} style={styles.occurrenceCard}>
                  <div style={styles.occurrenceDate}>
                    {occurrence.date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div style={styles.occurrenceTime}>
                    {occurrence.time} - {
                      (() => {
                        const endTime = new Date();
                        const [hours, minutes] = occurrence.time.split(':').map(Number);
                        endTime.setHours(hours, minutes + activity.duration, 0, 0);
                        return endTime.toTimeString().slice(0, 5);
                      })()
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: 'var(--space-6)',
    backgroundColor: '#F8FAFC',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-6)',
    backgroundColor: 'var(--white)',
    padding: 'var(--space-4)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)'
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: 'var(--font-size-xl)',
    cursor: 'pointer',
    color: 'var(--primary-purple)',
    padding: 'var(--space-2)',
    borderRadius: 'var(--radius-md)',
    transition: 'var(--transition-fast)'
  },
  title: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--text-primary)',
    margin: 0
  },
  createButton: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3) var(--space-4)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  controls: {
    marginBottom: 'var(--space-6)'
  },
  filterTabs: {
    display: 'flex',
    gap: 'var(--space-2)',
    backgroundColor: 'var(--white)',
    padding: 'var(--space-2)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)'
  },
  filterTab: {
    padding: 'var(--space-2) var(--space-4)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    transition: 'var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)'
  },
  filterTabActive: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)'
  },
  filterCount: {
    fontSize: 'var(--font-size-xs)',
    opacity: 0.8
  },
  content: {
    minHeight: '400px'
  },
  loading: {
    textAlign: 'center',
    padding: 'var(--space-8)',
    fontSize: 'var(--font-size-lg)',
    color: 'var(--text-secondary)'
  },
  emptyState: {
    textAlign: 'center',
    padding: 'var(--space-8)',
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)'
  },
  emptyIcon: {
    fontSize: 'var(--font-size-6xl)',
    marginBottom: 'var(--space-4)'
  },
  emptyTitle: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: '0 0 var(--space-2) 0'
  },
  emptyDescription: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--text-secondary)',
    margin: '0 0 var(--space-4) 0',
    lineHeight: 'var(--line-height-relaxed)'
  },
  emptyButton: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3) var(--space-4)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer'
  },
  activitiesList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: 'var(--space-4)'
  },
  activityCard: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border-light)',
    transition: 'var(--transition-normal)'
  },
  activityCardInactive: {
    opacity: 0.6,
    backgroundColor: '#f9f9f9'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'var(--space-3)'
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-3)',
    flex: 1
  },
  activityIcon: {
    fontSize: 'var(--font-size-xl)',
    marginTop: 'var(--space-1)'
  },
  activityName: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: '0 0 var(--space-1) 0'
  },
  activityMeta: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)'
  },
  cardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)'
  },
  inactiveLabel: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    backgroundColor: '#f3f4f6',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 'var(--font-weight-medium)'
  },
  actionButtons: {
    display: 'flex',
    gap: 'var(--space-1)'
  },
  actionButton: {
    background: 'none',
    border: 'none',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    padding: 'var(--space-1)',
    borderRadius: 'var(--radius-sm)',
    transition: 'var(--transition-fast)'
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    padding: 'var(--space-1)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--red-500)'
  },
  cardContent: {
    marginBottom: 'var(--space-4)'
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-2)'
  },
  infoIcon: {
    fontSize: 'var(--font-size-base)',
    width: '20px'
  },
  nextOccurrences: {
    marginTop: 'var(--space-3)',
    padding: 'var(--space-3)',
    backgroundColor: '#f8f9fa',
    borderRadius: 'var(--radius-md)'
  },
  nextTitle: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-2)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  occurrenceItem: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-1)'
  },
  moreOccurrences: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic'
  },
  cardFooter: {
    borderTop: '1px solid var(--border-light)',
    paddingTop: 'var(--space-3)'
  },
  viewDetailsButton: {
    width: '100%',
    padding: 'var(--space-2)',
    border: '1px solid var(--border-medium)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    color: 'var(--primary-purple)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    transition: 'var(--transition-fast)'
  },
  // Detail view styles
  detailContainer: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: 'var(--space-6)',
    backgroundColor: '#F8FAFC',
    minHeight: '100vh'
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-6)',
    backgroundColor: 'var(--white)',
    padding: 'var(--space-4)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)'
  },
  detailTitle: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--text-primary)',
    margin: 0,
    flex: 1,
    marginLeft: 'var(--space-3)'
  },
  detailActions: {
    display: 'flex',
    gap: 'var(--space-2)'
  },
  editButton: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-4)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer'
  },
  deleteButtonLarge: {
    backgroundColor: 'var(--red-500)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-4)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer'
  },
  detailContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6)'
  },
  detailSection: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    boxShadow: 'var(--shadow-sm)'
  },
  sectionTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: '0 0 var(--space-4) 0'
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--space-4)'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)'
  },
  detailLabel: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  locationCard: {
    padding: 'var(--space-3)',
    backgroundColor: '#f8f9fa',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-3)'
  },
  locationName: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: '0 0 var(--space-1) 0'
  },
  locationAddress: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    margin: '0 0 var(--space-1) 0'
  },
  locationNotes: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-tertiary)',
    margin: 0,
    fontStyle: 'italic'
  },
  contactCard: {
    padding: 'var(--space-3)',
    backgroundColor: '#f0f9ff',
    borderRadius: 'var(--radius-md)'
  },
  contactName: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: '0 0 var(--space-2) 0'
  },
  contactRole: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-normal)',
    color: 'var(--text-secondary)'
  },
  contactInfo: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    margin: '0 0 var(--space-1) 0'
  },
  itemsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  itemsListItem: {
    padding: 'var(--space-2)',
    backgroundColor: '#f8f9fa',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-2)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)'
  },
  notes: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--text-secondary)',
    lineHeight: 'var(--line-height-relaxed)',
    margin: 0
  },
  occurrencesList: {
    display: 'grid',
    gap: 'var(--space-2)'
  },
  occurrenceCard: {
    padding: 'var(--space-3)',
    backgroundColor: '#f8f9fa',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  occurrenceDate: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)'
  },
  occurrenceTime: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)'
  }
};

export default RecurringActivitiesManager;