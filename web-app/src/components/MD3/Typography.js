import React from 'react';
import PropTypes from 'prop-types';

/**
 * Material Design 3 Typography Component
 * Implements MD3 typography scale with proper semantic HTML elements
 */
const Typography = ({ 
  variant = 'body-medium',
  component,
  color = 'on-background',
  children,
  className = '',
  ...props 
}) => {
  const variantClasses = {
    'display-large': 'md3-display-large',
    'display-medium': 'md3-display-medium',
    'display-small': 'md3-display-small',
    'headline-large': 'md3-headline-large',
    'headline-medium': 'md3-headline-medium',
    'headline-small': 'md3-headline-small',
    'title-large': 'md3-title-large',
    'title-medium': 'md3-title-medium',
    'title-small': 'md3-title-small',
    'body-large': 'md3-body-large',
    'body-medium': 'md3-body-medium',
    'body-small': 'md3-body-small',
    'label-large': 'md3-label-large',
    'label-medium': 'md3-label-medium',
    'label-small': 'md3-label-small'
  };

  const colorClasses = {
    'primary': 'md3-primary-color',
    'secondary': 'md3-secondary-color',
    'tertiary': 'md3-tertiary-color',
    'error': 'md3-error-color',
    'on-surface': 'md3-on-surface-color',
    'on-surface-variant': 'md3-on-surface-variant-color',
    'on-background': ''
  };

  // Default semantic elements based on variant
  const defaultElements = {
    'display-large': 'h1',
    'display-medium': 'h1',
    'display-small': 'h1',
    'headline-large': 'h2',
    'headline-medium': 'h2',
    'headline-small': 'h3',
    'title-large': 'h4',
    'title-medium': 'h5',
    'title-small': 'h6',
    'body-large': 'p',
    'body-medium': 'p',
    'body-small': 'p',
    'label-large': 'span',
    'label-medium': 'span',
    'label-small': 'span'
  };

  const Component = component || defaultElements[variant] || 'span';

  const classes = [
    variantClasses[variant],
    colorClasses[color],
    className
  ].filter(Boolean).join(' ');

  return (
    <Component
      className={classes}
      {...props}
    >
      {children}
    </Component>
  );
};

Typography.propTypes = {
  variant: PropTypes.oneOf([
    'display-large', 'display-medium', 'display-small',
    'headline-large', 'headline-medium', 'headline-small',
    'title-large', 'title-medium', 'title-small',
    'body-large', 'body-medium', 'body-small',
    'label-large', 'label-medium', 'label-small'
  ]),
  component: PropTypes.elementType,
  color: PropTypes.oneOf([
    'primary', 'secondary', 'tertiary', 'error',
    'on-surface', 'on-surface-variant', 'on-background'
  ]),
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

export default Typography;