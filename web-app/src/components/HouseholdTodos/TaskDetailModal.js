import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { completeHouseholdTodo, confirmHouseholdTodo } from '../../utils/householdTodosUtils';
import { useAuPairExperience } from '../../hooks/useAuPairExperience';
import TaskInstructions from './TaskInstructions/TaskInstructions';
import ExamplePhotos from './TaskGuidance/ExamplePhotos';
import DifficultyBadge from './TaskGuidance/DifficultyBadge';
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
          <div className="task-header-content">
            <div className="task-title-section">
              <h2>{task.title}</h2>
              <div className="task-badges">
                <DifficultyBadge difficulty={task.difficulty} />
                {task.category && (
                  <span className={`task-category-badge ${task.category}`}>
                    {task.category}
                  </span>
                )}
                {task.isRecurring && (
                  <span className="recurring-badge">
                    🔄 {task.recurringType}
                  </span>
                )}
              </div>
            </div>
            <button className="task-detail-close" onClick={onClose}>×</button>
          </div>
          
          {task.dueDate && (
            <div className={`task-due-date ${isOverdue ? 'overdue' : ''}`}>
              📅 Due: {task.dueDate.toDate().toLocaleDateString()}
              {task.estimatedTime && (
                <span className="estimated-time">
                  ⏱️ {task.estimatedTime} min
                </span>
              )}
            </div>
          )}
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
                            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                              <button
                                style={{
                                  padding: 'var(--space-2) var(--space-3)',
                                  border: 'none',
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: !responseText.trim() ? 'var(--gray-400)' : 'var(--primary-purple)',
                                  color: 'var(--white)',
                                  fontSize: 'var(--font-size-sm)',
                                  fontWeight: 'var(--font-weight-medium)',
                                  cursor: !responseText.trim() ? 'not-allowed' : 'pointer',
                                  transition: 'var(--transition-fast)'
                                }}
                                onClick={handleSubmitResponse}
                                disabled={!responseText.trim()}
                              >
                                Send Response
                              </button>
                              <button
                                style={{
                                  padding: 'var(--space-2) var(--space-3)',
                                  border: '1px solid var(--border-light)',
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: 'var(--white)',
                                  color: 'var(--text-secondary)',
                                  fontSize: 'var(--font-size-sm)',
                                  fontWeight: 'var(--font-weight-medium)',
                                  cursor: 'pointer',
                                  transition: 'var(--transition-fast)'
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
                              padding: 'var(--space-2) var(--space-3)',
                              border: 'none',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: 'var(--primary-purple)',
                              color: 'var(--white)',
                              fontSize: 'var(--font-size-sm)',
                              fontWeight: 'var(--font-weight-medium)',
                              cursor: 'pointer',
                              transition: 'var(--transition-fast)'
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
            <div className="completion-section">
              <h4>📝 Comments</h4>
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
                      marginTop: 'var(--space-2)',
                      padding: 'var(--space-2) var(--space-3)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--white)',
                      color: 'var(--text-secondary)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
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
            </div>
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
                      padding: 'var(--space-2) var(--space-4)',
                      border: '1px solid var(--primary-purple)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--white)',
                      color: 'var(--primary-purple)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                    onClick={() => setShowHelpRequest(true)}
                  >
                    🤝 Need Help?
                  </button>
                )}
                {canComplete && (
                  <button
                    style={{
                      padding: 'var(--space-2) var(--space-4)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isCompleting ? 'var(--gray-400)' : 'var(--primary-purple)',
                      color: 'var(--white)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      cursor: isCompleting ? 'not-allowed' : 'pointer',
                      transition: 'var(--transition-fast)'
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
                      padding: 'var(--space-2) var(--space-4)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--white)',
                      color: 'var(--text-secondary)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                    onClick={() => {
                      if (onEdit && typeof onEdit === 'function') {
                        onEdit(task);
                      } else {
                        console.warn('onEdit is not a function or not provided');
                      }
                    }}
                  >
                    ✏️ Edit Task
                  </button>
                )}
                {canConfirm && (
                  <button
                    style={{
                      padding: 'var(--space-2) var(--space-4)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isConfirming ? 'var(--gray-400)' : '#22c55e',
                      color: 'var(--white)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      cursor: isConfirming ? 'not-allowed' : 'pointer',
                      transition: 'var(--transition-fast)'
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
                      padding: 'var(--space-2) var(--space-4)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--primary-purple)',
                      color: 'var(--white)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
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