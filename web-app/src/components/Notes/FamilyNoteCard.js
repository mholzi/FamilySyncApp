import React from 'react';

const FamilyNoteCard = ({ 
  note, 
  onDismiss, 
  onEdit, 
  onDelete, 
  canEdit = false, 
  canDelete = false,
  userRole 
}) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'urgent':
        return {
          borderLeft: '4px solid var(--primary-purple)',
          backgroundColor: 'rgba(99, 102, 241, 0.05)'
        };
      case 'important':
        return {
          borderLeft: '4px solid var(--secondary-orange)',
          backgroundColor: 'rgba(249, 115, 22, 0.05)'
        };
      default:
        return {
          borderLeft: '4px solid var(--gray-200)',
          backgroundColor: 'var(--white)'
        };
    }
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'normal') return null;
    
    const badgeClass = priority === 'urgent' ? 'badge-purple' : 'badge-orange';
    return (
      <span className={`badge ${badgeClass}`}>
        {priority === 'urgent' ? '🚨 Urgent' : '⚠️ Important'}
      </span>
    );
  };

  return (
    <div className="card" style={{...styles.noteCard, ...getPriorityStyle(note.priority)}}>
      <div style={styles.noteHeader}>
        <div style={styles.noteInfo}>
          <div style={styles.noteMeta}>
            <span style={styles.timeStamp}>{formatTime(note.createdAt)}</span>
            {getPriorityBadge(note.priority)}
          </div>
          {note.editedAt && (
            <span style={styles.editedTag}>(edited)</span>
          )}
        </div>
        
        <div style={styles.actions}>
          {(canEdit || canDelete) && (
            <div style={styles.ownerActions}>
              {canEdit && (
                <button 
                  style={styles.editButton}
                  onClick={() => onEdit(note)}
                  title="Edit note"
                >
                  ✏️
                </button>
              )}
              {canDelete && (
                <button 
                  style={styles.deleteButton}
                  onClick={() => onDelete(note.id)}
                  title="Delete note"
                >
                  🗑️
                </button>
              )}
            </div>
          )}
          
          <button 
            style={styles.dismissButton}
            onClick={() => onDismiss(note.id)}
            title="Dismiss from my view"
          >
            ✕
          </button>
        </div>
      </div>

      <div style={styles.noteContent}>
        {note.content}
      </div>

      {note.category && note.category !== 'general' && (
        <div style={styles.category}>
          <span className="badge" style={styles.categoryBadge}>
            {note.category}
          </span>
        </div>
      )}
    </div>
  );
};

const styles = {
  noteCard: {
    position: 'relative',
    transition: 'var(--transition-normal)',
    marginBottom: 'var(--space-3)'
  },
  noteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'var(--space-3)'
  },
  noteInfo: {
    flex: 1
  },
  noteMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-1)'
  },
  timeStamp: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    fontWeight: 'var(--font-weight-medium)'
  },
  editedTag: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic'
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)'
  },
  ownerActions: {
    display: 'flex',
    gap: 'var(--space-1)'
  },
  editButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 'var(--space-1)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-sm)',
    transition: 'var(--transition-fast)',
    opacity: 0.7
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 'var(--space-1)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-sm)',
    transition: 'var(--transition-fast)',
    opacity: 0.7
  },
  dismissButton: {
    background: 'var(--gray-100)',
    border: 'none',
    cursor: 'pointer',
    width: '24px',
    height: '24px',
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)',
    transition: 'var(--transition-fast)',
    fontWeight: 'var(--font-weight-bold)'
  },
  noteContent: {
    fontSize: 'var(--font-size-sm)',
    lineHeight: 'var(--line-height-normal)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-2)'
  },
  category: {
    marginTop: 'var(--space-2)'
  },
  categoryBadge: {
    fontSize: 'var(--font-size-xs)',
    backgroundColor: 'var(--gray-100)',
    color: 'var(--text-secondary)',
    textTransform: 'capitalize'
  }
};

// Add hover effects
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .family-note-card:hover .edit-button,
    .family-note-card:hover .delete-button {
      opacity: 1;
      background-color: var(--gray-50);
    }
    
    .family-note-card .dismiss-button:hover {
      background-color: var(--gray-200);
      color: var(--text-primary);
    }
  `;
  document.head.appendChild(style);
}

export default FamilyNoteCard;