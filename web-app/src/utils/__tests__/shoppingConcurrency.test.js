import { addShoppingItem, toggleShoppingItem, createShoppingList } from '../familyUtils';
import { db } from '../../firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';

// Mock Firebase
jest.mock('../../firebase', () => ({
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
    runTransaction: jest.fn(),
    setDoc: jest.fn(),
    getDoc: jest.fn()
  }
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  runTransaction: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date('2023-01-01') }))
  }
}));

describe('Shopping Concurrency Tests', () => {
  const mockFamilyId = 'test-family-id';
  const mockListId = 'test-list-id';
  const mockUserId1 = 'user1';
  const mockUserId2 = 'user2';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock transaction
    const mockTransaction = {
      get: jest.fn(),
      update: jest.fn(),
      set: jest.fn()
    };
    
    require('firebase/firestore').runTransaction.mockImplementation(
      (db, callback) => callback(mockTransaction)
    );
  });

  describe('Concurrent Item Addition', () => {
    test('should handle multiple users adding items simultaneously', async () => {
      // Mock existing shopping list
      const mockListData = {
        id: mockListId,
        name: 'Test List',
        items: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockListData
        }),
        update: jest.fn()
      };

      require('firebase/firestore').runTransaction.mockImplementation(
        (db, callback) => callback(mockTransaction)
      );

      // Simulate concurrent additions
      const promises = [
        addShoppingItem(mockFamilyId, mockListId, { name: 'Milk' }, mockUserId1),
        addShoppingItem(mockFamilyId, mockListId, { name: 'Bread' }, mockUserId1),
        addShoppingItem(mockFamilyId, mockListId, { name: 'Eggs' }, mockUserId2)
      ];

      const results = await Promise.allSettled(promises);
      
      // All additions should succeed
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
      
      // Transaction should have been called for each addition
      expect(require('firebase/firestore').runTransaction).toHaveBeenCalledTimes(3);
    });

    test('should prevent duplicate items when added concurrently', async () => {
      const mockListData = {
        id: mockListId,
        name: 'Test List',
        items: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockListData
        }),
        update: jest.fn()
      };

      require('firebase/firestore').runTransaction.mockImplementation(
        (db, callback) => callback(mockTransaction)
      );

      // Try to add same item twice
      const promises = [
        addShoppingItem(mockFamilyId, mockListId, { name: 'Milk' }, mockUserId1),
        addShoppingItem(mockFamilyId, mockListId, { name: 'Milk' }, mockUserId2)
      ];

      const results = await Promise.allSettled(promises);
      
      // One should succeed, one should fail
      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;
      
      expect(successes).toBe(1);
      expect(failures).toBe(1);
    });
  });

  describe('Concurrent Item Toggle', () => {
    test('should handle concurrent item toggles correctly', async () => {
      const mockItemId = 'test-item-id';
      const mockListData = {
        id: mockListId,
        name: 'Test List',
        items: {
          [mockItemId]: {
            id: mockItemId,
            name: 'Milk',
            isPurchased: false,
            addedBy: mockUserId1
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockListData
        }),
        update: jest.fn()
      };

      require('firebase/firestore').runTransaction.mockImplementation(
        (db, callback) => callback(mockTransaction)
      );

      // Simulate concurrent toggles
      const promises = [
        toggleShoppingItem(mockFamilyId, mockListId, mockItemId, true, mockUserId1),
        toggleShoppingItem(mockFamilyId, mockListId, mockItemId, false, mockUserId2)
      ];

      const results = await Promise.allSettled(promises);
      
      // All toggles should succeed (transaction handles conflicts)
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
      
      // Transaction should have been called for each toggle
      expect(require('firebase/firestore').runTransaction).toHaveBeenCalledTimes(2);
    });

    test('should handle toggle of non-existent item', async () => {
      const mockItemId = 'non-existent-item';
      const mockListData = {
        id: mockListId,
        name: 'Test List',
        items: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockListData
        }),
        update: jest.fn()
      };

      require('firebase/firestore').runTransaction.mockImplementation(
        (db, callback) => callback(mockTransaction)
      );

      // Try to toggle non-existent item
      await expect(
        toggleShoppingItem(mockFamilyId, mockListId, mockItemId, true, mockUserId1)
      ).rejects.toThrow('Item not found in shopping list');
    });
  });

  describe('Concurrent List Operations', () => {
    test('should handle concurrent list modifications', async () => {
      const mockListData = {
        id: mockListId,
        name: 'Test List',
        items: {
          'item1': { id: 'item1', name: 'Milk', isPurchased: false, addedBy: mockUserId1 },
          'item2': { id: 'item2', name: 'Bread', isPurchased: false, addedBy: mockUserId1 }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockListData
        }),
        update: jest.fn()
      };

      require('firebase/firestore').runTransaction.mockImplementation(
        (db, callback) => callback(mockTransaction)
      );

      // Simulate concurrent operations: add item + toggle existing item
      const promises = [
        addShoppingItem(mockFamilyId, mockListId, { name: 'Eggs' }, mockUserId1),
        toggleShoppingItem(mockFamilyId, mockListId, 'item1', true, mockUserId2)
      ];

      const results = await Promise.allSettled(promises);
      
      // Both operations should succeed
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    });

    test('should handle transaction failures gracefully', async () => {
      const mockTransaction = {
        get: jest.fn().mockRejectedValue(new Error('Transaction failed')),
        update: jest.fn()
      };

      require('firebase/firestore').runTransaction.mockImplementation(
        (db, callback) => callback(mockTransaction)
      );

      // Transaction should fail and throw user-friendly error
      await expect(
        addShoppingItem(mockFamilyId, mockListId, { name: 'Milk' }, mockUserId1)
      ).rejects.toThrow('Please check your input and try again');
    });
  });

  describe('Data Consistency', () => {
    test('should maintain data structure consistency', async () => {
      const mockListData = {
        id: mockListId,
        name: 'Test List',
        items: null, // Invalid structure
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockListData
        }),
        update: jest.fn()
      };

      require('firebase/firestore').runTransaction.mockImplementation(
        (db, callback) => callback(mockTransaction)
      );

      // Should handle invalid structure and create proper object
      const result = await addShoppingItem(mockFamilyId, mockListId, { name: 'Milk' }, mockUserId1);
      
      expect(result).toBeDefined();
      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          items: expect.any(Object)
        })
      );
    });

    test('should validate input data before processing', async () => {
      // Invalid family ID
      await expect(
        addShoppingItem('', mockListId, { name: 'Milk' }, mockUserId1)
      ).rejects.toThrow('Invalid familyId');

      // Invalid item data
      await expect(
        addShoppingItem(mockFamilyId, mockListId, { name: '' }, mockUserId1)
      ).rejects.toThrow('Invalid item');

      // Invalid user ID
      await expect(
        addShoppingItem(mockFamilyId, mockListId, { name: 'Milk' }, '')
      ).rejects.toThrow('Invalid userId');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      require('firebase/firestore').runTransaction.mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        addShoppingItem(mockFamilyId, mockListId, { name: 'Milk' }, mockUserId1)
      ).rejects.toThrow('Please check your input and try again');
    });

    test('should handle permission errors', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.code = 'permission-denied';
      
      require('firebase/firestore').runTransaction.mockRejectedValue(permissionError);

      await expect(
        addShoppingItem(mockFamilyId, mockListId, { name: 'Milk' }, mockUserId1)
      ).rejects.toThrow('You don\'t have permission to access this shopping list');
    });
  });
});