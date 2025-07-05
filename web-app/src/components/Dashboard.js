import { db } from '../firebase';
import { useFamily } from '../hooks/useFamily';
import { useTasks } from '../hooks/useTasks';
import { useCalendar } from '../hooks/useCalendar';
import { useShopping } from '../hooks/useShopping';
import TodoList from './HouseholdTodos/TodoList';
import AddTodo from './HouseholdTodos/AddTodo';
import { updateTaskStatus } from '../utils/familyUtils';
import { DashboardStates, getDashboardState } from '../utils/dashboardStates';
import DashboardWelcome from './DashboardWelcome';
import AddChildFlow from './AddChild/AddChildFlow';
import { collection, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useState } from 'react';
import { processAndUploadPhoto } from '../utils/optimizedPhotoUpload';
import LoadingProgress from './LoadingProgress';
import SmartCalendarPage from '../pages/SmartCalendarPage';
import ShoppingListPage from '../pages/ShoppingListPage';
import ProfileIcon from './Profile/ProfileIcon';
import ProfilePage from './Profile/ProfilePage';
import BottomNavigation from './BottomNavigation';

function Dashboard({ user }) {
  // Use custom hooks to fetch data
  const { userData, familyData, children, loading: familyLoading } = useFamily(user.uid);
  const { tasks, loading: tasksLoading } = useTasks(userData?.familyId, user.uid);
  const { events, loading: eventsLoading } = useCalendar(userData?.familyId, user.uid);
  const { shoppingLists, loading: shoppingLoading } = useShopping(userData?.familyId);

  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'add_child', 'edit_child', 'welcome', 'smart_calendar', 'profile'
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [isSavingChild, setIsSavingChild] = useState(false);
  const [saveProgress, setSaveProgress] = useState(null);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);

  const loading = familyLoading || tasksLoading || eventsLoading || shoppingLoading;

  // Determine dashboard state
  const dashboardState = getDashboardState(userData, children, tasks);
  
  // Determine user role (fallback logic for role detection)
  const userRole = userData?.role || (familyData?.parentUids?.includes(user.uid) ? 'parent' : 'aupair');
  
  // Calculate shopping notifications for parents
  const pendingApprovalCount = userRole === 'parent' 
    ? shoppingLists.filter(list => list.status === 'needs-approval' || list.paymentStatus === 'approved').length 
    : 0;
  

  const handleProfileNavigation = (action) => {
    // Handle navigation to different profile-related pages
    switch (action) {
      case 'profile':
        setCurrentView('profile');
        break;
      case 'notifications':
        console.log('Navigate to notifications');
        alert('Notifications settings coming soon!');
        break;
      case 'settings':
        console.log('Navigate to settings');
        alert('Settings coming soon!');
        break;
      case 'family':
        console.log('Navigate to family management');
        alert('Family management coming soon!');
        break;
      case 'analytics':
        console.log('Navigate to analytics');
        alert('Analytics coming soon!');
        break;
      default:
        console.log('Unknown navigation action:', action);
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
    setEditingChild(null);
  };

  const handleEditChild = (child) => {
    setCurrentView('edit_child');
    setEditingChild(child);
    setIsAddingChild(false);
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
    // Handle delete request
    if (childData.deleteChild) {
      try {
        setIsSavingChild(true);
        setSaveProgress({ stage: 'validation', progress: 50, message: 'Deleting child...' });
        
        await deleteDoc(doc(db, 'children', childData.deleteChild));
        
        setSaveProgress({ stage: 'complete', progress: 100, message: 'Child deleted successfully!' });
        
        setTimeout(() => {
          setCurrentView('dashboard');
          setEditingChild(null);
          setIsSavingChild(false);
          setSaveProgress(null);
        }, 1000);
        
        return;
      } catch (error) {
        console.error('Error deleting child:', error);
        alert('Failed to delete child. Please try again.');
        setIsSavingChild(false);
        setSaveProgress(null);
        return;
      }
    }

    setIsSavingChild(true);
    setSaveProgress({ stage: 'validation', progress: 0, message: 'Starting save process...' });
    
    try {
      console.log('Received child data to save:', childData);
      
      // Skip duplicate check when editing existing child
      if (!editingChild) {
        // Only check for duplicates when adding new children
        setSaveProgress({ stage: 'validation', progress: 10, message: 'Checking for duplicates...' });
        
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
      } else {
        // Skip duplicate check for editing - go straight to data preparation
        setSaveProgress({ stage: 'validation', progress: 10, message: 'Preparing update...' });
      }
      
      // Prepare the child data for Firestore
      setSaveProgress({ stage: 'validation', progress: 20, message: 'Preparing child data...' });
      
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
      if (childData.photoFile && childData.photoFile instanceof File && childData.photoFile.size > 0) {
        try {
          // Generate a temporary child ID for the photo upload
          const tempChildId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Process and upload photo with progress tracking
          photoURL = await processAndUploadPhoto(
            childData.photoFile,
            tempChildId,
            userData.familyId,
            (progress) => {
              setSaveProgress({
                stage: progress.stage,
                progress: 30 + (progress.progress * 0.5), // Photo upload takes 50% of total progress
                message: progress.message
              });
            }
          );
          
          console.log('Photo uploaded successfully:', photoURL);
        } catch (photoError) {
          console.error('Photo upload error:', photoError);
          // Continue without photo if upload fails
          alert(`Photo upload failed: ${photoError.message}. Child will be saved without photo.`);
          photoURL = null;
        }
      } else {
        // Skip photo upload progress
        setSaveProgress({ stage: 'uploading', progress: 80, message: 'No photo to upload...' });
      }
      
      // Update child data with photo URL
      childToSave.profilePictureUrl = photoURL;
      
      // Remove the photo file from the data before saving to Firestore
      delete childToSave.photoFile;
      
      console.log('Processed child data for Firestore:', childToSave);
      
      // Save child to Firestore (create new or update existing)
      setSaveProgress({ stage: 'complete', progress: 90, message: 'Saving to database...' });
      
      if (editingChild) {
        // Update existing child
        await updateDoc(doc(db, 'children', editingChild.id), childToSave);
        console.log('Child updated successfully with ID:', editingChild.id);
      } else {
        // Create new child
        const docRef = await addDoc(collection(db, 'children'), childToSave);
        console.log('Child added successfully with ID:', docRef.id);
      }
      
      // Clear the draft from localStorage
      localStorage.removeItem('childDraft');
      
      // Clean up draft document from Firestore if it exists
      if (childData.tempId) {
        try {
          const draftRef = doc(db, 'families', userData.familyId, 'childDrafts', childData.tempId);
          await deleteDoc(draftRef);
          console.log('Draft document cleaned up:', childData.tempId);
        } catch (draftError) {
          console.warn('Could not clean up draft document:', draftError);
          // Don't fail the whole operation for this
        }
      }
      
      setSaveProgress({ stage: 'complete', progress: 100, message: editingChild ? 'Child updated successfully!' : 'Child saved successfully!' });
      
      // Small delay to show completion
      setTimeout(() => {
        setCurrentView('dashboard');
        setIsAddingChild(false);
        setEditingChild(null);
      }, 1000);
      
    } catch (error) {
      console.error('Error adding child:', error);
      setSaveProgress({ stage: 'error', progress: 0, message: 'Failed to save child. Please try again.' });
      
      // Show error to user
      setTimeout(() => {
        alert('Failed to add child. Please try again.');
      }, 1000);
    } finally {
      setTimeout(() => {
        setIsSavingChild(false);
        setSaveProgress(null);
      }, 2000);
    }
  };

  const handleCancelAddChild = () => {
    // Clear any draft data
    localStorage.removeItem('childDraft');
    setCurrentView('dashboard');
    setIsAddingChild(false);
    setEditingChild(null);
  };

  // Todo handlers
  const handleAddTodo = () => {
    setShowAddTodo(true);
    setEditingTodo(null);
  };

  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
    setShowAddTodo(true);
  };

  const handleCloseTodo = () => {
    setShowAddTodo(false);
    setEditingTodo(null);
  };

  const handleTodoSuccess = () => {
    // Refresh will happen automatically via real-time listeners
    console.log('Todo saved successfully');
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
      <div style={styles.appContainer}>
        <AddChildFlow
          user={user}
          familyId={userData?.familyId}
          existingChildren={children}
          onComplete={handleChildAdded}
          onCancel={handleCancelAddChild}
          isSaving={isSavingChild}
        />
        <BottomNavigation 
          currentView={currentView} 
          onNavigate={setCurrentView} 
          pendingApprovalCount={pendingApprovalCount}
        />
      </div>
    );
  }

  // Show edit child flow
  if (currentView === 'edit_child' && editingChild) {
    return (
      <div style={styles.appContainer}>
        <AddChildFlow
          user={user}
          familyId={userData?.familyId}
          existingChildren={children.filter(child => child.id !== editingChild.id)}
          editingChild={editingChild}
          onComplete={handleChildAdded}
          onCancel={handleCancelAddChild}
          isSaving={isSavingChild}
        />
        <BottomNavigation 
          currentView={currentView} 
          onNavigate={setCurrentView} 
          pendingApprovalCount={pendingApprovalCount}
        />
      </div>
    );
  }

  // Show smart calendar
  if (currentView === 'smart_calendar') {
    return (
      <div style={styles.appContainer}>
        <SmartCalendarPage user={user} />
        <BottomNavigation 
          currentView={currentView} 
          onNavigate={setCurrentView} 
          pendingApprovalCount={pendingApprovalCount}
        />
      </div>
    );
  }

  if (currentView === 'shopping') {
    return (
      <div style={styles.appContainer}>
        <ShoppingListPage />
        <BottomNavigation 
          currentView={currentView} 
          onNavigate={setCurrentView} 
          pendingApprovalCount={pendingApprovalCount}
        />
      </div>
    );
  }

  // Show profile page
  if (currentView === 'profile') {
    return (
      <div style={styles.appContainer}>
        <ProfilePage user={user} onBack={() => setCurrentView('dashboard')} />
        <BottomNavigation 
          currentView={currentView} 
          onNavigate={setCurrentView} 
          pendingApprovalCount={pendingApprovalCount}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backButton}>←</button>
        <h1 style={styles.title}>{familyData?.name || 'FamilySync'}</h1>
        <ProfileIcon 
          user={user}
          userData={userData}
          onNavigate={handleProfileNavigation}
        />
      </header>

      {/* Main Content */}
      <div style={styles.content}>
        {/* My Tasks Today - Only show for Au Pairs */}
        {userRole === 'aupair' && (
          <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>My Tasks Today</h2>
          </div>
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
        )}

        {/* Household Todos (Parent-Au Pair) */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              {userRole === 'parent' ? 'Household Tasks for Au Pair' : 'Your Assigned Tasks'}
            </h2>
            {userRole === 'parent' && (
              <button style={styles.headerButton} onClick={handleAddTodo}>
                Add Task +
              </button>
            )}
          </div>
          <div style={styles.todosContainer}>
            <TodoList
              familyId={userData?.familyId}
              userRole={userRole}
              userId={user.uid}
              viewType="today"
              onEditTodo={handleEditTodo}
              showAddButton={false} // We handle this in the section header
              onAddTodo={handleAddTodo}
            />
          </div>
        </section>

        {/* Children's Overview */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Children's Overview</h2>
            <button style={styles.headerButton} onClick={handleAddChild}>
              Add Child +
            </button>
          </div>
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
                  Math.floor((new Date() - (child.dateOfBirth.toDate ? child.dateOfBirth.toDate() : new Date(child.dateOfBirth))) / (365.25 * 24 * 60 * 60 * 1000)) 
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
                      <button 
                        style={styles.childActionButtonSecondary} 
                        onClick={() => handleEditChild(child)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Upcoming Events */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Upcoming Events for Me</h2>
          </div>
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
            <div style={styles.cardHeader}>
              <h3 style={styles.bottomTitle}>Shopping List</h3>
              <button 
                style={styles.viewAllButton}
                onClick={() => setCurrentView('shopping')}
              >
                View All
              </button>
            </div>
            <div style={styles.shoppingList}>
              {shoppingLists.length === 0 ? (
                <div style={styles.emptyStateSmall}>
                  <p>No shopping lists</p>
                  <button 
                    style={styles.createButton}
                    onClick={() => setCurrentView('shopping')}
                  >
                    Create first list
                  </button>
                </div>
              ) : (
                (() => {
                  const activeLists = shoppingLists.filter(list => !list.isArchived && list.status !== 'paid-out');
                  
                  if (activeLists.length === 0) {
                    return (
                      <div style={styles.allClearState}>
                        <div style={styles.allClearIcon}>✨</div>
                        <p style={styles.allClearText}>All shopping done!</p>
                        <p style={styles.allClearSubtext}>Great job keeping the household stocked</p>
                        <button 
                          style={styles.createButton}
                          onClick={() => setCurrentView('shopping')}
                        >
                          Create new list
                        </button>
                      </div>
                    );
                  }
                  
                  // Check if all active lists are completed
                  const allCompleted = activeLists.every(list => {
                    const items = Array.isArray(list.items) 
                      ? list.items 
                      : Object.values(list.items || {});
                    return items.length > 0 && items.every(item => item.isPurchased);
                  });
                  
                  if (allCompleted) {
                    return (
                      <div style={styles.allClearState}>
                        <div style={styles.allClearIcon}>🎉</div>
                        <p style={styles.allClearText}>All shopping completed!</p>
                        <p style={styles.allClearSubtext}>{activeLists.length} {activeLists.length === 1 ? 'list' : 'lists'} finished</p>
                        <div style={styles.completedListsPreview}>
                          {activeLists.map(list => (
                            <div 
                              key={list.id}
                              style={styles.completedListItem}
                              onClick={() => setCurrentView('shopping')}
                            >
                              {list.name} ✓
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  
                  return activeLists.map((list) => {
                    const items = Array.isArray(list.items) 
                      ? list.items 
                      : Object.values(list.items || {});
                    
                    const completedItems = items.filter(item => item.isPurchased).length;
                    const totalItems = items.length;
                    const remainingItems = totalItems - completedItems;
                    
                    return (
                      <div 
                        key={list.id} 
                        style={styles.shoppingListItem}
                        onClick={() => setCurrentView('shopping')}
                      >
                        <div style={styles.listHeader}>
                          <span style={styles.listName}>{list.name}</span>
                          {list.status === 'needs-approval' && (
                            <span style={styles.approvalBadge}>Needs Approval</span>
                          )}
                        </div>
                        <div style={styles.progressIndicator}>
                          {remainingItems > 0 
                            ? `${remainingItems}/${totalItems} items remaining`
                            : `${totalItems}/${totalItems} items completed ✓`
                          }
                        </div>
                      </div>
                    );
                  });
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
      <BottomNavigation 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        pendingApprovalCount={pendingApprovalCount}
      />

      {/* Enhanced Loading Progress */}
      <LoadingProgress
        isVisible={isSavingChild}
        title="Saving Child Profile"
        subtitle="Please wait while we create your child's profile"
        progress={saveProgress}
        allowCancel={false}
      />

      {/* Add/Edit Todo Modal */}
      {showAddTodo && (
        <AddTodo
          familyId={userData?.familyId}
          userId={user.uid}
          onClose={handleCloseTodo}
          onSuccess={handleTodoSuccess}
          editTodo={editingTodo}
        />
      )}
    </div>
  );
}

const styles = {
  appContainer: {
    minHeight: '100vh',
    backgroundColor: '#F2F2F7',
    paddingBottom: '80px', // Space for bottom navigation
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
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

  // Content Styles
  content: {
    flex: 1,
    padding: '20px',
    paddingBottom: '100px'
  },
  section: {
    marginBottom: '30px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: 0
  },
  headerButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  // Task Styles
  tasksContainer: {
    display: 'flex',
    gap: '15px',
    overflowX: 'auto',
    paddingBottom: '10px'
  },
  
  // Todos Styles
  todosContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
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
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  viewAllButton: {
    background: 'none',
    border: 'none',
    color: '#007AFF',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  createButton: {
    background: '#007AFF',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '8px'
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  listName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  approvalBadge: {
    background: '#FF6B35',
    color: 'white',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '500'
  },
  shoppingItemContainer: {
    marginBottom: '8px'
  },
  itemCompleted: {
    textDecoration: 'line-through',
    opacity: 0.6
  },
  itemPending: {
    // Default styles
  },
  moreItems: {
    fontSize: '12px',
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: '8px'
  },
  shoppingListItem: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: '1px solid #E5E5EA'
  },
  progressIndicator: {
    fontSize: '12px',
    color: '#8E8E93',
    marginTop: '4px'
  },
  allClearState: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#F0FDF4',
    borderRadius: '12px',
    border: '1px solid #86EFAC'
  },
  allClearIcon: {
    fontSize: '32px',
    marginBottom: '8px'
  },
  allClearText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#166534',
    margin: '0 0 4px 0'
  },
  allClearSubtext: {
    fontSize: '12px',
    color: '#16A34A',
    margin: '0 0 12px 0'
  },
  completedListsPreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '12px'
  },
  completedListItem: {
    fontSize: '12px',
    color: '#16A34A',
    backgroundColor: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
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
  childActionButtonSecondary: {
    backgroundColor: 'transparent',
    color: '#007AFF',
    border: '1px solid #007AFF',
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