import React, { useState } from 'react';
import './FirstTimeHelper.css';

const FirstTimeHelper = ({ 
  firstTimeHelp, 
  isNewAuPair = false,
  isLearningMode = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasBeenViewed, setHasBeenViewed] = useState(false);

  // Show if there's content and the au pair is new or in learning mode
  const shouldShow = firstTimeHelp && (isNewAuPair || isLearningMode);

  if (!shouldShow) {
    return null;
  }

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (!hasBeenViewed) {
      setHasBeenViewed(true);
    }
  };

  const handleDismiss = () => {
    setIsExpanded(false);
    setHasBeenViewed(true);
  };

  return (
    <div className={`first-time-helper ${isExpanded ? 'expanded' : ''} ${hasBeenViewed ? 'viewed' : ''}`}>
      <div className="first-time-helper-header" onClick={handleToggle}>
        <div className="helper-icon">
          {isNewAuPair ? '🌟' : '💡'}
        </div>
        <div className="helper-title">
          {isNewAuPair ? 'New Au Pair Guide' : 'Learning Mode'}
        </div>
        <div className="helper-actions">
          {!hasBeenViewed && <div className="helper-badge">New</div>}
          <button className="helper-toggle" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="first-time-helper-content">
          {firstTimeHelp && (
            <div className="help-section">
              <h5>First-Time Tips</h5>
              <div className="help-text">
                {firstTimeHelp.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          )}


          <div className="helper-footer">
            <button 
              className="helper-dismiss-btn"
              onClick={handleDismiss}
            >
              Got it! 👍
            </button>
            <div className="helper-note">
              {isNewAuPair 
                ? 'This guide will be available for your first 30 days'
                : 'You can turn off Learning Mode in your profile settings'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirstTimeHelper;