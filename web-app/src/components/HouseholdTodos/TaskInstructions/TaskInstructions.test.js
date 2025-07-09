import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskInstructions from './TaskInstructions';

describe('TaskInstructions', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Display Mode', () => {
    it('renders instructions in display mode', () => {
      const instructions = '**Step 1:**\n1. First step\n2. Second step\n\n**Important:** Safety note';
      
      render(
        <TaskInstructions 
          value={instructions} 
          onChange={mockOnChange} 
          isEditing={false} 
        />
      );

      expect(screen.getByText('Instructions')).toBeInTheDocument();
      expect(screen.getByText('Step 1:')).toBeInTheDocument();
      expect(screen.getByText('First step')).toBeInTheDocument();
      expect(screen.getByText('Second step')).toBeInTheDocument();
    });

    it('shows "No instructions provided" when empty', () => {
      render(
        <TaskInstructions 
          value="" 
          onChange={mockOnChange} 
          isEditing={false} 
        />
      );

      expect(screen.getByText('No instructions provided')).toBeInTheDocument();
    });

    it('formats bold text correctly', () => {
      render(
        <TaskInstructions 
          value="**Important Note:** This is bold" 
          onChange={mockOnChange} 
          isEditing={false} 
        />
      );

      const boldElement = screen.getByText('Important Note:');
      expect(boldElement.tagName).toBe('H5');
    });

    it('formats bullet points correctly', () => {
      render(
        <TaskInstructions 
          value="- First item\n- Second item" 
          onChange={mockOnChange} 
          isEditing={false} 
        />
      );

      expect(screen.getByText('First item')).toBeInTheDocument();
      expect(screen.getByText('Second item')).toBeInTheDocument();
    });

    it('formats numbered lists correctly', () => {
      render(
        <TaskInstructions 
          value="1. First step\n2. Second step" 
          onChange={mockOnChange} 
          isEditing={false} 
        />
      );

      expect(screen.getByText('First step')).toBeInTheDocument();
      expect(screen.getByText('Second step')).toBeInTheDocument();
    });

    it('highlights warning text', () => {
      render(
        <TaskInstructions 
          value="⚠️ Important safety warning" 
          onChange={mockOnChange} 
          isEditing={false} 
        />
      );

      const warningElement = screen.getByText('⚠️ Important safety warning');
      expect(warningElement).toHaveClass('warning-text');
    });
  });

  describe('Edit Mode', () => {
    it('renders editor in edit mode', () => {
      render(
        <TaskInstructions 
          value="" 
          onChange={mockOnChange} 
          isEditing={true} 
        />
      );

      expect(screen.getByText('Step-by-Step Instructions')).toBeInTheDocument();
      expect(screen.getByText('Help your au pair succeed with clear, friendly guidance')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('shows format buttons', () => {
      render(
        <TaskInstructions 
          value="" 
          onChange={mockOnChange} 
          isEditing={true} 
        />
      );

      expect(screen.getByTitle('Bold')).toBeInTheDocument();
      expect(screen.getByTitle('Italic')).toBeInTheDocument();
      expect(screen.getByTitle('Underline')).toBeInTheDocument();
      expect(screen.getByTitle('Numbered List')).toBeInTheDocument();
      expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
    });

    it('shows template dropdown', () => {
      render(
        <TaskInstructions 
          value="" 
          onChange={mockOnChange} 
          isEditing={true} 
        />
      );

      const templateSelect = screen.getByDisplayValue('Insert Template...');
      expect(templateSelect).toBeInTheDocument();
      
      // Check that templates are available
      fireEvent.click(templateSelect);
      expect(screen.getByText('Step-by-Step')).toBeInTheDocument();
      expect(screen.getByText('Cleaning Checklist')).toBeInTheDocument();
      expect(screen.getByText('Safety First')).toBeInTheDocument();
    });

    it('calls onChange when text is entered', () => {
      render(
        <TaskInstructions 
          value="" 
          onChange={mockOnChange} 
          isEditing={true} 
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'New instructions' } });
      
      expect(mockOnChange).toHaveBeenCalledWith('New instructions');
    });

    it('shows preview when preview button is clicked', () => {
      render(
        <TaskInstructions 
          value="**Test:** Preview content" 
          onChange={mockOnChange} 
          isEditing={true} 
        />
      );

      const previewButton = screen.getByText('👁️ Preview');
      fireEvent.click(previewButton);
      
      expect(screen.getByText('✏️ Edit')).toBeInTheDocument();
      expect(screen.getByText('Test:')).toBeInTheDocument();
      expect(screen.getByText('Preview content')).toBeInTheDocument();
    });

    it('inserts template when selected', () => {
      render(
        <TaskInstructions 
          value="" 
          onChange={mockOnChange} 
          isEditing={true} 
        />
      );

      const templateSelect = screen.getByDisplayValue('Insert Template...');
      fireEvent.change(templateSelect, { target: { value: 'Step-by-Step' } });
      
      expect(mockOnChange).toHaveBeenCalledWith(expect.stringContaining('**Step-by-Step Instructions:**'));
    });

    it('shows formatting help text', () => {
      render(
        <TaskInstructions 
          value="" 
          onChange={mockOnChange} 
          isEditing={true} 
        />
      );

      expect(screen.getByText('Quick Formatting:')).toBeInTheDocument();
      expect(screen.getByText('**Bold Text** • - Bullet points • 1. Numbered lists • ⚠️ Warnings')).toBeInTheDocument();
      expect(screen.getByText('Shortcuts:')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+B Bold • Ctrl+I Italic • Ctrl+U Underline')).toBeInTheDocument();
    });

    it('has proper placeholder text', () => {
      render(
        <TaskInstructions 
          value="" 
          onChange={mockOnChange} 
          isEditing={true} 
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('Write clear, step-by-step instructions'));
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for screen readers', () => {
      render(
        <TaskInstructions 
          value="" 
          onChange={mockOnChange} 
          isEditing={true} 
        />
      );

      expect(screen.getByText('Step-by-Step Instructions')).toBeInTheDocument();
      expect(screen.getByText('Help your au pair succeed with clear, friendly guidance')).toBeInTheDocument();
    });

    it('format buttons have proper titles', () => {
      render(
        <TaskInstructions 
          value="" 
          onChange={mockOnChange} 
          isEditing={true} 
        />
      );

      expect(screen.getByTitle('Bold')).toBeInTheDocument();
      expect(screen.getByTitle('Italic')).toBeInTheDocument();
      expect(screen.getByTitle('Underline')).toBeInTheDocument();
      expect(screen.getByTitle('Numbered List')).toBeInTheDocument();
      expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('handles keyboard shortcuts', () => {
      render(
        <TaskInstructions 
          value="" 
          onChange={mockOnChange} 
          isEditing={true} 
        />
      );

      const textarea = screen.getByRole('textbox');
      
      // Test Ctrl+B (bold)
      fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });
      // Note: In a real test, you'd need to mock document.execCommand
      
      // Test Ctrl+I (italic)
      fireEvent.keyDown(textarea, { key: 'i', ctrlKey: true });
      
      // Test Ctrl+U (underline)
      fireEvent.keyDown(textarea, { key: 'u', ctrlKey: true });
      
      // The actual formatting would require mocking document.execCommand
      // which is deprecated and not easily testable
    });
  });
});