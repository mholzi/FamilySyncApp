import React, { useState, useEffect } from 'react';
import FamilyNoteCard from './FamilyNoteCard';
import AddFamilyNote from './AddFamilyNote';
import useFamilyNotes from '../../hooks/useFamilyNotes';

const FamilyNotesModal = ({ isOpen, onClose, familyId, userId, userRole, userData, familyData }) => {
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
    dismissNote,
    toggleLike 
  } = useFamilyNotes(familyId, userId);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      // Store current scroll position
      const scrollY = window.scrollY;
      document.body.style.top = `-${scrollY}px`;
      
      return () => {
        document.body.classList.remove('modal-open');
        // Restore scroll position
        const scrollY = parseInt(document.body.style.top || '0') * -1;
        document.body.style.top = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

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
      <div className="card family-notes-modal" style={styles.modal}>
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
              <option value="thankyou">Thank you</option>
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
    padding: 'var(--space-4)',
    WebkitOverflowScrolling: 'touch', // Enable smooth scrolling on iOS
    overscrollBehavior: 'contain' // Prevent scroll chaining
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

// Add responsive styles for mobile
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 768px) {
      /* Mobile-specific modal adjustments */
      .family-notes-modal {
        max-height: 100vh !important;
        height: 100vh;
        max-width: 100% !important;
        margin: 0;
        border-radius: 0;
      }
      
      /* Adjust content area for mobile */
      .family-notes-modal .content {
        padding: var(--space-3);
      }
      
      /* Stack filters vertically on mobile */
      .family-notes-modal .filters {
        flex-direction: column;
        width: 100%;
      }
      
      .family-notes-modal .filters select {
        width: 100%;
        min-width: unset;
      }
      
      /* Adjust controls layout on mobile */
      .family-notes-modal .controls {
        flex-direction: column;
        align-items: stretch;
        gap: var(--space-3);
      }
      
      /* Ensure proper touch scrolling */
      .family-notes-modal .content {
        -webkit-overflow-scrolling: touch;
        overflow-y: auto;
        overflow-x: hidden;
        max-height: calc(100vh - 250px); /* Account for header and controls */
      }
      
      /* Prevent body scroll when modal is open */
      body.modal-open {
        overflow: hidden;
        position: fixed;
        width: 100%;
      }
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
    
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `;
  
  // Only add if not already present
  if (!document.querySelector('#family-notes-modal-styles')) {
    style.id = 'family-notes-modal-styles';
    document.head.appendChild(style);
  }
}

export default FamilyNotesModal;