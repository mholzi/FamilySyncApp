import React from 'react';
import './TaskInstructions.css';

const TaskInstructions = ({ value, onChange, isEditing }) => {
  if (!isEditing) {
    // Display mode - show the instructions as simple text
    return (
      <div className="task-instructions-display">
        <h4>Instructions</h4>
        <div className="instructions-content">
          {value ? (
            <p style={{ whiteSpace: 'pre-wrap' }}>{value}</p>
          ) : (
            <p className="no-instructions">No instructions provided.</p>
          )}
        </div>
      </div>
    );
  }

  // Edit mode - simple textarea instead of rich text editor
  return (
    <div className="task-instructions-editor">
      <div className="form-group">
        <label htmlFor="task-instructions">Task Instructions</label>
        <textarea
          id="task-instructions"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Provide clear, simple instructions for this task..."
          rows={4}
          className="task-instructions-textarea"
        />
        <div className="field-help">
          💡 Keep instructions simple and clear. First-time guidance is available separately.
        </div>
      </div>
    </div>
  );
};

export default TaskInstructions;