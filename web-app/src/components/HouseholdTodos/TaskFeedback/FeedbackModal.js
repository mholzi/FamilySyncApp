import React, { useState } from 'react';
import { updateDoc, doc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import './FeedbackModal.css';

const FeedbackModal = ({ 
  familyId, 
  taskId, 
  taskTitle, 
  completedByName,
  currentUser,
  onClose, 
  onSuccess 
}) => {
  const [selectedRating, setSelectedRating] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const ratings = [
    {
      value: 'great',
      emoji: '🌟',
      title: 'Amazing!',
      subtitle: 'Exceeded expectations',
      color: '#10b981',
      messages: [
        'Fantastic work! You really went above and beyond.',
        'Outstanding job! We\'re so grateful for your attention to detail.',
        'Incredible! This looks even better than we imagined.',
        'Wow! You have such great instincts for how we like things done.'
      ]
    },
    {
      value: 'good',
      emoji: '👍',
      title: 'Great job!',
      subtitle: 'Well done',
      color: '#3b82f6',
      messages: [
        'Thank you for taking such good care of this!',
        'Perfect! This is exactly how we like it done.',
        'Great work! We really appreciate your effort.',
        'Excellent! You\'re getting the hang of our preferences.'
      ]
    },
    {
      value: 'needs-improvement',
      emoji: '💪',
      title: 'Good effort!',
      subtitle: 'Let\'s improve together',
      color: '#f59e0b',
      messages: [
        'Thanks for your effort! Let\'s work together to make it even better.',
        'Great try! We\'ll share some tips to help you next time.',
        'Good work! There are just a few small tweaks we can make.',
        'Nice job! We have some suggestions that might help.'
      ]
    }
  ];

  const handleRatingSelect = (rating) => {
    setSelectedRating(rating);
    // Auto-fill with a positive message
    if (!customMessage) {
      const randomMessage = rating.messages[Math.floor(Math.random() * rating.messages.length)];
      setCustomMessage(randomMessage);
    }
  };

  const sendFeedback = async () => {
    if (!selectedRating) return;

    setSending(true);
    try {
      const taskRef = doc(db, 'families', familyId, 'householdTodos', taskId);
      
      const feedback = {
        rating: selectedRating.value,
        message: customMessage.trim() || selectedRating.messages[0],
        timestamp: serverTimestamp(),
        givenBy: currentUser.uid,
        givenByName: currentUser.displayName || currentUser.email
      };

      // Update task with feedback and mark as confirmed
      await updateDoc(taskRef, {
        feedback: arrayUnion(feedback),
        status: 'confirmed',
        confirmedBy: currentUser.uid,
        confirmedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Show celebration animation
      setShowCelebration(true);
      
      setTimeout(() => {
        if (onSuccess) {
          onSuccess('Feedback sent! 🎉');
        }
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error sending feedback:', error);
      if (onSuccess) {
        onSuccess('Could not send feedback. Please try again.', 'error');
      }
      setSending(false);
    }
  };

  if (showCelebration) {
    return (
      <div className="feedback-overlay">
        <div className="celebration-container">
          <div className="celebration-animation">
            <div className="celebration-emoji">🎉</div>
            <div className="celebration-text">
              <h3>Feedback Sent!</h3>
              <p>Thank you for the positive encouragement!</p>
            </div>
            <div className="celebration-confetti">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 4)]
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="feedback-modal">
        <div className="feedback-header">
          <div className="feedback-title">
            <span className="feedback-icon">💝</span>
            <div>
              <h3>Share Your Feedback</h3>
              <p>How did {completedByName} do with "{taskTitle}"?</p>
            </div>
          </div>
          <button className="feedback-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="feedback-content">
          <div className="feedback-subtitle">
            Your encouragement helps create a positive working relationship! 🌟
          </div>

          {/* Rating Selection */}
          <div className="rating-section">
            <label>Choose your feedback:</label>
            <div className="rating-options">
              {ratings.map((rating) => (
                <button
                  key={rating.value}
                  type="button"
                  className={`rating-option ${selectedRating?.value === rating.value ? 'selected' : ''}`}
                  onClick={() => handleRatingSelect(rating)}
                  style={{
                    '--rating-color': rating.color
                  }}
                >
                  <div className="rating-emoji">{rating.emoji}</div>
                  <div className="rating-content">
                    <div className="rating-title">{rating.title}</div>
                    <div className="rating-subtitle">{rating.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          {selectedRating && (
            <div className="message-section">
              <label htmlFor="feedback-message">
                Personal message (optional):
              </label>
              <textarea
                id="feedback-message"
                className="feedback-message-input"
                placeholder="Add a personal touch to your feedback..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                disabled={sending}
              />
              <div className="message-help">
                💡 Specific, positive feedback helps au pairs learn your preferences
              </div>
            </div>
          )}

          {/* Quick Message Suggestions */}
          {selectedRating && (
            <div className="quick-messages">
              <label>Quick suggestions:</label>
              <div className="message-buttons">
                {selectedRating.messages.slice(0, 3).map((message, index) => (
                  <button
                    key={index}
                    type="button"
                    className="message-btn"
                    onClick={() => setCustomMessage(message)}
                    disabled={sending}
                  >
                    "{message}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="feedback-footer">
          <div className="feedback-info">
            🤝 This feedback will help build trust and understanding
          </div>
          <div className="feedback-actions">
            <button 
              className="feedback-cancel-btn" 
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </button>
            <button 
              className="feedback-send-btn"
              onClick={sendFeedback}
              disabled={!selectedRating || sending}
              style={{
                '--button-color': selectedRating?.color || '#3b82f6'
              }}
            >
              {sending ? (
                <>
                  <span className="sending-spinner"></span>
                  Sending...
                </>
              ) : (
                <>
                  <span>{selectedRating?.emoji || '💝'}</span>
                  <span>Send Feedback</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;