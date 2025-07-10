import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, serverTimestamp, updateDoc, arrayUnion, orderBy } from 'firebase/firestore';
import { useFamily } from '../../hooks/useFamily';
import DirectMessageChat from './DirectMessageChat';
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
  
  // Performance optimization: Pagination
  const [visibleMessageCount, setVisibleMessageCount] = useState(20);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  
  // Message archiving
  const [showArchivedMessages, setShowArchivedMessages] = useState(false);
  
  // First-time help/onboarding
  const [showOnboardingHelp, setShowOnboardingHelp] = useState(false);

  // Debounced search for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
            authorId: noteData.createdBy
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
          
          // Extract comments from help requests
          if (taskData.helpRequests?.length > 0) {
            taskData.helpRequests.forEach((request) => {
              commentsData.push({
                id: `${doc.id}_help_${request.id}`,
                type: 'task',
                taskId: doc.id,
                taskTitle: taskData.title,
                taskDescription: taskData.description,
                taskCategory: taskData.category,
                taskDueDate: taskData.dueDate,
                taskCompleted: taskData.isCompleted,
                taskCompletedAt: taskData.completedAt,
                message: request.message,
                authorId: request.requestedBy,
                authorName: request.requestedByName,
                authorRole: 'aupair',
                timestamp: request.timestamp,
                isQuestion: request.message.trim().endsWith('?'),
                hasResponse: !!request.response,
                response: request.response,
                responseBy: request.responseBy,
                responseAt: request.responseAt
              });
            });
          }

          // Extract completion notes
          if (taskData.completionNotes) {
            commentsData.push({
              id: `${doc.id}_completion`,
              type: 'task',
              taskId: doc.id,
              taskTitle: taskData.title,
              taskDescription: taskData.description,
              taskCategory: taskData.category,
              taskDueDate: taskData.dueDate,
              taskCompleted: taskData.isCompleted,
              taskCompletedAt: taskData.completedAt,
              message: taskData.completionNotes,
              authorId: taskData.completedBy,
              authorName: taskData.completedByName || 'Au Pair',
              authorRole: 'aupair',
              timestamp: taskData.completedAt,
              isQuestion: false,
              hasResponse: true
            });
          }
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

  // Calculate unanswered questions count
  const unansweredQuestionsCount = useMemo(() => {
    return taskComments.filter(comment => 
      comment.isQuestion && !comment.hasResponse
    ).length;
  }, [taskComments]);

  // Check if message should be auto-archived (older than 30 days and resolved)
  const shouldAutoArchive = useCallback((message) => {
    const messageTimestamp = message.timestamp || message.createdAt;
    if (!messageTimestamp) return false;
    
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const messageAge = messageTimestamp.toMillis();
    
    // Auto-archive old resolved questions or completed task comments
    return messageAge < thirtyDaysAgo && 
           ((message.isQuestion && message.hasResponse) || 
            (message.type === 'task' && message.message.includes('completed')));
  }, []);

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
      const notesToShow = showArchivedMessages 
        ? familyNotes 
        : familyNotes.filter(note => !note.isArchived && !shouldAutoArchive(note));
      allMessages = [...allMessages, ...notesToShow];
    }
    if (filter === 'all' || filter === 'tasks') {
      const tasksToShow = showArchivedMessages 
        ? taskComments 
        : taskComments.filter(comment => !shouldAutoArchive(comment));
      allMessages = [...allMessages, ...tasksToShow];
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
  }, [filter, debouncedSearchQuery, familyNotes, taskComments, directMessages, visibleMessageCount, showArchivedMessages, shouldAutoArchive]);

  // Get visible messages for rendering (performance optimization)
  const visibleMessages = useMemo(() => {
    return filteredAndSortedMessages.slice(0, visibleMessageCount);
  }, [filteredAndSortedMessages, visibleMessageCount]);

  // Load more messages function
  const loadMoreMessages = useCallback(() => {
    setVisibleMessageCount(prev => prev + 20);
  }, []);

  // Archive message function (currently unused but available for future use)
  // eslint-disable-next-line no-unused-vars
  const archiveMessage = useCallback(async (messageId, messageType) => {
    if (!user?.uid) return;
    
    try {
      if (messageType === 'note') {
        await updateDoc(doc(db, 'families', family.id, 'familyNotes', messageId), {
          isArchived: true,
          archivedAt: serverTimestamp(),
          archivedBy: user.uid
        });
      }
      // Task comments don't support individual archiving in this implementation
    } catch (error) {
      console.error('Error archiving message:', error);
    }
  }, [user?.uid, family?.id]);

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
          <button
            className={`filter-btn archive-btn ${showArchivedMessages ? 'active' : ''}`}
            onClick={() => setShowArchivedMessages(!showArchivedMessages)}
            title={showArchivedMessages ? 'Hide archived messages' : 'Show archived messages'}
          >
            📦 Archive
          </button>
        </div>
      </div>

      {/* Family Chat Button */}
      <button className="family-chat-btn" onClick={openFamilyChat}>
        <span className="family-chat-icon">👨‍👩‍👧‍👦</span>
        <span className="family-chat-text">Family Chat</span>
        <span className="family-chat-arrow">→</span>
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
const MessageCard = React.memo(({ message, onClick, currentUserId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isUnansweredQuestion = message.isQuestion && !message.hasResponse;
  
  // Determine if message is unread by current user
  const isUnread = message.type === 'note' 
    ? (message.readBy ? !message.readBy.includes(currentUserId) : true)
    : (message.seenBy ? !message.seenBy.includes(currentUserId) : false);
  const messageTimestamp = message.timestamp || message.createdAt;
  const isNewMessage = messageTimestamp && 
    (Date.now() - messageTimestamp.toMillis()) < (24 * 60 * 60 * 1000); // Less than 24 hours old

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
      // Mark family notes as read when clicked
      if (onClick?.markAsRead) {
        onClick.markAsRead(message.id, message.type);
      }
    }
  };

  return (
    <div 
      className={`message-card ${isUnansweredQuestion ? 'unanswered-question' : ''} ${message.type === 'chat' ? 'clickable' : ''} ${message.type === 'task' ? 'expandable' : ''} ${isUnread ? 'unread' : ''} ${isNewMessage ? 'new-message' : ''}`}
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
            <div className="message-author">
              {getFriendlyName(message.authorName)} • {message.authorRole}
            </div>
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
              <div className="task-context">
                <div className="task-context-header">
                  <strong>Task Details:</strong>
                </div>
                <div className="task-context-content">
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
            {(message.timestamp || message.createdAt)?.toDate().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </span>
          {isNewMessage && <span className="new-indicator">NEW</span>}
          {isUnread && message.authorId !== currentUserId && (
            <span className="unread-indicator">●</span>
          )}
        </div>
        {message.type === 'task' && !isExpanded && (
          <span className="expand-hint">Tap to expand</span>
        )}
        {/* Author name box */}
        {message.authorName && (
          <div className="message-author-box">
            {getFriendlyName(message.authorName)}
          </div>
        )}
      </div>
    </div>
  );
});

export default MessagesPage;