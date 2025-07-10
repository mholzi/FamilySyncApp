import React, { useState, useEffect } from 'react';
import { useFamily } from '../../hooks/useFamily';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import FamilyMembersSection from './FamilyMembersSection';
import ChildrenSection from './ChildrenSection';
import InvitationsSection from './InvitationsSection';
import LoadingProgress from '../LoadingProgress';

const FamilyManagement = ({ user, onBack }) => {
  const { userData, familyData, loading } = useFamily(user.uid);
  const [editingFamilyInfo, setEditingFamilyInfo] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [optimisticFamilyName, setOptimisticFamilyName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Check if user is a parent
  const isParent = userData?.role === 'parent';

  useEffect(() => {
    // Redirect non-parents
    if (!loading && userData && !isParent) {
      alert('Only parents can access Family Management');
      if (onBack) onBack();
    }
  }, [loading, userData, isParent, onBack]);

  useEffect(() => {
    if (familyData?.name) {
      setFamilyName(familyData.name);
      setOptimisticFamilyName(familyData.name);
    }
  }, [familyData]);

  if (loading) {
    return <LoadingProgress message="Loading family data..." />;
  }

  if (!isParent) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <h2 style={styles.accessDeniedTitle}>Access Denied</h2>
          <p style={styles.accessDeniedText}>Only parents can access Family Management.</p>
          <button style={styles.primaryButton} onClick={onBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleSaveFamilyName = async () => {
    if (!familyName.trim()) {
      setError('Family name is required');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      // Optimistically update the display
      setOptimisticFamilyName(familyName.trim());
      
      const familyRef = doc(db, 'families', familyData.id);
      await updateDoc(familyRef, {
        name: familyName.trim(),
        updatedAt: new Date()
      });
      setEditingFamilyInfo(false);
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticFamilyName(familyData?.name || '');
      console.error('Error updating family name:', error);
      setError('Failed to update family name');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFamilyName(familyData?.name || '');
    setOptimisticFamilyName(familyData?.name || '');
    setEditingFamilyInfo(false);
    setError(null);
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backButton} onClick={onBack || (() => window.history.length > 1 ? window.history.back() : window.location.href = '/')}>
          ←
        </button>
        <h1 style={styles.title}>Family Management</h1>
        <div style={styles.headerSpacer} />
      </header>


      {/* Content */}
      <div style={styles.content}>
        {/* Family Information Section */}
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Family Information</h2>
                {!editingFamilyInfo && (
                  <button
                    style={styles.editButton}
                    onClick={() => setEditingFamilyInfo(true)}
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
                )}
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>Family Name</label>
                {editingFamilyInfo ? (
                  <input
                    type="text"
                    style={{...styles.input, ...(error ? styles.inputError : {})}}
                    value={familyName}
                    onChange={(e) => {
                      setFamilyName(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter family name"
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--md-sys-color-primary)';
                    }}
                    onBlur={(e) => {
                      if (!error) {
                        e.target.style.borderColor = 'var(--md-sys-color-outline)';
                      }
                    }}
                  />
                ) : (
                  <div style={styles.value}>{optimisticFamilyName || 'Not set'}</div>
                )}
                {error && <div style={styles.error}>{error}</div>}
              </div>

              {editingFamilyInfo && (
                <div style={styles.actions}>
                  <button 
                    style={styles.cancelButton} 
                    onClick={handleCancelEdit}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)';
                      e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-highest)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    style={styles.saveButton} 
                    onClick={handleSaveFamilyName}
                    disabled={isSaving}
                    onMouseEnter={(e) => {
                      if (!isSaving) {
                        e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
              
              {/* Created date in bottom right */}
              <div style={{
                ...styles.createdDateBox,
                zIndex: editingFamilyInfo ? 0 : 1
              }}>
                Created {familyData?.createdAt ? (
                  familyData.createdAt.toDate ? 
                    new Date(familyData.createdAt.toDate()).toLocaleDateString() : 
                    new Date(familyData.createdAt).toLocaleDateString()
                ) : 'Unknown'}
              </div>
            </section>

            <FamilyMembersSection 
              familyData={familyData} 
              currentUserId={user.uid}
            />
            <ChildrenSection 
              familyData={familyData} 
              familyId={familyData?.id}
            />
            <InvitationsSection 
              familyData={familyData} 
              familyId={familyData?.id}
              currentUserName={userData?.name}
            />
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: 'calc(100vh - 64px)',
    backgroundColor: 'var(--md-sys-color-surface)',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)',
    paddingBottom: '80px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: 'var(--md-sys-color-surface-container)',
    boxShadow: 'var(--md-sys-elevation-level1)',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)'
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: 'var(--md-sys-color-on-surface)',
    padding: '8px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  title: {
    fontSize: '22px',
    fontWeight: '400',
    color: 'var(--md-sys-color-on-surface)',
    margin: 0,
    flex: 1,
    textAlign: 'center',
    fontFamily: 'var(--md-sys-typescale-headline-small-font-family-name)',
    lineHeight: 'var(--md-sys-typescale-headline-small-line-height)'
  },
  headerSpacer: {
    width: '40px'
  },
  content: {
    padding: '24px',
    maxWidth: '720px',
    margin: '0 auto'
  },
  accessDenied: {
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-sys-shape-corner-large)',
    margin: '20px'
  },
  accessDeniedTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '16px',
    fontFamily: 'var(--md-sys-typescale-headline-small-font-family-name)'
  },
  accessDeniedText: {
    fontSize: '16px',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginBottom: '24px',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)'
  },
  primaryButton: {
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
    boxShadow: 'var(--md-sys-elevation-level1)'
  },
  field: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginBottom: '8px',
    fontFamily: 'var(--md-sys-typescale-label-small-font-family-name)',
    lineHeight: 'var(--md-sys-typescale-label-small-line-height)',
    letterSpacing: 'var(--md-sys-typescale-label-small-letter-spacing)'
  },
  value: {
    fontSize: '16px',
    color: 'var(--md-sys-color-on-surface)',
    padding: '8px 0',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)',
    lineHeight: 'var(--md-sys-typescale-body-large-line-height)'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid var(--md-sys-color-outline)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    backgroundColor: 'var(--md-sys-color-surface)',
    boxSizing: 'border-box',
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)',
    transition: 'border-color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    outline: 'none'
  },
  inputError: {
    borderColor: 'var(--md-sys-color-error)'
  },
  error: {
    color: 'var(--md-sys-color-error)',
    fontSize: '12px',
    marginTop: '4px',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)'
  },
  actions: {
    marginTop: '24px',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    color: 'var(--md-sys-color-on-surface)',
    border: '1px solid var(--md-sys-color-outline)',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    minWidth: '100px'
  },
  saveButton: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    minWidth: '100px',
    opacity: 1
  },
  createdDateBox: {
    position: 'absolute',
    bottom: '16px',
    right: '16px',
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    opacity: 0.7,
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)',
    transition: 'opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  }
};

export default FamilyManagement;