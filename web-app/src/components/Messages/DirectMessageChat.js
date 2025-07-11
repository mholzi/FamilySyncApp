import React, { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../firebase';
import { collection, doc, setDoc, onSnapshot, query, orderBy, serverTimestamp, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import './DirectMessageChat.css';

const DirectMessageChat = ({ conversationId, participants, currentUserId, onBack }) => {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [otherParticipant, setOtherParticipant] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch current user profile
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      if (currentUserId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUserId));
          if (userDoc.exists()) {
            setCurrentUserProfile(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching current user profile:', error);
        }
      }
    };
    
    fetchCurrentUserProfile();
  }, [currentUserId]);

  // Fetch other participant info
  useEffect(() => {
    // Skip fetching for family chat
    if (conversationId === 'family-chat') {
      return;
    }
    
    const fetchOtherParticipant = async () => {
      const otherUserId = participants.find(id => id !== currentUserId);
      if (otherUserId) {
        const userDoc = await getDoc(doc(db, 'users', otherUserId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setOtherParticipant({ 
            id: otherUserId, 
            ...userData,
            // Use profile name as displayName
            displayName: userData.name || userData.displayName || userData.email
          });
        }
      }
    };
    fetchOtherParticipant();
  }, [participants, currentUserId, conversationId]);

  // Subscribe to messages
  useEffect(() => {
    if (!conversationId) return;

    // Handle family chat differently if needed
    if (conversationId === 'family-chat') {
      // For now, we'll use the same structure but could customize later
      // Family chat messages could be stored in a different collection
    }

    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesData);

      // Fetch user profiles for all unique authors
      const uniqueAuthorIds = [...new Set(messagesData.map(msg => msg.authorId).filter(id => id))];
      const profilesMap = {};
      
      for (const authorId of uniqueAuthorIds) {
        if (!userProfiles[authorId]) {
          try {
            const userDoc = await getDoc(doc(db, 'users', authorId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              profilesMap[authorId] = {
                name: userData.name || userData.displayName || userData.email,
                role: userData.role
              };
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        }
      }
      
      if (Object.keys(profilesMap).length > 0) {
        setUserProfiles(prev => ({ ...prev, ...profilesMap }));
      }

      // Mark messages as read
      markMessagesAsRead(messagesData);
    });

    return () => unsubscribe();
  }, [conversationId, currentUserId, userProfiles]);

  const markMessagesAsRead = async (messagesData) => {
    const unreadMessages = messagesData.filter(
      msg => msg.authorId !== currentUserId && !msg.seenBy?.includes(currentUserId)
    );

    for (const msg of unreadMessages) {
      await updateDoc(
        doc(db, 'conversations', conversationId, 'messages', msg.id),
        {
          seenBy: arrayUnion(currentUserId)
        }
      );
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const messageData = {
        message: newMessage.trim(),
        authorId: currentUserId,
        authorName: currentUserProfile?.name || user?.displayName || user?.email || 'Unknown',
        timestamp: serverTimestamp(),
        seenBy: [currentUserId],
        isQuestion: newMessage.trim().endsWith('?')
      };

      // Add message to conversation
      const messageRef = doc(collection(db, 'conversations', conversationId, 'messages'));
      await setDoc(messageRef, messageData);

      // Update conversation metadata
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: newMessage.trim(),
        lastMessageTime: serverTimestamp(),
        lastMessageBy: currentUserId
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="direct-message-chat">
      <div className="chat-header">
        <button className="back-button" onClick={onBack}>
          ←
        </button>
        <div className="chat-participant-info">
          {conversationId === 'family-chat' ? (
            <>
              <div className="participant-avatar">
                👨‍👩‍👧‍👦
              </div>
              <div className="participant-details">
                <h3>Family Chat</h3>
                <span className="participant-role">All family members</span>
              </div>
            </>
          ) : otherParticipant ? (
            <>
              <div className="participant-avatar">
                {otherParticipant.displayName?.[0] || otherParticipant.email?.[0] || '?'}
              </div>
              <div className="participant-details">
                <h3>{otherParticipant.displayName || otherParticipant.email}</h3>
                <span className="participant-role">{otherParticipant.role || ''}</span>
              </div>
            </>
          ) : (
            <>
              <div className="participant-avatar">
                <div className="loading-avatar"></div>
              </div>
              <div className="participant-details">
                <h3>Loading...</h3>
                <span className="participant-role"></span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>Start a conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.authorId === currentUserId;
            const isUnansweredQuestion = message.isQuestion && !messages.some(
              m => m.timestamp > message.timestamp && m.authorId !== message.authorId
            );

            // Check if message is from today
            const messageDate = message.timestamp?.toDate();
            const today = new Date();
            const isToday = messageDate && 
              messageDate.getDate() === today.getDate() &&
              messageDate.getMonth() === today.getMonth() &&
              messageDate.getFullYear() === today.getFullYear();

            return (
              <div
                key={message.id}
                className={`message-bubble ${isOwn ? 'own' : 'other'} ${isUnansweredQuestion ? 'unanswered-question' : ''}`}
              >
                <p className="message-text">{message.message}</p>
                {isUnansweredQuestion && !isOwn && (
                  <div className="awaiting-response">Awaiting response...</div>
                )}
                <span className="message-time">
                  {isToday ? (
                    message.timestamp?.toDate().toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  ) : (
                    message.timestamp?.toDate().toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })
                  )}
                  {!isOwn && conversationId === 'family-chat' && (
                    <span className="message-author-inline">
                      {' • '}
                      {userProfiles[message.authorId]?.name ? 
                        (userProfiles[message.authorId].name.split(' ')[0] || userProfiles[message.authorId].name) : 
                        (message.authorName?.split(' ')[0] || message.authorName || 'Unknown')
                      }
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
          className="chat-input"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={1}
          disabled={sending}
        />
        <button
          className="send-button"
          onClick={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? '...' : '→'}
        </button>
      </div>
    </div>
  );
};

export default DirectMessageChat;