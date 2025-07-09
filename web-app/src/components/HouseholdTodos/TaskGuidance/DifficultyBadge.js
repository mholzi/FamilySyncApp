import React from 'react';
import './DifficultyBadge.css';

const DifficultyBadge = ({ difficulty, showLabel = true, size = 'normal' }) => {
  const getDifficultyConfig = (level) => {
    switch (level) {
      case 'easy':
        return {
          icon: '🌟',
          label: 'Easy',
          description: 'Quick task',
          className: 'difficulty-easy'
        };
      case 'moderate':
        return {
          icon: '⚡',
          label: 'Moderate',
          description: 'Standard task',
          className: 'difficulty-moderate'
        };
      case 'complex':
        return {
          icon: '🎯',
          label: 'Complex',
          description: 'Needs attention',
          className: 'difficulty-complex'
        };
      default:
        return {
          icon: '🌟',
          label: 'Easy',
          description: 'Quick task',
          className: 'difficulty-easy'
        };
    }
  };

  const config = getDifficultyConfig(difficulty);

  return (
    <div className={`difficulty-badge ${config.className} ${size}`}>
      <span className="difficulty-icon">{config.icon}</span>
      {showLabel && (
        <span className="difficulty-text">
          <span className="difficulty-label">{config.label}</span>
          <span className="difficulty-description">{config.description}</span>
        </span>
      )}
    </div>
  );
};

export default DifficultyBadge;