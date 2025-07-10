import React, { useState } from 'react';

const AddFamilyNote = ({ onSubmit, onCancel, onDelete, initialNote = null, userRole }) => {
  const [content, setContent] = useState(initialNote?.content || '');
  const [priority, setPriority] = useState(initialNote?.priority || 'normal');
  const [category, setCategory] = useState(initialNote?.category || 'general');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!initialNote;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        content: content.trim(),
        priority,
        category
      });
      
      if (!isEditing) {
        // Clear form after successful creation
        setContent('');
        setPriority('normal');
        setCategory('general');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      if (onDelete) {
        await onDelete(initialNote.id);
      } else {
        console.error('onDelete handler not provided');
        alert('Delete functionality not available');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parentTemplates = [
    { text: "Today the kids are allowed to watch a film", category: "kids" },
    { text: "Late pickup today at 6 PM", category: "schedule" },
    { text: "Special dinner rules - no dessert until vegetables are finished", category: "rules" },
    { text: "School event tomorrow - remember permission slip", category: "schedule" },
    { text: "Kids can have friends over this afternoon", category: "kids" },
    { text: "Early bedtime tonight", category: "kids" },
    { text: "Thank you for handling the emergency so well", category: "thankyou" },
    { text: "Thanks for teaching [child name] that new skill", category: "thankyou" },
    { text: "Appreciate you staying late yesterday", category: "thankyou" }
  ];

  const auPairTemplates = [
    { text: "The children had a great day and ate all their meals", category: "kids" },
    { text: "Running a bit late for pickup - will be there by [time]", category: "schedule" },
    { text: "Need clarification on bedtime routine for tonight", category: "kids" },
    { text: "Completed all scheduled activities today", category: "general" },
    { text: "One of the children seems unwell - please advise", category: "kids" },
    { text: "Tomorrow's school items are packed and ready", category: "schedule" },
    { text: "Had to handle a small incident - everything is fine now", category: "kids" },
    { text: "Children would like to invite a friend over - is this okay?", category: "kids" },
    { text: "Thank you for the lovely family dinner", category: "thankyou" },
    { text: "Thanks for understanding the schedule change", category: "thankyou" },
    { text: "Appreciate your help with homework", category: "thankyou" }
  ];

  const templates = userRole === 'parent' ? parentTemplates : auPairTemplates;

  const applyTemplate = (template) => {
    setContent(template.text);
    setCategory(template.category);
  };

  return (
    <div style={styles.overlay}>
      <div className="card" style={styles.modal}>
        <div className="card-header">
          <h3 style={styles.title}>
            {isEditing ? 'Edit Note' : 'Add Family Note'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="card-body">
          {!isEditing && (
            <div style={styles.templatesSection}>
              <h4 style={styles.templatesTitle}>Quick Templates:</h4>
              <div style={styles.templateGrid}>
                {templates.map((template, index) => (
                  <button
                    key={index}
                    type="button"
                    style={styles.templateButton}
                    onClick={() => applyTemplate(template)}
                    disabled={isSubmitting}
                  >
                    {template.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Message:</label>
            <textarea
              className="form-input"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 500))}
              placeholder="Enter your family message..."
              rows={3}
              style={styles.textarea}
              disabled={isSubmitting}
              required
              maxLength={500}
            />
            <div style={styles.characterCount}>
              <span style={{
                color: content.length > 450 ? 'var(--md-sys-color-error)' : 
                       content.length > 400 ? 'var(--md-sys-color-tertiary)' : 
                       'var(--md-sys-color-on-surface-variant)'
              }}>
                {content.length}/500
              </span>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Priority:</label>
              <select
                className="form-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Category:</label>
              <select
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="general">General</option>
                <option value="kids">Kids</option>
                <option value="schedule">Schedule</option>
                <option value="rules">Rules</option>
                <option value="thankyou">Thank you</option>
              </select>
            </div>
          </div>

          <div style={styles.actions}>
            {isEditing && (
              <button
                type="button"
                style={styles.deleteButton}
                className="delete-button"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <div style={styles.rightActions}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!content.trim() || isSubmitting}
              >
                {isSubmitting 
                  ? (isEditing ? 'Updating...' : 'Adding...') 
                  : (isEditing ? 'Update Note' : 'Add Note')
                }
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

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
    zIndex: 99999,
    padding: '16px'
  },
  modal: {
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    backgroundColor: 'var(--md-sys-color-surface)',
    borderRadius: 'var(--md-sys-shape-corner-large)',
    boxShadow: 'var(--md-sys-elevation-level3)',
    animation: 'scaleIn 0.2s ease-out'
  },
  title: {
    fontSize: '24px',
    fontWeight: '400',
    color: 'var(--md-sys-color-on-surface)',
    margin: 0,
    lineHeight: '32px'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '24px',
    color: 'var(--md-sys-color-on-surface-variant)',
    padding: '4px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  templatesSection: {
    marginBottom: '24px'
  },
  templatesTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '12px'
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '8px'
  },
  templateButton: {
    background: 'var(--md-sys-color-surface-container-low)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    padding: '8px',
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    textAlign: 'left',
    lineHeight: '1.4'
  },
  formGroup: {
    marginBottom: '16px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '8px'
  },
  textarea: {
    minHeight: '80px',
    resize: 'vertical'
  },
  characterCount: {
    marginTop: '4px',
    fontSize: '12px',
    textAlign: 'right'
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '24px'
  },
  rightActions: {
    display: 'flex',
    gap: '12px'
  },
  deleteButton: {
    background: 'none',
    border: '1px solid var(--md-sys-color-error)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--md-sys-color-error)',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  }
};

// Add template button hover effect
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    /* Template button hover */
    .template-button:hover {
      background-color: var(--md-sys-color-surface-container);
      border-color: var(--md-sys-color-outline);
      color: var(--md-sys-color-on-surface);
    }
    
    /* Close button hover */
    .close-button:hover {
      background-color: var(--md-sys-color-surface-container-highest);
      color: var(--md-sys-color-on-surface);
    }
    
    /* Delete button hover */
    .delete-button:hover {
      background-color: var(--md-sys-color-error);
      color: var(--md-sys-color-on-error);
      border-color: var(--md-sys-color-error);
    }
    
    /* Form inputs with MD3 styling */
    .form-input {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-small);
      background-color: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      font-size: 16px;
      transition: var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
    }
    
    .form-input:focus {
      outline: none;
      border-color: var(--md-sys-color-primary);
      box-shadow: 0 0 0 1px var(--md-sys-color-primary);
    }
    
    .form-input:disabled {
      background-color: var(--md-sys-color-surface-container-highest);
      color: var(--md-sys-color-on-surface-variant);
      opacity: 0.6;
    }
    
    /* Buttons with MD3 styling */
    .btn {
      padding: 10px 24px;
      border-radius: var(--md-sys-shape-corner-full);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
      border: none;
      min-width: 64px;
      height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    
    .btn-primary {
      background-color: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
    }
    
    .btn-primary:hover:not(:disabled) {
      box-shadow: var(--md-sys-elevation-level2);
    }
    
    .btn-primary:disabled {
      background-color: var(--md-sys-color-on-surface);
      opacity: 0.12;
      color: var(--md-sys-color-on-surface);
      cursor: not-allowed;
    }
    
    .btn-secondary {
      background-color: transparent;
      color: var(--md-sys-color-primary);
      border: 1px solid var(--md-sys-color-outline);
    }
    
    .btn-secondary:hover:not(:disabled) {
      background-color: var(--md-sys-color-primary-container);
    }
    
    .btn-secondary:disabled {
      color: var(--md-sys-color-on-surface);
      opacity: 0.38;
      cursor: not-allowed;
    }
    
    /* Card styling */
    .card {
      background-color: var(--md-sys-color-surface);
      border-radius: var(--md-sys-shape-corner-large);
      overflow: hidden;
    }
    
    .card-header {
      padding: 24px 24px 16px 24px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
    }
    
    .card-body {
      padding: 24px;
    }
    
    /* Animation */
    @keyframes scaleIn {
      from {
        transform: scale(0.95);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
  `;
  
  // Only add if not already present
  if (!document.querySelector('#add-family-note-styles')) {
    styleElement.id = 'add-family-note-styles';
    document.head.appendChild(styleElement);
  }
}

export default AddFamilyNote;