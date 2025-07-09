import { 
  initializeTestEnvironment, 
  assertFails, 
  assertSucceeds 
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';

// Test configuration
const PROJECT_ID = 'test-familysync-shopping';
const FAMILY_ID = 'test-family-123';
const USER_ID_1 = 'user1-test';
const USER_ID_2 = 'user2-test';
const SHOPPING_LIST_ID = 'shopping-list-123';

describe('Shopping Security Rules Tests', () => {
  let testEnv;
  let authenticatedDb;
  let unauthenticatedDb;
  let otherUserDb;

  beforeAll(async () => {
    // Initialize test environment
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: `
          rules_version='2'
          service cloud.firestore {
            match /databases/{database}/documents {
              function isFamilyMember(familyId) {
                return request.auth != null && 
                       request.auth.uid in get(/databases/$(database)/documents/families/$(familyId)).data.memberUids;
              }
              
              match /families/{familyId} {
                allow read, write: if isFamilyMember(familyId);
                
                match /shopping/{shoppingId} {
                  allow read: if isFamilyMember(familyId);
                  allow write: if isFamilyMember(familyId) && 
                                 request.resource.data.familyId == familyId;
                  allow create: if isFamilyMember(familyId) && 
                                  request.resource.data.familyId == familyId;
                  allow delete: if isFamilyMember(familyId);
                }
              }
            }
          }
        `
      }
    });

    // Get authenticated contexts
    authenticatedDb = testEnv.authenticatedContext(USER_ID_1).firestore();
    unauthenticatedDb = testEnv.unauthenticatedContext().firestore();
    otherUserDb = testEnv.authenticatedContext(USER_ID_2).firestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    
    // Setup family document with USER_ID_1 as member
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'families', FAMILY_ID), {
        id: FAMILY_ID,
        name: 'Test Family',
        memberUids: [USER_ID_1],
        parentUids: [USER_ID_1],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  });

  describe('Shopping List Access Control', () => {
    test('should allow family members to read shopping lists', async () => {
      // Setup shopping list
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID), {
          id: SHOPPING_LIST_ID,
          name: 'Test Shopping List',
          familyId: FAMILY_ID,
          createdBy: USER_ID_1,
          items: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });

      // Family member should be able to read
      await assertSucceeds(
        getDoc(doc(authenticatedDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID))
      );
    });

    test('should deny unauthenticated users access to shopping lists', async () => {
      // Setup shopping list
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID), {
          id: SHOPPING_LIST_ID,
          name: 'Test Shopping List',
          familyId: FAMILY_ID,
          createdBy: USER_ID_1,
          items: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });

      // Unauthenticated user should be denied
      await assertFails(
        getDoc(doc(unauthenticatedDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID))
      );
    });

    test('should deny non-family members access to shopping lists', async () => {
      // Setup shopping list
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID), {
          id: SHOPPING_LIST_ID,
          name: 'Test Shopping List',
          familyId: FAMILY_ID,
          createdBy: USER_ID_1,
          items: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });

      // Non-family member should be denied
      await assertFails(
        getDoc(doc(otherUserDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID))
      );
    });
  });

  describe('Shopping List Creation', () => {
    test('should allow family members to create shopping lists', async () => {
      const shoppingListData = {
        id: SHOPPING_LIST_ID,
        name: 'New Shopping List',
        familyId: FAMILY_ID,
        createdBy: USER_ID_1,
        items: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Family member should be able to create
      await assertSucceeds(
        setDoc(doc(authenticatedDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID), shoppingListData)
      );
    });

    test('should deny creation with wrong familyId', async () => {
      const shoppingListData = {
        id: SHOPPING_LIST_ID,
        name: 'New Shopping List',
        familyId: 'wrong-family-id', // Wrong family ID
        createdBy: USER_ID_1,
        items: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Should fail due to familyId mismatch
      await assertFails(
        setDoc(doc(authenticatedDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID), shoppingListData)
      );
    });

    test('should deny unauthenticated users from creating shopping lists', async () => {
      const shoppingListData = {
        id: SHOPPING_LIST_ID,
        name: 'New Shopping List',
        familyId: FAMILY_ID,
        createdBy: USER_ID_1,
        items: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Unauthenticated user should be denied
      await assertFails(
        setDoc(doc(unauthenticatedDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID), shoppingListData)
      );
    });
  });

  describe('Shopping List Updates', () => {
    beforeEach(async () => {
      // Setup shopping list for update tests
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID), {
          id: SHOPPING_LIST_ID,
          name: 'Test Shopping List',
          familyId: FAMILY_ID,
          createdBy: USER_ID_1,
          items: {
            'item1': {
              id: 'item1',
              name: 'Milk',
              isPurchased: false,
              addedBy: USER_ID_1
            }
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
    });

    test('should allow family members to update shopping lists', async () => {
      // Family member should be able to update
      await assertSucceeds(
        updateDoc(doc(authenticatedDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID), {
          'items.item1.isPurchased': true,
          updatedAt: new Date()
        })
      );
    });

    test('should deny updates that change familyId', async () => {
      // Should fail when trying to change familyId
      await assertFails(
        updateDoc(doc(authenticatedDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID), {
          familyId: 'different-family-id',
          updatedAt: new Date()
        })
      );
    });

    test('should deny non-family members from updating shopping lists', async () => {
      // Non-family member should be denied
      await assertFails(
        updateDoc(doc(otherUserDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID), {
          'items.item1.isPurchased': true,
          updatedAt: new Date()
        })
      );
    });
  });

  describe('Shopping List Deletion', () => {
    beforeEach(async () => {
      // Setup shopping list for deletion tests
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID), {
          id: SHOPPING_LIST_ID,
          name: 'Test Shopping List',
          familyId: FAMILY_ID,
          createdBy: USER_ID_1,
          items: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
    });

    test('should allow family members to delete shopping lists', async () => {
      // Family member should be able to delete
      await assertSucceeds(
        deleteDoc(doc(authenticatedDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID))
      );
    });

    test('should deny non-family members from deleting shopping lists', async () => {
      // Non-family member should be denied
      await assertFails(
        deleteDoc(doc(otherUserDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID))
      );
    });

    test('should deny unauthenticated users from deleting shopping lists', async () => {
      // Unauthenticated user should be denied
      await assertFails(
        deleteDoc(doc(unauthenticatedDb, 'families', FAMILY_ID, 'shopping', SHOPPING_LIST_ID))
      );
    });
  });

  describe('Complex Shopping Operations', () => {
    test('should handle batch operations correctly', async () => {
      // Create multiple shopping lists
      const list1Data = {
        id: 'list1',
        name: 'Grocery List',
        familyId: FAMILY_ID,
        createdBy: USER_ID_1,
        items: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const list2Data = {
        id: 'list2',
        name: 'Hardware Store',
        familyId: FAMILY_ID,
        createdBy: USER_ID_1,
        items: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Both should succeed
      await assertSucceeds(
        setDoc(doc(authenticatedDb, 'families', FAMILY_ID, 'shopping', 'list1'), list1Data)
      );
      
      await assertSucceeds(
        setDoc(doc(authenticatedDb, 'families', FAMILY_ID, 'shopping', 'list2'), list2Data)
      );
    });

    test('should validate familyId consistency across operations', async () => {
      // Create list with correct familyId
      await assertSucceeds(
        setDoc(doc(authenticatedDb, 'families', FAMILY_ID, 'shopping', 'list1'), {
          id: 'list1',
          name: 'Valid List',
          familyId: FAMILY_ID,
          createdBy: USER_ID_1,
          items: {},
          createdAt: new Date(),
          updatedAt: new Date()
        })
      );

      // Try to create another list with wrong familyId
      await assertFails(
        setDoc(doc(authenticatedDb, 'families', FAMILY_ID, 'shopping', 'list2'), {
          id: 'list2',
          name: 'Invalid List',
          familyId: 'wrong-family-id',
          createdBy: USER_ID_1,
          items: {},
          createdAt: new Date(),
          updatedAt: new Date()
        })
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing family document', async () => {
      // Try to access shopping list from non-existent family
      await assertFails(
        getDoc(doc(authenticatedDb, 'families', 'non-existent-family', 'shopping', SHOPPING_LIST_ID))
      );
    });

    test('should handle empty family memberUids', async () => {
      // Setup family with empty memberUids
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'families', 'empty-family'), {
          id: 'empty-family',
          name: 'Empty Family',
          memberUids: [],
          parentUids: [],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });

      // Should deny access
      await assertFails(
        getDoc(doc(authenticatedDb, 'families', 'empty-family', 'shopping', SHOPPING_LIST_ID))
      );
    });
  });
});