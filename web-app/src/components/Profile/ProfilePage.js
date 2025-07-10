import React, { useState, useEffect } from 'react';
import { useFamily } from '../../hooks/useFamily';
import { 
  updateUserProfile, 
  uploadProfilePicture, 
  validateEmail,
  validatePhoneNumber,
  formatUserRole,
  getUserInitials,
  formatDate
} from '../../utils/userUtils';

const ProfilePage = ({ user, onBack }) => {
  const { userData, familyData, loading } = useFamily(user.uid);
  const [editingSection, setEditingSection] = useState(null); // 'personal'
  const [isSaving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        email: userData.email || user.email || '',
        phone: userData.phone || '',
      });
    }
  }, [userData, user.email, familyData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (editingSection === 'personal') {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      }

      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!validateEmail(formData.email)) {
        newErrors.email = 'Please enter a valid email';
      }

      if (formData.phone && !validatePhoneNumber(formData.phone)) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Update based on which section is being edited
      if (editingSection === 'personal') {
        const profileUpdates = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim()
        };

        const profileResult = await updateUserProfile(user.uid, profileUpdates);
        if (!profileResult.success) {
          throw new Error(profileResult.error);
        }
      }

      setEditingSection(null);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(`Failed to save profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data
    if (userData) {
      setFormData({
        name: userData.name || '',
        email: userData.email || user.email || '',
        phone: userData.phone || '',
      });
    }
    setEditingSection(null);
    setErrors({});
  };

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSaving(true);
    try {
      const result = await uploadProfilePicture(user.uid, file);
      if (!result.success) {
        throw new Error(result.error);
      }
      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert(`Failed to upload profile picture: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading profile...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backButton} onClick={onBack || (() => window.history.length > 1 ? window.history.back() : window.location.href = '/')}>
          ←
        </button>
        <h1 style={styles.title}>Profile</h1>
        <div style={{ width: '40px' }} /> {/* Spacer for layout balance */}
      </header>

      {/* Content */}
      <div style={styles.content}>
        {/* Profile Picture */}
        <div style={styles.avatarSection}>
          <div style={styles.avatarContainer}>
            {userData?.profilePictureUrl ? (
              <img 
                src={userData.profilePictureUrl} 
                alt="Profile" 
                style={styles.avatarImage}
              />
            ) : (
              <div style={styles.avatarPlaceholder}>
                {getUserInitials(userData?.name)}
              </div>
            )}
          </div>
          {!editingSection && (
            <div style={styles.uploadContainer}>
              <input
                type="file"
                id="profile-upload"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                style={styles.hiddenInput}
              />
              <label 
                htmlFor="profile-upload" 
                style={styles.uploadButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary-container)';
                  e.currentTarget.style.borderColor = 'var(--md-sys-color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-highest)';
                  e.currentTarget.style.borderColor = 'var(--md-sys-color-outline)';
                }}
              >
                📷 Upload Photo
              </label>
            </div>
          )}
        </div>

        {/* Personal Information */}
        {(!editingSection || editingSection === 'personal') && (
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Personal Information</h2>
              {!editingSection && (
                <button
                  style={styles.sectionEditButton}
                  onClick={() => setEditingSection('personal')}
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
            <label style={styles.label}>Name</label>
            {editingSection === 'personal' ? (
              <input
                type="text"
                style={{...styles.input, ...(errors.name ? styles.inputError : {})}}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your name"
              />
            ) : (
              <div style={styles.value}>{userData?.name || 'Not set'}</div>
            )}
            {errors.name && <div style={styles.error}>{errors.name}</div>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            {editingSection === 'personal' ? (
              <input
                type="email"
                style={{...styles.input, ...(errors.email ? styles.inputError : {})}}
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email"
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--md-sys-color-primary)';
                }}
                onBlur={(e) => {
                  if (!errors.email) {
                    e.target.style.borderColor = 'var(--md-sys-color-outline)';
                  }
                }}
              />
            ) : (
              <div style={styles.value}>{userData?.email || user.email || 'Not set'}</div>
            )}
            {errors.email && <div style={styles.error}>{errors.email}</div>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Phone</label>
            {editingSection === 'personal' ? (
              <input
                type="tel"
                style={{...styles.input, ...(errors.phone ? styles.inputError : {})}}
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter your phone number"
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--md-sys-color-primary)';
                }}
                onBlur={(e) => {
                  if (!errors.phone) {
                    e.target.style.borderColor = 'var(--md-sys-color-outline)';
                  }
                }}
              />
            ) : (
              <div style={styles.value}>{userData?.phone || 'Not set'}</div>
            )}
            {errors.phone && <div style={styles.error}>{errors.phone}</div>}
          </div>
          </section>
        )}


        {/* Role Information - Always shown when not editing */}
        {!editingSection && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Role Information</h2>
            
            <div style={styles.field}>
              <label style={styles.label}>Role</label>
              <div style={styles.value}>{formatUserRole(userData?.role)}</div>
            </div>

            {userData?.role === 'aupair' && (
              <div style={styles.field}>
                <label style={styles.label}>Host Family</label>
                <div style={styles.value}>{familyData?.name || 'Not assigned'}</div>
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>Member Since</label>
              <div style={styles.value}>
                {formatDate(userData?.createdAt)}
              </div>
            </div>
          </section>
        )}


        {/* Action buttons for editing mode */}
        {editingSection && (
          <div style={styles.actions}>
            <button 
              style={styles.cancelButton} 
              onClick={handleCancel}
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
              onClick={handleSave}
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
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: 'calc(100vh - 64px)', // Account for bottom navigation
    backgroundColor: 'var(--md-sys-color-surface)',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)',
    paddingBottom: '80px' // Extra padding for bottom navigation
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
    fontFamily: 'var(--md-sys-typescale-headline-small-font-family-name)',
    lineHeight: 'var(--md-sys-typescale-headline-small-line-height)'
  },
  editButton: {
    backgroundColor: 'transparent',
    border: '1px solid var(--md-sys-color-outline)',
    color: 'var(--md-sys-color-primary)',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
    padding: '8px 16px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  saveButton: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    padding: '8px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    opacity: 1
  },
  content: {
    padding: '24px',
    maxWidth: '720px',
    margin: '0 auto'
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '24px',
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-sys-shape-corner-large)',
    padding: '32px',
    boxShadow: 'var(--md-sys-elevation-level1)',
    border: '1px solid var(--md-sys-color-outline-variant)'
  },
  avatarContainer: {
    marginBottom: '16px'
  },
  avatarImage: {
    width: '96px',
    height: '96px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    objectFit: 'cover',
    border: '3px solid var(--md-sys-color-surface)'
  },
  avatarPlaceholder: {
    width: '96px',
    height: '96px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    fontWeight: '600',
    fontFamily: 'var(--md-sys-typescale-display-small-font-family-name)',
    border: '3px solid var(--md-sys-color-surface)'
  },
  uploadContainer: {
    textAlign: 'center'
  },
  uploadButton: {
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    color: 'var(--md-sys-color-on-surface)',
    border: '1px solid var(--md-sys-color-outline)',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    padding: '8px 20px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    display: 'inline-block'
  },
  hiddenInput: {
    display: 'none'
  },
  section: {
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-sys-shape-corner-large)',
    padding: '24px',
    marginBottom: '16px',
    border: '1px solid var(--md-sys-color-outline-variant)'
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
  sectionEditButton: {
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
  inputDisabled: {
    backgroundColor: 'var(--md-sys-color-surface-container)',
    color: 'var(--md-sys-color-on-surface-variant)',
    cursor: 'not-allowed',
    opacity: 0.6
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid var(--md-sys-color-outline)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    backgroundColor: 'var(--md-sys-color-surface)',
    boxSizing: 'border-box',
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)',
    cursor: 'pointer',
    transition: 'border-color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    outline: 'none'
  },
  switchContainer: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    gap: '12px'
  },
  switch: {
    width: '52px',
    height: '32px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    borderRadius: '16px',
    position: 'relative',
    transition: 'background-color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    border: '2px solid var(--md-sys-color-outline)'
  },
  switchOn: {
    backgroundColor: 'var(--md-sys-color-primary)',
    borderColor: 'var(--md-sys-color-primary)'
  },
  switchHandle: {
    width: '28px',
    height: '28px',
    backgroundColor: 'var(--md-sys-color-on-primary)',
    borderRadius: '14px',
    position: 'absolute',
    top: '2px',
    left: '2px',
    transition: 'transform var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    boxShadow: 'var(--md-sys-elevation-level1)'
  },
  switchHandleOn: {
    transform: 'translateX(20px)',
    backgroundColor: 'var(--md-sys-color-on-primary)'
  },
  switchLabel: {
    fontSize: '16px',
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)',
    userSelect: 'none'
  },
  fieldHelp: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginTop: '8px',
    lineHeight: '1.4',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)'
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
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '50vh',
    fontSize: '16px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)'
  }
};

export default ProfilePage;