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

  const templates = [
    { text: "Today the kids are allowed to watch a film", category: "kids" },
    { text: "Late pickup today at 6 PM", category: "schedule" },
    { text: "Special dinner rules - no dessert until vegetables are finished", category: "rules" },
    { text: "School event tomorrow - remember permission slip", category: "schedule" },
    { text: "Kids can have friends over this afternoon", category: "kids" },
    { text: "Early bedtime tonight", category: "kids" }
  ];

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
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your family message..."
              rows={3}
              style={styles.textarea}
              disabled={isSubmitting}
              required
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Priority:</label>
              <select
                className="form-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={isSubmitting || (userRole === 'aupair' && priority === 'important')}
              >
                <option value="normal">Normal</option>
                {userRole === 'parent' && <option value="important">Important</option>}
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
    padding: 'var(--space-4)'
  },
  modal: {
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: 'var(--shadow-xl)',
    animation: 'scaleIn 0.2s ease-out'
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
    cursor: 'pointer',
    fontSize: 'var(--font-size-lg)',
    color: 'var(--text-secondary)',
    padding: 'var(--space-1)',
    borderRadius: 'var(--radius-sm)',
    transition: 'var(--transition-fast)'
  },
  templatesSection: {
    marginBottom: 'var(--space-6)'
  },
  templatesTitle: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-3)'
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--space-2)'
  },
  templateButton: {
    background: 'var(--gray-50)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2)',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    textAlign: 'left',
    lineHeight: 'var(--line-height-tight)'
  },
  formGroup: {
    marginBottom: 'var(--space-4)'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-4)'
  },
  label: {
    display: 'block',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-2)'
  },
  textarea: {
    minHeight: '80px',
    resize: 'vertical'
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'var(--space-6)'
  },
  rightActions: {
    display: 'flex',
    gap: 'var(--space-3)'
  },
  deleteButton: {
    background: 'none',
    border: '1px solid #ef4444',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-4)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: '#ef4444',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  }
};

// Add template button hover effect
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .template-button:hover {
      background-color: var(--gray-100);
      border-color: var(--border-medium);
      color: var(--text-primary);
    }
    
    .close-button:hover {
      background-color: var(--gray-100);
      color: var(--text-primary);
    }
    
    .delete-button:hover {
      background-color: #ef4444;
      color: white;
    }
    
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
  document.head.appendChild(style);
}

export default AddFamilyNote;