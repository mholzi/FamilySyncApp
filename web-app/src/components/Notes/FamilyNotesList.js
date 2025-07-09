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
    marginBottom: 'var(--space-4)'
  },
  title: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: 0,
    textAlign: 'left'
  },
  addButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 'var(--space-4)'
  },
  addButton: {
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-4)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    minWidth: '120px'
  },
  footer: {
    textAlign: 'center',
    marginTop: 'var(--space-4)',
    borderTop: '1px solid var(--border-light)',
    paddingTop: 'var(--space-3)'
  },
  viewAllLink: {
    background: 'none',
    border: 'none',
    color: 'var(--primary-purple)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    padding: 'var(--space-2) 0',
    transition: 'opacity 0.2s ease',
    width: '100%'
  },
  notesList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 'var(--space-3)'
  },
  emptyState: {
    textAlign: 'center',
    padding: 'var(--space-8)',
    color: 'var(--text-secondary)'
  },
  emptyIcon: {
    fontSize: 'var(--font-size-4xl)',
    marginBottom: 'var(--space-3)'
  },
  emptyText: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    margin: '0 0 var(--space-2) 0'
  },
  emptySubtext: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    margin: '0 0 var(--space-4) 0'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-8)',
    color: 'var(--text-secondary)'
  },
  loadingSpinner: {
    width: '20px',
    height: '20px',
    border: '2px solid var(--gray-200)',
    borderTop: '2px solid var(--primary-purple)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  error: {
    padding: 'var(--space-4)',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: 'var(--radius-md)',
    color: '#DC2626',
    fontSize: 'var(--font-size-sm)'
  },
  unreadBadge: {
    marginLeft: 'var(--space-3)',
    backgroundColor: '#ef4444',
    color: 'var(--white)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-normal)',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-full)',
    display: 'inline-block'
  },
  viewAllBadge: {
    marginLeft: 'var(--space-2)',
    backgroundColor: '#ef4444',
    color: 'var(--white)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-normal)',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    display: 'inline-block'
  }
};

// Add hover effects and responsive behavior
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    /* Add button hover effects */
    .family-notes-container .add-note-button:hover {
      background-color: var(--primary-purple-dark, #5B21B6);
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
        padding: var(--space-2) var(--space-3);
        font-size: var(--font-size-xs);
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
  `;
  
  // Only add if not already present
  if (!document.querySelector('#family-notes-styles')) {
    styleElement.id = 'family-notes-styles';
    document.head.appendChild(styleElement);
  }
}

export default FamilyNotesList;