import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from './SettingsPage';
import { useFamily } from '../../hooks/useFamily';
import { updateUserPreferences } from '../../utils/userUtils';

// Mock dependencies
jest.mock('../../hooks/useFamily');
jest.mock('../../utils/userUtils');

describe('SettingsPage', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com'
  };

  const mockUserData = {
    name: 'Test User',
    preferences: {
      language: 'en',
      theme: 'system',
      notifications: true,
      defaultView: 'dashboard'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useFamily.mockReturnValue({
      userData: mockUserData,
      loading: false
    });
  });

  test('renders settings page with preferences', () => {
    render(<SettingsPage user={mockUser} />);
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('🇺🇸 English')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  test('enters edit mode when Edit button is clicked', () => {
    render(<SettingsPage user={mockUser} />);
    
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);
    
    // Should show form inputs
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2); // Language and Theme selects
    
    // Check notification switch is present by looking for the label
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    
    // Should show action buttons
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  test('updates preferences when saved', async () => {
    updateUserPreferences.mockResolvedValue({ success: true });
    window.alert = jest.fn();
    
    render(<SettingsPage user={mockUser} />);
    
    // Enter edit mode
    fireEvent.click(screen.getByText('Edit'));
    
    // Change language
    const selects = screen.getAllByRole('combobox');
    const languageSelect = selects[0]; // First select is language
    fireEvent.change(languageSelect, { target: { value: 'de' } });
    
    // Save changes
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(updateUserPreferences).toHaveBeenCalledWith(mockUser.uid, {
        language: 'de',
        theme: 'system',
        notifications: true,
        defaultView: 'dashboard'
      });
      expect(window.alert).toHaveBeenCalledWith('Settings updated successfully!');
    });
  });

  test('cancels edit mode and resets form', () => {
    render(<SettingsPage user={mockUser} />);
    
    // Enter edit mode
    fireEvent.click(screen.getByText('Edit'));
    
    // Change language
    const selects = screen.getAllByRole('combobox');
    const languageSelect = selects[0]; // First select is language
    fireEvent.change(languageSelect, { target: { value: 'de' } });
    
    // Cancel
    fireEvent.click(screen.getByText('Cancel'));
    
    // Should exit edit mode and show original value
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('🇺🇸 English')).toBeInTheDocument();
  });

  test('shows loading state', () => {
    useFamily.mockReturnValue({
      userData: null,
      loading: true
    });
    
    render(<SettingsPage user={mockUser} />);
    
    expect(screen.getByText('Loading settings...')).toBeInTheDocument();
  });

  test('handles save error gracefully', async () => {
    updateUserPreferences.mockResolvedValue({ 
      success: false, 
      error: 'Failed to update preferences' 
    });
    window.alert = jest.fn();
    console.error = jest.fn();
    
    render(<SettingsPage user={mockUser} />);
    
    // Enter edit mode and save
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to save settings: Failed to update preferences');
      expect(console.error).toHaveBeenCalled();
    });
  });

  test('displays German when language is set to de', () => {
    const germanUserData = {
      ...mockUserData,
      preferences: {
        ...mockUserData.preferences,
        language: 'de'
      }
    };
    
    useFamily.mockReturnValue({
      userData: germanUserData,
      loading: false
    });
    
    render(<SettingsPage user={mockUser} />);
    
    expect(screen.getByText('🇩🇪 German')).toBeInTheDocument();
  });

  test('toggles notifications switch', async () => {
    updateUserPreferences.mockResolvedValue({ success: true });
    window.alert = jest.fn();
    
    render(<SettingsPage user={mockUser} />);
    
    // Enter edit mode
    fireEvent.click(screen.getByText('Edit'));
    
    // Toggle notifications by clicking the switch label container
    const switchContainer = screen.getByText('Enabled').closest('label');
    fireEvent.click(switchContainer);
    
    // Save changes
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(updateUserPreferences).toHaveBeenCalledWith(mockUser.uid, {
        language: 'en',
        theme: 'system',
        notifications: false, // Should be toggled off
        defaultView: 'dashboard'
      });
    });
  });
});