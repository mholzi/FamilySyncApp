import React, { useState } from 'react';
import FamilyNoteCard from './FamilyNoteCard';
import AddFamilyNote from './AddFamilyNote';
import FamilyNotesModal from './FamilyNotesModal';
import useFamilyNotes from '../../hooks/useFamilyNotes';

const FamilyNotesList = ({ familyId, userId, userRole, userData = null, familyData = null, maxDisplayed = null }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [showAllModal, setShowAllModal] = useState(false);
  
  const { 
    visibleNotes, 
    unreadCount,
    loading, 
    error, 
    createNote, 
    editNote, 
    deleteNote, 
    dismissNote,
    toggleLike 
  } = useFamilyNotes(familyId, userId);

  // Sort notes by priority (urgent > important > normal) then by timestamp
  const sortedNotes = [...visibleNotes].sort((a, b) => {
    const priorityOrder = { urgent: 0, important: 1, normal: 2 };
    const priorityDiff = priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal'];
    
    if (priorityDiff !== 0) return priorityDiff;
    
    // Sort by timestamp (newest first)
    const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
    const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
    return bTime - aTime;
  });

  const displayedNotes = maxDisplayed 
    ? sortedNotes.slice(0, maxDisplayed)
    : sortedNotes;

  const handleCreateNote = async (noteData) => {
    await createNote(noteData);
    setShowAddModal(false);
  };

  const handleEditNote = async (noteData) => {
    await editNote(editingNote.id, noteData);
    setEditingNote(null);
  };

  const handleDeleteNote = async (noteId) => {
    await deleteNote(noteId);
  };

  const handleDismissNote = async (noteId) => {
    await dismissNote(noteId);
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingSpinner}></div>
        <span>Loading notes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <span>Error loading notes: {error}</span>
      </div>
    );
  }

  return (
    <div style={styles.container} className="family-notes-container">
      {/* Clean Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>
          Family Notes
          {unreadCount > 0 && (
            <span style={styles.unreadBadge}>
              {unreadCount} unread
            </span>
          )}
        </h3>
      </div>

      {/* Notes List */}
      {displayedNotes.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>💬</div>
          <p style={styles.emptyText}>No active messages</p>
          <p style={styles.emptySubtext}>
            Create the first family note to start communicating!
          </p>
        </div>
      ) : (
        <div>
          <div style={styles.notesList} className="notes-grid">
            {displayedNotes.map((note) => (
              <FamilyNoteCard
                key={note.id}
                note={note}
                onDismiss={handleDismissNote}
                onEdit={setEditingNote}
                onDelete={handleDeleteNote}
                onLike={toggleLike}
                canEdit={note.createdBy === userId}
                canDelete={note.createdBy === userId || userRole === 'parent'}
                userRole={userRole}
                userData={userData}
                familyData={familyData}
                userId={userId}
              />
            ))}
          </div>
          
          {/* Footer 'View All' Link */}
          {maxDisplayed && visibleNotes.length > maxDisplayed && (
            <div style={styles.footer}>
              <button 
                style={styles.viewAllLink}
                className="view-all-link"
                onClick={() => setShowAllModal(true)}
              >
                See all {visibleNotes.length} messages →
                {unreadCount > displayedNotes.filter(n => !n.readBy?.includes(userId)).length && (
                  <span style={styles.viewAllBadge}>
                    {unreadCount - displayedNotes.filter(n => !n.readBy?.includes(userId)).length} unread
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Add Note Button - positioned below notes */}
      <div style={styles.addButtonContainer}>
        <button 
          style={styles.addButton}
          className="add-note-button"
          onClick={() => setShowAddModal(true)}
          title="Add Note"
        >
          Add Note
        </button>
      </div>

      {/* Add Note Modal */}
      {showAddModal && (
        <AddFamilyNote
          onSubmit={handleCreateNote}
          onCancel={() => setShowAddModal(false)}
          userRole={userRole}
        />
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <AddFamilyNote
          onSubmit={handleEditNote}
          onCancel={() => setEditingNote(null)}
          onDelete={async (noteId) => {
            await deleteNote(noteId);
            setEditingNote(null);
          }}
          initialNote={editingNote}
          userRole={userRole}
        />
      )}

      {/* View All Notes Modal */}
      {showAllModal && (
        <FamilyNotesModal
          isOpen={showAllModal}
          onClose={() => setShowAllModal(false)}
          familyId={familyId}
          userId={userId}
          userRole={userRole}
          userData={userData}
          familyData={familyData}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    width: '100%'
  },
  header: {
    marginBottom: '16px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '400',
    color: 'var(--md-sys-color-on-surface)',
    margin: 0,
    textAlign: 'left',
    lineHeight: '32px'
  },
  addButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '16px'
  },
  addButton: {
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard)',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    minWidth: '120px',
    height: '40px',
    boxShadow: 'var(--md-sys-elevation-level1)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  footer: {
    textAlign: 'center',
    marginTop: '16px',
    borderTop: '1px solid var(--md-sys-color-outline-variant)',
    paddingTop: '12px'
  },
  viewAllLink: {
    background: 'none',
    border: 'none',
    color: 'var(--md-sys-color-primary)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '8px 0',
    transition: 'opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    width: '100%'
  },
  notesList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '32px',
    color: 'var(--md-sys-color-on-surface-variant)'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px'
  },
  emptyText: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    margin: '0 0 8px 0'
  },
  emptySubtext: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: '0 0 16px 0'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '32px',
    color: 'var(--md-sys-color-on-surface-variant)'
  },
  loadingSpinner: {
    width: '20px',
    height: '20px',
    border: '2px solid var(--md-sys-color-outline-variant)',
    borderTop: '2px solid var(--md-sys-color-primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  error: {
    padding: '16px',
    backgroundColor: 'var(--md-sys-color-error-container)',
    border: '1px solid var(--md-sys-color-error)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    color: 'var(--md-sys-color-on-error-container)',
    fontSize: '14px'
  },
  unreadBadge: {
    marginLeft: '12px',
    backgroundColor: 'var(--md-sys-color-error)',
    color: 'var(--md-sys-color-on-error)',
    fontSize: '12px',
    fontWeight: '400',
    padding: '4px 8px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    display: 'inline-block'
  },
  viewAllBadge: {
    marginLeft: '8px',
    backgroundColor: 'var(--md-sys-color-error)',
    color: 'var(--md-sys-color-on-error)',
    fontSize: '12px',
    fontWeight: '400',
    padding: '4px 8px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    display: 'inline-block'
  }
};

// Add hover effects and responsive behavior
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    /* Add button hover effects */
    .family-notes-container .add-note-button:hover {
      box-shadow: var(--md-sys-elevation-level2);
      transform: translateY(-1px);
    }
    
    .family-notes-container .add-note-button:active {
      transform: translateY(0);
    }
    
    /* View all link hover */
    .family-notes-container .view-all-link:hover {
      opacity: 0.8;
      text-decoration: underline;
    }
    
    /* Mobile responsiveness */
    @media (max-width: 768px) {
      .family-notes-container .add-note-button {
        padding: 8px 16px;
        font-size: 14px;
        min-width: 100px;
      }
      
      /* Single column layout on mobile */
      .family-notes-container .notes-grid {
        grid-template-columns: 1fr !important;
      }
    }
    
    /* Ensure proper z-index stacking */
    .family-notes-container {
      position: relative;
      z-index: 1;
    }
    
    /* Loading spinner animation */
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  
  // Only add if not already present
  if (!document.querySelector('#family-notes-styles')) {
    styleElement.id = 'family-notes-styles';
    document.head.appendChild(styleElement);
  }
}

export default FamilyNotesList;