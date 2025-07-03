import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useFamily } from '../hooks/useFamily';
import { useTasks } from '../hooks/useTasks';
import { useCalendar } from '../hooks/useCalendar';
import { useShopping } from '../hooks/useShopping';
import { updateTaskStatus } from '../utils/familyUtils';
import { DashboardStates, getDashboardState } from '../utils/dashboardStates';
import DashboardWelcome from './DashboardWelcome';
import AddChildFlow from './AddChild/AddChildFlow';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useState } from 'react';
import { uploadChildPhoto, validateImageFile, resizeImage } from '../utils/photoUpload';

function Dashboard({ user }) {
  // Use custom hooks to fetch data
  const { userData, familyData, children, loading: familyLoading } = useFamily(user.uid);
  const { tasks, loading: tasksLoading } = useTasks(userData?.familyId, user.uid);
  const { events, loading: eventsLoading } = useCalendar(userData?.familyId, user.uid);
  const { shoppingLists, loading: shoppingLoading } = useShopping(userData?.familyId);

  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'add_child', 'welcome'
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [isSavingChild, setIsSavingChild] = useState(false);

  const loading = familyLoading || tasksLoading || eventsLoading || shoppingLoading;

  // Determine dashboard state
  const dashboardState = getDashboardState(userData, children, tasks);
  

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleTaskToggle = async (taskId, currentStatus) => {
    if (!userData?.familyId) return;
    
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await updateTaskStatus(userData.familyId, taskId, newStatus, user.uid);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleAddChild = () => {
    setCurrentView('add_child');
    setIsAddingChild(true);
  };

  const handleInviteAuPair = () => {
    // TODO: Implement au pair invitation flow
    console.log('Invite au pair clicked');
  };

  const handleSkipWelcome = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        hasSeenWelcomeScreen: true,
        updatedAt: Timestamp.now()
      });
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Error updating welcome screen status:', error);
    }
  };

  const handleChildAdded = async (childData) => {
    setIsSavingChild(true);
    try {
      console.log('Received child data to save:', childData);
      console.log('User data:', userData);
      console.log('Family ID:', userData.familyId);
      
      // Final duplication check before saving
      const childName = childData.name.trim().toLowerCase();
      const childBirthDate = childData.dateOfBirth ? 
        new Date(childData.dateOfBirth).toDateString() : null;
      
      const exactDuplicate = children.find(child => {
        const existingName = child.name.toLowerCase();
        const existingBirthDate = child.dateOfBirth ? 
          (child.dateOfBirth.toDate ? child.dateOfBirth.toDate() : new Date(child.dateOfBirth)).toDateString() : null;
        
        return existingName === childName && existingBirthDate === childBirthDate;
      });
      
      if (exactDuplicate) {
        alert(`A child named "${exactDuplicate.name}" with the same birth date already exists. Please check the children list.`);
        setCurrentView('dashboard');
        setIsAddingChild(false);
        return;
      }
      
      // Prepare the child data for Firestore
      const childToSave = {
        ...childData,
        familyId: userData.familyId,
        createdBy: user.uid,
        createdAt: Timestamp.now(),
        isActive: true
      };
      
      // Convert date string to Timestamp if needed
      if (childToSave.dateOfBirth && typeof childToSave.dateOfBirth === 'string') {
        childToSave.dateOfBirth = Timestamp.fromDate(new Date(childToSave.dateOfBirth));
      } else if (childToSave.dateOfBirth instanceof Date) {
        childToSave.dateOfBirth = Timestamp.fromDate(childToSave.dateOfBirth);
      }
      
      // Handle photo upload if there's a photo file
      let photoURL = childToSave.profilePictureUrl;
      if (childData.photoFile) {
        try {
          // Validate the image file
          validateImageFile(childData.photoFile);
          
          // Resize the image if needed
          const resizedFile = await resizeImage(childData.photoFile);
          
          // Generate a temporary child ID for the photo upload
          const tempChildId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Upload the photo and get the download URL
          photoURL = await uploadChildPhoto(resizedFile, tempChildId, userData.familyId);
          
          console.log('Photo uploaded successfully:', photoURL);
        } catch (photoError) {
          console.error('Photo upload error:', photoError);
          // Continue without photo if upload fails
          alert(`Photo upload failed: ${photoError.message}. Child will be saved without photo.`);
          photoURL = null;
        }
      }
      
      // Update child data with photo URL
      childToSave.profilePictureUrl = photoURL;
      
      // Remove the photo file from the data before saving to Firestore
      delete childToSave.photoFile;
      
      console.log('Processed child data for Firestore:', childToSave);
      
      // Add child to Firestore
      const docRef = await addDoc(collection(db, 'children'), childToSave);
      
      // Clear the draft from localStorage
      localStorage.removeItem('childDraft');
      
      console.log('Child added successfully with ID:', docRef.id);
      
      // Reset view
      setCurrentView('dashboard');
      setIsAddingChild(false);
    } catch (error) {
      console.error('Error adding child:', error);
      // Show error to user
      alert('Failed to add child. Please try again.');
    } finally {
      setIsSavingChild(false);
    }
  };

  const handleCancelAddChild = () => {
    // Clear any draft data
    localStorage.removeItem('childDraft');
    setCurrentView('dashboard');
    setIsAddingChild(false);
  };

  // Helper function to get user initials
  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Helper function to format time
  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  // Show welcome screen for first-time users
  if (dashboardState === DashboardStates.FIRST_TIME_NO_CHILDREN && currentView === 'dashboard') {
    return (
      <DashboardWelcome
        userData={userData}
        onAddChild={handleAddChild}
        onInviteAuPair={handleInviteAuPair}
        onSkip={handleSkipWelcome}
      />
    );
  }

  // Show add child flow
  if (currentView === 'add_child' || isAddingChild) {
    return (
      <AddChildFlow
        user={user}
        familyId={userData?.familyId}
        existingChildren={children}
        onComplete={handleChildAdded}
        onCancel={handleCancelAddChild}
        isSaving={isSavingChild}
      />
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backButton}>←</button>
        <h1 style={styles.title}>{familyData?.name || 'FamilySync'}</h1>
        <div style={styles.profileIcon} onClick={handleLogout}>
          {userData?.name?.charAt(0) || 'U'}
        </div>
      </header>

      {/* Main Content */}
      <div style={styles.content}>
        {/* My Tasks Today */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>My Tasks Today</h2>
          <div style={styles.tasksContainer}>
            {tasks.length === 0 ? (
              <div style={styles.emptyState}>
                {children.length === 0 ? (
                  <p>No tasks for today! 🎉</p>
                ) : (
                  <>
                    <p>📝 No tasks yet</p>
                    <p style={styles.emptyStateSubtext}>
                      Ready to create your first task for {children[0].name}?
                    </p>
                    <button style={styles.emptyStateButton}>Create Task +</button>
                  </>
                )}
              </div>
            ) : (
              tasks.map((task) => (
                <div 
                  key={task.id} 
                  style={{
                    ...styles.taskCard, 
                    ...(task.status === 'completed' ? {} : styles.taskCardActive)
                  }}
                >
                  <div style={styles.taskHeader}>
                    <div style={styles.taskProfile}>
                      <div style={styles.profilePic}>
                        {getUserInitials(userData?.name)}
                      </div>
                      <span style={styles.taskTitle}>{task.title}</span>
                    </div>
                    <div 
                      style={task.status === 'completed' ? styles.checkboxChecked : styles.checkboxUnchecked}
                      onClick={() => handleTaskToggle(task.id, task.status)}
                    >
                      ✓
                    </div>
                  </div>
                  {task.description && (
                    <div style={styles.taskDescription}>
                      {task.description}
                    </div>
                  )}
                  <div style={styles.taskTime}>
                    {task.dueDate ? formatTime(task.dueDate) : 'Today'}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Children's Overview */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Children's Overview</h2>
          <div style={styles.childrenContainer}>
            {children.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyStateIcon}>👶</div>
                <p>Ready to add your children?</p>
                <button style={styles.emptyStateButton} onClick={handleAddChild}>
                  Add Child +
                </button>
              </div>
            ) : (
              children.map((child) => {
                const age = child.dateOfBirth ? 
                  Math.floor((new Date() - child.dateOfBirth.toDate()) / (365.25 * 24 * 60 * 60 * 1000)) 
                  : 0;
                
                return (
                  <div key={child.id} style={styles.childCard}>
                    <div style={styles.childHeader}>
                      <div style={styles.childProfile}>
                        <div style={styles.childPic}>
                          {child.profilePictureUrl ? (
                            <img 
                              src={child.profilePictureUrl} 
                              alt={`${child.name} profile`}
                              style={styles.childProfileImage}
                            />
                          ) : (
                            getUserInitials(child.name)
                          )}
                        </div>
                        <div>
                          <div style={styles.childName}>{child.name}</div>
                          <div style={styles.childAge}>Age {age}</div>
                        </div>
                      </div>
                      <div style={styles.statusDot}></div>
                    </div>
                    <div style={styles.progressSection}>
                      <div style={styles.progressLabel}>Today's Care</div>
                      <div style={styles.progressTimes}>
                        <span style={styles.timeStart}>8:00</span>
                        <span style={styles.timeCurrent}>Now</span>
                      </div>
                      <div style={styles.progressSubtext}>All good 👍</div>
                    </div>
                    <div style={styles.childActions}>
                      <button style={styles.childActionButton}>Log Care</button>
                      <button style={styles.childActionButton} onClick={handleAddChild}>+ Add Child</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Upcoming Events */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Upcoming Events for Me</h2>
          <div style={styles.eventsContainer}>
            {events.length === 0 ? (
              <div style={styles.emptyState}>
                {children.length === 0 ? (
                  <p>No upcoming events</p>
                ) : (
                  <>
                    <p>📅 No events yet</p>
                    <p style={styles.emptyStateSubtext}>
                      Add {children[0].name}'s school pickup, activities?
                    </p>
                    <button style={styles.emptyStateButton}>Add Event +</button>
                  </>
                )}
              </div>
            ) : (
              events.map((event) => {
                // Choose color based on category
                const getEventColor = (category) => {
                  switch (category) {
                    case 'work':
                    case 'family': return '#FF9500';
                    case 'personal': return '#FF3B30';
                    case 'childcare': return '#34C759';
                    default: return '#007AFF';
                  }
                };

                return (
                  <div 
                    key={event.id} 
                    style={{
                      ...styles.eventCard, 
                      backgroundColor: event.color || getEventColor(event.category)
                    }}
                  >
                    <div style={styles.eventText}>
                      {event.title}
                      {event.category && (
                        <>
                          <br/>
                          <span style={{fontSize: '12px', opacity: 0.8}}>
                            {event.category}
                          </span>
                        </>
                      )}
                    </div>
                    <div style={styles.eventTime}>
                      {event.startTime ? formatTime(event.startTime) : ''}
                      {event.endTime && (
                        <>
                          <br/>
                          {formatTime(event.endTime)}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Bottom Section */}
        <div style={styles.bottomContainer}>
          <div style={styles.bottomCard}>
            <h3 style={styles.bottomTitle}>Family Notes</h3>
            <div style={styles.notesList}>
              {/* Notes content placeholder */}
            </div>
          </div>
          
          <div style={styles.bottomCard}>
            <h3 style={styles.bottomTitle}>Shopping List</h3>
            <div style={styles.shoppingList}>
              {shoppingLists.length === 0 ? (
                <div style={styles.emptyStateSmall}>
                  <p>No shopping lists</p>
                </div>
              ) : (
                (() => {
                  // Get first shopping list and show first few items
                  const firstList = shoppingLists[0];
                  const items = Array.isArray(firstList.items) 
                    ? firstList.items 
                    : Object.values(firstList.items || {});
                  
                  return items.slice(0, 3).map((item) => (
                    <div key={item.id}>
                      <div style={styles.shoppingItem}>
                        <span>{item.name}</span>
                        <div 
                          style={item.isPurchased ? styles.checkboxChecked : styles.checkboxUnchecked}
                        >
                          ✓
                        </div>
                      </div>
                      {item.quantity && (
                        <div style={styles.shoppingSubtext}>{item.quantity}</div>
                      )}
                    </div>
                  ));
                })()
              )}
            </div>
          </div>
        </div>
        {/* Au Pair Invitation Reminder */}
        {children.length > 0 && (
          <div style={styles.reminderCard}>
            <span style={styles.reminderIcon}>👥</span>
            <span style={styles.reminderText}>Still need to invite your au pair?</span>
            <button style={styles.reminderButton} onClick={handleInviteAuPair}>
              Create Invite
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav style={styles.bottomNav}>
        <div style={styles.navItem}>
          <span style={styles.navIcon}>🏠</span>
          <span style={styles.navLabel}>Hower</span>
        </div>
        <div style={styles.navItem}>
          <span style={styles.navIcon}>📅</span>
          <span style={styles.navLabel}>Daot</span>
        </div>
        <div style={styles.navItem}>
          <div style={styles.fabButton}>✓</div>
        </div>
        <div style={styles.navItem}>
          <span style={styles.navIcon}>📧</span>
          <span style={styles.navLabel}>Polan</span>
        </div>
        <div style={styles.navItem}>
          <span style={styles.navIcon}>👤</span>
          <span style={styles.navLabel}>Socles</span>
        </div>
      </nav>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F2F2F7',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  
  // Header Styles
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
  profileIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '16px',
    backgroundColor: '#FF3B30',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },

  // Content Styles
  content: {
    flex: 1,
    padding: '20px',
    paddingBottom: '100px'
  },
  section: {
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 15px 0'
  },

  // Task Styles
  tasksContainer: {
    display: 'flex',
    gap: '15px',
    overflowX: 'auto',
    paddingBottom: '10px'
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '15px',
    minWidth: '200px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  taskCardActive: {
    backgroundColor: '#4A5568',
    color: 'white'
  },
  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  taskProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  profilePic: {
    width: '24px',
    height: '24px',
    borderRadius: '12px',
    backgroundColor: '#E5E5EA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: '600'
  },
  taskTitle: {
    fontSize: '14px',
    fontWeight: '500'
  },
  checkboxChecked: {
    width: '20px',
    height: '20px',
    borderRadius: '10px',
    backgroundColor: '#34C759',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    cursor: 'pointer'
  },
  checkboxUnchecked: {
    width: '20px',
    height: '20px',
    borderRadius: '10px',
    border: '1px solid #C7C7CC',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#C7C7CC',
    cursor: 'pointer'
  },
  taskDescription: {
    fontSize: '12px',
    lineHeight: '1.4',
    marginBottom: '10px',
    opacity: 0.8
  },
  taskTime: {
    fontSize: '11px',
    color: '#8E8E93'
  },

  // Children's Overview Styles
  childrenContainer: {
    display: 'flex',
    gap: '15px',
    overflowX: 'auto',
    paddingBottom: '10px'
  },
  childCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '15px',
    minWidth: '160px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  childHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  childProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  childPic: {
    width: '32px',
    height: '32px',
    borderRadius: '16px',
    backgroundColor: '#E5E5EA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    overflow: 'hidden'
  },
  childProfileImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '16px'
  },
  childName: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#000'
  },
  childAge: {
    fontSize: '10px',
    color: '#8E8E93'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '4px',
    backgroundColor: '#FF3B30'
  },
  progressSection: {
    fontSize: '11px'
  },
  progressLabel: {
    fontWeight: '500',
    marginBottom: '5px'
  },
  progressTimes: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '5px'
  },
  timeStart: {
    color: '#8E8E93'
  },
  timeCurrent: {
    color: '#34C759',
    fontWeight: '600'
  },
  progressSubtext: {
    color: '#8E8E93',
    fontSize: '10px'
  },

  // Events Styles
  eventsContainer: {
    display: 'flex',
    gap: '15px',
    overflowX: 'auto',
    paddingBottom: '10px'
  },
  eventCard: {
    borderRadius: '12px',
    padding: '15px',
    minWidth: '120px',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '80px'
  },
  eventText: {
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '1.3'
  },
  eventTime: {
    fontSize: '12px',
    opacity: 0.9,
    marginTop: '10px'
  },

  // Bottom Section Styles
  bottomContainer: {
    display: 'flex',
    gap: '15px',
    marginTop: '20px'
  },
  bottomCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '15px',
    flex: 1,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  bottomTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 15px 0'
  },
  notesList: {
    minHeight: '80px'
  },
  shoppingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  shoppingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px'
  },
  shoppingSubtext: {
    fontSize: '12px',
    color: '#8E8E93',
    marginLeft: '0'
  },

  // Bottom Navigation Styles
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '10px 0 25px 0',
    borderTop: '1px solid #E5E5EA',
    boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)'
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    flex: 1
  },
  navIcon: {
    fontSize: '20px'
  },
  navLabel: {
    fontSize: '10px',
    color: '#8E8E93'
  },
  fabButton: {
    width: '44px',
    height: '44px',
    borderRadius: '22px',
    backgroundColor: '#4A5568',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
  },

  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '20px',
    color: '#666'
  },

  // Empty States
  emptyState: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: '14px',
    minWidth: '200px'
  },
  emptyStateIcon: {
    fontSize: '32px',
    marginBottom: '10px'
  },
  emptyStateSubtext: {
    fontSize: '12px',
    margin: '5px 0 15px 0'
  },
  emptyStateButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '10px'
  },
  emptyStateSmall: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: '12px',
    padding: '20px'
  },

  // Child Actions
  childActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '10px'
  },
  childActionButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    flex: 1
  },

  // Reminder Card
  reminderCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  reminderIcon: {
    fontSize: '24px'
  },
  reminderText: {
    flex: 1,
    fontSize: '14px',
    color: '#000',
    fontWeight: '500'
  },
  reminderButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  }
};

export default Dashboard;