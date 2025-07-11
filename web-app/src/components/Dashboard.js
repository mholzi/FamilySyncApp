import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useFamily } from '../hooks/useFamily';
import { useTasks } from '../hooks/useTasks';
import { useCalendar } from '../hooks/useCalendar';
import { useShopping } from '../hooks/useShopping';
import { getTodaysHouseholdTodos, autoResetCompletedTasks } from '../utils/householdTodosUtils';
import { DashboardStates, getDashboardState } from '../utils/dashboardStates';
import { cleanupOldFamilyNotes } from '../utils/notesCleanup';

// Import Material Design 3 components
import { Card, Typography, Button, FAB, ThemeToggle } from './MD3';

// Import existing components (will be converted gradually)
import SimpleTodoCard from './HouseholdTodos/SimpleTodoCard';
import AddTodo from './HouseholdTodos/AddTodo';
import DashboardWelcome from './DashboardWelcome';
import AddChildFlow from './AddChild/AddChildFlow';
import CalendarPage from '../pages/CalendarPage';
import ShoppingListPage from '../pages/ShoppingListPage';
import ProfileIcon from './Profile/ProfileIcon';
import ProfilePage from './Profile/ProfilePage';
import SettingsPage from './Profile/SettingsPage';
import BottomNavigation from './BottomNavigation';
import FamilyNotesList from './Notes/FamilyNotesList';
import EnhancedChildCard from './Children/EnhancedChildCard';
import UpcomingEventsForMe from './Dashboard/UpcomingEventsForMe';
import ShoppingListTaskCard from './Shopping/ShoppingListTaskCard';
import { FamilyManagement } from './FamilyManagement';
import MessagesPage from './Messages/MessagesPage';
import NotificationBell from './NotificationBell/NotificationBell';

function Dashboard({ user }) {
  const [currentView, setCurrentView] = useState('dashboard');

  // Use custom hooks to fetch data
  const { userData, familyData, children, loading: familyLoading } = useFamily(user.uid);
  const { tasks, loading: tasksLoading } = useTasks(userData?.familyId, user.uid);
  const { events, loading: eventsLoading } = useCalendar(userData?.familyId, user.uid);
  const { shoppingLists, loading: shoppingLoading } = useShopping(currentView === 'dashboard' ? userData?.familyId : null);

  // Memoize filtered shopping lists with null checks
  const activeShoppingLists = useMemo(() => {
    if (!shoppingLists || !Array.isArray(shoppingLists)) return [];
    return shoppingLists.filter(list => !list.isArchived && list.status !== 'paid-out' && list.status !== 'needs-approval');
  }, [shoppingLists]);

  // Filter shopping lists for today's tasks
  const todayShoppingLists = useMemo(() => {
    const today = new Date();
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return activeShoppingLists.filter(list => {
      if (!list.scheduledFor && !list.scheduledOption) return true;
      if (list.scheduledOption === 'this-week') return true;
      
      if (list.scheduledFor) {
        const scheduledDate = new Date(list.scheduledFor);
        const scheduleDay = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
        return scheduleDay <= todayDay;
      }
      
      return true;
    });
  }, [activeShoppingLists]);

  // State management
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [householdTodos, setHouseholdTodos] = useState([]);
  const [todosLoading, setTodosLoading] = useState(true);
  const [recurringActivities, setRecurringActivities] = useState([]);
  const [unansweredQuestionsCount, setUnansweredQuestionsCount] = useState(0);
  const [messagesUnreadCount, setMessagesUnreadCount] = useState(0);

  // Only show loading on initial load, not when switching views
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const loading = !hasInitiallyLoaded && (familyLoading || tasksLoading || eventsLoading || shoppingLoading || todosLoading);
  
  // Mark as initially loaded once all data is fetched
  useEffect(() => {
    if (!familyLoading && !tasksLoading && !eventsLoading && !shoppingLoading && !todosLoading) {
      setHasInitiallyLoaded(true);
    }
  }, [familyLoading, tasksLoading, eventsLoading, shoppingLoading, todosLoading]);

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

  // Auto-reset completed tasks after 24 hours
  useEffect(() => {
    if (!userData?.familyId || userData?.role !== 'parent') return;

    const familyId = userData.familyId;
    autoResetCompletedTasks(familyId);

    const interval = setInterval(() => {
      autoResetCompletedTasks(familyId);
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userData?.familyId, userData?.role]);

  // Cleanup old family notes on component mount
  useEffect(() => {
    if (!userData?.familyId) return;

    // Run cleanup on mount
    cleanupOldFamilyNotes(userData.familyId);

    // Run cleanup every hour
    const interval = setInterval(() => {
      cleanupOldFamilyNotes(userData.familyId);
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userData?.familyId]);

  // Set up global function to update messages unread count
  useEffect(() => {
    window.updateMessagesUnreadCount = (count) => {
      setMessagesUnreadCount(count);
    };
    
    return () => {
      delete window.updateMessagesUnreadCount;
    };
  }, []);

  // Fetch recurring activities
  useEffect(() => {
    if (!userData?.familyId) return;

    let unsubscribe = null;

    try {
      const activitiesQuery = query(
        collection(db, 'recurringActivities'),
        where('familyId', '==', userData.familyId)
      );

      unsubscribe = onSnapshot(
        activitiesQuery, 
        (snapshot) => {
          const activitiesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setRecurringActivities(activitiesData);
        },
        (error) => {
          console.error('Error fetching recurring activities:', error);
          setRecurringActivities([]);
        }
      );
    } catch (error) {
      console.error('Error setting up recurring activities listener:', error);
      setRecurringActivities([]);
    }

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('Error unsubscribing from recurring activities:', error);
        }
      }
    };
  }, [userData?.familyId]);

  // Determine user role
  const userRole = userData?.role || (familyData?.parentUids?.includes(user.uid) ? 'parent' : 'aupair');

  // Determine dashboard state
  const dashboardState = getDashboardState(
    userData,
    familyData,
    children,
    familyLoading,
    userRole
  );

  // Calculate unanswered questions count from task help requests
  useEffect(() => {
    if (!userData?.familyId) return;

    const unsubscribe = onSnapshot(
      collection(db, 'families', userData.familyId, 'householdTodos'),
      (snapshot) => {
        let count = 0;
        
        snapshot.docs.forEach(doc => {
          const taskData = doc.data();
          
          // Count unanswered questions from help requests
          if (taskData.helpRequests?.length > 0) {
            taskData.helpRequests.forEach((request) => {
              if (request.message?.trim().endsWith('?') && !request.response) {
                count++;
              }
            });
          }
        });
        
        setUnansweredQuestionsCount(count);
      }
    );

    return () => unsubscribe();
  }, [userData?.familyId]);

  // Handle navigation
  const handleProfileNavigation = (view) => {
    setCurrentView(view);
  };

  const handleAddTodo = () => {
    setShowAddTodo(true);
  };

  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
    setShowAddTodo(true);
  };

  const handleCloseTodo = () => {
    setShowAddTodo(false);
    setEditingTodo(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="md3-container md3-flex md3-flex-center" style={{ minHeight: '100vh' }}>
        <Card elevation={1} className="md3-p-24">
          <div className="md3-flex md3-flex-column md3-flex-center md3-gap-16">
            <FAB>
              <span className="md3-title-large">F</span>
            </FAB>
            <Typography variant="headline-small" color="primary">
              Loading FamilySync...
            </Typography>
            <div className="md3-progress w-full">
              <div className="md3-progress-bar" style={{ width: '70%' }}></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Handle special states that don't need bottom navigation
  if (dashboardState === DashboardStates.WELCOME) {
    return (
      <DashboardWelcome 
        user={user}
        userData={userData}
        onNavigate={setCurrentView}
      />
    );
  }

  if (dashboardState === DashboardStates.SETUP_CHILDREN) {
    return (
      <AddChildFlow 
        user={user}
        userData={userData}
        onSave={() => setCurrentView('dashboard')}
        onCancel={() => setCurrentView('dashboard')}
      />
    );
  }

  // Handle different view states with bottom navigation
  if (currentView === 'profile') {
    return (
      <div className="md3-container md3-flex md3-flex-column" style={{ minHeight: '100vh' }}>
        <ProfilePage 
          user={user}
          userData={userData}
          onNavigate={handleProfileNavigation}
        />
        <BottomNavigation 
          currentView={currentView}
          onNavigate={setCurrentView}
          unansweredQuestionsCount={unansweredQuestionsCount}
        />
      </div>
    );
  }

  if (currentView === 'family') {
    return (
      <div className="md3-container md3-flex md3-flex-column" style={{ minHeight: '100vh' }}>
        <FamilyManagement 
          user={user}
          onBack={() => setCurrentView('dashboard')}
        />
        <BottomNavigation 
          currentView={currentView}
          onNavigate={setCurrentView}
          unansweredQuestionsCount={unansweredQuestionsCount}
        />
      </div>
    );
  }

  if (currentView === 'calendar') {
    return (
      <div className="md3-container md3-flex md3-flex-column" style={{ minHeight: '100vh' }}>
        <CalendarPage 
          user={user}
          userData={userData}
          familyData={familyData}
          children={children}
          recurringActivities={recurringActivities}
          onNavigate={setCurrentView}
        />
        <BottomNavigation 
          currentView={currentView}
          onNavigate={setCurrentView}
          unansweredQuestionsCount={unansweredQuestionsCount}
        />
      </div>
    );
  }

  if (currentView === 'shopping') {
    return (
      <div className="md3-container md3-flex md3-flex-column" style={{ minHeight: '100vh' }}>
        <ShoppingListPage 
          user={user}
          userData={userData}
          onNavigate={setCurrentView}
        />
        <BottomNavigation 
          currentView={currentView}
          onNavigate={setCurrentView}
          unansweredQuestionsCount={unansweredQuestionsCount}
        />
      </div>
    );
  }

  if (currentView === 'settings') {
    return (
      <div className="md3-container md3-flex md3-flex-column" style={{ minHeight: '100vh' }}>
        <SettingsPage 
          user={user}
          onBack={() => setCurrentView('dashboard')}
        />
        <BottomNavigation 
          currentView={currentView}
          onNavigate={setCurrentView}
          unansweredQuestionsCount={unansweredQuestionsCount}
        />
      </div>
    );
  }

  if (currentView === 'messages') {
    return (
      <div className="md3-container md3-flex md3-flex-column" style={{ minHeight: '100vh' }}>
        <div style={{ 
          flex: 1, 
          overflowY: 'auto'
        }}>
          <MessagesPage 
          />
        </div>
        <BottomNavigation 
          currentView={currentView}
          onNavigate={setCurrentView}
          unansweredQuestionsCount={unansweredQuestionsCount}
        />
      </div>
    );
  }

  // Main Dashboard Layout
  return (
    <div className="md3-container md3-flex md3-flex-column" style={{ minHeight: '100vh' }}>
      <style>{`
        .task-cards-container::-webkit-scrollbar {
          height: 6px;
        }
        .task-cards-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .task-cards-container::-webkit-scrollbar-thumb {
          background: var(--md-sys-color-outline-variant);
          border-radius: 3px;
        }
        .task-cards-container::-webkit-scrollbar-thumb:hover {
          background: var(--md-sys-color-outline);
        }
        @media (max-width: 768px) {
          .task-cards-container {
            scroll-padding-left: 16px;
          }
          .task-cards-container::-webkit-scrollbar {
            display: none;
          }
        }
      `}</style>
      {/* Header */}
      <header className="md3-surface-container md3-elevation-2 md3-p-9">
        <div className="md3-flex md3-flex-between md3-flex-center">
          <div className="md3-flex md3-flex-center md3-gap-12">
            <Button variant="text" onClick={() => window.history.length > 1 ? window.history.back() : setCurrentView('dashboard')}>
              ←
            </Button>
            <Typography variant="headline-small" color="on-surface">
              {familyData?.name || 'FamilySync'}
            </Typography>
          </div>
          
          <div className="md3-flex md3-flex-center md3-gap-8">
            <NotificationBell />
            <ThemeToggle />
            <ProfileIcon 
              user={user}
              userData={userData}
              onNavigate={handleProfileNavigation}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="md3-flex-1 md3-p-16" style={{ paddingBottom: '100px' }}>
        {/* Tasks & Shopping Section */}
        <section className="md3-mb-24">
          <div className="md3-flex md3-flex-between md3-flex-center md3-mb-16">
            <Typography variant="headline-small" color="on-surface">
              {userRole === 'parent' 
                ? 'Tasks & Shopping for Au Pair' 
                : 'Your Daily Contributions'
              }
            </Typography>
            {userRole === 'parent' && (
              <Button variant="filled" onClick={handleAddTodo}>
                Add Task
              </Button>
            )}
          </div>

          <div 
            className="task-cards-container"
            style={{
              display: 'flex',
              gap: '12px',
              overflowX: 'auto',
              paddingBottom: '8px',
              marginLeft: '-16px',
              marginRight: '-16px',
              paddingLeft: '16px',
              paddingRight: '16px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--md-sys-color-outline-variant) transparent',
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: 'x mandatory'
            }}
          >
            {/* Shopping List Task Cards */}
            {todayShoppingLists.map((list) => (
              <div key={`shopping-${list.id}`} style={{ 
                flex: '0 0 calc(70vw - 24px)', 
                maxWidth: '320px',
                scrollSnapAlign: 'start'
              }}>
                <ShoppingListTaskCard
                  list={list}
                  onNavigate={setCurrentView}
                />
              </div>
            ))}
            
            {/* Household Todo Cards */}
            {householdTodos.length === 0 && todayShoppingLists.length === 0 ? (
              <Card variant="outlined" className="md3-p-24" style={{ 
                flex: '1 1 100%',
                width: '100%'
              }}>
                <div className="md3-flex md3-flex-column md3-flex-center md3-gap-16">
                  <Typography variant="title-medium" color="on-surface-variant">
                    No tasks for today
                  </Typography>
                  <Typography variant="body-medium" color="on-surface-variant">
                    {userRole === 'parent' 
                      ? 'Add tasks for your au pair to help with daily activities.'
                      : 'Great job! You\'re all caught up with your daily contributions.'
                    }
                  </Typography>
                </div>
              </Card>
            ) : (
              householdTodos.map((todo) => (
                <div key={todo.id} style={{ 
                  flex: '0 0 calc(70vw - 24px)', 
                  maxWidth: '320px',
                  scrollSnapAlign: 'start'
                }}>
                  <SimpleTodoCard
                    todo={todo}
                    onEdit={handleEditTodo}
                    userRole={userRole}
                    familyId={userData?.familyId}
                    userId={user?.uid}
                  />
                </div>
              ))
            )}
          </div>
        </section>

        {/* Children Section */}
        {children && Array.isArray(children) && children.length > 0 && (
          <section className="md3-mb-24">
            <div className="md3-flex md3-flex-between md3-flex-center md3-mb-16">
              <Typography variant="headline-small" color="on-surface">
                Children
              </Typography>
              {userRole === 'parent' && (
                <Button variant="outlined" onClick={() => setIsAddingChild(true)}>
                  Add Child
                </Button>
              )}
            </div>

            <div className="md3-flex md3-gap-12" style={{ 
              overflowX: 'auto', 
              paddingBottom: 'var(--md-sys-motion-duration-short3)',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--md-sys-color-outline-variant) transparent'
            }}>
              {children.map((child) => (
                <EnhancedChildCard
                  key={child.id}
                  child={child}
                  onEditChild={setEditingChild}
                  userRole={userRole}
                  recurringActivities={recurringActivities}
                  calendarEvents={events}
                />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events Section */}
        <section className="md3-mb-24">
          <UpcomingEventsForMe 
            children={children}
            userRole={userRole}
            activities={events}
            familyId={userData?.familyId}
            userId={user?.uid}
            maxEvents={15}
            recurringActivities={recurringActivities}
            onNavigate={setCurrentView}
          />
        </section>

        {/* Family Notes Section */}
        <section className="md3-mb-24">
          <FamilyNotesList 
            familyId={userData?.familyId}
            userId={user.uid}
            userRole={userRole}
            userData={userData}
            familyData={familyData}
            maxDisplayed={4}
          />
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentView={currentView}
        onNavigate={setCurrentView}
        messagesUnreadCount={messagesUnreadCount}
      />


      {/* Modals */}
      {showAddTodo && (
        <AddTodo
          familyId={userData?.familyId}
          userId={user?.uid}
          editTodo={editingTodo}
          onClose={handleCloseTodo}
          onSuccess={() => {
            handleCloseTodo();
            // Refresh todos will happen automatically via the listener
          }}
        />
      )}

      {isAddingChild && (
        <AddChildFlow
          user={user}
          userData={userData}
          familyId={userData?.familyId}
          onComplete={() => setIsAddingChild(false)}
          onCancel={() => setIsAddingChild(false)}
        />
      )}

      {editingChild && (
        <AddChildFlow
          user={user}
          userData={userData}
          familyId={userData?.familyId}
          editingChild={editingChild}
          onComplete={() => setEditingChild(null)}
          onCancel={() => setEditingChild(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;