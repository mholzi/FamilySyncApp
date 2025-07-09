import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { 
  connectFirestoreEmulator,
  collection,
  addDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../firebase';
import App from '../App';

/**
 * Integration testing patterns for FamilySync
 * 
 * PATTERN: Use these patterns for end-to-end feature testing
 * - Firebase emulator setup
 * - Real database operations
 * - Full user workflows
 * - Cross-component interactions
 * - Performance testing
 */

/**
 * Setup Firebase emulators for testing
 */
beforeAll(async () => {
  // Connect to Firebase emulators
  if (!auth.emulatorConfig) {
    connectAuthEmulator(auth, 'http://localhost:9099');
  }
  
  if (!db._delegate._databaseId.projectId.includes('demo-')) {
    connectFirestoreEmulator(db, 'localhost', 8080);
  }
});

/**
 * Test data setup
 */
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  firstName: 'Test',
  lastName: 'User',
  role: 'Parent'
};

const testFamily = {
  name: 'Test Family',
  memberUids: []
};

const testTasks = [
  {
    title: 'Buy groceries',
    description: 'Weekly grocery shopping',
    assignedTo: 'test-user-id',
    dueDate: new Date('2024-01-15'),
    priority: 'medium',
    completed: false
  },
  {
    title: 'Pick up kids',
    description: 'Pick up from school',
    assignedTo: 'test-user-id',
    dueDate: new Date('2024-01-16'),
    priority: 'high',
    completed: false
  }
];

/**
 * User authentication flow integration test
 */
describe('User Authentication Flow', () => {
  test('user can sign up, sign in, and access dashboard', async () => {
    const user = userEvent.setup();
    
    render(<App />);
    
    // Navigate to signup
    await user.click(screen.getByText(/sign up/i));
    
    // Fill out signup form
    await user.type(screen.getByLabelText(/email/i), testUser.email);
    await user.type(screen.getByLabelText(/password/i), testUser.password);
    await user.type(screen.getByLabelText(/first name/i), testUser.firstName);
    await user.type(screen.getByLabelText(/last name/i), testUser.lastName);
    await user.selectOptions(screen.getByLabelText(/role/i), testUser.role);
    
    // Submit signup form
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    // Wait for redirect to dashboard
    await waitFor(() => {
      expect(screen.getByText(/welcome.*test user/i)).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Sign out
    await user.click(screen.getByRole('button', { name: /sign out/i }));
    
    // Verify redirect to login
    await waitFor(() => {
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });
    
    // Sign in with created account
    await user.type(screen.getByLabelText(/email/i), testUser.email);
    await user.type(screen.getByLabelText(/password/i), testUser.password);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Verify successful login
    await waitFor(() => {
      expect(screen.getByText(/welcome.*test user/i)).toBeInTheDocument();
    });
  });
});

/**
 * Task management integration test
 */
describe('Task Management Flow', () => {
  let testUserId;
  let testFamilyId;
  
  beforeEach(async () => {
    // Create test user and family in emulator
    const userCredential = await signInWithEmailAndPassword(auth, testUser.email, testUser.password);
    testUserId = userCredential.user.uid;
    
    // Create test family
    const familyRef = await addDoc(collection(db, 'families'), {
      ...testFamily,
      memberUids: [testUserId]
    });
    testFamilyId = familyRef.id;
    
    // Add test tasks
    for (const task of testTasks) {
      await addDoc(collection(db, 'families', testFamilyId, 'tasks'), {
        ...task,
        familyId: testFamilyId,
        assignedTo: testUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  });
  
  test('user can view, create, and complete tasks', async () => {
    const user = userEvent.setup();
    
    render(<App />);
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      expect(screen.getByText('Pick up kids')).toBeInTheDocument();
    });
    
    // Create new task
    await user.click(screen.getByRole('button', { name: /add task/i }));
    
    await user.type(screen.getByLabelText(/task title/i), 'New Test Task');
    await user.type(screen.getByLabelText(/description/i), 'Test description');
    await user.click(screen.getByRole('button', { name: /save task/i }));
    
    // Verify new task appears
    await waitFor(() => {
      expect(screen.getByText('New Test Task')).toBeInTheDocument();
    });
    
    // Complete a task
    const completeButton = screen.getByRole('button', { name: /complete.*buy groceries/i });
    await user.click(completeButton);
    
    // Verify task is marked as completed
    await waitFor(() => {
      expect(screen.getByText('Buy groceries')).toHaveClass('completed');
    });
    
    // Verify task completion in database
    const completedTasks = await getDocs(
      query(
        collection(db, 'families', testFamilyId, 'tasks'),
        where('completed', '==', true)
      )
    );
    
    expect(completedTasks.size).toBe(1);
    expect(completedTasks.docs[0].data().title).toBe('Buy groceries');
  });
});

/**
 * Real-time sync integration test
 */
describe('Real-time Synchronization', () => {
  test('updates reflect across multiple instances', async () => {
    // Simulate two browser instances
    const { rerender } = render(<App />);
    
    // First instance - add a task
    const user1 = userEvent.setup();
    await user1.click(screen.getByRole('button', { name: /add task/i }));
    await user1.type(screen.getByLabelText(/task title/i), 'Shared Task');
    await user1.click(screen.getByRole('button', { name: /save task/i }));
    
    // Second instance should see the new task
    rerender(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Shared Task')).toBeInTheDocument();
    });
  });
});

/**
 * Error handling integration test
 */
describe('Error Handling Integration', () => {
  test('handles network errors gracefully', async () => {
    // Mock network failure
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Simulate network error by stopping emulator connection
    const originalFetch = window.fetch;
    window.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    
    render(<App />);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
    
    // Restore fetch
    window.fetch = originalFetch;
    
    // Verify error retry functionality
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await userEvent.click(retryButton);
    
    // Should attempt to reload data
    await waitFor(() => {
      expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
    });
  });
});

/**
 * Performance integration test
 */
describe('Performance Integration', () => {
  test('loads dashboard within acceptable time', async () => {
    const startTime = performance.now();
    
    render(<App />);
    
    // Wait for dashboard to fully load
    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });
    
    const loadTime = performance.now() - startTime;
    
    // Should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });
  
  test('handles large dataset efficiently', async () => {
    // Create large dataset
    const largeTasks = Array.from({ length: 100 }, (_, i) => ({
      title: `Task ${i + 1}`,
      description: `Description for task ${i + 1}`,
      assignedTo: 'test-user-id',
      dueDate: new Date(),
      priority: 'medium',
      completed: false
    }));
    
    // Add tasks to database
    for (const task of largeTasks) {
      await addDoc(collection(db, 'families', testFamilyId, 'tasks'), task);
    }
    
    const startTime = performance.now();
    
    render(<App />);
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(screen.getAllByText(/task \d+/i)).toHaveLength(20); // Assuming pagination
    });
    
    const loadTime = performance.now() - startTime;
    
    // Should still load efficiently with large dataset
    expect(loadTime).toBeLessThan(3000);
  });
});

/**
 * Cross-browser compatibility test
 */
describe('Cross-browser Compatibility', () => {
  test('works with different user agents', async () => {
    // Mock different browsers
    const browsers = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
    ];
    
    for (const userAgent of browsers) {
      Object.defineProperty(navigator, 'userAgent', {
        value: userAgent,
        configurable: true
      });
      
      const { unmount } = render(<App />);
      
      // Verify basic functionality works
      await waitFor(() => {
        expect(screen.getByText(/welcome/i)).toBeInTheDocument();
      });
      
      unmount();
    }
  });
});

/**
 * Mobile responsiveness integration test
 */
describe('Mobile Responsiveness', () => {
  test('adapts to mobile viewport', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667
    });
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
    
    render(<App />);
    
    // Verify mobile-specific elements
    await waitFor(() => {
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
    });
    
    // Verify desktop elements are hidden
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
  });
});

/**
 * Security integration test
 */
describe('Security Integration', () => {
  test('prevents unauthorized access', async () => {
    // Clear authentication
    await auth.signOut();
    
    render(<App />);
    
    // Try to access protected route
    window.history.pushState({}, '', '/dashboard');
    
    // Should redirect to login
    await waitFor(() => {
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });
  });
  
  test('enforces data access rules', async () => {
    // Try to access another family's data
    const otherFamilyId = 'other-family-id';
    
    // This should fail due to security rules
    await expect(
      getDocs(collection(db, 'families', otherFamilyId, 'tasks'))
    ).rejects.toThrow(/permission-denied/i);
  });
});

/**
 * Cleanup after tests
 */
afterEach(async () => {
  // Clean up test data
  if (testFamilyId) {
    // Delete test tasks
    const tasksSnapshot = await getDocs(
      collection(db, 'families', testFamilyId, 'tasks')
    );
    
    for (const doc of tasksSnapshot.docs) {
      await doc.ref.delete();
    }
    
    // Delete test family
    await doc(db, 'families', testFamilyId).delete();
  }
  
  // Sign out user
  if (auth.currentUser) {
    await auth.signOut();
  }
});