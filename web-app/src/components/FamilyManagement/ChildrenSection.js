import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
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

      // Sort by age (oldest first)
      childrenData.sort((a, b) => {
        const dateA = a.dateOfBirth?.toDate ? a.dateOfBirth.toDate() : new Date(a.dateOfBirth);
        const dateB = b.dateOfBirth?.toDate ? b.dateOfBirth.toDate() : new Date(b.dateOfBirth);
        return dateA - dateB; // Older children first
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
          <div style={styles.childrenContainer}>
            {children.map((child, index) => (
              <div key={child.id} style={styles.childCard}>
                <div style={styles.childCardHeader}>
                  <div style={styles.childInfo}>
                    {child.profilePicture ? (
                      <img 
                        src={child.profilePicture} 
                        alt={child.name}
                        style={styles.childImage}
                      />
                    ) : (
                      <div style={styles.childInitials}>
                        {child.name ? child.name.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                    <div style={styles.childDetails}>
                      <h4 style={styles.childName}>{child.name || 'Unnamed'}</h4>
                      <p style={styles.childAge}>
                        {child.dateOfBirth ? (() => {
                          const birthDate = child.dateOfBirth?.toDate ? child.dateOfBirth.toDate() : new Date(child.dateOfBirth);
                          const today = new Date();
                          const ageInYears = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
                          const ageInMonths = Math.floor((today - birthDate) / (30.44 * 24 * 60 * 60 * 1000));
                          
                          if (ageInYears >= 1) {
                            return `${ageInYears} year${ageInYears === 1 ? '' : 's'} old`;
                          } else {
                            return `${ageInMonths} month${ageInMonths === 1 ? '' : 's'} old`;
                          }
                        })() : 'Age not set'}
                      </p>
                      {child.emergencyContact && (
                        <p style={styles.childContact}>{child.emergencyContact}</p>
                      )}
                    </div>
                  </div>
                  <button
                    style={styles.editButton}
                    onClick={() => handleEditChild(child)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary)';
                      e.currentTarget.style.color = 'var(--md-sys-color-on-primary)';
                      e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary-container)';
                      e.currentTarget.style.color = 'var(--md-sys-color-on-primary-container)';
                      e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level1)';
                    }}
                  >
                    Edit
                  </button>
                </div>
                {/* Health Information */}
                <div style={styles.healthInfo}>
                  {(() => {
                    const allergiesText = typeof child.allergies === 'string' 
                      ? child.allergies.trim()
                      : Array.isArray(child.allergies) 
                        ? child.allergies.map(a => a.name || a).join(', ').trim()
                        : '';
                    
                    return allergiesText && (
                      <div style={styles.allergyAlert}>
                        <span style={styles.alertIcon}>⚠️</span>
                        <span style={styles.alertText}>
                          Allergies: {allergiesText}
                        </span>
                      </div>
                    );
                  })()}
                  {child.medicalInfo && child.medicalInfo.trim() && (
                    <div style={styles.medicinePill}>
                      <span style={styles.pillIcon}>💊</span>
                      <span style={styles.pillText}>{child.medicalInfo.trim()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* Add Child Card */}
            <div style={styles.addChildCard}>
              <div style={styles.addChildContent}>
                <div style={styles.addChildIcon}>➕</div>
                <h4 style={styles.addChildTitle}>Add Child</h4>
                <p style={styles.addChildText}>Add another child to your family</p>
              </div>
              <button
                style={styles.addChildButton}
                onClick={handleAddChild}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary)';
                  e.currentTarget.style.color = 'var(--md-sys-color-on-primary)';
                  e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary-container)';
                  e.currentTarget.style.color = 'var(--md-sys-color-on-primary-container)';
                  e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level1)';
                }}
              >
                Add Child
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.childrenContainer}>
            <div style={styles.addChildCard}>
              <div style={styles.addChildContent}>
                <div style={styles.addChildIcon}>👶</div>
                <h4 style={styles.addChildTitle}>No Children Yet</h4>
                <p style={styles.addChildText}>Add your children to manage their schedules</p>
              </div>
              <button
                style={styles.addChildButton}
                onClick={handleAddChild}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary)';
                  e.currentTarget.style.color = 'var(--md-sys-color-on-primary)';
                  e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary-container)';
                  e.currentTarget.style.color = 'var(--md-sys-color-on-primary-container)';
                  e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level1)';
                }}
              >
                Add First Child
              </button>
            </div>
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
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-sys-shape-corner-large)',
    padding: '24px',
    marginBottom: '16px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    position: 'relative'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)',
    paddingBottom: '12px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    margin: 0,
    fontFamily: 'var(--md-sys-typescale-title-medium-font-family-name)',
    lineHeight: 'var(--md-sys-typescale-title-medium-line-height)',
    letterSpacing: 'var(--md-sys-typescale-title-medium-letter-spacing)'
  },
  addButton: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  loadingText: {
    color: 'var(--md-sys-color-on-surface-variant)',
    textAlign: 'center',
    padding: '20px',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)'
  },
  childrenContainer: {
    display: 'flex',
    gap: '12px',
    overflowX: 'auto',
    paddingBottom: '8px',
    marginLeft: '-14px',
    marginRight: '-24px',
    paddingLeft: '24px',
    paddingRight: '24px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--md-sys-color-outline-variant) transparent',
    WebkitOverflowScrolling: 'touch',
    scrollSnapType: 'x mandatory'
  },
  childCard: {
    backgroundColor: 'var(--md-sys-color-surface)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    padding: '16px',
    border: '1px solid var(--md-sys-color-outline)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    flex: '0 0 calc(70vw - 24px)',
    maxWidth: '320px',
    minHeight: '150px',
    scrollSnapAlign: 'start',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  childCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px'
  },
  childInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0
  },
  childImage: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    objectFit: 'cover',
    flexShrink: 0
  },
  childInitials: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    backgroundColor: 'var(--md-sys-color-tertiary)',
    color: 'var(--md-sys-color-on-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: '600',
    fontFamily: 'var(--md-sys-typescale-title-medium-font-family-name)',
    flexShrink: 0
  },
  childDetails: {
    flex: 1,
    minWidth: 0
  },
  childName: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    margin: '0 0 4px 0',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)',
    lineHeight: 'var(--md-sys-typescale-body-large-line-height)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  childAge: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: '0',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)'
  },
  childContact: {
    fontSize: '13px',
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: '2px 0 0 0',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  healthInfo: {
    marginTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  allergyAlert: {
    padding: '6px 8px',
    backgroundColor: 'var(--md-sys-color-error-container)',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    fontSize: '11px',
    color: 'var(--md-sys-color-on-error-container)',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    lineHeight: '1.3',
    border: '1px solid var(--md-sys-color-error)'
  },
  medicinePill: {
    padding: '4px 8px',
    backgroundColor: 'var(--md-sys-color-tertiary-container)',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    fontSize: '11px',
    color: 'var(--md-sys-color-on-tertiary-container)',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    lineHeight: '1.3',
    border: '1px solid var(--md-sys-color-tertiary)',
    alignSelf: 'flex-start'
  },
  alertIcon: {
    fontSize: '12px',
    flexShrink: 0
  },
  alertText: {
    lineHeight: '1.3',
    wordBreak: 'break-word'
  },
  pillIcon: {
    fontSize: '12px',
    flexShrink: 0
  },
  pillText: {
    lineHeight: '1.3',
    wordBreak: 'break-word'
  },
  noteIcon: {
    fontSize: '14px'
  },
  editButton: {
    backgroundColor: 'var(--md-sys-color-primary-container)',
    border: '1px solid var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary-container)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    boxShadow: 'var(--md-sys-elevation-level1)',
    flexShrink: 0
  },
  addChildCard: {
    backgroundColor: 'var(--md-sys-color-surface-container)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    padding: '16px',
    border: '2px dashed var(--md-sys-color-outline)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    flex: '0 0 calc(70vw - 24px)',
    maxWidth: '320px',
    minHeight: '150px',
    scrollSnapAlign: 'start',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  addChildContent: {
    textAlign: 'center',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px'
  },
  addChildIcon: {
    fontSize: '32px',
    marginBottom: '8px'
  },
  addChildTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    margin: '0 0 4px 0',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)'
  },
  addChildText: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: '0',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)'
  },
  addChildButton: {
    backgroundColor: 'var(--md-sys-color-primary-container)',
    border: '1px solid var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary-container)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    boxShadow: 'var(--md-sys-elevation-level1)',
    width: '100%',
    marginTop: '12px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)'
  }
};

export default ChildrenSection;