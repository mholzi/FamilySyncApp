# FamilySync Firestore Data Model Plan

## Overview
This document outlines the Firestore database structure for FamilySync, designed to support au pair families with shared organization, real-time collaboration, and role-based access control.

## Core Design Principles

### 1. **Family-Centric Architecture**
- All data is organized around the `familyId` concept
- Each family is an isolated data domain
- Users belong to one family at a time

### 2. **Real-time Collaboration**
- Use Firestore's real-time listeners for live updates
- Optimistic UI updates with rollback on conflicts
- Minimal latency for critical updates (tasks, calendar)

### 3. **Role-Based Access**
- **Parents**: Full read/write access to family data
- **Au Pairs**: Read/write access to assigned tasks, limited calendar access
- Future: **Children** (view-only for age-appropriate content)

### 4. **GDPR Compliance**
- User consent tracking
- Data minimization
- Easy data export/deletion
- EU data residency (Firebase EU regions)

---

## Collection Structure

### 1. `/users/{userId}` - User Profiles
```javascript
{
  // Firebase Auth UID as document ID
  id: "firebase-auth-uid",
  
  // Basic Profile
  name: "Maria Schmidt",
  email: "maria@example.com",
  role: "parent" | "aupair" | "child",
  
  // Family Association
  familyId: "family-uuid",
  
  // Profile Details
  profilePictureUrl: "gs://bucket/profiles/user.jpg",
  language: "de" | "en",
  timezone: "Europe/Berlin",
  
  // Metadata
  createdAt: Timestamp,
  lastActiveAt: Timestamp,
  
  // Settings
  notifications: {
    tasks: true,
    calendar: true,
    notes: true,
    shopping: false
  },
  
  // GDPR
  consentGiven: true,
  consentDate: Timestamp
}
```

### 2. `/families/{familyId}` - Family Information
```javascript
{
  // Auto-generated UUID as document ID
  id: "family-uuid",
  
  // Basic Info
  name: "The Schmidt Family",
  address: {
    street: "Hauptstraße 123",
    city: "Berlin",
    postalCode: "10115",
    country: "Germany"
  },
  
  // Members
  memberUids: ["parent-uid", "aupair-uid"],
  parentUids: ["parent-uid"],
  aupairUids: ["aupair-uid"],
  childrenUids: [], // Future: when children get accounts
  
  // Settings
  defaultLanguage: "de",
  timezone: "Europe/Berlin",
  
  // Metadata
  createdAt: Timestamp,
  createdBy: "parent-uid",
  
  // Invite System
  inviteCode: "FAMILY123", // 7-character code for au pairs to join
  inviteCodeExpiry: Timestamp
}
```

### 3. `/families/{familyId}/children/{childId}` - Children Information
```javascript
{
  // Auto-generated ID
  id: "child-uuid",
  
  // Basic Info
  name: "Emma Schmidt",
  dateOfBirth: Timestamp,
  phoneNumber: "+49 176 12345678", // Optional: for older children with mobile phones
  
  // Profile
  profilePictureUrl: "gs://bucket/children/child.jpg",
  
  // Care Details
  allergies: ["nuts", "dairy"],
  medications: [
    {
      name: "Inhaler",
      dosage: "2 puffs as needed",
      instructions: "For asthma attacks"
    }
  ],
  
  // Emergency Contacts
  emergencyContacts: [
    {
      name: "Dr. Mueller",
      phone: "+49 30 12345678",
      relationship: "pediatrician"
    }
  ],
  
  // Daily Care Tracking
  carePreferences: {
    napTimes: ["13:00"],
    bedtime: "19:30",
    mealPreferences: ["no vegetables", "loves pasta"]
  },
  
  // Metadata
  createdAt: Timestamp,
  createdBy: "parent-uid"
}
```

### 4. `/families/{familyId}/tasks/{taskId}` - Task Management
```javascript
{
  id: "task-uuid",
  
  // Task Details
  title: "Pick up Emma from school",
  description: "School ends at 15:30. Wait by the main entrance.",
  category: "childcare" | "household" | "errands" | "personal",
  
  // Assignment
  assignedTo: "aupair-uid", // Single assignee
  createdBy: "parent-uid",
  
  // Scheduling
  dueDate: Timestamp,
  isRecurring: false,
  recurrencePattern: null, // Future: "daily", "weekly", etc.
  
  // Status
  status: "pending" | "in_progress" | "completed" | "cancelled",
  completedAt: Timestamp,
  completedBy: "aupair-uid",
  
  // Priority & Organization
  priority: "low" | "medium" | "high" | "urgent",
  estimatedDuration: 30, // minutes
  
  // Related Data
  relatedChildrenIds: ["child-uuid"],
  attachments: [], // Future: photos, documents
  
  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 5. `/families/{familyId}/calendar/{eventId}` - Calendar Events
```javascript
{
  id: "event-uuid",
  
  // Event Details
  title: "Emma's Soccer Practice",
  description: "Remember to bring water bottle and cleats",
  location: "Sportplatz Berlin-Mitte",
  
  // Timing
  startTime: Timestamp,
  endTime: Timestamp,
  isAllDay: false,
  
  // Recurrence
  isRecurring: true,
  recurrencePattern: {
    frequency: "weekly", // daily, weekly, monthly
    interval: 1,
    daysOfWeek: [2], // Tuesday = 2
    endDate: Timestamp
  },
  
  // Assignment & Visibility
  attendees: ["child-uuid", "aupair-uid"],
  createdBy: "parent-uid",
  visibility: "family" | "parents_only",
  
  // Categorization
  category: "childcare" | "family" | "work" | "personal",
  color: "#FF9500", // Orange for work/family
  
  // Notifications
  reminders: [
    { minutes: 30, sent: false },
    { minutes: 10, sent: false }
  ],
  
  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 6. `/families/{familyId}/shopping/{listId}` - Shopping Lists
```javascript
{
  id: "shopping-list-uuid",
  
  // List Details
  name: "Weekly Groceries",
  description: "Regular weekly shopping",
  
  // Items
  items: [
    {
      id: "item-uuid",
      name: "Milk",
      quantity: "2 liters",
      category: "dairy",
      notes: "Organic if available",
      isPurchased: false,
      addedBy: "parent-uid",
      purchasedBy: null,
      purchasedAt: null
    },
    {
      id: "item-uuid-2",
      name: "Bread",
      quantity: "1 loaf",
      category: "bakery",
      notes: "Whole grain",
      isPurchased: true,
      addedBy: "aupair-uid",
      purchasedBy: "aupair-uid",
      purchasedAt: Timestamp
    }
  ],
  
  // Status
  isArchived: false,
  
  // Metadata
  createdAt: Timestamp,
  createdBy: "parent-uid",
  updatedAt: Timestamp
}
```

### 7. `/families/{familyId}/notes/{noteId}` - Family Notes & Daily Logs
```javascript
{
  id: "note-uuid",
  
  // Note Content
  title: "Emma's Day Summary",
  content: "Had a great nap from 1-3pm. Ate all her lunch! Played at the park for 1 hour.",
  type: "daily_log" | "general_note" | "important" | "emergency",
  
  // Categorization
  tags: ["childcare", "emma"],
  relatedChildrenIds: ["child-uuid"],
  
  // Visibility & Assignment
  createdBy: "aupair-uid",
  isPrivate: false, // true = only visible to creator and parents
  isPinned: false,
  
  // Media
  attachments: [
    {
      type: "image",
      url: "gs://bucket/notes/photo.jpg",
      caption: "Emma at the playground"
    }
  ],
  
  // Interactions
  readBy: ["parent-uid"], // Track who has seen the note
  
  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp,
  expiresAt: null // Optional: auto-delete old logs
}
```

---

## Security Rules Strategy

### 1. **Authentication Required**
```javascript
// All reads/writes require authentication
allow read, write: if request.auth != null;
```

### 2. **Family Isolation**
```javascript
// Users can only access their own family's data
allow read, write: if request.auth.uid in resource.data.memberUids;
```

### 3. **Role-Based Permissions**
```javascript
// Parents have full access, au pairs have limited access
function isParent() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'parent';
}

function isAuPair() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'aupair';
}
```

### 4. **Data Validation**
```javascript
// Ensure required fields are present
allow create: if request.resource.data.keys().hasAll(['name', 'familyId', 'createdAt']);
```

---

## Data Access Patterns

### 1. **Dashboard Loading**
```javascript
// Load user profile
const userDoc = await getDoc(doc(db, 'users', userId));

// Load family info
const familyDoc = await getDoc(doc(db, 'families', familyId));

// Load today's tasks (real-time)
const tasksQuery = query(
  collection(db, 'families', familyId, 'tasks'),
  where('assignedTo', '==', userId),
  where('dueDate', '>=', startOfDay),
  where('dueDate', '<=', endOfDay),
  where('status', '!=', 'completed')
);

// Load children info
const childrenQuery = query(collection(db, 'families', familyId, 'children'));

// Load upcoming events
const eventsQuery = query(
  collection(db, 'families', familyId, 'calendar'),
  where('attendees', 'array-contains', userId),
  where('startTime', '>=', now),
  orderBy('startTime', 'asc'),
  limit(5)
);
```

### 2. **Real-time Subscriptions**
```javascript
// Tasks updates
const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
  const tasks = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
  setTasks(tasks);
});

// Shopping list updates
const unsubscribeShopping = onSnapshot(
  collection(db, 'families', familyId, 'shopping'),
  (snapshot) => {
    // Update shopping lists in real-time
  }
);
```

---

## Performance Considerations

### 1. **Compound Indexes**
```javascript
// Required composite indexes:
// tasks: assignedTo + dueDate + status
// calendar: attendees + startTime
// notes: relatedChildrenIds + createdAt
// shopping: isPurchased + createdAt
```

### 2. **Data Pagination**
```javascript
// Paginate large collections (notes, completed tasks)
const notesQuery = query(
  collection(db, 'families', familyId, 'notes'),
  orderBy('createdAt', 'desc'),
  limit(20)
);
```

### 3. **Offline Support**
```javascript
// Enable offline persistence
await enableIndexedDbPersistence(db);
```

---

## Migration Strategy

### Phase 1: MVP Collections
- Users, Families, Tasks, Basic Calendar Events

### Phase 2: Enhanced Features  
- Children profiles, Shopping lists, Notes

### Phase 3: Advanced Features
- Recurring events, File attachments, Advanced notifications

### Phase 4: Scale Optimizations
- Subcollections for performance, Archive old data, Advanced caching

---

## Data Export (GDPR Compliance)

### User Data Export Function
```javascript
// Cloud Function to export all user data
exports.exportUserData = functions.https.onCall(async (data, context) => {
  const userId = context.auth.uid;
  
  // Collect all user data across collections
  const userData = {
    profile: await getUserProfile(userId),
    family: await getFamilyData(userId),
    tasks: await getUserTasks(userId),
    calendar: await getUserCalendarEvents(userId),
    notes: await getUserNotes(userId)
  };
  
  return userData;
});
```

---

## Next Steps for Implementation

1. **Create Firestore Security Rules** based on the role-based access patterns
2. **Set up Firestore Indexes** for the compound queries
3. **Implement data access layer** with React hooks for real-time subscriptions
4. **Create data validation schemas** using libraries like Yup or Zod
5. **Build Cloud Functions** for complex operations (family invites, data cleanup)
6. **Add offline support** with Firestore persistence
7. **Implement data export** functionality for GDPR compliance