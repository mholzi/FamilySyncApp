// Common modal styles for consistent blur overlay effect across the application

export const blurOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)', // For Safari support
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px',
  animation: 'fadeIn 0.2s ease-out'
};

// Add CSS animation keyframes to the document
if (typeof document !== 'undefined' && !document.getElementById('modal-animations')) {
  const style = document.createElement('style');
  style.id = 'modal-animations';
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        backdrop-filter: blur(0px);
        -webkit-backdrop-filter: blur(0px);
      }
      to {
        opacity: 1;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
    }
    
    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
}

export const modalContentStyle = {
  animation: 'slideUp 0.3s ease-out'
};

// Common modal container style
export const modalContainerStyle = {
  backgroundColor: 'var(--md-sys-color-surface)',
  borderRadius: 'var(--md-sys-shape-corner-large)',
  width: '100%',
  maxWidth: '480px',
  maxHeight: '90vh',
  overflow: 'hidden',
  boxShadow: 'var(--md-sys-elevation-level3)',
  display: 'flex',
  flexDirection: 'column',
  ...modalContentStyle
};