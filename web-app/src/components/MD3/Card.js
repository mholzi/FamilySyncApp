import React from 'react';
import PropTypes from 'prop-types';

/**
 * Material Design 3 Card Component
 * Implements MD3 card specifications with proper elevation and surface colors
 */
const Card = ({ 
  variant = 'elevated', 
  elevation = 1,
  children,
  className = '',
  onClick,
  ...props 
}) => {
  const baseClasses = 'md3-card';
  const variantClasses = {
    elevated: 'md3-card-elevated',
    filled: 'md3-card-filled',
    outlined: 'md3-card-outlined'
  };
  
  const elevationClasses = {
    0: 'md3-elevation-0',
    1: 'md3-elevation-1',
    2: 'md3-elevation-2',
    3: 'md3-elevation-3',
    4: 'md3-elevation-4',
    5: 'md3-elevation-5'
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    elevationClasses[elevation],
    className
  ].filter(Boolean).join(' ');

  const CardElement = onClick ? 'button' : 'div';

  return (
    <CardElement
      className={classes}
      onClick={onClick}
      {...props}
    >
      {children}
    </CardElement>
  );
};

Card.propTypes = {
  variant: PropTypes.oneOf(['elevated', 'filled', 'outlined']),
  elevation: PropTypes.oneOf([0, 1, 2, 3, 4, 5]),
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  onClick: PropTypes.func
};

export default Card;