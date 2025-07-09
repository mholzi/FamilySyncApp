import React, { useState } from 'react';
import { updateDoc, doc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import './HelpRequest.css';

const HelpRequest = ({ 
  familyId, 
  taskId, 
  taskTitle, 
  currentUser,
  onClose, 
  onSuccess 
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [category, setCategory] = useState('question');

  const categories = [
    { value: 'question', label: 'I have a question', icon: '❓' },
    { value: 'clarification', label: 'Need clarification', icon: '🤔' },
    { value: 'supplies', label: 'Missing supplies', icon: '🧰' },
    { value: 'difficulty', label: 'Having trouble', icon: '😓' },
    { value: 'suggestion', label: 'I have a suggestion', icon: '💡' }
  ];

  const sendHelpRequest = async () => {
    if (!message.trim()) return;

    setSending(true);
    try {
      // Add help request to task
      const taskRef = doc(db, 'families', familyId, 'householdTodos', taskId);
      
      const helpRequest = {
        id: `help_${Date.now()}`,
        message: message.trim(),
        category,
        timestamp: serverTimestamp(),
        requestedBy: currentUser.uid,
        requestedByName: currentUser.displayName || currentUser.email,
        resolved: false,
        response: null,
        responseBy: null,
        responseAt: null
      };

      await updateDoc(taskRef, {
        helpRequests: arrayUnion(helpRequest),
        updatedAt: serverTimestamp()
      });

      // TODO: Send notification to all parents in family
      // This would be implemented with Firebase Cloud Functions
      console.log('📧 Help request notification would be sent to parents');

      if (onSuccess) {
        onSuccess('Your question has been sent! 💬 The parents will be notified.');
      }
      
      onClose();
    } catch (error) {
      console.error('Error sending help request:', error);
      // Show error message but don't close modal
      if (onSuccess) {
        onSuccess('Could not send question. Please try again.', 'error');
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      sendHelpRequest();
    }
  };

  const selectedCategory = categories.find(cat => cat.value === category);

  return (
    <div className="help-request-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="help-request-modal">
        <div className="help-request-header">
          <div className="help-request-title">
            <span className="help-icon">🤝</span>
            <h3>Need Help with "{taskTitle}"?</h3>
          </div>
          <button className="help-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="help-request-content">
          <div className="help-subtitle">
            No question is too small - we're here to help! 😊
          </div>

          {/* Category Selection */}
          <div className="category-selection">
            <label>What kind of help do you need?</label>
            <div className="category-grid">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  className={`category-btn ${category === cat.value ? 'selected' : ''}`}
                  onClick={() => setCategory(cat.value)}
                >
                  <span className="category-icon">{cat.icon}</span>
                  <span className="category-label">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div className="message-section">
            <label htmlFor="help-message">
              {selectedCategory?.icon} {selectedCategory?.label}
            </label>
            <textarea
              id="help-message"
              className="help-message-input"
              placeholder={getPlaceholderText(category)}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={4}
              disabled={sending}
            />
            <div className="message-help">
              💡 Tip: The more specific you are, the better we can help!
            </div>
          </div>

          {/* Quick Examples */}
          <div className="quick-examples">
            <label>Quick examples:</label>
            <div className="example-buttons">
              {getQuickExamples(category).map((example, index) => (
                <button
                  key={index}
                  type="button"
                  className="example-btn"
                  onClick={() => setMessage(example)}
                  disabled={sending}
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="help-request-footer">
          <div className="help-info">
            📱 All parents in the family will be notified
          </div>
          <div className="help-actions">
            <button 
              className="help-cancel-btn" 
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </button>
            <button 
              className="help-send-btn"
              onClick={sendHelpRequest}
              disabled={!message.trim() || sending}
            >
              {sending ? (
                <>
                  <span className="sending-spinner"></span>
                  Sending...
                </>
              ) : (
                <>
                  <span>Send Question</span>
                  <span className="keyboard-hint">⌘+Enter</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getPlaceholderText = (category) => {
  const placeholders = {
    question: "What would you like to know? e.g., 'Which cleaning products should I use?'",
    clarification: "What needs clarification? e.g., 'I'm not sure what you mean by...'",
    supplies: "What supplies are you missing? e.g., 'I can't find the vacuum cleaner'",
    difficulty: "What's challenging about this task? e.g., 'I'm having trouble with...'",
    suggestion: "What's your suggestion? e.g., 'Maybe we could try doing this differently?'"
  };
  return placeholders[category] || placeholders.question;
};

const getQuickExamples = (category) => {
  const examples = {
    question: [
      "Which cleaning products should I use?",
      "How often should I do this?",
      "Is there a specific way you prefer this done?"
    ],
    clarification: [
      "I'm not sure what you mean by 'deep clean'",
      "Should I include the children's bathroom?",
      "What exactly counts as 'organized'?"
    ],
    supplies: [
      "I can't find the vacuum cleaner",
      "We're out of cleaning spray",
      "The washing machine isn't working"
    ],
    difficulty: [
      "This is taking much longer than expected",
      "I'm not sure I'm doing this correctly",
      "The children are making this challenging"
    ],
    suggestion: [
      "Maybe we could do this at a different time?",
      "I think there might be an easier way",
      "Could we break this into smaller steps?"
    ]
  };
  return examples[category] || examples.question;
};

export default HelpRequest;