import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../firebase';
import { doc, updateDoc, serverTimestamp, arrayUnion, getDoc } from 'firebase/firestore';
import { completeHouseholdTodo, confirmHouseholdTodo } from '../../utils/householdTodosUtils';
import { useAuPairExperience } from '../../hooks/useAuPairExperience';
import TaskInstructions from './TaskInstructions/TaskInstructions';
import ExamplePhotos from './TaskGuidance/ExamplePhotos';
import FirstTimeHelper from './TaskGuidance/FirstTimeHelper';
import FeedbackModal from './TaskFeedback/FeedbackModal';
import './TaskDetailModal.css';

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

const TaskDetailModal = ({ 
  task, 
  familyId, 
  userRole, 
  onClose, 
  onTaskUpdate,
  onEdit 
}) => {
  const [user] = useAuthState(auth);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [completionPhotos, setCompletionPhotos] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success'); // 'success' or 'error'
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [respondingToComment, setRespondingToComment] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [userProfileData, setUserProfileData] = useState(null);

  // Get au pair experience for learning mode
  const { 
    isNewAuPair, 
    shouldShowLearningMode, 
    incrementTaskCount 
  } = useAuPairExperience(familyId, userRole === 'aupair' ? user?.uid : null);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserProfileData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };
    
    fetchUserProfile();
  }, [user?.uid]);

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

  const handleAddComment = async () => {
    if (!commentText.trim() || !user) return;
    
    setIsAddingComment(true);
    try {
      // Create timestamp as Date object first for the comment object
      const now = new Date();
      
      const newComment = {
        id: `comment_${Date.now()}`,
        message: commentText.trim(),
        requestedBy: user.uid, // Using the same field names as existing help requests
        requestedByName: userProfileData?.name || user.displayName || user.email,
        authorId: user.uid,
        authorName: userProfileData?.name || user.displayName || user.email,
        authorRole: userRole,
        timestamp: now, // Use Date object instead of serverTimestamp for arrayUnion
        isQuestion: commentText.trim().endsWith('?'),
        hasResponse: false,
        response: null,
        responseBy: null,
        responseAt: null
      };

      const taskRef = doc(db, 'families', familyId, 'householdTodos', task.id);
      
      // First, get the current helpRequests array
      const currentHelpRequests = task.helpRequests || [];
      
      // Add the new comment to the array
      const updatedHelpRequests = [...currentHelpRequests, newComment];
      
      // Update the document with the new array
      await updateDoc(taskRef, {
        helpRequests: updatedHelpRequests,
        updatedAt: serverTimestamp()
      });

      setMessage('Comment added! 💬');
      setMessageType('success');
      setCommentText('');
      
      // Refresh task data
      setTimeout(() => {
        onTaskUpdate?.();
      }, 500);
    } catch (error) {
      console.error('Error adding comment:', error);
      console.error('Error details:', error.message);
      console.error('Task ID:', task.id);
      console.error('Family ID:', familyId);
      setMessage('Error adding comment. Please try again.');
      setMessageType('error');
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleRespond = (commentIndex) => {
    setRespondingToComment(commentIndex);
    setResponseText('');
  };

  const handleSubmitResponse = async () => {
    if (!responseText.trim() || !user) return;

    try {
      // Update the help request with response
      const updatedHelpRequests = [...task.helpRequests];
      const requestIndex = respondingToComment;
      
      updatedHelpRequests[requestIndex] = {
        ...updatedHelpRequests[requestIndex],
        response: responseText.trim(),
        responseBy: user.uid,
        responseAt: new Date(),
        resolved: true,
        hasResponse: true
      };

      // Update the task in Firestore
      const taskRef = doc(db, 'families', familyId, 'householdTodos', task.id);
      await updateDoc(taskRef, {
        helpRequests: updatedHelpRequests,
        updatedAt: serverTimestamp()
      });

      setMessage('Response sent successfully! 📝');
      setMessageType('success');
      setRespondingToComment(null);
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
    setRespondingToComment(null);
    setResponseText('');
  };

  const isOverdue = task.dueDate && task.dueDate.toDate() < new Date() && task.status === 'pending';
  const canComplete = userRole === 'aupair' && task.status === 'pending';
  const canConfirm = userRole === 'parent' && task.status === 'completed';
  const canGiveFeedback = userRole === 'parent' && task.status === 'completed';
  const canAddComment = task.status === 'pending' || task.status === 'in-progress';

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

          {/* Comments Section */}
          <div className="comments-section">
            <h4>💬 Comments</h4>
            
            {/* Add Comment Form */}
            {canAddComment && (
              <div className="add-comment-form">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment or ask a question..."
                  rows={3}
                  className="comment-textarea"
                  disabled={isAddingComment}
                />
                <button
                  className="comment-submit-btn"
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || isAddingComment}
                  style={{
                    marginTop: '8px',
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: 'var(--md-sys-shape-corner-full)',
                    backgroundColor: !commentText.trim() || isAddingComment ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-primary)',
                    color: !commentText.trim() || isAddingComment ? 'var(--md-sys-color-surface)' : 'var(--md-sys-color-on-primary)',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: !commentText.trim() || isAddingComment ? 'not-allowed' : 'pointer',
                    opacity: !commentText.trim() || isAddingComment ? 0.38 : 1,
                    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
                  }}
                >
                  {isAddingComment ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            )}
            
            {/* Comments List */}
            {task.helpRequests?.length > 0 && (
              <div className="comments-list">
                {task.helpRequests.map((comment, index) => {
                  const isUnansweredQuestion = comment.isQuestion && !comment.hasResponse;
                  
                  return (
                    <div 
                      key={index} 
                      className={`comment-item ${isUnansweredQuestion ? 'unanswered-question' : ''}`}
                      style={isUnansweredQuestion ? { backgroundColor: '#FFF9C4', borderColor: '#F9A825' } : {}}
                    >
                      <div className="comment-content">
                        <p className="comment-message">{comment.message}</p>
                        <div className="comment-metadata">
                          <span className="comment-date">
                            {comment.timestamp?.toDate().toLocaleString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                          </span>
                          <span className="comment-author-tag">
                            {getFriendlyName(comment.authorName || comment.requestedByName)}
                          </span>
                        </div>
                      </div>
                      {comment.response && (
                        <div className="comment-response-thread">
                          <div className="response-content">
                            <p className="response-message">{comment.response}</p>
                            <div className="comment-metadata">
                              <span className="comment-date">
                                {comment.responseAt?.toDate ? comment.responseAt.toDate().toLocaleString('en-GB', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                }) : 'Recently'}
                              </span>
                              <span className="comment-author-tag">Parent</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {userRole === 'parent' && !comment.response && comment.isQuestion && (
                        <div className="comment-actions">
                          {respondingToComment === index ? (
                          <div className="response-form">
                            <textarea
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              placeholder="Type your response..."
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
                            onClick={() => handleRespond(index)}
                          >
                            📝 Respond
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            )}
          </div>

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

          {/* Completion Photos for Au Pair */}
          {canComplete && (
            <div className="completion-form">
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