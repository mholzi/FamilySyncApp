import React from 'react';
import PropTypes from 'prop-types';

/**
 * Material Design 3 TextField Component
 * Implements MD3 text field specifications with proper focus states and accessibility
 */
const TextField = ({ 
  label,
  placeholder,
  value,
  onChange,
  error = false,
  disabled = false,
  required = false,
  type = 'text',
  multiline = false,
  rows = 4,
  helperText,
  className = '',
  ...props 
}) => {
  const baseClasses = 'md3-text-field';
  const Component = multiline ? 'textarea' : 'input';
  
  const classes = [
    baseClasses,
    error ? 'md3-text-field-error' : '',
    disabled ? 'md3-text-field-disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="md3-text-field-container">
      {label && (
        <label className="md3-label-medium md3-on-surface-variant-color md3-mb-8">
          {label}
          {required && <span className="md3-error-color"> *</span>}
        </label>
      )}
      
      <Component
        type={multiline ? undefined : type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={multiline ? rows : undefined}
        className={classes}
        {...props}
      />
      
      {helperText && (
        <div className={`md3-label-small md3-mt-8 ${error ? 'md3-error-color' : 'md3-on-surface-variant-color'}`}>
          {helperText}
        </div>
      )}
    </div>
  );
};

TextField.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  error: PropTypes.bool,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  type: PropTypes.string,
  multiline: PropTypes.bool,
  rows: PropTypes.number,
  helperText: PropTypes.string,
  className: PropTypes.string
};

export default TextField;