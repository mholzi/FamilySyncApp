import React, { useState, useRef, useEffect } from 'react';
import ProfileMenu from './ProfileMenu';
import LogoutConfirmModal from './LogoutConfirmModal';

const ProfileIcon = ({ user, userData, onNavigate }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileMenuRef = useRef(null);

  // Handle clicking outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProfileMenu]);

  // Handle escape key to close menu
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
        setShowLogoutConfirm(false);
      }
    };

    if (showProfileMenu || showLogoutConfirm) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showProfileMenu, showLogoutConfirm]);

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const closeProfileMenu = () => {
    setShowProfileMenu(false);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const handleMenuNavigate = (action) => {
    if (onNavigate) {
      onNavigate(action);
    } else {
      // Default navigation behavior for unimplemented features
      console.log(`Navigate to: ${action}`);
      alert(`${action.charAt(0).toUpperCase() + action.slice(1)} feature coming soon!`);
    }
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div ref={profileMenuRef} style={styles.container}>
      <div 
        style={{
          ...styles.profileIcon,
          ...(showProfileMenu ? styles.profileIconActive : {})
        }}
        onClick={toggleProfileMenu}
        role="button"
        aria-label="Profile menu"
        aria-expanded={showProfileMenu}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleProfileMenu();
          }
        }}
      >
        {userData?.profilePictureUrl ? (
          <img 
            src={userData.profilePictureUrl} 
            alt="Profile" 
            style={styles.profileImage}
          />
        ) : (
          getUserInitials(userData?.name)
        )}
      </div>

      <ProfileMenu
        user={user}
        userData={userData}
        isOpen={showProfileMenu}
        onClose={closeProfileMenu}
        onNavigate={handleMenuNavigate}
        onConfirmLogout={handleConfirmLogout}
      />

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          setShowProfileMenu(false);
        }}
        onCancel={handleLogoutCancel}
      />
    </div>
  );
};

const styles = {
  container: {
    position: 'relative'
  },
  profileIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '16px',
    backgroundColor: '#007AFF',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    overflow: 'hidden',
    border: 'none',
    outline: 'none'
  },
  profileIconActive: {
    backgroundColor: '#0056D6',
    transform: 'scale(1.05)',
    boxShadow: '0 0 0 2px rgba(0, 122, 255, 0.3)'
  },
  profileImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '16px'
  }
};

// Add hover styles via CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .profile-icon:hover {
    background-color: #0056D6 !important;
    transform: scale(1.05);
  }
  
  .profile-icon:focus {
    box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.3) !important;
  }
`;
document.head.appendChild(styleSheet);

export default ProfileIcon;