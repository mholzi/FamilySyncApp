import React from 'react';
import { useTheme } from '../ThemeProvider';
import Button from './Button';

/**
 * Material Design 3 Theme Toggle Component
 * Allows users to switch between light and dark themes
 */
const ThemeToggle = ({ className = '', ...props }) => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <Button
      variant="text"
      onClick={toggleTheme}
      className={className}
      {...props}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </Button>
  );
};

export default ThemeToggle;