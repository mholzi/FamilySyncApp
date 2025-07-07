import { db } from '../firebase';
import { useFamily } from '../hooks/useFamily';
import { useTasks } from '../hooks/useTasks';
import { useCalendar } from '../hooks/useCalendar';
import { useShopping } from '../hooks/useShopping';
import SimpleTodoCard from './HouseholdTodos/SimpleTodoCard';
import AddTodo from './HouseholdTodos/AddTodo';
import { getTodaysHouseholdTodos, autoResetCompletedTasks } from '../utils/householdTodosUtils';
import { updateTaskStatus } from '../utils/familyUtils';
import { DashboardStates, getDashboardState } from '../utils/dashboardStates';
import DashboardWelcome from './DashboardWelcome';
import AddChildFlow from './AddChild/AddChildFlow';
import { collection, addDoc, doc, updateDoc, deleteDoc, Timestamp, getDoc } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { processAndUploadPhoto } from '../utils/optimizedPhotoUpload';
import LoadingProgress from './LoadingProgress';
import SmartCalendarPage from '../pages/SmartCalendarPage';
import ShoppingListPage from '../pages/ShoppingListPage';
import ProfileIcon from './Profile/ProfileIcon';
import ProfilePage from './Profile/ProfilePage';
import BottomNavigation from './BottomNavigation';
import FamilyNotesList from './Notes/FamilyNotesList';
import EnhancedChildCard from './Children/EnhancedChildCard';
import UpcomingEventsForMe from './Dashboard/UpcomingEventsForMe';
import RecurringActivitiesManager from './Activities/RecurringActivitiesManager';
import TimeOffRequest from './Requests/TimeOffRequest';
import RequestsList from './Requests/RequestsList';

function Dashboard({ user }) {
  // Use custom hooks to fetch data
  const { userData, familyData, children, loading: familyLoading } = useFamily(user.uid);
  const { tasks, loading: tasksLoading } = useTasks(userData?.familyId, user.uid);
  const { events, loading: eventsLoading } = useCalendar(userData?.familyId, user.uid);
  const { shoppingLists, loading: shoppingLoading } = useShopping(userData?.familyId);

  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'add_child', 'edit_child', 'welcome', 'smart_calendar', 'profile', 'activities'
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [isSavingChild, setIsSavingChild] = useState(false);
  const [saveProgress, setSaveProgress] = useState(null);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showTimeOffRequest, setShowTimeOffRequest] = useState(false);
  
  // State for household todos
  const [householdTodos, setHouseholdTodos] = useState([]);
  const [todosLoading, setTodosLoading] = useState(true);

  const loading = familyLoading || tasksLoading || eventsLoading || shoppingLoading || todosLoading;

  // Fetch household todos for today
  useEffect(() => {
    if (!userData?.familyId || !userData?.role) return;

    const unsubscribe = getTodaysHouseholdTodos(userData.familyId, (snapshot) => {
      const todosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHouseholdTodos(todosData);
      setTodosLoading(false);
    }, userData.role);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userData?.familyId, userData?.role]);

  // Auto-reset completed tasks after 24 hours (run for parents only)
  useEffect(() => {
    if (!userData?.familyId || userData?.role !== 'parent') return;

    const familyId = userData.familyId;
    
    // Run immediately
    autoResetCompletedTasks(familyId);

    // Run every hour to check for tasks to reset
    const interval = setInterval(() => {
      autoResetCompletedTasks(familyId);
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, [userData?.familyId, userData?.role]);

  // Determine dashboard state
  const dashboardState = getDashboardState(userData, children, tasks);
  
  // Determine user role (fallback logic for role detection)
  const userRole = userData?.role || (familyData?.parentUids?.includes(user.uid) ? 'parent' : 'aupair');
  
  // Calculate shopping notifications for parents
  const pendingApprovalCount = userRole === 'parent' 
    ? shoppingLists.filter(list => list.status === 'needs-approval' || list.paymentStatus === 'approved').length 
    : 0;

  // Helper function to get au pair ID
  const getAuPairId = (familyData) => {
    console.log('Getting au pair ID from familyData:', familyData);
    console.log('All familyData keys:', Object.keys(familyData || {}));
    
    // Try auPairUids first
    if (familyData?.auPairUids && familyData.auPairUids.length > 0) {
      console.log('Found auPairUids:', familyData.auPairUids);
      return familyData.auPairUids[0];
    }
    
    // Try memberUids and filter out parentUids
    if (familyData?.memberUids && familyData?.parentUids) {
      const auPairIds = familyData.memberUids.filter(uid => !familyData.parentUids.includes(uid));
      console.log('Found au pair IDs from memberUids:', auPairIds);
      if (auPairIds.length > 0) {
        return auPairIds[0];
      }
    }
    
    // Try checking if current non-parent user is au pair
    if (familyData && user && !familyData?.parentUids?.includes(user.uid)) {
      console.log('Current user might be au pair or au pair exists:', user.uid);
      // Check if there are any users other than parents
      if (familyData.memberUids && familyData.memberUids.length > (familyData.parentUids?.length || 0)) {
        console.log('Found additional members (likely au pair)');
        return familyData.memberUids.find(uid => !familyData.parentUids?.includes(uid));
      }
    }
    
    console.log('No au pair ID found - showing invite message');
    return null;
  };
  

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


  const handleInviteAuPair = async () => {
    try {
      // Generate a unique 6-character invitation code
      const generateInviteCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      // Check if family already has an invite code
      const familyDocRef = doc(db, 'families', userData.familyId);
      const familyDoc = await getDoc(familyDocRef);
      
      if (familyDoc.exists() && familyDoc.data().inviteCode) {
        // Use existing code
        setInviteCode(familyDoc.data().inviteCode);
      } else {
        // Generate new code and save it
        const newCode = generateInviteCode();
        await updateDoc(familyDocRef, {
          inviteCode: newCode,
          inviteCreatedAt: Timestamp.now(),
          inviteCreatedBy: user.uid
        });
        setInviteCode(newCode);
      }
      
      setShowInvitePopup(true);
    } catch (error) {
      console.error('Error creating invitation:', error);
      alert('Failed to create invitation. Please try again.');
    }
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


  const handleCloseTodo = () => {
    setShowAddTodo(false);
    setEditingTodo(null);
  };

  const handleTodoSuccess = () => {
    // Refresh will happen automatically via real-time listeners
    console.log('Todo saved successfully');
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

  // Show recurring activities management
  if (currentView === 'activities') {
    return (
      <div style={styles.appContainer}>
        <RecurringActivitiesManager
          familyId={userData?.familyId}
          children={children}
          userRole={userRole}
          onClose={() => setCurrentView('dashboard')}
        />
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
        {/* Household Todos (Parent-Au Pair) */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              {userRole === 'parent' 
                ? `Household Tasks for Au Pair ${householdTodos.length > 0 ? `(${householdTodos.length})` : ''}` 
                : 'Your Daily Contributions'
              }
            </h2>
            {userRole === 'parent' && (
              <button style={styles.headerButton} onClick={handleAddTodo}>
                Add Task
              </button>
            )}
          </div>
          <div style={styles.tasksContainer}>
            {householdTodos.length === 0 ? (
              <div style={styles.emptyStateFullWidth}>
                <div style={styles.emptyStateIcon}>✅</div>
                <p style={styles.emptyStateTitle}>All Tasks Completed!</p>
                <p style={styles.emptyStateSubtext}>
                  {userRole === 'parent' 
                    ? 'Great work! All household tasks have been completed. Your au pair is doing an excellent job!'
                    : 'Fantastic work! You\'ve completed all your assigned tasks. Enjoy your well-deserved break! 🎉'
                  }
                </p>
              </div>
            ) : (
              householdTodos.map((todo) => (
                <SimpleTodoCard
                  key={todo.id}
                  todo={todo}
                  userRole={userRole}
                  familyId={userData?.familyId}
                  userId={user.uid}
                  onToggleComplete={(todoId, newStatus) => {
                    console.log(`Todo ${todoId} status changed to ${newStatus}`);
                  }}
                />
              ))
            )}
          </div>
        </section>

        {/* Children's Overview */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Children's Overview</h2>
            {userRole === 'parent' && (
              <button style={styles.headerButton} onClick={handleAddChild}>
                Add Child
              </button>
            )}
          </div>
          <div style={styles.childrenContainer}>
            {children.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyStateIcon}>👶</div>
                <p>Ready to add your children?</p>
                {userRole === 'parent' && (
                  <button style={styles.emptyStateButton} onClick={handleAddChild}>
                    Add Child
                  </button>
                )}
              </div>
            ) : (
              children.map((child) => (
                <EnhancedChildCard
                  key={child.id}
                  child={child}
                  onEditChild={handleEditChild}
                  userRole={userRole}
                />
              ))
            )}
          </div>
        </section>

        {/* Recurring Activities Management - Only for Parents */}
        {userRole === 'parent' && (
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Recurring Activities</h2>
              <button 
                style={styles.headerButton} 
                onClick={() => setCurrentView('activities')}
              >
                Manage Activities
              </button>
            </div>
            <div style={styles.activitiesPreview}>
              <p style={styles.activitiesDescription}>
                Set up regular schedules for sports, lessons, appointments, and other recurring activities. 
                Your au pair will see these in their upcoming events.
              </p>
              <div style={styles.activitiesFeatures}>
                <div style={styles.featureItem}>
                  <span style={styles.featureIcon}>📅</span>
                  <span>Weekly & custom schedules</span>
                </div>
                <div style={styles.featureItem}>
                  <span style={styles.featureIcon}>📍</span>
                  <span>Locations & contact info</span>
                </div>
                <div style={styles.featureItem}>
                  <span style={styles.featureIcon}>🎒</span>
                  <span>Required items & preparation</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Time-Off Requests Section */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              {userRole === 'parent' ? 'Babysitting & Time-Off' : 'Babysitting'}
            </h2>
            {userRole === 'parent' && (
              <button 
                style={styles.headerButton} 
                onClick={() => setShowTimeOffRequest(true)}
              >
                + New Request
              </button>
            )}
          </div>
          <RequestsList
            familyId={userData?.familyId}
            userId={user.uid}
            userRole={userRole}
            children={children}
            familyData={familyData}
          />
        </section>

        {/* Upcoming Events for Me */}
        <section style={styles.section}>
          <UpcomingEventsForMe 
            children={children}
            userRole={userRole}
            activities={events}
            familyId={userData?.familyId}
            maxEvents={5}
          />
        </section>

        {/* Bottom Section */}
        <div style={styles.bottomContainer}>
          <div style={styles.bottomCard}>
            <FamilyNotesList
              familyId={userData?.familyId}
              userId={user.uid}
              userRole={userRole}
              userData={userData}
              familyData={familyData}
              maxDisplayed={3}
            />
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
                          {list.status === 'needs-approval' && userRole === 'parent' && (
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
        {/* Au Pair Invitation Reminder - Only show if no au pair is linked and user is parent */}
        {children.length > 0 && 
         userRole === 'parent' && 
         !getAuPairId(familyData) && (
          <div style={styles.reminderCard}>
            <span style={styles.reminderIcon}>👥</span>
            <span style={styles.reminderText}>Still need to invite your Au Pair?</span>
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

      {/* Au Pair Invitation Popup */}
      {showInvitePopup && (
        <div style={styles.inviteOverlay}>
          <div style={styles.inviteModal}>
            <div style={styles.inviteHeader}>
              <h2 style={styles.inviteTitle}>Invite Your Au Pair</h2>
              <button 
                style={styles.inviteCloseButton} 
                onClick={() => setShowInvitePopup(false)}
              >
                ×
              </button>
            </div>
            
            <div style={styles.inviteContent}>
              <p style={styles.inviteDescription}>
                Share this code with your Au Pair. They'll use it to join your family during their sign-up process.
              </p>
              
              <div style={styles.inviteCodeContainer}>
                <div style={styles.inviteCodeLabel}>Invitation Code</div>
                <div style={styles.inviteCode}>{inviteCode}</div>
                <button 
                  style={styles.copyButton}
                  onClick={() => {
                    navigator.clipboard.writeText(inviteCode);
                    alert('Code copied to clipboard!');
                  }}
                >
                  📋 Copy Code
                </button>
              </div>

              <div style={styles.inviteInstructions}>
                <h3 style={styles.inviteSubtitle}>Instructions for Au Pair:</h3>
                <ol style={styles.inviteList}>
                  <li>Download the FamilySync app</li>
                  <li>Select "I am an Au Pair" during sign-up</li>
                  <li>Enter this invitation code when prompted</li>
                  <li>Complete their profile setup</li>
                </ol>
              </div>

              <div style={styles.inviteNote}>
                <strong>Note:</strong> This code will remain active until your Au Pair joins. 
                You can share it via email, text, or any messaging app.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time-Off Request Modal */}
      {showTimeOffRequest && (
        <TimeOffRequest
          familyId={userData?.familyId}
          currentUser={user}
          children={children}
          auPairId={getAuPairId(familyData)} // Get au pair ID using helper
          onClose={() => setShowTimeOffRequest(false)}
        />
      )}
    </div>
  );
}

const styles = {
  appContainer: {
    minHeight: '100vh',
    backgroundColor: '#F8FAFC',
    paddingBottom: '80px', // Space for bottom navigation
    fontFamily: 'var(--font-family-sans)'
  },
  container: {
    minHeight: '100vh',
    backgroundColor: '#F8FAFC',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'var(--font-family-sans)'
  },
  
  // Header Styles
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-4) var(--space-5)',
    backgroundColor: 'var(--white)',
    boxShadow: 'var(--shadow-sm)',
    borderBottom: '1px solid var(--border-light)'
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
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: 0
  },

  // Content Styles
  content: {
    flex: 1,
    padding: 'var(--space-5)',
    paddingBottom: '100px'
  },
  section: {
    marginBottom: 'var(--space-8)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-4)'
  },
  sectionTitle: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: 0
  },
  headerButton: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-4)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    boxShadow: 'var(--shadow-sm)'
  },

  // Task Styles
  tasksContainer: {
    display: 'flex',
    gap: 'var(--space-4)',
    overflowX: 'auto',
    paddingBottom: 'var(--space-3)'
  },
  
  // Todos Styles (using tasksContainer for horizontal layout)
  taskCard: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    minWidth: '240px',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border-light)',
    transition: 'var(--transition-normal)'
  },
  taskCardActive: {
    backgroundColor: 'var(--gray-800)',
    color: 'var(--white)',
    border: '1px solid var(--gray-700)'
  },
  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-3)'
  },
  taskProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)'
  },
  profilePic: {
    width: '28px',
    height: '28px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--gray-100)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-secondary)'
  },
  taskTitle: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'inherit'
  },
  checkboxChecked: {
    width: '24px',
    height: '24px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--secondary-green)',
    color: 'var(--white)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  checkboxUnchecked: {
    width: '24px',
    height: '24px',
    borderRadius: 'var(--radius-full)',
    border: '2px solid var(--gray-300)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--gray-300)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  taskDescription: {
    fontSize: 'var(--font-size-xs)',
    lineHeight: 'var(--line-height-normal)',
    marginBottom: 'var(--space-3)',
    opacity: 0.8,
    color: 'var(--text-secondary)'
  },
  taskTime: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)'
  },

  // Children's Overview Styles
  childrenContainer: {
    display: 'flex',
    gap: 'var(--space-4)',
    overflowX: 'auto',
    paddingBottom: 'var(--space-3)'
  },
  childCard: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    minWidth: '180px',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border-light)',
    transition: 'var(--transition-normal)'
  },
  childHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'var(--space-4)'
  },
  childProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)'
  },
  childPic: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--gray-100)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    overflow: 'hidden',
    color: 'var(--text-secondary)'
  },
  childProfileImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: 'var(--radius-full)'
  },
  childName: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)'
  },
  childAge: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--secondary-green)'
  },
  progressSection: {
    fontSize: 'var(--font-size-xs)'
  },
  progressLabel: {
    fontWeight: 'var(--font-weight-medium)',
    marginBottom: 'var(--space-1)',
    color: 'var(--text-primary)'
  },
  progressTimes: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 'var(--space-1)'
  },
  timeStart: {
    color: 'var(--text-tertiary)'
  },
  timeCurrent: {
    color: 'var(--secondary-green)',
    fontWeight: 'var(--font-weight-semibold)'
  },
  progressSubtext: {
    color: 'var(--text-tertiary)',
    fontSize: 'var(--font-size-xs)'
  },

  // Events Styles
  eventsContainer: {
    display: 'flex',
    gap: 'var(--space-4)',
    overflowX: 'auto',
    paddingBottom: 'var(--space-3)'
  },
  eventCard: {
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    minWidth: '140px',
    color: 'var(--white)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '90px',
    boxShadow: 'var(--shadow-sm)'
  },
  eventText: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    lineHeight: 'var(--line-height-tight)'
  },
  eventTime: {
    fontSize: 'var(--font-size-xs)',
    opacity: 0.9,
    marginTop: 'var(--space-3)'
  },

  // Bottom Section Styles
  bottomContainer: {
    display: 'flex',
    gap: 'var(--space-4)',
    marginTop: 'var(--space-5)'
  },
  bottomCard: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    flex: 1,
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border-light)'
  },
  bottomTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: '0 0 var(--space-4) 0'
  },
  shoppingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)'
  },
  shoppingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 'var(--font-size-sm)'
  },
  shoppingSubtext: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    marginLeft: '0'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-4)'
  },
  viewAllButton: {
    background: 'none',
    border: 'none',
    color: 'var(--primary-purple)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    fontWeight: 'var(--font-weight-medium)',
    transition: 'var(--transition-fast)'
  },
  createButton: {
    background: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    marginTop: 'var(--space-2)',
    fontWeight: 'var(--font-weight-medium)',
    transition: 'var(--transition-fast)'
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-3)'
  },
  listName: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)'
  },
  approvalBadge: {
    background: 'var(--secondary-orange)',
    color: 'var(--white)',
    fontSize: 'var(--font-size-xs)',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 'var(--font-weight-medium)'
  },
  shoppingItemContainer: {
    marginBottom: 'var(--space-2)'
  },
  itemCompleted: {
    textDecoration: 'line-through',
    opacity: 0.6
  },
  itemPending: {
    // Default styles
  },
  moreItems: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
    marginTop: 'var(--space-2)'
  },
  shoppingListItem: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    marginBottom: 'var(--space-2)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    border: '1px solid var(--border-light)'
  },
  progressIndicator: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    marginTop: 'var(--space-1)'
  },
  allClearState: {
    textAlign: 'center',
    padding: 'var(--space-5)',
    backgroundColor: '#F0FDF4',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid #86EFAC'
  },
  allClearIcon: {
    fontSize: 'var(--font-size-4xl)',
    marginBottom: 'var(--space-2)'
  },
  allClearText: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: '#166534',
    margin: '0 0 var(--space-1) 0'
  },
  allClearSubtext: {
    fontSize: 'var(--font-size-xs)',
    color: '#16A34A',
    margin: '0 0 var(--space-3) 0'
  },
  completedListsPreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    marginTop: 'var(--space-3)'
  },
  completedListItem: {
    fontSize: 'var(--font-size-xs)',
    color: '#16A34A',
    backgroundColor: 'var(--white)',
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },

  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: 'var(--font-size-xl)',
    color: 'var(--text-secondary)'
  },

  // Empty States
  emptyState: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-8)',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-sm)',
    minWidth: '220px',
    border: '1px solid var(--border-light)'
  },
  emptyStateIcon: {
    fontSize: 'var(--font-size-4xl)',
    marginBottom: 'var(--space-3)'
  },
  emptyStateSubtext: {
    fontSize: 'var(--font-size-xs)',
    margin: 'var(--space-1) 0 var(--space-4) 0',
    color: 'var(--text-tertiary)'
  },
  emptyStateButton: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3) var(--space-4)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    marginTop: 'var(--space-3)',
    transition: 'var(--transition-fast)'
  },
  emptyStateSmall: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-xs)',
    padding: 'var(--space-5)'
  },
  emptyStateFullWidth: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-8)',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-sm)',
    width: '100%',
    border: '1px solid var(--border-light)',
    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
  },
  emptyStateTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: 'var(--space-3) 0 var(--space-2) 0'
  },

  // Child Actions
  childActions: {
    display: 'flex',
    gap: 'var(--space-2)',
    marginTop: 'var(--space-3)'
  },
  childActionButton: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    flex: 1,
    transition: 'var(--transition-fast)'
  },
  childActionButtonSecondary: {
    backgroundColor: 'transparent',
    color: 'var(--primary-purple)',
    border: '1px solid var(--primary-purple)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    flex: 1,
    transition: 'var(--transition-fast)'
  },

  // Reminder Card
  reminderCard: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-5)',
    marginTop: 'var(--space-5)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border-light)'
  },
  reminderIcon: {
    fontSize: 'var(--font-size-2xl)'
  },
  reminderText: {
    flex: 1,
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-primary)',
    fontWeight: 'var(--font-weight-medium)'
  },
  reminderButton: {
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

  // Invitation Popup Styles
  inviteOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  inviteModal: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  inviteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 24px 0 24px',
    borderBottom: '1px solid var(--border-light)',
    marginBottom: '24px'
  },
  inviteTitle: {
    margin: 0,
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--text-primary)'
  },
  inviteCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background 0.2s ease'
  },
  inviteContent: {
    padding: '0 24px 24px 24px'
  },
  inviteDescription: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--text-secondary)',
    marginBottom: '24px',
    lineHeight: 'var(--line-height-relaxed)'
  },
  inviteCodeContainer: {
    backgroundColor: '#f0f9ff',
    border: '2px dashed var(--primary-purple)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    textAlign: 'center',
    marginBottom: '24px'
  },
  inviteCodeLabel: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  inviteCode: {
    fontSize: '32px',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--primary-purple)',
    letterSpacing: '0.1em',
    fontFamily: 'monospace',
    marginBottom: '16px'
  },
  copyButton: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '10px 20px',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  inviteInstructions: {
    marginBottom: '24px'
  },
  inviteSubtitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    marginBottom: '12px'
  },
  inviteList: {
    paddingLeft: '20px',
    margin: 0,
    color: 'var(--text-secondary)',
    lineHeight: 'var(--line-height-relaxed)'
  },
  inviteNote: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    fontSize: 'var(--font-size-sm)',
    color: '#92400e',
    lineHeight: 'var(--line-height-relaxed)'
  },

  // Activities Preview Styles
  activitiesPreview: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    border: '1px solid var(--border-light)'
  },
  activitiesDescription: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    lineHeight: 'var(--line-height-relaxed)',
    margin: '0 0 var(--space-4) 0'
  },
  activitiesFeatures: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--space-3)'
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-primary)'
  },
  featureIcon: {
    fontSize: 'var(--font-size-lg)',
    width: '24px',
    textAlign: 'center'
  }
};

export default Dashboard;