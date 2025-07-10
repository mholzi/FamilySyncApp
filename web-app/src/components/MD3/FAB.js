import React from 'react';
import PropTypes from 'prop-types';

/**
 * Material Design 3 Floating Action Button Component
 * Implements MD3 FAB specifications with proper elevation and colors
 */
const FAB = ({ 
  size = 'medium',
  children,
  onClick,
  className = '',
  ...props 
}) => {
  const baseClasses = 'md3-fab md3-touch-target';
  const sizeClasses = {
    small: 'md3-fab-small',
    medium: '',
    large: 'md3-fab-large'
  };

  const classes = [
    baseClasses,
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      onClick={onClick}
      className={classes}
      {...props}
    >
      {children}
    </button>
  );
};

FAB.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  className: PropTypes.string
};

export default FAB;