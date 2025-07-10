import React from 'react';

const ProfileMenu = ({ user, userData, isOpen, onClose, onNavigate, onConfirmLogout }) => {
  if (!isOpen) return null;

  // Common menu items for all users
  const commonMenuItems = [
    { icon: '👤', label: 'Edit Profile', action: 'profile' },
    { icon: '🔔', label: 'Notifications', action: 'notifications' },
    { icon: '⚙️', label: 'Settings', action: 'settings' }
  ];

  // Parent-specific menu items
  const parentMenuItems = [
    { icon: '👥', label: 'Family Management', action: 'family' },
    { icon: '🚨', label: 'Emergency Contacts', action: 'emergency' }
  ];

  // Au Pair-specific menu items
  const auPairMenuItems = [
    { icon: '👨‍👩‍👧‍👦', label: 'Family Info', action: 'familyInfo' },
    { icon: '🆘', label: 'Emergency Info', action: 'emergencyInfo' }
  ];

  // Build menu items based on user role
  const roleSpecificItems = userData?.role === 'parent' ? parentMenuItems : auPairMenuItems;
  const menuItems = [
    ...commonMenuItems,
    { type: 'divider' },
    ...roleSpecificItems,
    { type: 'divider' },
    { icon: '🔓', label: 'Sign Out', action: 'logout', variant: 'danger' }
  ];

  const handleMenuAction = (action) => {
    if (action === 'logout') {
      onConfirmLogout();
    } else {
      onNavigate(action);
    }
    onClose();
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />
      
      {/* Menu */}
      <div style={styles.profileMenu}>
        {/* User Info Header */}
        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {userData?.profilePictureUrl ? (
              <img 
                src={userData.profilePictureUrl} 
                alt="Profile" 
                style={styles.avatarImage}
              />
            ) : (
              getUserInitials(userData?.name)
            )}
          </div>
          <div style={styles.userDetails}>
            <div style={styles.userName}>{userData?.name || 'User'}</div>
            <div style={styles.userRole}>
              {userData?.role === 'parent' ? 'Host Parent' : 'Au Pair'}
            </div>
          </div>
        </div>
        
        {/* Menu Items */}
        <div style={styles.menuItems}>
          {menuItems.map((item, index) => (
            item.type === 'divider' ? (
              <div key={index} style={styles.divider} />
            ) : (
              <button
                key={index}
                data-profile-menu-item
                style={{
                  ...styles.menuItem,
                  ...(item.variant === 'danger' ? styles.menuItemDanger : {})
                }}
                onClick={() => handleMenuAction(item.action)}
                onMouseEnter={(e) => {
                  if (item.variant !== 'danger') {
                    e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-highest)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span style={styles.icon}>{item.icon}</span>
                <span style={styles.label}>{item.label}</span>
              </button>
            )
          ))}
        </div>
      </div>
    </>
  );
};

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  profileMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    backgroundColor: 'var(--md-sys-color-surface)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    boxShadow: 'var(--md-sys-elevation-level2)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    minWidth: '280px',
    zIndex: 1000,
    animation: 'slideDown var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard)',
    overflow: 'hidden'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)',
    backgroundColor: 'var(--md-sys-color-surface-container-low)'
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '600',
    overflow: 'hidden',
    fontFamily: 'var(--md-sys-typescale-title-medium-font-family-name)'
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: 'var(--md-sys-shape-corner-full)'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    marginBottom: '4px',
    fontFamily: 'var(--md-sys-typescale-title-medium-font-family-name)',
    lineHeight: 'var(--md-sys-typescale-title-medium-line-height)'
  },
  userRole: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)',
    lineHeight: 'var(--md-sys-typescale-body-small-line-height)'
  },
  menuItems: {
    padding: '8px'
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    fontSize: '16px',
    color: 'var(--md-sys-color-on-surface)',
    cursor: 'pointer',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    textAlign: 'left',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    fontWeight: 'var(--md-sys-typescale-label-large-font-weight)',
    lineHeight: 'var(--md-sys-typescale-label-large-line-height)',
    letterSpacing: 'var(--md-sys-typescale-label-large-letter-spacing)'
  },
  menuItemDanger: {
    color: 'var(--md-sys-color-error)'
  },
  icon: {
    fontSize: '20px',
    width: '24px',
    textAlign: 'center',
    flexShrink: 0
  },
  label: {
    flex: 1
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--md-sys-color-outline-variant)',
    margin: '8px 16px',
    opacity: 0.5
  }
};

// Add CSS animation keyframes and hover styles
if (typeof document !== 'undefined' && !document.getElementById('profile-menu-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'profile-menu-styles';
  styleSheet.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    /* Profile menu hover states */
    [data-profile-menu-item]:hover {
      background-color: var(--md-sys-color-surface-container-highest) !important;
    }
    
    [data-profile-menu-item]:active {
      background-color: var(--md-sys-color-surface-container) !important;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default ProfileMenu;