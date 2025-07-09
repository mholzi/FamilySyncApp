import React, { useState } from 'react';
import { updateDoc, doc, arrayUnion, serverTimestamp, getDoc } from 'firebase/firestore';
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
    console.log('🔍 Debug: Send button clicked');
    
    if (!message.trim()) {
      console.log('❌ Debug: No message entered');
      if (onSuccess) {
        onSuccess('Please enter a message before sending.', 'error');
      }
      return;
    }

    console.log('🔍 Debug: Starting help request submission', {
      familyId,
      taskId,
      currentUser: currentUser?.uid,
      message: message.trim(),
      onSuccess: typeof onSuccess,
      onClose: typeof onClose
    });

    // Validate required props
    if (!familyId || !taskId || !currentUser) {
      console.error('❌ Missing required props:', { familyId: !!familyId, taskId: !!taskId, currentUser: !!currentUser });
      if (onSuccess) {
        onSuccess('Missing required information. Please refresh the page and try again.', 'error');
      }
      return;
    }

    setSending(true);
    try {
      // Add help request to task
      const taskRef = doc(db, 'families', familyId, 'householdTodos', taskId);
      console.log('🔍 Debug: Created task reference', taskRef.path);
      
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

      console.log('🔍 Debug: Submitting help request', helpRequest);
      
      // First check if the document exists and has helpRequests field
      const taskDoc = await getDoc(taskRef);
      if (!taskDoc.exists()) {
        throw new Error('Task not found');
      }
      
      const taskData = taskDoc.data();
      console.log('🔍 Debug: Current task data:', { 
        hasHelpRequests: 'helpRequests' in taskData,
        helpRequestsLength: taskData.helpRequests?.length || 0
      });
      
      // Update the task with the new help request
      if (!taskData.helpRequests || !Array.isArray(taskData.helpRequests)) {
        // If helpRequests doesn't exist or isn't an array, create it
        await updateDoc(taskRef, {
          helpRequests: [helpRequest],
          updatedAt: serverTimestamp()
        });
      } else {
        // Use arrayUnion if the field exists
        await updateDoc(taskRef, {
          helpRequests: arrayUnion(helpRequest),
          updatedAt: serverTimestamp()
        });
      }

      console.log('✅ Debug: Help request submitted successfully');

      // TODO: Send notification to all parents in family
      // This would be implemented with Firebase Cloud Functions
      console.log('📧 Help request notification would be sent to parents');

      if (onSuccess) {
        console.log('🔍 Debug: Calling onSuccess callback');
        onSuccess('Your question has been sent! 💬 The parents will be notified.');
      }
      
      // Add small delay to ensure success message is shown
      setTimeout(() => {
        console.log('🔍 Debug: Closing modal');
        onClose();
      }, 100);
    } catch (error) {
      console.error('❌ Error sending help request:', error);
      console.error('Error details:', error.message, error.code, error.stack);
      
      // Show more detailed error message but don't close modal
      let errorMessage = 'Could not send question. Please try again.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please make sure you have access to this family.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'not-found') {
        errorMessage = 'Task not found. Please refresh the page and try again.';
      }
      
      if (onSuccess) {
        console.log('🔍 Debug: Calling onSuccess with error');
        onSuccess(errorMessage, 'error');
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
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.titleContainer}>
            <span style={styles.helpIcon}>🤝</span>
            <h3 style={styles.title}>Need Help with "{taskTitle}"?</h3>
          </div>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={styles.content}>
          <div style={styles.subtitle}>
            No question is too small - we're here to help! 😊
          </div>

          {/* Category Selection */}
          <div style={styles.formGroup}>
            <label style={styles.label}>What kind of help do you need?</label>
            <div style={styles.categoryGrid}>
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  style={{
                    ...styles.categoryButton,
                    ...(category === cat.value ? styles.categoryButtonActive : {})
                  }}
                  onClick={() => setCategory(cat.value)}
                >
                  <span style={styles.categoryIcon}>{cat.icon}</span>
                  <span style={styles.categoryLabel}>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="help-message">
              {selectedCategory?.icon} {selectedCategory?.label}
            </label>
            <textarea
              id="help-message"
              style={styles.textarea}
              placeholder={getPlaceholderText(category)}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={4}
              disabled={sending}
            />
            <div style={styles.helpText}>
              💡 Tip: The more specific you are, the better we can help!
            </div>
          </div>

          {/* Quick Examples */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Quick examples:</label>
            <div style={styles.exampleButtons}>
              {getQuickExamples(category).map((example, index) => (
                <button
                  key={index}
                  type="button"
                  style={styles.exampleButton}
                  onClick={() => setMessage(example)}
                  disabled={sending}
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <div style={styles.infoText}>
            📱 All parents in the family will be notified
          </div>
          <div style={styles.footerButtons}>
            <button 
              style={styles.cancelButton}
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </button>
            <button 
              style={{
                ...styles.primaryButton,
                ...((!message.trim() || sending) ? styles.primaryButtonDisabled : {})
              }}
              onClick={sendHelpRequest}
              disabled={!message.trim() || sending}
            >
              {sending ? (
                <>
                  <span style={styles.spinner}></span>
                  Sending...
                </>
              ) : (
                <>
                  <span>Send Question</span>
                  <span style={styles.keyboardHint}>⌘+Enter</span>
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

// Styles matching EditEventModal patterns
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: 'var(--space-4)'
  },
  modal: {
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--border-light)'
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    flex: 1
  },
  helpIcon: {
    fontSize: 'var(--font-size-xl)',
    animation: 'wave 2s ease-in-out infinite'
  },
  title: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: 'var(--font-size-xl)',
    cursor: 'pointer',
    padding: 'var(--space-1)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-sm)',
    transition: 'var(--transition-fast)'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: 'var(--space-4)'
  },
  subtitle: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    marginBottom: 'var(--space-4)',
    fontStyle: 'italic'
  },
  formGroup: {
    marginBottom: 'var(--space-4)'
  },
  label: {
    display: 'block',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-2)'
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 'var(--space-2)'
  },
  categoryButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 'var(--space-3)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    textAlign: 'center'
  },
  categoryButtonActive: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    border: '1px solid var(--primary-purple)'
  },
  categoryIcon: {
    fontSize: 'var(--font-size-lg)',
    marginBottom: 'var(--space-1)'
  },
  categoryLabel: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)'
  },
  textarea: {
    width: '100%',
    padding: 'var(--space-3)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-base)',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '100px',
    outline: 'none',
    transition: 'var(--transition-fast)'
  },
  helpText: {
    marginTop: 'var(--space-1)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    fontStyle: 'italic'
  },
  exampleButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)'
  },
  exampleButton: {
    background: '#f8f9fa',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-3)',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    transition: 'var(--transition-fast)'
  },
  footer: {
    padding: 'var(--space-4)',
    borderTop: '1px solid var(--border-light)'
  },
  infoText: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    marginBottom: 'var(--space-3)',
    fontStyle: 'italic'
  },
  footerButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-3)'
  },
  cancelButton: {
    flex: 1,
    padding: 'var(--space-2) var(--space-4)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  primaryButton: {
    flex: 1,
    padding: 'var(--space-2) var(--space-4)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)'
  },
  primaryButtonDisabled: {
    backgroundColor: 'var(--gray-400)',
    cursor: 'not-allowed'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid currentColor',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  keyboardHint: {
    fontSize: 'var(--font-size-xs)',
    opacity: 0.7,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)'
  }
};

export default HelpRequest;