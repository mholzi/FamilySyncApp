import React from 'react';
import PropTypes from 'prop-types';
import styles from './Button.module.css';

/**
 * Reusable Button component following FamilySync design system
 * 
 * PATTERN: Use this as the base for all button components
 * - CSS modules for styling
 * - PropTypes for validation
 * - Variant system for different button types
 * - Accessibility features built-in
 */
const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  type = 'button',
  className = '',
  ariaLabel,
  ...props 
}) => {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      {...props}
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'outline']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  className: PropTypes.string,
  ariaLabel: PropTypes.string
};

export default Button;