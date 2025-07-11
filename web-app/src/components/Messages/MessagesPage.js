import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, serverTimestamp, updateDoc, arrayUnion, orderBy, deleteDoc } from 'firebase/firestore';
import { useFamily } from '../../hooks/useFamily';
import DirectMessageChat from './DirectMessageChat';
import { cleanupOldFamilyNotes } from '../../utils/notesCleanup';
import './MessagesPage.css';

const MessagesPage = () => {
  const [user] = useAuthState(auth);
  const { familyData: family, loading: familyLoading } = useFamily(user?.uid);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [familyNotes, setFamilyNotes] = useState([]);
  const [taskComments, setTaskComments] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [viewedMessagesTimestamp, setViewedMessagesTimestamp] = useState(null);
  const [newThreshold, setNewThreshold] = useState(Date.now());
  const [familyChatUnreadCount, setFamilyChatUnreadCount] = useState(0);
  
  // Performance optimization: Pagination
  const [visibleMessageCount, setVisibleMessageCount] = useState(20);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  
  
  // First-time help/onboarding
  const [showOnboardingHelp, setShowOnboardingHelp] = useState(false);

  // Debounced search for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-remove NEW indicators after 3 seconds
  useEffect(() => {
    // Set the timestamp when the component mounts
    if (!viewedMessagesTimestamp) {
      setViewedMessagesTimestamp(Date.now());
    }

    // After 3 seconds, update the new threshold to hide NEW indicators
    const timer = setTimeout(() => {
      setNewThreshold(Date.now() - (3 * 1000)); // 3 seconds ago
    }, 3000);

    return () => clearTimeout(timer);
  }, [viewedMessagesTimestamp]);

  // Check if this is the first time visiting Messages (for parents)
  useEffect(() => {
    if (user?.uid && family?.id) {
      const hasSeenOnboarding = localStorage.getItem(`messages-onboarding-${user.uid}`);
      if (!hasSeenOnboarding) {
        // Show onboarding help after a short delay
        const timer = setTimeout(() => {
          setShowOnboardingHelp(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [user?.uid, family?.id]);

  // Cleanup old family notes on component mount
  useEffect(() => {
    if (!family?.id) return;

    // Run cleanup on mount
    cleanupOldFamilyNotes(family.id);

    // Run cleanup every hour
    const interval = setInterval(() => {
      cleanupOldFamilyNotes(family.id);
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [family?.id]);

  // Fetch family notes
  useEffect(() => {
    if (!family?.id) return;

    const notesQuery = query(
      collection(db, 'families', family.id, 'notes'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      notesQuery,
      async (snapshot) => {
        const notes = await Promise.all(snapshot.docs.map(async (noteDoc) => {
          const noteData = noteDoc.data();
          let authorName = 'Unknown';
          
          // Fetch author name if createdBy exists
          if (noteData.createdBy) {
            try {
              const userDoc = await getDoc(doc(db, 'users', noteData.createdBy));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                // Use the profile name field, fallback to displayName, then email
                authorName = userData.name || userData.displayName || userData.email || 'Unknown';
              }
            } catch (error) {
              console.error('Error fetching author for note:', error);
            }
          }
          
          return {
            id: noteDoc.id,
            type: 'note',
            ...noteData,
            authorName,
            authorId: noteData.createdBy,
            comments: noteData.comments || []
          };
        }));
        setFamilyNotes(notes);
      }
    );

    return () => unsubscribe();
  }, [family?.id]);

  // Fetch task comments
  useEffect(() => {
    if (!family?.id) return;

    const unsubscribe = onSnapshot(
      collection(db, 'families', family.id, 'householdTodos'),
      async (snapshot) => {
        const commentsData = [];
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000); // 3 days in milliseconds
        
        for (const doc of snapshot.docs) {
          const taskData = doc.data();
          
          // Check if task was completed more than 3 days ago
          const isOldCompletedTask = taskData.isCompleted && 
            taskData.completedAt && 
            taskData.completedAt.toMillis() < threeDaysAgo;
          
          // Skip messages from tasks completed more than 3 days ago
          if (isOldCompletedTask) {
            continue;
          }
          
          // Skip completed and confirmed tasks entirely
          if (taskData.isCompleted || taskData.status === 'confirmed') {
            continue;
          }
          
          // Extract comments from help requests - consolidate by task
          if (taskData.helpRequests?.length > 0) {
            // Create a single message card for this task with all comments
            const taskMessages = taskData.helpRequests.map(request => ({
              id: request.id,
              message: request.message,
              authorId: request.requestedBy,
              authorName: request.requestedByName,
              authorRole: request.authorRole || 'aupair',
              timestamp: request.timestamp,
              isQuestion: request.message.trim().endsWith('?'),
              hasResponse: !!request.response,
              response: request.response,
              responseBy: request.responseBy,
              responseAt: request.responseAt,
              responseAuthorName: request.responseAuthorName
            }));
            
            // Check if any message is an unanswered question
            const hasUnansweredQuestion = taskMessages.some(msg => msg.isQuestion && !msg.hasResponse);
            
            commentsData.push({
              id: `${doc.id}_consolidated`,
              type: 'task',
              taskId: doc.id,
              taskTitle: taskData.title,
              taskDescription: taskData.description,
              taskCategory: taskData.category,
              taskDueDate: taskData.dueDate,
              taskCompleted: taskData.isCompleted,
              taskCompletedAt: taskData.completedAt,
              taskMessages: taskMessages, // All messages for this task
              hasUnansweredQuestion: hasUnansweredQuestion,
              // Use the most recent message timestamp
              timestamp: taskMessages.reduce((latest, msg) => 
                (!latest || (msg.timestamp && msg.timestamp > latest)) ? msg.timestamp : latest, 
                null
              ),
              // For the main display, show the latest message
              message: taskMessages[taskMessages.length - 1]?.message || '',
              authorName: taskMessages[taskMessages.length - 1]?.authorName || 'Unknown',
              authorRole: taskMessages[taskMessages.length - 1]?.authorRole || 'aupair'
            });
          }

          // Skip completion notes since we're excluding completed tasks
        }
        
        setTaskComments(commentsData);
      }
    );

    return () => unsubscribe();
  }, [family?.id]);

  // Fetch family members
  useEffect(() => {
    if (!family?.id) return;

    const fetchFamilyMembers = async () => {
      const members = [];
      
      // Fetch all family members
      if (family.members) {
        for (const memberId of family.members) {
          const memberDoc = await getDoc(doc(db, 'users', memberId));
          if (memberDoc.exists() && memberId !== user?.uid) {
            const memberData = memberDoc.data();
            members.push({ 
              id: memberId, 
              ...memberData,
              // Ensure we have the friendly name
              displayName: memberData.name || memberData.displayName || memberData.email
            });
          }
        }
      }
      
      setFamilyMembers(members);
    };
    
    fetchFamilyMembers();
  }, [family?.id, user?.uid]);

  // Fetch conversations
  useEffect(() => {
    if (!user?.uid) return;

    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(conversationsQuery, async (snapshot) => {
      const conversationsData = [];
      
      for (const doc of snapshot.docs) {
        const convData = doc.data();
        
        // Get other participant info
        const otherUserId = convData.participants.find(id => id !== user.uid);
        let otherUser = null;
        
        if (otherUserId) {
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            otherUser = { 
              id: otherUserId, 
              ...userData,
              // Ensure we have the friendly name
              displayName: userData.name || userData.displayName || userData.email
            };
          }
        }
        
        conversationsData.push({
          id: doc.id,
          type: 'chat',
          ...convData,
          otherUser
        });
      }
      
      setConversations(conversationsData);
      setDirectMessages(conversationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Fetch family chat unread count
  useEffect(() => {
    if (!user?.uid || !family?.id) return;

    // Subscribe to family chat messages
    const messagesQuery = query(
      collection(db, 'conversations', 'family-chat', 'messages'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      // Count messages that are:
      // 1. Not authored by current user
      // 2. Not seen by current user
      let unreadCount = 0;
      
      snapshot.docs.forEach(doc => {
        const messageData = doc.data();
        if (messageData.authorId !== user.uid && 
            (!messageData.seenBy || !messageData.seenBy.includes(user.uid))) {
          unreadCount++;
        }
      });
      
      setFamilyChatUnreadCount(unreadCount);
    });

    return () => unsubscribe();
  }, [user?.uid, family?.id]);

  // Calculate unanswered questions count
  const unansweredQuestionsCount = useMemo(() => {
    return taskComments.filter(comment => 
      comment.hasUnansweredQuestion || (comment.isQuestion && !comment.hasResponse)
    ).length;
  }, [taskComments]);

  // Calculate total unread count for bottom navigation
  const totalUnreadCount = useMemo(() => {
    // Count unread family chat messages
    let total = familyChatUnreadCount;
    
    // Count unread direct messages
    directMessages.forEach(conv => {
      if (conv.lastMessageBy && conv.lastMessageBy !== user?.uid && 
          (!conv.seenBy || !conv.seenBy.includes(user?.uid))) {
        total++;
      }
    });
    
    // Count unread family notes (notes without readBy including current user)
    familyNotes.forEach(note => {
      if (note.authorId !== user?.uid && 
          (!note.readBy || !note.readBy.includes(user?.uid))) {
        total++;
      }
    });
    
    // Count unanswered questions in tasks
    total += unansweredQuestionsCount;
    
    return total;
  }, [familyChatUnreadCount, directMessages, familyNotes, unansweredQuestionsCount, user?.uid]);

  // Export the total unread count so it can be used in parent components
  useEffect(() => {
    if (window.updateMessagesUnreadCount) {
      window.updateMessagesUnreadCount(totalUnreadCount);
    }
  }, [totalUnreadCount]);


  // Mark messages as read when user views them - memoized for performance
  const markAsRead = useCallback(async (messageId, messageType) => {
    if (!user?.uid) return;
    
    try {
      if (messageType === 'note') {
        // Mark family note as read  
        await updateDoc(doc(db, 'families', family.id, 'notes', messageId), {
          readBy: arrayUnion(user.uid)
        });
      } else if (messageType === 'task') {
        // For task comments, we'll need to update the specific comment in the helpRequests array
        // This is more complex as it requires finding the specific task and comment
        console.log('Marking task comment as read:', messageId);
        // TODO: Implement task comment read status if needed
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, [user?.uid, family?.id]);

  // Smart ordering and filtering
  const filteredAndSortedMessages = useMemo(() => {
    let allMessages = [];

    // Combine all messages based on filter
    if (filter === 'all' || filter === 'notes') {
      allMessages = [...allMessages, ...familyNotes];
    }
    if (filter === 'all' || filter === 'tasks') {
      allMessages = [...allMessages, ...taskComments];
    }
    if (filter === 'all' || filter === 'chats') {
      allMessages = [...allMessages, ...directMessages];
    }

    // Apply search filter using debounced query
    if (debouncedSearchQuery) {
      allMessages = allMessages.filter(msg => 
        msg.message?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        msg.content?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        msg.taskTitle?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    // Sort: Unanswered questions first, then by timestamp
    allMessages.sort((a, b) => {
      // Unanswered questions always come first
      if (a.isQuestion && !a.hasResponse && !(b.isQuestion && !b.hasResponse)) return -1;
      if (b.isQuestion && !b.hasResponse && !(a.isQuestion && !a.hasResponse)) return 1;
      
      // Then sort by timestamp (newest first)
      // Handle both timestamp (task comments) and createdAt (family notes) fields
      const aTime = (a.timestamp?.toMillis && a.timestamp.toMillis()) || 
                    (a.createdAt?.toMillis && a.createdAt.toMillis()) || 0;
      const bTime = (b.timestamp?.toMillis && b.timestamp.toMillis()) || 
                    (b.createdAt?.toMillis && b.createdAt.toMillis()) || 0;
      return bTime - aTime;
    });

    // Update hasMoreMessages state
    setHasMoreMessages(allMessages.length > visibleMessageCount);
    
    return allMessages;
  }, [filter, debouncedSearchQuery, familyNotes, taskComments, directMessages, visibleMessageCount]);

  // Get visible messages for rendering (performance optimization)
  const visibleMessages = useMemo(() => {
    return filteredAndSortedMessages.slice(0, visibleMessageCount);
  }, [filteredAndSortedMessages, visibleMessageCount]);

  // Load more messages function
  const loadMoreMessages = useCallback(() => {
    setVisibleMessageCount(prev => prev + 20);
  }, []);


  // Start a new conversation
  const startConversation = async (otherUserId) => {
    // Check if conversation already exists
    const existingConv = conversations.find(conv => 
      conv.participants.includes(otherUserId)
    );

    if (existingConv) {
      setSelectedConversation(existingConv);
      setShowNewMessageModal(false);
      return;
    }

    // Create new conversation
    try {
      const conversationData = {
        participants: [user.uid, otherUserId],
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        lastMessageBy: null,
        type: 'direct' // Can be 'direct' or 'family'
      };

      const conversationRef = doc(collection(db, 'conversations'));
      await setDoc(conversationRef, conversationData);

      // Get the created conversation
      const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
      const otherUser = otherUserDoc.exists() ? { id: otherUserId, ...otherUserDoc.data() } : null;

      setSelectedConversation({
        id: conversationRef.id,
        ...conversationData,
        otherUser
      });
      setShowNewMessageModal(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  // Handle family chat
  const openFamilyChat = () => {
    setSelectedConversation({
      id: 'family-chat',
      type: 'family',
      participants: family?.members || [],
      isFamilyChat: true
    });
    // Reset unread count when opening chat
    setFamilyChatUnreadCount(0);
  };

  if (familyLoading || loading) {
    return (
      <div className="messages-loading">
        <div className="loading-spinner"></div>
        <p>Loading messages...</p>
      </div>
    );
  }

  // Show chat view if conversation is selected
  if (selectedConversation) {
    return (
      <DirectMessageChat
        conversationId={selectedConversation.id}
        participants={selectedConversation.participants}
        currentUserId={user?.uid}
        onBack={() => setSelectedConversation(null)}
      />
    );
  }

  return (
    <div className="messages-page">
      <div className="messages-header">
        <div className="messages-header-left">
          <h1 className="messages-title">Messages</h1>
          {unansweredQuestionsCount > 0 && (
            <div className="unanswered-badge">
              {unansweredQuestionsCount} unanswered
            </div>
          )}
        </div>
        <button 
          className="new-message-btn"
          onClick={() => setShowNewMessageModal(true)}
          title="Start new conversation"
        >
          +
        </button>
      </div>

      <div className="messages-controls">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-container">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'notes' ? 'active' : ''}`}
            onClick={() => setFilter('notes')}
          >
            Notes
          </button>
          <button
            className={`filter-btn ${filter === 'tasks' ? 'active' : ''}`}
            onClick={() => setFilter('tasks')}
          >
            Tasks
          </button>
          <button
            className={`filter-btn ${filter === 'chats' ? 'active' : ''}`}
            onClick={() => setFilter('chats')}
          >
            Chats
          </button>
        </div>
      </div>

      {/* Family Chat Button */}
      <button className="family-chat-btn" onClick={openFamilyChat}>
        <span className="family-chat-icon">👨‍👩‍👧‍👦</span>
        <span className="family-chat-text">Family Chat</span>
        <div className="family-chat-right">
          {familyChatUnreadCount > 0 && (
            <span className="family-chat-unread-badge">
              {familyChatUnreadCount > 99 ? '99+' : familyChatUnreadCount}
            </span>
          )}
          <span className="family-chat-arrow">→</span>
        </div>
      </button>

      <div className="messages-list">
        {filteredAndSortedMessages.length === 0 ? (
          <div className="no-messages">
            <p>No messages found</p>
          </div>
        ) : (
          <>
            {visibleMessages.map((message) => (
              <MessageCard 
                key={message.id} 
                message={message}
                currentUserId={user?.uid}
                family={family}
                newThreshold={newThreshold}
                onClick={message.type === 'chat' ? () => {
                  setSelectedConversation(message);
                } : { markAsRead }}
              />
            ))}
            
            {/* Load More Button */}
            {hasMoreMessages && (
              <div className="load-more-container">
                <button 
                  className="load-more-btn"
                  onClick={loadMoreMessages}
                >
                  Load More Messages ({filteredAndSortedMessages.length - visibleMessageCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="new-message-modal-overlay" onClick={() => setShowNewMessageModal(false)}>
          <div className="new-message-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Start New Conversation</h3>
              <button className="modal-close" onClick={() => setShowNewMessageModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <p className="modal-subtitle">Select a family member to message:</p>
              <div className="member-list">
                {familyMembers.map((member) => (
                  <button
                    key={member.id}
                    className="member-item"
                    onClick={() => startConversation(member.id)}
                  >
                    <div className="member-avatar">
                      {member.displayName?.[0] || member.email?.[0] || '?'}
                    </div>
                    <div className="member-info">
                      <p className="member-name">{member.displayName || member.email}</p>
                      <p className="member-role">{member.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Help Modal */}
      {showOnboardingHelp && (
        <div className="onboarding-overlay" onClick={() => setShowOnboardingHelp(false)}>
          <div className="onboarding-modal" onClick={(e) => e.stopPropagation()}>
            <div className="onboarding-header">
              <h3>🎉 Welcome to Messages!</h3>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowOnboardingHelp(false);
                  localStorage.setItem(`messages-onboarding-${user?.uid}`, 'true');
                }}
              >
                ×
              </button>
            </div>
            <div className="onboarding-content">
              <p className="onboarding-intro">
                Your family communication is now unified in one place! Here's what you can do:
              </p>
              
              <div className="onboarding-features">
                <div className="feature-item">
                  <span className="feature-icon">💬</span>
                  <div className="feature-text">
                    <strong>All Messages Together</strong>
                    <p>Family notes, task comments, and direct messages in one place</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <span className="feature-icon">🟡</span>
                  <div className="feature-text">
                    <strong>Never Miss Questions</strong>
                    <p>Unanswered au pair questions appear first with yellow highlighting</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <span className="feature-icon">📋</span>
                  <div className="feature-text">
                    <strong>Task Context</strong>
                    <p>Tap task messages to see full task details</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <span className="feature-icon">🔍</span>
                  <div className="feature-text">
                    <strong>Smart Filters</strong>
                    <p>Filter by Notes, Tasks, or Chats to find what you need</p>
                  </div>
                </div>
              </div>
              
              <div className="onboarding-actions">
                <button 
                  className="onboarding-btn primary"
                  onClick={() => {
                    setShowOnboardingHelp(false);
                    localStorage.setItem(`messages-onboarding-${user?.uid}`, 'true');
                  }}
                >
                  Got it! 👍
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get friendly name
const getFriendlyName = (authorName) => {
  if (!authorName) return 'Unknown';
  
  // If it's an email, extract the part before @
  if (authorName.includes('@')) {
    return authorName.split('@')[0];
  }
  
  // If it has spaces, return the first name
  if (authorName.includes(' ')) {
    return authorName.split(' ')[0];
  }
  
  // Otherwise return as is
  return authorName;
};

// Message Card Component - Memoized for performance
const MessageCard = React.memo(({ message, onClick, currentUserId, family, newThreshold }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isUnansweredQuestion = message.hasUnansweredQuestion || (message.isQuestion && !message.hasResponse);
  
  // Determine if message is unread by current user
  const isUnread = message.type === 'note' 
    ? (message.readBy ? !message.readBy.includes(currentUserId) : true)
    : (message.seenBy ? !message.seenBy.includes(currentUserId) : false);
  const messageTimestamp = message.timestamp || message.createdAt;
  // Check if message timestamp is after the new threshold
  const messageTime = messageTimestamp?.toMillis ? messageTimestamp.toMillis() : 0;
  const isNewMessage = messageTime > newThreshold;

  const handleCardClick = (e) => {
    if (message.type === 'chat') {
      onClick?.();
    } else if (message.type === 'task') {
      // For task messages, toggle expansion
      e.stopPropagation();
      setIsExpanded(!isExpanded);
      // Mark as read when expanded
      if (!isExpanded && onClick?.markAsRead) {
        onClick.markAsRead(message.id, message.type);
      }
    } else if (message.type === 'note') {
      // For notes, toggle expansion
      e.stopPropagation();
      setIsExpanded(!isExpanded);
      // Mark family notes as read when clicked
      if (onClick?.markAsRead) {
        onClick.markAsRead(message.id, message.type);
      }
    }
  };

  const handleDeleteNote = async (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, 'families', family.id, 'notes', message.id));
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div 
      className={`message-card ${isUnansweredQuestion ? 'unanswered-question' : ''} ${message.type === 'chat' ? 'clickable' : ''} ${(message.type === 'task' || message.type === 'note') ? 'expandable' : ''} ${isUnread ? 'unread' : ''} ${isNewMessage ? 'new-message' : ''}`}
      onClick={handleCardClick}
    >
      {/* Message Type Indicator */}
      <div className="message-type">
        {message.type === 'chat' && <span className="type-icon">💬</span>}
        <span className={`type-label ${message.type === 'task' ? 'type-label-task' : ''}`}>
          {message.type === 'note' && 'Family Note'}
          {message.type === 'task' && 'Task'}
          {message.type === 'chat' && 'Direct Message'}
        </span>
        {message.type === 'task' && (
          <span className="task-title-container">
            <span className="task-title">{message.taskTitle}</span>
            <span className="expand-indicator">
              {isExpanded ? '▼' : '▶'}
            </span>
          </span>
        )}
        {message.type === 'note' && (
          <>
            <span className="expand-indicator" style={{ marginLeft: 'auto', marginRight: '8px' }}>
              {isExpanded ? '▼' : '▶'}
            </span>
            {message.authorId === currentUserId && (
              <button 
                className="note-delete-btn"
                onClick={handleDeleteNote}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--md-sys-color-error)',
                  cursor: 'pointer',
                  padding: '4px',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}
                title="Delete note"
              >
                🗑️
              </button>
            )}
          </>
        )}
      </div>

      {/* Message Content */}
      <div className="message-content">
        {message.type === 'note' ? (
          <>
            {message.authorName && (
              <div className="message-author">
                {getFriendlyName(message.authorName)}
              </div>
            )}
            <p className="message-text">{message.content || message.text || message.message}</p>
            {message.isPinned && <span className="pinned-indicator">📌 Pinned</span>}
            
            {/* Expandable Note Context */}
            {isExpanded && (
              <div className="task-context" onClick={(e) => e.stopPropagation()} style={{ marginTop: '12px' }}>
                {/* Response Box */}
                <div className="task-reply-box">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Add a comment to this note..."
                    className="task-reply-input"
                    rows={3}
                  />
                  <button
                    className="task-reply-button"
                    onClick={async () => {
                      if (!replyText.trim()) return;
                      
                      setIsReplying(true);
                      try {
                        // Get current user data
                        const userDoc = await getDoc(doc(db, 'users', currentUserId));
                        const userData = userDoc.exists() ? userDoc.data() : {};
                        
                        // Create new comment
                        const newComment = {
                          id: `comment_${Date.now()}`,
                          message: replyText.trim(),
                          authorId: currentUserId,
                          authorName: userData.name || userData.displayName || userData.email || 'Unknown',
                          authorRole: userData.role || 'parent',
                          timestamp: new Date()
                        };
                        
                        // Get the note document
                        const noteRef = doc(db, 'families', family.id, 'notes', message.id);
                        const noteDoc = await getDoc(noteRef);
                        
                        if (noteDoc.exists()) {
                          const noteData = noteDoc.data();
                          const currentComments = noteData.comments || [];
                          const updatedComments = [...currentComments, newComment];
                          
                          // Update the note
                          await updateDoc(noteRef, {
                            comments: updatedComments,
                            updatedAt: serverTimestamp()
                          });
                          
                          setReplyText('');
                          // The onSnapshot listener will automatically update the UI
                        }
                      } catch (error) {
                        console.error('Error adding comment:', error);
                        alert('Failed to add comment. Please try again.');
                      } finally {
                        setIsReplying(false);
                      }
                    }}
                    disabled={!replyText.trim() || isReplying}
                  >
                    {isReplying ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>

                {/* Comments Thread */}
                {message.comments && message.comments.length > 0 && (
                  <div className="task-messages-thread">
                    <h4>Comments</h4>
                    {/* Sort comments newest first */}
                    {[...message.comments].sort((a, b) => {
                      const aTime = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.getTime ? a.timestamp.getTime() : 0);
                      const bTime = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.getTime ? b.timestamp.getTime() : 0);
                      return bTime - aTime;
                    }).map((comment, index) => (
                      <div key={comment.id || index} className="task-thread-message">
                        <div className="thread-message-header">
                          <span className="thread-message-author">
                            {getFriendlyName(comment.authorName)}
                          </span>
                          <span className="thread-message-time">
                            {comment.timestamp?.toDate ? comment.timestamp.toDate().toLocaleString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            }) : (comment.timestamp?.toLocaleString ? comment.timestamp.toLocaleString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            }) : 'Recently')}
                          </span>
                        </div>
                        <p className="thread-message-text">{comment.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : message.type === 'chat' ? (
          <>
            <div className="message-author">
              {getFriendlyName(message.otherUser?.displayName || message.otherUser?.email)}
            </div>
            <p className="message-text">
              {message.lastMessage || 'Start a conversation...'}
            </p>
          </>
        ) : (
          <>
            <p className="message-text">{message.message}</p>
            {isUnansweredQuestion && (
              <div className="awaiting-response">Awaiting response...</div>
            )}
            {message.response && (
              <div className="message-response">
                <strong>Response:</strong> {message.response}
              </div>
            )}
            
            {/* Expandable Task Context */}
            {isExpanded && message.type === 'task' && (
              <div className="task-context" onClick={(e) => e.stopPropagation()}>
                {/* Response Box at top */}
                <div className="task-reply-box">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response..."
                    className="task-reply-input"
                    rows={3}
                  />
                  <button
                    className="task-reply-button"
                    onClick={async () => {
                      if (!replyText.trim() || !message.taskId) return;
                      
                      setIsReplying(true);
                      try {
                        // Get current user data
                        const userDoc = await getDoc(doc(db, 'users', currentUserId));
                        const userData = userDoc.exists() ? userDoc.data() : {};
                        
                        // Create new comment
                        const newComment = {
                          id: `comment_${Date.now()}`,
                          message: replyText.trim(),
                          requestedBy: currentUserId,
                          requestedByName: userData.name || userData.displayName || userData.email || 'Unknown',
                          authorId: currentUserId,
                          authorName: userData.name || userData.displayName || userData.email || 'Unknown',
                          authorRole: userData.role || 'parent',
                          timestamp: new Date(),
                          isQuestion: replyText.trim().endsWith('?'),
                          hasResponse: false,
                          response: null,
                          responseBy: null,
                          responseAt: null
                        };
                        
                        // Get the task document
                        const taskRef = doc(db, 'families', family.id, 'householdTodos', message.taskId);
                        const taskDoc = await getDoc(taskRef);
                        
                        if (taskDoc.exists()) {
                          const taskData = taskDoc.data();
                          const currentHelpRequests = taskData.helpRequests || [];
                          const updatedHelpRequests = [...currentHelpRequests, newComment];
                          
                          // Update the task
                          await updateDoc(taskRef, {
                            helpRequests: updatedHelpRequests,
                            updatedAt: serverTimestamp()
                          });
                          
                          setReplyText('');
                          // The onSnapshot listener will automatically update the UI
                        }
                      } catch (error) {
                        console.error('Error adding reply:', error);
                        alert('Failed to send reply. Please try again.');
                      } finally {
                        setIsReplying(false);
                      }
                    }}
                    disabled={!replyText.trim() || isReplying}
                  >
                    {isReplying ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>

                {/* Messages Thread */}
                {message.taskMessages && message.taskMessages.length > 0 && (
                  <div className="task-messages-thread">
                    <h4>Conversation Thread</h4>
                    {/* Sort messages newest first */}
                    {[...message.taskMessages].sort((a, b) => {
                      const aTime = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
                      const bTime = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
                      return bTime - aTime;
                    }).map((msg, index) => (
                      <div key={msg.id || index} className="task-thread-message">
                        <div className="thread-message-header">
                          <span className="thread-message-author">
                            {getFriendlyName(msg.authorName)}
                          </span>
                          <span className="thread-message-time">
                            {msg.timestamp?.toDate().toLocaleString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                          </span>
                        </div>
                        <p className="thread-message-text">{msg.message}</p>
                        {msg.response && (
                          <div className="thread-message-response">
                            <div className="thread-response-header">
                              <span className="thread-message-author">
                                {getFriendlyName(msg.responseAuthorName || 'Parent')}
                              </span>
                              <span className="thread-message-time">
                                {msg.responseAt?.toDate ? msg.responseAt.toDate().toLocaleString('en-GB', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                }) : 'Recently'}
                              </span>
                            </div>
                            <p className="thread-message-text">{msg.response}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Task Details */}
                <div className="task-context-details">
                  <h4>Task Information</h4>
                  <p><strong>Title:</strong> {message.taskTitle}</p>
                  {message.taskDescription && (
                    <p><strong>Description:</strong> {message.taskDescription}</p>
                  )}
                  {message.taskCategory && (
                    <p><strong>Category:</strong> {message.taskCategory}</p>
                  )}
                  {message.taskDueDate && (
                    <p><strong>Due:</strong> {message.taskDueDate.toDate().toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Message Metadata */}
      <div className="message-metadata">
        <div className="message-time-container">
          <span className="message-time">
            {(message.timestamp || message.createdAt)?.toDate().toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })}
          </span>
          {isNewMessage && <span className="new-indicator">NEW</span>}
          {isUnread && message.authorId !== currentUserId && (
            <span className="unread-indicator">●</span>
          )}
        </div>
        {/* Author name box */}
        {message.authorName && (
          <div className="message-author-box">
            {getFriendlyName(message.authorName)}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="delete-confirm-overlay" 
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(false);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px'
          }}
        >
          <div 
            className="delete-confirm-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--md-sys-color-surface)',
              borderRadius: 'var(--md-sys-shape-corner-large)',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: 'var(--md-sys-elevation-level3)',
              animation: 'slideUp 0.3s ease'
            }}
          >
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '20px',
              fontWeight: '500',
              color: 'var(--md-sys-color-on-surface)'
            }}>
              Delete Family Note?
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '16px',
              color: 'var(--md-sys-color-on-surface-variant)',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete this note? This action cannot be undone.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                style={{
                  padding: '10px 24px',
                  border: '1px solid var(--md-sys-color-outline)',
                  borderRadius: 'var(--md-sys-shape-corner-full)',
                  backgroundColor: 'transparent',
                  color: 'var(--md-sys-color-primary)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDelete();
                }}
                style={{
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: 'var(--md-sys-shape-corner-full)',
                  backgroundColor: 'var(--md-sys-color-error)',
                  color: 'var(--md-sys-color-on-error)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
                  boxShadow: 'var(--md-sys-elevation-level1)'
                }}
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default MessagesPage;