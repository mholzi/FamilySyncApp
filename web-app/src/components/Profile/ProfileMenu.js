import React from 'react';

const ProfileMenu = ({ user, userData, isOpen, onClose, onNavigate, onConfirmLogout }) => {
  if (!isOpen) return null;

  const menuItems = [
    { icon: '👤', label: 'Edit Profile', action: 'profile' },
    { icon: '🔔', label: 'Notifications', action: 'notifications' },
    { icon: '⚙️', label: 'Settings', action: 'settings' },
    { icon: '👥', label: 'Family Management', action: 'family' },
    { icon: '📊', label: 'Analytics', action: 'analytics' },
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
                style={{
                  ...styles.menuItem,
                  ...(item.variant === 'danger' ? styles.menuItemDanger : {})
                }}
                onClick={() => handleMenuAction(item.action)}
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
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    minWidth: '240px',
    zIndex: 1000,
    animation: 'slideDown 0.2s ease',
    overflow: 'hidden'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    borderBottom: '1px solid #F2F2F7',
    backgroundColor: '#FAFAFA'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '20px',
    backgroundColor: '#007AFF',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
    overflow: 'hidden'
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '20px'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '2px'
  },
  userRole: {
    fontSize: '13px',
    color: '#8E8E93'
  },
  menuItems: {
    padding: '8px 0'
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '15px',
    color: '#000',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    textAlign: 'left'
  },
  menuItemDanger: {
    color: '#FF3B30'
  },
  icon: {
    fontSize: '16px',
    width: '20px',
    textAlign: 'center'
  },
  label: {
    flex: 1,
    fontWeight: '400'
  },
  divider: {
    height: '1px',
    backgroundColor: '#F2F2F7',
    margin: '8px 16px'
  }
};

// Add CSS animation keyframes
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .profile-menu-item:hover {
    background-color: #F2F2F7 !important;
  }
`;
document.head.appendChild(styleSheet);

export default ProfileMenu;