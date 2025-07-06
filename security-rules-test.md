# Firebase Security Rules Test Guide

## Overview
This document outlines how to test the newly implemented security rules for FamilySync to ensure proper family-based access control.

## Security Rules Implementation Summary

### Firestore Security Rules (`firestore.rules`)
- **Users Collection**: Users can only read/write their own profile. Family members can read each other's profiles.
- **Families Collection**: Only family members (users in `memberUids` array) can access family data.
- **Children Collection**: Only family members can access children data.
- **Tasks Collection**: Assigned users and family members can read tasks. Only family members can write.
- **Household Todos**: Only family members can access.
- **Calendar Events**: Family members and event attendees can read. Only family members can write.
- **Shopping Lists**: Family members can access. Special approval rules for parents.
- **Notes**: Only family members can access.

### Storage Security Rules (`storage.rules`)
- **User Profile Photos**: Users can read/write own photos. Family members can read.
- **Children Photos**: Only family members can access.
- **Shopping Receipts**: Only family members can access.
- **Other Attachments**: Family-based access control.

## Testing the Security Rules

### 1. Deploy the Rules
```bash
# Deploy only the security rules
firebase deploy --only firestore:rules,storage:rules

# Or deploy everything
firebase deploy
```

### 2. Test Scenarios

#### Scenario A: User Profile Access
1. **Test**: User A tries to read their own profile
   - **Expected**: ✅ Success
2. **Test**: User A tries to read User B's profile (same family)
   - **Expected**: ✅ Success
3. **Test**: User A tries to read User C's profile (different family)
   - **Expected**: ❌ Permission denied
4. **Test**: User A tries to update User B's profile
   - **Expected**: ❌ Permission denied

#### Scenario B: Family Data Access
1. **Test**: User in Family 1 tries to read Family 1 data
   - **Expected**: ✅ Success
2. **Test**: User in Family 1 tries to read Family 2 data
   - **Expected**: ❌ Permission denied
3. **Test**: Unauthenticated user tries to read any family data
   - **Expected**: ❌ Permission denied

#### Scenario C: Child Management
1. **Test**: Parent creates a child in their family
   - **Expected**: ✅ Success
2. **Test**: Au pair reads children in their family
   - **Expected**: ✅ Success
3. **Test**: User from different family tries to read children
   - **Expected**: ❌ Permission denied

#### Scenario D: Shopping List Approval
1. **Test**: Au pair creates shopping list
   - **Expected**: ✅ Success
2. **Test**: Au pair marks list as completed
   - **Expected**: ✅ Success
3. **Test**: Parent approves shopping list
   - **Expected**: ✅ Success
4. **Test**: Au pair tries to approve shopping list
   - **Expected**: ❌ Permission denied (only parents can approve)

### 3. Using Firebase Emulators for Testing

```bash
# Start the emulators
firebase emulators:start

# The emulator UI will be available at http://localhost:4000
```

### 4. Manual Testing Code Example

```javascript
// Test security rules in your app
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Test 1: Read own profile (should succeed)
const testOwnProfile = async () => {
  try {
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    console.log('✅ Successfully read own profile:', userDoc.data());
  } catch (error) {
    console.error('❌ Failed to read own profile:', error);
  }
};

// Test 2: Read other family member's profile (should succeed if same family)
const testFamilyMemberProfile = async (otherUserId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', otherUserId));
    console.log('✅ Successfully read family member profile:', userDoc.data());
  } catch (error) {
    console.error('❌ Failed to read family member profile:', error);
  }
};

// Test 3: Try to access different family's data (should fail)
const testCrossFamilyAccess = async (otherFamilyId) => {
  try {
    const familyDoc = await getDoc(doc(db, 'families', otherFamilyId));
    console.log('❌ SECURITY BREACH: Accessed other family data:', familyDoc.data());
  } catch (error) {
    console.log('✅ Correctly blocked cross-family access:', error.code);
  }
};
```

## Security Rules Validation Checklist

- [ ] Firestore rules deployed successfully
- [ ] Storage rules deployed successfully
- [ ] Users can only modify their own profiles
- [ ] Family members can read each other's basic info
- [ ] Cross-family data access is blocked
- [ ] Children data is family-restricted
- [ ] Shopping approval only works for parents
- [ ] Calendar events respect attendee lists
- [ ] Storage photos are family-restricted
- [ ] Unauthenticated access is completely blocked

## Next Steps

1. **Deploy the rules**: `firebase deploy --only firestore:rules,storage:rules`
2. **Test thoroughly**: Use the Firebase Emulator Suite for comprehensive testing
3. **Monitor security**: Enable Firebase Security Rules monitoring in the console
4. **Regular audits**: Review and update rules as new features are added

## Important Notes

- The previous permissive rules expire on August 2, 2025
- These new rules must be deployed before any production launch
- Regular security audits should be performed
- Consider implementing additional Cloud Functions for complex security logic