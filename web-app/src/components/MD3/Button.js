import React from 'react';
import PropTypes from 'prop-types';

/**
 * Material Design 3 Button Component
 * Implements MD3 button specifications with proper state layers and accessibility
 */
const Button = ({ 
  variant = 'filled', 
  size = 'medium',
  disabled = false,
  type = 'button',
  children,
  onClick,
  className = '',
  ...props 
}) => {
  const baseClasses = 'md3-button md3-touch-target';
  const variantClasses = {
    filled: 'md3-button-filled',
    outlined: 'md3-button-outlined',
    text: 'md3-button-text'
  };
  
  const sizeClasses = {
    small: 'md3-button-small',
    medium: '',
    large: 'md3-button-large'
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={classes}
      {...props}
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  variant: PropTypes.oneOf(['filled', 'outlined', 'text']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  className: PropTypes.string
};

export default Button;