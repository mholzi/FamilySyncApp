import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { completeHouseholdTodo, confirmHouseholdTodo } from '../../utils/householdTodosUtils';
import { useAuPairExperience } from '../../hooks/useAuPairExperience';
import TaskInstructions from './TaskInstructions/TaskInstructions';
import ExamplePhotos from './TaskGuidance/ExamplePhotos';
import FirstTimeHelper from './TaskGuidance/FirstTimeHelper';
import HelpRequest from './TaskFeedback/HelpRequest';
import FeedbackModal from './TaskFeedback/FeedbackModal';
import './TaskDetailModal.css';

const TaskDetailModal = ({ 
  task, 
  familyId, 
  userRole, 
  onClose, 
  onTaskUpdate,
  onEdit 
}) => {
  const [user] = useAuthState(auth);
  const [showHelpRequest, setShowHelpRequest] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [completionPhotos, setCompletionPhotos] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success'); // 'success' or 'error'
  const [respondingToRequest, setRespondingToRequest] = useState(null);
  const [responseText, setResponseText] = useState('');

  // Get au pair experience for learning mode
  const { 
    isNewAuPair, 
    shouldShowLearningMode, 
    incrementTaskCount 
  } = useAuPairExperience(familyId, userRole === 'aupair' ? user?.uid : null);

  const handleCompleteTask = async () => {
    if (!user) return;
    
    console.log('Au pair attempting to complete task with notes:', completionNotes);
    setIsCompleting(true);
    try {
      await completeHouseholdTodo(familyId, task.id, {
        notes: completionNotes,
        photos: completionPhotos.map(photo => photo.url)
      }, user.uid);

      // Increment task count for au pair experience
      if (userRole === 'aupair') {
        await incrementTaskCount();
      }

      setMessage('Task completed! 🎉');
      setMessageType('success');
      setTimeout(() => {
        onTaskUpdate?.();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error completing task:', error);
      setMessage('Error completing task. Please try again.');
      setMessageType('error');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleConfirmTask = async () => {
    if (!user) return;
    
    setIsConfirming(true);
    try {
      await confirmHouseholdTodo(familyId, task.id, user.uid);
      setMessage('Task confirmed! ✅');
      setMessageType('success');
      setTimeout(() => {
        onTaskUpdate?.();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error confirming task:', error);
      setMessage('Error confirming task. Please try again.');
      setMessageType('error');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleFeedbackSuccess = (msg) => {
    setMessage(msg);
    setShowFeedbackModal(false);
    setTimeout(() => {
      onTaskUpdate?.();
      onClose();
    }, 1500);
  };

  const handleHelpSuccess = (msg, type = 'success') => {
    console.log('🔍 Debug: handleHelpSuccess called with:', { msg, type });
    setMessage(msg);
    setMessageType(type);
    if (type === 'success') {
      setShowHelpRequest(false);
      // Clear message after 3 seconds for success
      setTimeout(() => {
        setMessage('');
      }, 3000);
    }
    // If type is 'error', keep the modal open so user can retry
  };

  const handleRespond = (requestId, index) => {
    setRespondingToRequest(index);
    setResponseText('');
  };

  const handleSubmitResponse = async () => {
    if (!responseText.trim() || !user) return;

    try {
      // Update the help request with response
      const updatedHelpRequests = [...task.helpRequests];
      const requestIndex = respondingToRequest;
      
      updatedHelpRequests[requestIndex] = {
        ...updatedHelpRequests[requestIndex],
        response: responseText.trim(),
        responseBy: user.uid,
        responseAt: new Date(),
        resolved: true
      };

      // Update the task in Firestore
      const taskRef = doc(db, 'families', familyId, 'householdTodos', task.id);
      await updateDoc(taskRef, {
        helpRequests: updatedHelpRequests,
        updatedAt: serverTimestamp()
      });

      setMessage('Response sent successfully! 📝');
      setMessageType('success');
      setRespondingToRequest(null);
      setResponseText('');
      
      // Refresh the task data
      setTimeout(() => {
        onTaskUpdate?.();
      }, 1000);
    } catch (error) {
      console.error('Error submitting response:', error);
      setMessage('Error sending response. Please try again.');
      setMessageType('error');
    }
  };

  const handleCancelResponse = () => {
    setRespondingToRequest(null);
    setResponseText('');
  };

  const isOverdue = task.dueDate && task.dueDate.toDate() < new Date() && task.status === 'pending';
  const canComplete = userRole === 'aupair' && task.status === 'pending';
  const canConfirm = userRole === 'parent' && task.status === 'completed';
  const canGiveFeedback = userRole === 'parent' && task.status === 'completed';
  const canRequestHelp = userRole === 'aupair' && task.status === 'pending';

  return (
    <div className="task-detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="task-detail-modal">
        <div className="task-detail-header">
          <button className="task-detail-close" onClick={onClose}>×</button>
          
          <div className="task-detail-main-content">
            {/* Left section with due date and time */}
            <div className="task-time-section">
              {task.dueDate && (
                <>
                  <div className="task-due-display">
                    {task.dueDate.toDate().toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className={`task-day-indicator ${isOverdue ? 'overdue' : ''}`}>
                    {isOverdue ? 'Overdue' : 'Due'}
                  </div>
                  {task.estimatedTime && (
                    <div className="task-time-estimate">
                      {task.estimatedTime} min
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Main content section */}
            <div className="task-content-section">
              <div className="task-header-row">
                <h2 className="task-modal-title">{task.title}</h2>
              </div>
              
              <div className="task-metadata">
                {task.category && (
                  <span className={`task-category-badge ${task.category}`}>
                    {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
                  </span>
                )}
                {task.difficulty && (
                  <span className={`task-difficulty-badge ${task.difficulty}`}>
                    {task.difficulty === 'easy' ? '🌟 Easy' : 
                     task.difficulty === 'moderate' ? '⚡ Moderate' : 
                     '🎯 Complex'}
                  </span>
                )}
                {task.isRecurring && (
                  <span className="recurring-badge">
                    {task.recurringType === 'daily' ? 'Daily' : 
                     task.recurringType === 'weekly' ? 'Weekly' : 
                     task.recurringType === 'monthly' ? 'Monthly' : 
                     task.recurringType.charAt(0).toUpperCase() + task.recurringType.slice(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="task-detail-content">
          {/* Status Message */}
          {message && (
            <div className={`task-message ${messageType === 'error' ? 'task-message-error' : ''}`}>
              {message}
            </div>
          )}

          {/* Basic Description */}
          {task.description && (
            <div className="task-description">
              <h4>Description</h4>
              <p>{task.description}</p>
            </div>
          )}

          {/* Simple Instructions */}
          {task.instructions && (
            <TaskInstructions
              value={typeof task.instructions === 'string' ? task.instructions : task.instructions.richText}
              isEditing={false}
            />
          )}

          {/* Example Photos */}
          {task.examplePhotos?.length > 0 && (
            <ExamplePhotos
              photos={task.examplePhotos.map(url => ({ url, uploadedAt: task.examplePhotosUploadedAt }))}
              isEditing={false}
              taskTitle={task.title}
            />
          )}

          {/* First Time Helper - Only for Au Pairs */}
          {task.firstTimeHelp && userRole === 'aupair' && (
            <FirstTimeHelper
              firstTimeHelp={task.firstTimeHelp}
              isNewAuPair={isNewAuPair}
              isLearningMode={shouldShowLearningMode}
            />
          )}

          {/* Preferred Time */}
          {task.preferredTimeOfDay && (
            <div className="preferred-time">
              <h4>⏰ Preferred Time</h4>
              <p>Best completed in the {task.preferredTimeOfDay}</p>
            </div>
          )}

          {/* Help Requests */}
          {task.helpRequests?.length > 0 && (
            <div className="help-requests-section">
              <h4>❓ Help Requests</h4>
              <div className="help-requests-list">
                {task.helpRequests.map((request, index) => (
                  <div key={index} className="help-request-item">
                    <div className="help-request-header">
                      <span className="help-request-category">
                        {request.category === 'question' ? '❓' : 
                         request.category === 'clarification' ? '🤔' : 
                         request.category === 'supplies' ? '🧰' : 
                         request.category === 'difficulty' ? '😓' : '💡'}
                      </span>
                      <span className="help-request-date">
                        {request.timestamp?.toDate().toLocaleDateString()}
                      </span>
                    </div>
                    <p className="help-request-message">{request.message}</p>
                    {request.response && (
                      <div className="help-request-response">
                        <strong>Response:</strong> {request.response}
                      </div>
                    )}
                    {userRole === 'parent' && !request.response && (
                      <div className="help-request-actions">
                        {respondingToRequest === index ? (
                          <div className="response-form">
                            <textarea
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              placeholder="Type your response to help the au pair..."
                              rows={3}
                              className="response-textarea"
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button
                                style={{
                                  padding: '8px 12px',
                                  border: 'none',
                                  borderRadius: 'var(--md-sys-shape-corner-small)',
                                  backgroundColor: !responseText.trim() ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-primary)',
                                  color: !responseText.trim() ? 'var(--md-sys-color-surface)' : 'var(--md-sys-color-on-primary)',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  cursor: !responseText.trim() ? 'not-allowed' : 'pointer',
                                  transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
                                  opacity: !responseText.trim() ? 0.38 : 1
                                }}
                                onClick={handleSubmitResponse}
                                disabled={!responseText.trim()}
                              >
                                Send Response
                              </button>
                              <button
                                style={{
                                  padding: '8px 12px',
                                  border: '1px solid var(--md-sys-color-outline)',
                                  borderRadius: 'var(--md-sys-shape-corner-small)',
                                  backgroundColor: 'transparent',
                                  color: 'var(--md-sys-color-primary)',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
                                }}
                                onClick={handleCancelResponse}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            style={{
                              padding: '8px 12px',
                              border: 'none',
                              borderRadius: 'var(--md-sys-shape-corner-small)',
                              backgroundColor: 'var(--md-sys-color-primary)',
                              color: 'var(--md-sys-color-on-primary)',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
                            }}
                            onClick={() => handleRespond(request.id, index)}
                          >
                            📝 Respond
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previous Feedback */}
          {task.feedback?.length > 0 && (
            <div className="feedback-section">
              <h4>💝 Previous Feedback</h4>
              <div className="feedback-list">
                {task.feedback.map((feedback, index) => (
                  <div key={index} className="feedback-item">
                    <div className="feedback-header">
                      <span className="feedback-rating">
                        {feedback.rating === 'great' ? '🌟' : 
                         feedback.rating === 'good' ? '👍' : '💪'}
                      </span>
                      <span className="feedback-date">
                        {feedback.timestamp?.toDate().toLocaleDateString()}
                      </span>
                    </div>
                    <p className="feedback-message">"{feedback.message}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completion Section for Au Pair */}
          {canComplete && (
            <>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: 'var(--md-sys-color-on-surface)' }}>📝 Comments</h4>
              <div className="completion-form">
                <div className="form-group">
                  <label>Notes (optional)</label>
                  <textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Add any notes about how you completed this task..."
                    rows={3}
                  />
                  <button
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      border: '1px solid var(--md-sys-color-outline)',
                      borderRadius: 'var(--md-sys-shape-corner-small)',
                      backgroundColor: 'transparent',
                      color: 'var(--md-sys-color-primary)',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
                    }}
                    onClick={async () => {
                      if (completionNotes.trim()) {
                        try {
                          const taskRef = doc(db, 'families', familyId, 'householdTodos', task.id);
                          await updateDoc(taskRef, {
                            completionNotes: completionNotes.trim(),
                            updatedAt: serverTimestamp()
                          });
                          setMessage('Notes saved! 📝');
                          setMessageType('success');
                          setTimeout(() => setMessage(''), 3000);
                        } catch (error) {
                          console.error('Error saving notes:', error);
                          setMessage('Error saving notes. Please try again.');
                          setMessageType('error');
                        }
                      }
                    }}
                  >
                    Save Notes
                  </button>
                </div>
                
                <div className="form-group">
                  <label>Completion Photos (optional)</label>
                  <ExamplePhotos
                    familyId={familyId}
                    photos={completionPhotos}
                    onPhotosChange={setCompletionPhotos}
                    isEditing={true}
                    taskTitle={task.title}
                  />
                </div>
              </div>
            </>
          )}

          {/* Completion Info for Completed Tasks */}
          {task.status === 'completed' && (
            <div className="completion-info">
              <h4>✅ Completion Details</h4>
              <div className="completion-details">
                <p>
                  <strong>Completed:</strong> {task.completedAt?.toDate().toLocaleDateString()}
                </p>
                <p>
                  <strong>Completed by:</strong> {task.completedByName || 'Au Pair'}
                </p>
                {task.completionNotes && (
                  <p>
                    <strong>Notes:</strong> {task.completionNotes}
                  </p>
                )}
                {task.completionPhotos?.length > 0 && (
                  <div className="completion-photos">
                    <strong>Completion Photos:</strong>
                    <div className="photos-grid">
                      {task.completionPhotos.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Completion ${index + 1}`}
                          className="completion-photo"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="task-detail-footer">
          <div className="task-actions">
            {/* Au Pair Actions */}
            {userRole === 'aupair' && (
              <>
                {canRequestHelp && (
                  <button
                    style={{
                      padding: '8px 16px',
                      border: '1px solid var(--md-sys-color-primary)',
                      borderRadius: 'var(--md-sys-shape-corner-full)',
                      backgroundColor: 'transparent',
                      color: 'var(--md-sys-color-primary)',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
                    }}
                    onClick={() => setShowHelpRequest(true)}
                  >
                    🤝 Need Help?
                  </button>
                )}
                {canComplete && (
                  <button
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: 'var(--md-sys-shape-corner-full)',
                      backgroundColor: isCompleting ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-primary)',
                      color: isCompleting ? 'var(--md-sys-color-surface)' : 'var(--md-sys-color-on-primary)',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: isCompleting ? 'not-allowed' : 'pointer',
                      transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
                      opacity: isCompleting ? 0.38 : 1
                    }}
                    onClick={handleCompleteTask}
                    disabled={isCompleting}
                  >
                    {isCompleting ? 'Completing...' : '✅ Mark Complete'}
                  </button>
                )}
              </>
            )}

            {/* Parent Actions */}
            {userRole === 'parent' && (
              <>
                {task.status === 'pending' && (
                  <button
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: 'var(--md-sys-shape-corner-full)',
                      backgroundColor: 'var(--md-sys-color-primary)',
                      color: 'var(--md-sys-color-on-primary)',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
                    }}
                    onClick={() => {
                      if (onEdit && typeof onEdit === 'function') {
                        onEdit(task);
                      } else {
                        console.warn('onEdit is not a function or not provided');
                      }
                    }}
                  >
                    Edit Task
                  </button>
                )}
                {canConfirm && (
                  <button
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: 'var(--md-sys-shape-corner-full)',
                      backgroundColor: isConfirming ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-secondary)',
                      color: isConfirming ? 'var(--md-sys-color-surface)' : 'var(--md-sys-color-on-secondary)',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: isConfirming ? 'not-allowed' : 'pointer',
                      transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
                      opacity: isConfirming ? 0.38 : 1
                    }}
                    onClick={handleConfirmTask}
                    disabled={isConfirming}
                  >
                    {isConfirming ? 'Confirming...' : '✅ Confirm Complete'}
                  </button>
                )}
                {canGiveFeedback && (
                  <button
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: 'var(--md-sys-shape-corner-full)',
                      backgroundColor: 'var(--md-sys-color-primary)',
                      color: 'var(--md-sys-color-on-primary)',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
                    }}
                    onClick={() => setShowFeedbackModal(true)}
                  >
                    💝 Give Feedback
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Help Request Modal */}
      {showHelpRequest && (
        <HelpRequest
          familyId={familyId}
          taskId={task.id}
          taskTitle={task.title}
          currentUser={user}
          onClose={() => setShowHelpRequest(false)}
          onSuccess={handleHelpSuccess}
        />
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <FeedbackModal
          familyId={familyId}
          taskId={task.id}
          taskTitle={task.title}
          completedByName={task.completedByName || 'Au Pair'}
          currentUser={user}
          onClose={() => setShowFeedbackModal(false)}
          onSuccess={handleFeedbackSuccess}
        />
      )}
    </div>
  );
};

export default TaskDetailModal;