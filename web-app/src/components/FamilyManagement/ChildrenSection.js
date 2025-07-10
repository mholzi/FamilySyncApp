import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import EnhancedChildCard from '../Children/EnhancedChildCard';
import EditChildModal from './EditChildModal';
import { validateChildProfile } from '../../utils/validation';

const ChildrenSection = ({ familyData, familyId }) => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingChild, setEditingChild] = useState(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    // Query children that belong to this family
    const q = query(
      collection(db, 'children'),
      where('familyId', '==', familyId),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const childrenData = [];
      snapshot.forEach((doc) => {
        childrenData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort by age (youngest first)
      childrenData.sort((a, b) => {
        const dateA = a.dateOfBirth?.toDate ? a.dateOfBirth.toDate() : new Date(a.dateOfBirth);
        const dateB = b.dateOfBirth?.toDate ? b.dateOfBirth.toDate() : new Date(b.dateOfBirth);
        return dateB - dateA; // Younger children first
      });

      setChildren(childrenData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [familyId]);

  const handleEditChild = (child) => {
    setEditingChild(child);
    setErrors({});
  };

  const handleAddChild = () => {
    setShowAddChild(true);
    setEditingChild({
      name: '',
      dateOfBirth: '',
      profilePicture: '',
      allergies: '',
      medicalInfo: '',
      emergencyContact: '',
      notes: ''
    });
    setErrors({});
  };

  const handleSaveChild = async (childData) => {
    // Validate child data
    const validation = validateChildProfile(childData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      if (childData.id) {
        // Update existing child
        const childRef = doc(db, 'children', childData.id);
        const updateData = {
          name: childData.name.trim(),
          dateOfBirth: childData.dateOfBirth,
          profilePicture: childData.profilePicture || '',
          allergies: childData.allergies?.trim() || '',
          medicalInfo: childData.medicalInfo?.trim() || '',
          emergencyContact: childData.emergencyContact?.trim() || '',
          notes: childData.notes?.trim() || '',
          updatedAt: new Date()
        };
        
        await updateDoc(childRef, updateData);
      } else {
        // Add new child
        const newChild = {
          name: childData.name.trim(),
          dateOfBirth: childData.dateOfBirth,
          profilePicture: childData.profilePicture || '',
          allergies: childData.allergies?.trim() || '',
          medicalInfo: childData.medicalInfo?.trim() || '',
          emergencyContact: childData.emergencyContact?.trim() || '',
          notes: childData.notes?.trim() || '',
          familyId: familyId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await addDoc(collection(db, 'children'), newChild);
      }

      setEditingChild(null);
      setShowAddChild(false);
      setErrors({});
    } catch (error) {
      console.error('Error saving child:', error);
      alert('Failed to save child profile. Please try again.');
    }
  };

  const handleDeleteChild = async (childId) => {
    if (!window.confirm('Are you sure you want to remove this child? This action cannot be undone.')) {
      return;
    }

    try {
      // Soft delete - set isActive to false
      const childRef = doc(db, 'children', childId);
      await updateDoc(childRef, {
        isActive: false,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error deleting child:', error);
      alert('Failed to remove child. Please try again.');
    }
  };

  if (loading) {
    return (
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Children</h2>
        <div style={styles.loadingText}>Loading children...</div>
      </section>
    );
  }

  return (
    <>
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Children</h2>
          <button style={styles.addButton} onClick={handleAddChild}>
            + Add Child
          </button>
        </div>
        
        {children.length > 0 ? (
          <div style={styles.childrenGrid}>
            {children.map((child, index) => (
              <div key={child.id} style={styles.childCardWrapper}>
                <EnhancedChildCard 
                  child={child}
                  childIndex={index}
                  onEditChild={() => handleEditChild(child)}
                  userRole="parent"
                />
                <div style={styles.cardActions}>
                  <button 
                    style={styles.editButton}
                    onClick={() => handleEditChild(child)}
                  >
                    Edit
                  </button>
                  <button 
                    style={styles.deleteButton}
                    onClick={() => handleDeleteChild(child.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>No children added yet. Click "Add Child" to get started!</p>
          </div>
        )}
      </section>

      {/* Edit/Add Child Modal */}
      {(editingChild || showAddChild) && (
        <EditChildModal
          child={editingChild}
          onSave={handleSaveChild}
          onCancel={() => {
            setEditingChild(null);
            setShowAddChild(false);
            setErrors({});
          }}
          errors={errors}
        />
      )}
    </>
  );
};

const styles = {
  section: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #F2F2F7',
    paddingBottom: '12px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: 0
  },
  addButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  },
  loadingText: {
    color: '#8E8E93',
    textAlign: 'center',
    padding: '20px'
  },
  childrenGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px'
  },
  childCardWrapper: {
    position: 'relative'
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    justifyContent: 'flex-end'
  },
  editButton: {
    backgroundColor: '#F2F2F7',
    color: '#007AFF',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  deleteButton: {
    backgroundColor: '#FFF2F2',
    color: '#FF3B30',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#8E8E93'
  }
};

// Add hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .add-child-button:hover {
    background-color: #0056D6 !important;
  }
  
  .edit-child-button:hover {
    background-color: #E5E5EA !important;
  }
  
  .delete-child-button:hover {
    background-color: #FFE5E5 !important;
  }
`;
document.head.appendChild(styleSheet);

export default ChildrenSection;