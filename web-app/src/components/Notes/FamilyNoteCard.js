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
        return 'var(--md-sys-color-error)'; // red
      case 'important':
        return 'var(--md-sys-color-tertiary)'; // orange
      default:
        return 'var(--md-sys-color-outline)'; // gray
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
    
    // Extract RGB values from CSS variable for opacity
    let bgColor = 'var(--md-sys-color-surface-container-highest)';
    if (priority === 'urgent') {
      bgColor = 'var(--md-sys-color-error-container)';
    } else if (priority === 'important') {
      bgColor = 'var(--md-sys-color-tertiary-container)';
    }
    
    return {
      fontSize: '12px',
      color: priorityColor,
      backgroundColor: bgColor,
      padding: '4px 8px',
      borderRadius: 'var(--md-sys-shape-corner-extra-small)',
      fontWeight: '500',
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
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    padding: '16px',
    marginBottom: '12px',
    boxShadow: 'var(--md-sys-elevation-level1)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    transition: 'var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard)',
    minWidth: '240px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '120px'
  },
  noteHeader: {
    marginBottom: '20px'
  },
  contentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '4px'
  },
  authorTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    lineHeight: '1.3',
    flex: 1,
    textAlign: 'left'
  },
  noteContent: {
    fontSize: '13px',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: '1.4',
    textAlign: 'left',
    flex: 1
  },
  editedTag: {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontStyle: 'italic'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginRight: '5px'
  },
  timeStamp: {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    padding: '4px 8px',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    fontWeight: '500',
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
    marginBottom: '12px',
    minHeight: '20px',
    flex: 1
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    marginTop: 'auto',
    position: 'relative',
    zIndex: 5
  },
  leftBottomSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  priorityBadge: {
    fontSize: '12px',
    color: 'var(--md-sys-color-primary)',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    padding: '8px 12px',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    fontWeight: '500',
    minWidth: '80px',
    textAlign: 'center',
    border: '1px solid transparent',
    cursor: 'default',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    height: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  dismissButton: {
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    minWidth: '80px',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)'
  },
  editButton: {
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    minWidth: '80px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    color: 'var(--md-sys-color-on-surface-variant)'
  },
  likeButton: {
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    backgroundColor: 'transparent',
    color: 'var(--md-sys-color-on-surface-variant)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    position: 'relative',
    zIndex: 10
  },
  likeButtonActive: {
    color: 'var(--md-sys-color-error)' // Red for liked state
  },
  likeIcon: {
    fontSize: '16px'
  },
  likeCount: {
    fontSize: '12px',
    marginLeft: '4px'
  }
};

// Add hover effects
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .family-note-card {
      transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    }
    
    .family-note-card:hover {
      box-shadow: var(--md-sys-elevation-level2);
      transform: translateY(-1px);
    }
    
    .family-note-card .dismiss-button:hover {
      box-shadow: var(--md-sys-elevation-level1);
    }
    
    .family-note-card .edit-button:hover {
      background-color: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-on-surface);
    }
    
    .family-note-card .like-button:hover {
      background-color: var(--md-sys-color-surface-container-highest);
    }
  `;
  
  // Only add if not already present
  if (!document.querySelector('#family-note-card-styles')) {
    styleElement.id = 'family-note-card-styles';
    document.head.appendChild(styleElement);
  }
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