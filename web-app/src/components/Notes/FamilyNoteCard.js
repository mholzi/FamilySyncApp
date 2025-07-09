import React, { useState, useEffect } from 'react';
import { getUserName } from '../../utils/userUtils';

const FamilyNoteCard = ({ 
  note, 
  onDismiss, 
  onEdit, 
  onDelete, 
  onLike,
  canEdit = false, 
  canDelete = false,
  userRole,
  userData = null, // Current user data
  familyData = null, // Family data with member information
  userId = null // Direct userId prop for clarity
}) => {
  const [authorName, setAuthorName] = useState('Loading...');
  const [, forceUpdate] = useState({});
  
  // Get the current user ID from props
  const currentUserId = userId || userData?.uid || userData?.id;
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return '#ef4444'; // red
      case 'important':
        return '#f97316'; // orange
      default:
        return '#d1d5db'; // gray
    }
  };

  // Auto-refresh timestamp every minute
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({}); // Force re-render to update timestamp
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Fetch the author name when component mounts or createdBy changes
  useEffect(() => {
    const fetchAuthorName = async () => {
      if (!note.createdBy) {
        setAuthorName('Unknown User');
        return;
      }

      // Debug logging (commented out after verification)
      // console.log('FamilyNoteCard - User data check:');
      // console.log('userData:', userData);
      // console.log('note.createdBy:', note.createdBy);
      // console.log('userData?.uid:', userData?.uid);
      // console.log('userData?.id:', userData?.id);
      // console.log('Match with uid:', userData?.uid === note.createdBy);
      // console.log('Match with id:', userData?.id === note.createdBy);

      // If this is the current user
      if (currentUserId && currentUserId === note.createdBy) {
        const name = userData.displayName || userData.name || userData.email?.split('@')[0] || 'You';
        setAuthorName(name);
        return;
      }

      // For other users, fetch their name from the database
      try {
        const fetchedName = await getUserName(note.createdBy);
        setAuthorName(fetchedName);
      } catch (error) {
        console.error('Error fetching author name:', error);
        // Fallback to role-based names
        if (familyData) {
          if (familyData.parentUids && familyData.parentUids.includes(note.createdBy)) {
            setAuthorName('Parent');
          } else if (familyData.auPairUids && familyData.auPairUids.includes(note.createdBy)) {
            setAuthorName('Au Pair');
          } else {
            setAuthorName('Family Member');
          }
        } else {
          setAuthorName('Family Member');
        }
      }
    };

    fetchAuthorName();
  }, [note.createdBy, currentUserId, userData, familyData]);

  const getPriorityBadgeStyle = (priority) => {
    const priorityColor = getPriorityColor(priority);
    return {
      fontSize: 'var(--font-size-xs)',
      color: priorityColor,
      backgroundColor: `${priorityColor}20`, // 20% opacity of priority color for better visibility
      padding: 'var(--space-1) var(--space-2)',
      borderRadius: 'var(--radius-sm)',
      fontWeight: 'var(--font-weight-medium)',
      flexShrink: 0,
      whiteSpace: 'nowrap'
    };
  };

  return (
    <div 
      className="family-note-card"
      style={styles.noteCard}
    >
      {/* Header with author and timestamp */}
      <div style={styles.noteHeader}>
        <div style={styles.contentRow}>
          <div style={styles.authorTitle}>
            {authorName}
          </div>
          <div style={styles.headerRight}>
            {note.priority && note.priority !== 'normal' && (
              <span style={getPriorityBadgeStyle(note.priority)}>
                {note.priority.charAt(0).toUpperCase() + note.priority.slice(1)}
              </span>
            )}
            <span style={styles.timeStamp}>
              {formatTime(note.createdAt)}
            </span>
          </div>
        </div>
        <div style={styles.contentRow}>
          <span style={styles.noteContent}>
            {note.content}
            {note.editedAt && (
              <span style={styles.editedTag}> (edited)</span>
            )}
          </span>
        </div>
      </div>
      
      {/* Spacer area */}
      <div style={styles.spacerArea}></div>
      
      {/* Bottom row with action buttons on right */}
      <div style={styles.bottomRow}>
        <div style={styles.leftBottomSection}>
          {/* Like button and count */}
          <button 
            style={{
              ...styles.likeButton,
              ...(note.likedBy?.includes(currentUserId) ? styles.likeButtonActive : {})
            }}
            className="like-button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onLike) {
                onLike(note.id);
              }
            }}
            title="Like this note"
            type="button"
          >
            <span style={styles.likeIcon}>
              {note.likedBy?.length > 0 ? '❤️' : '🤍'}
            </span>
            {note.likedBy?.length > 0 && (
              <span style={styles.likeCount}>
                {note.likedBy.includes(currentUserId) && note.likedBy.length > 1
                  ? `You and ${note.likedBy.length - 1} ${note.likedBy.length === 2 ? 'other' : 'others'}`
                  : note.likedBy.length}
              </span>
            )}
          </button>
        </div>
        <div style={styles.actions}>
          {/* Show edit button if current user is the note creator */}
          {currentUserId === note.createdBy && (
            <button 
              style={styles.editButton}
              className="edit-button"
              onClick={() => onEdit(note)}
              title="Edit note"
            >
              Edit
            </button>
          )}
          
          <button 
            style={styles.dismissButton}
            className="dismiss-button"
            onClick={() => onDismiss(note.id)}
            title="Dismiss from my view"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  noteCard: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    marginBottom: 'var(--space-3)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border-light)',
    transition: 'var(--transition-normal)',
    minWidth: '240px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '120px'
  },
  noteHeader: {
    marginBottom: 'calc(var(--space-3) + 10px)'
  },
  contentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-1)'
  },
  authorTitle: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    lineHeight: 'var(--line-height-tight)',
    flex: 1,
    textAlign: 'left'
  },
  noteContent: {
    fontSize: 'calc(var(--font-size-xs) * 1.2)',
    color: 'var(--text-secondary)',
    lineHeight: 'var(--line-height-normal)',
    textAlign: 'left',
    flex: 1
  },
  editedTag: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    marginRight: '5px'
  },
  timeStamp: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    backgroundColor: '#fef3c7',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 'var(--font-weight-medium)',
    flexShrink: 0,
    whiteSpace: 'nowrap'
  },
  authorRow: {
    display: 'flex',
    alignItems: 'center'
  },
  spacerArea: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: 'var(--space-3)',
    minHeight: '20px',
    flex: 1
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 'var(--space-2)',
    marginTop: 'auto',
    position: 'relative',
    zIndex: 5
  },
  leftBottomSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)'
  },
  priorityBadge: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--primary-purple)',
    backgroundColor: '#f3f4f6',
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    fontWeight: 'var(--font-weight-medium)',
    minWidth: '80px',
    textAlign: 'center',
    border: '1px solid transparent',
    cursor: 'default',
    transition: 'var(--transition-fast)',
    height: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)'
  },
  dismissButton: {
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    minWidth: '80px',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)'
  },
  editButton: {
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    minWidth: '80px',
    backgroundColor: '#f3f4f6',
    color: 'var(--text-primary)'
  },
  likeButton: {
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-1) var(--space-2)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    position: 'relative',
    zIndex: 10
  },
  likeButtonActive: {
    color: '#ef4444' // Red for liked state
  },
  likeIcon: {
    fontSize: 'var(--font-size-base)'
  },
  likeCount: {
    fontSize: 'var(--font-size-xs)',
    marginLeft: 'var(--space-1)'
  }
};

// Add hover effects
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .family-note-card {
      transition: all 0.2s ease;
    }
    
    .family-note-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }
    
    
    .family-note-card .dismiss-button:hover {
      background-color: var(--gray-50);
      border-color: var(--gray-300);
      color: var(--text-primary);
    }
    
    .family-note-card .edit-button:hover {
      background-color: var(--gray-200);
      color: var(--text-primary);
    }
    
    .family-note-card .like-button:hover {
      background-color: var(--gray-50);
    }
  `;
  document.head.appendChild(style);
}

export default React.memo(FamilyNoteCard, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  // Only re-render if note data, permissions, or user data changes
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.content === nextProps.note.content &&
    prevProps.note.priority === nextProps.note.priority &&
    prevProps.note.createdBy === nextProps.note.createdBy &&
    prevProps.note.editedAt === nextProps.note.editedAt &&
    JSON.stringify(prevProps.note.likedBy) === JSON.stringify(nextProps.note.likedBy) &&
    JSON.stringify(prevProps.note.readBy) === JSON.stringify(nextProps.note.readBy) &&
    prevProps.canEdit === nextProps.canEdit &&
    prevProps.canDelete === nextProps.canDelete &&
    prevProps.userRole === nextProps.userRole &&
    prevProps.userData?.uid === nextProps.userData?.uid &&
    prevProps.familyData?.familyId === nextProps.familyData?.familyId &&
    prevProps.userId === nextProps.userId
  );
});