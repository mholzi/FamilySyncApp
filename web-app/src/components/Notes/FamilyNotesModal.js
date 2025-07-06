import React, { useState } from 'react';
import FamilyNoteCard from './FamilyNoteCard';
import AddFamilyNote from './AddFamilyNote';
import useFamilyNotes from '../../hooks/useFamilyNotes';

const FamilyNotesModal = ({ isOpen, onClose, familyId, userId, userRole }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  
  const { 
    visibleNotes, 
    loading, 
    error, 
    createNote, 
    editNote, 
    deleteNote, 
    dismissNote 
  } = useFamilyNotes(familyId, userId);

  // Filter notes based on selected filters
  const filteredNotes = visibleNotes.filter(note => {
    const categoryMatch = filterCategory === 'all' || note.category === filterCategory;
    const priorityMatch = filterPriority === 'all' || note.priority === filterPriority;
    return categoryMatch && priorityMatch;
  });

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

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div className="card" style={styles.modal}>
        {/* Header */}
        <div className="card-header" style={styles.header}>
          <div>
            <h2 style={styles.title}>All Family Notes</h2>
            <p style={styles.subtitle}>
              {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'} visible to you
            </p>
          </div>
          <button 
            style={styles.closeButton}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Filters and Actions */}
        <div style={styles.controls}>
          <div style={styles.filters}>
            <select
              className="form-input"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Categories</option>
              <option value="general">General</option>
              <option value="kids">Kids</option>
              <option value="schedule">Schedule</option>
              <option value="rules">Rules</option>
            </select>

            <select
              className="form-input"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Priorities</option>
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            Add Note +
          </button>
        </div>

        {/* Notes Content */}
        <div className="card-body" style={styles.content}>
          {loading ? (
            <div style={styles.loading}>
              <div style={styles.loadingSpinner}></div>
              <span>Loading notes...</span>
            </div>
          ) : error ? (
            <div style={styles.error}>
              <span>Error loading notes: {error}</span>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>💬</div>
              <p style={styles.emptyText}>
                {visibleNotes.length === 0 
                  ? 'No active family notes' 
                  : 'No notes match your filters'
                }
              </p>
              <p style={styles.emptySubtext}>
                {visibleNotes.length === 0 
                  ? 'Create the first family note to start communicating!'
                  : 'Try adjusting your filter settings.'
                }
              </p>
              {visibleNotes.length === 0 && (
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowAddModal(true)}
                >
                  Add First Note
                </button>
              )}
            </div>
          ) : (
            <div style={styles.notesList}>
              {filteredNotes.map((note) => (
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
            </div>
          )}
        </div>
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
          initialNote={editingNote}
          userRole={userRole}
        />
      )}
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
    zIndex: 1000,
    padding: 'var(--space-4)'
  },
  modal: {
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-xl)',
    animation: 'scaleIn 0.2s ease-out'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--border-light)'
  },
  title: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: 0
  },
  subtitle: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    margin: 'var(--space-1) 0 0 0'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 'var(--font-size-xl)',
    color: 'var(--text-secondary)',
    padding: 'var(--space-1)',
    borderRadius: 'var(--radius-sm)',
    transition: 'var(--transition-fast)'
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--border-light)',
    gap: 'var(--space-4)'
  },
  filters: {
    display: 'flex',
    gap: 'var(--space-3)'
  },
  filterSelect: {
    minWidth: '150px'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: 'var(--space-4)'
  },
  notesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)'
  },
  emptyState: {
    textAlign: 'center',
    padding: 'var(--space-12)',
    color: 'var(--text-secondary)'
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: 'var(--space-4)'
  },
  emptyText: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    margin: '0 0 var(--space-2) 0'
  },
  emptySubtext: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--text-secondary)',
    margin: '0 0 var(--space-6) 0'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-12)',
    color: 'var(--text-secondary)'
  },
  loadingSpinner: {
    width: '24px',
    height: '24px',
    border: '2px solid var(--gray-200)',
    borderTop: '2px solid var(--primary-purple)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  error: {
    padding: 'var(--space-6)',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: 'var(--radius-md)',
    color: '#DC2626',
    fontSize: 'var(--font-size-base)',
    textAlign: 'center'
  }
};

export default FamilyNotesModal;