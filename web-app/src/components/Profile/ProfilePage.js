import React, { useState, useEffect } from 'react';
import { useFamily } from '../../hooks/useFamily';
import { 
  updateUserProfile, 
  uploadProfilePicture, 
  updateUserPreferences,
  validateEmail,
  validatePhoneNumber,
  formatUserRole,
  getUserInitials,
  formatDate
} from '../../utils/userUtils';

const ProfilePage = ({ user, onBack }) => {
  const { userData, familyData, loading } = useFamily(user.uid);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        email: userData.email || user.email || '',
        phone: userData.phone || '',
        language: userData.preferences?.language || 'en',
        theme: userData.preferences?.theme || 'system',
        notifications: userData.preferences?.notifications !== false,
        defaultView: userData.preferences?.defaultView || 'dashboard'
      });
    }
  }, [userData, user.email]);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Update profile data
      const profileUpdates = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim()
      };

      const profileResult = await updateUserProfile(user.uid, profileUpdates);
      if (!profileResult.success) {
        throw new Error(profileResult.error);
      }

      // Update preferences
      const preferences = {
        language: formData.language,
        theme: formData.theme,
        notifications: formData.notifications,
        defaultView: formData.defaultView
      };

      const preferencesResult = await updateUserPreferences(user.uid, preferences);
      if (!preferencesResult.success) {
        throw new Error(preferencesResult.error);
      }

      setIsEditing(false);
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
        language: userData.preferences?.language || 'en',
        theme: userData.preferences?.theme || 'system',
        notifications: userData.preferences?.notifications !== false,
        defaultView: userData.preferences?.defaultView || 'dashboard'
      });
    }
    setIsEditing(false);
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
        <button style={styles.backButton} onClick={onBack || (() => window.history.back())}>
          ←
        </button>
        <h1 style={styles.title}>Profile</h1>
        {isEditing ? (
          <button 
            style={styles.saveButton} 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        ) : (
          <button style={styles.editButton} onClick={() => setIsEditing(true)}>
            Edit
          </button>
        )}
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
          {isEditing && (
            <div style={styles.uploadContainer}>
              <input
                type="file"
                id="profile-upload"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                style={styles.hiddenInput}
              />
              <label htmlFor="profile-upload" style={styles.uploadButton}>
                Upload Photo
              </label>
            </div>
          )}
        </div>

        {/* Personal Information */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Personal Information</h2>
          
          <div style={styles.field}>
            <label style={styles.label}>Name</label>
            {isEditing ? (
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
            {isEditing ? (
              <input
                type="email"
                style={{...styles.input, ...(errors.email ? styles.inputError : {})}}
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email"
              />
            ) : (
              <div style={styles.value}>{userData?.email || user.email || 'Not set'}</div>
            )}
            {errors.email && <div style={styles.error}>{errors.email}</div>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Phone</label>
            {isEditing ? (
              <input
                type="tel"
                style={{...styles.input, ...(errors.phone ? styles.inputError : {})}}
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter your phone number"
              />
            ) : (
              <div style={styles.value}>{userData?.phone || 'Not set'}</div>
            )}
            {errors.phone && <div style={styles.error}>{errors.phone}</div>}
          </div>
        </section>

        {/* Family Role */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Family Role</h2>
          
          <div style={styles.field}>
            <label style={styles.label}>Role</label>
            <div style={styles.value}>{formatUserRole(userData?.role)}</div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Family</label>
            <div style={styles.value}>{familyData?.name || 'Not assigned'}</div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Member Since</label>
            <div style={styles.value}>
              {formatDate(userData?.createdAt)}
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Preferences</h2>
          
          <div style={styles.field}>
            <label style={styles.label}>Language</label>
            {isEditing ? (
              <select
                style={styles.select}
                value={formData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
              >
                <option value="en">🇺🇸 English</option>
                <option value="de">🇩🇪 German</option>
              </select>
            ) : (
              <div style={styles.value}>
                {formData.language === 'de' ? '🇩🇪 German' : '🇺🇸 English'}
              </div>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Theme</label>
            {isEditing ? (
              <select
                style={styles.select}
                value={formData.theme}
                onChange={(e) => handleInputChange('theme', e.target.value)}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            ) : (
              <div style={styles.value}>
                {formData.theme.charAt(0).toUpperCase() + formData.theme.slice(1)}
              </div>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Notifications</label>
            {isEditing ? (
              <label style={styles.switchContainer}>
                <input
                  type="checkbox"
                  checked={formData.notifications}
                  onChange={(e) => handleInputChange('notifications', e.target.checked)}
                  style={styles.hiddenInput}
                />
                <span style={{
                  ...styles.switch,
                  ...(formData.notifications ? styles.switchOn : {})
                }}>
                  <span style={{
                    ...styles.switchHandle,
                    ...(formData.notifications ? styles.switchHandleOn : {})
                  }} />
                </span>
              </label>
            ) : (
              <div style={styles.value}>
                {formData.notifications ? 'Enabled' : 'Disabled'}
              </div>
            )}
          </div>
        </section>

        {/* Cancel button for editing mode */}
        {isEditing && (
          <div style={styles.actions}>
            <button style={styles.cancelButton} onClick={handleCancel}>
              Cancel
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
    backgroundColor: '#F2F2F7',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    paddingBottom: '20px' // Extra padding for bottom navigation
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#007AFF'
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    margin: 0
  },
  editButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#007AFF',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  saveButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  content: {
    padding: '20px'
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '30px',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  avatarContainer: {
    marginBottom: '16px'
  },
  avatarImage: {
    width: '80px',
    height: '80px',
    borderRadius: '40px',
    objectFit: 'cover'
  },
  avatarPlaceholder: {
    width: '80px',
    height: '80px',
    borderRadius: '40px',
    backgroundColor: '#007AFF',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: '600'
  },
  uploadContainer: {
    textAlign: 'center'
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  hiddenInput: {
    display: 'none'
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '16px',
    borderBottom: '1px solid #F2F2F7',
    paddingBottom: '8px'
  },
  field: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
    marginBottom: '4px'
  },
  value: {
    fontSize: '16px',
    color: '#000',
    padding: '8px 0'
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #E5E5EA',
    borderRadius: '8px',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  inputError: {
    borderColor: '#FF3B30'
  },
  select: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #E5E5EA',
    borderRadius: '8px',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  switchContainer: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer'
  },
  switch: {
    width: '48px',
    height: '28px',
    backgroundColor: '#E5E5EA',
    borderRadius: '14px',
    position: 'relative',
    transition: 'background-color 0.2s ease'
  },
  switchOn: {
    backgroundColor: '#007AFF'
  },
  switchHandle: {
    width: '24px',
    height: '24px',
    backgroundColor: 'white',
    borderRadius: '12px',
    position: 'absolute',
    top: '2px',
    left: '2px',
    transition: 'transform 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
  },
  switchHandleOn: {
    transform: 'translateX(20px)'
  },
  error: {
    color: '#FF3B30',
    fontSize: '12px',
    marginTop: '4px'
  },
  actions: {
    marginTop: '20px'
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    width: '100%'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '50vh',
    fontSize: '18px',
    color: '#666'
  }
};

export default ProfilePage;