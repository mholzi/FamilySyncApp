import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
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

  // Get au pair experience for learning mode
  const { 
    isNewAuPair, 
    shouldShowLearningMode, 
    incrementTaskCount 
  } = useAuPairExperience(familyId, userRole === 'aupair' ? user?.uid : null);

  const handleCompleteTask = async () => {
    if (!user) return;
    
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
      setTimeout(() => {
        onTaskUpdate?.();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error completing task:', error);
      setMessage('Error completing task. Please try again.');
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
      setTimeout(() => {
        onTaskUpdate?.();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error confirming task:', error);
      setMessage('Error confirming task. Please try again.');
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

  const handleHelpSuccess = (msg) => {
    setMessage(msg);
    setShowHelpRequest(false);
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
            <div className="task-message">
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

          {/* First Time Helper */}
          {task.firstTimeHelp && (
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
              <h4>📝 Task Completion</h4>
              <div className="completion-form">
                <div className="form-group">
                  <label>Notes (optional)</label>
                  <textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Add any notes about how you completed this task..."
                    rows={3}
                  />
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
                    className="btn btn-help"
                    onClick={() => setShowHelpRequest(true)}
                  >
                    🤝 Need Help?
                  </button>
                )}
                {canComplete && (
                  <button
                    className="btn btn-primary"
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
                    className="btn btn-secondary"
                    onClick={() => onEdit(task)}
                  >
                    ✏️ Edit Task
                  </button>
                )}
                {canConfirm && (
                  <button
                    className="btn btn-success"
                    onClick={handleConfirmTask}
                    disabled={isConfirming}
                  >
                    {isConfirming ? 'Confirming...' : '✅ Confirm Complete'}
                  </button>
                )}
                {canGiveFeedback && (
                  <button
                    className="btn btn-primary"
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