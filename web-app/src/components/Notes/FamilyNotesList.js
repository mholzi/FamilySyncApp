import React, { useState } from 'react';
import FamilyNoteCard from './FamilyNoteCard';
import AddFamilyNote from './AddFamilyNote';
import FamilyNotesModal from './FamilyNotesModal';
import useFamilyNotes from '../../hooks/useFamilyNotes';

const FamilyNotesList = ({ familyId, userId, userRole, maxDisplayed = null }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [showAllModal, setShowAllModal] = useState(false);
  
  const { 
    visibleNotes, 
    loading, 
    error, 
    createNote, 
    editNote, 
    deleteNote, 
    dismissNote 
  } = useFamilyNotes(familyId, userId);

  const displayedNotes = maxDisplayed 
    ? visibleNotes.slice(0, maxDisplayed)
    : visibleNotes;

  const handleCreateNote = async (noteData) => {
    await createNote(noteData);
    setShowAddModal(false);
  };

  const handleEditNote = async (noteData) => {
    await editNote(editingNote.id, noteData);
    setEditingNote(null);
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Are you sure you want to delete this note? This will remove it for everyone.')) {
      await deleteNote(noteId);
    }
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
    <div style={styles.container}>
      {/* Header with Add Button */}
      <div style={styles.header}>
        <h3 style={styles.title}>Family Notes</h3>
        <div style={styles.headerActions}>
          {maxDisplayed && visibleNotes.length > 0 && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAllModal(true)}
              style={styles.viewAllButton}
            >
              View All
            </button>
          )}
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddModal(true)}
            style={styles.addButton}
          >
            Add Note +
          </button>
        </div>
      </div>

      {/* Notes List */}
      {displayedNotes.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>💬</div>
          <p style={styles.emptyText}>No active messages</p>
          <p style={styles.emptySubtext}>
            Create the first family note to start communicating!
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
            style={styles.emptyButton}
          >
            Add First Note
          </button>
        </div>
      ) : (
        <div style={styles.notesList}>
          {displayedNotes.map((note) => (
            <FamilyNoteCard
              key={note.id}
              note={note}
              onDismiss={handleDismissNote}
              onEdit={setEditingNote}
              onDelete={handleDeleteNote}
              canEdit={note.createdBy === userId}
              canDelete={note.createdBy === userId || userRole === 'parent'}
              userRole={userRole}
            />
          ))}
          
          {/* Show more indicator if there are more notes */}
          {maxDisplayed && visibleNotes.length > maxDisplayed && (
            <div style={styles.showMore}>
              <span style={styles.showMoreText}>
                +{visibleNotes.length - maxDisplayed} more notes
              </span>
            </div>
          )}
        </div>
      )}

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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-4)'
  },
  title: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: 'var(--space-2)',
    alignItems: 'center'
  },
  viewAllButton: {
    fontSize: 'var(--font-size-sm)'
  },
  addButton: {
    fontSize: 'var(--font-size-sm)'
  },
  notesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)'
  },
  showMore: {
    textAlign: 'center',
    padding: 'var(--space-3)',
    borderTop: '1px solid var(--border-light)'
  },
  showMoreText: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    fontStyle: 'italic'
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
  emptyButton: {
    fontSize: 'var(--font-size-sm)'
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
  }
};

export default FamilyNotesList;