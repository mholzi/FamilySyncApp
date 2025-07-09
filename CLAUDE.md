# 🤖 Claude for FamilySync Web App Development

This document serves as a comprehensive guide for leveraging Claude Code (or any integrated Claude client) to accelerate development, improve code quality, and troubleshoot issues for the `FamilySync` web application. It combines general prompting best practices with specific architectural details of our project.

---

## 🚨 Project Awareness Rules

**CRITICAL**: Before starting ANY task, you MUST:

1. **Read Current Tasks**: Use `TodoRead` to understand ongoing work and avoid conflicts
2. **Check Recent Changes**: Review `IMPLEMENTATION_SUMMARY.md` for latest updates
3. **Verify Examples**: Look in `examples/` directory for patterns to follow
4. **Validate Paths**: Confirm file paths exist before editing (use `LS` or `Glob`)
5. **Run Validation**: Execute validation commands after EVERY change

**NEVER**:
- Assume a file exists without checking
- Skip validation steps
- Create files unless absolutely necessary
- Guess at patterns - always check examples

---

## 🎯 Project Overview & Context

* **Project Name:** `FamilySync`
* **Purpose:** A web app to help au pair families manage day-to-day organization (calendar, tasks, shopping, notes).
* **Target Users:** Host parents (like Maria) and Au Pairs.
* **Key UX Principles:** Clear, Harmonious, Empowered. **English and German UI support.**
* **Current Development Stage:** Firebase authentication implemented, working on dashboard UI implementation.
* **Design Reference:** See `/design-assets/dashboard-mockup.jpeg` for the target mobile-first UI design.

---

## 🏛️ Architecture

The application follows a cloud-native architecture with:

* **Frontend**: React 19.1.0 web app created with Create React App.
* **Backend**: Firebase platform with:
    * Firestore for NoSQL document storage (currently with temporary permissive rules expiring August 2, 2025).
    * Cloud Functions for serverless logic (Node.js 22 runtime). **Note: The project currently has both TypeScript (`/functions`) and JavaScript (`/familysyncapp`) Firebase Functions directories. Consider consolidating to one.**
    * Firebase Hosting for web app deployment.
    * Data Connect for PostgreSQL integration via GraphQL (instance: `familysyncapp-fdc`, database: `fdcdb`). **Note: The PostgreSQL schema in `/dataconnect/schema/schema.gql` is currently commented out and contains example movie review code. This needs to be replaced with the actual family sync data model.**

---

## 📐 Code Structure Rules

### File Organization
1. **File Size Limits**
   - React Components: Max 200 lines
   - Utility Functions: Max 150 lines
   - Test Files: Max 300 lines
   - Split larger files into focused modules

2. **Import Order** (enforce with ESLint)
   ```javascript
   // 1. React imports
   import React, { useState, useEffect } from 'react';
   
   // 2. External libraries
   import { doc, onSnapshot } from 'firebase/firestore';
   
   // 3. Internal imports (use absolute paths)
   import { Button } from '@/components/Button';
   import { useAuth } from '@/hooks/useAuth';
   
   // 4. Styles
   import styles from './Component.module.css';
   ```

3. **Component Structure**
   ```javascript
   // 1. Type definitions / PropTypes
   // 2. Component declaration
   // 3. Custom hooks
   // 4. Event handlers
   // 5. Render helpers
   // 6. Main render
   ```

### Naming Conventions
- **Components**: PascalCase (e.g., `ShoppingListCard`)
- **Files**: Match component name (e.g., `ShoppingListCard.js`)
- **CSS Modules**: camelCase classes (e.g., `.containerActive`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)
- **Firebase Collections**: camelCase (e.g., `calendarEvents`)

---

## ✅ Validation Commands

### After EVERY Code Change
```bash
# Web App Validation
cd web-app
npm run lint                    # ESLint check
npm test -- --watchAll=false    # Run all tests
npm run build                   # Ensure production build works

# Functions Validation (TypeScript)
cd ../functions
npm run lint                    # TSLint/ESLint check
npm run build                   # TypeScript compilation
npm test                        # Run function tests

# Firestore Rules Validation
firebase deploy --only firestore:rules --dry-run
```

### Before Marking Task Complete
- [ ] All validation commands pass
- [ ] No console errors in browser
- [ ] No TypeScript errors
- [ ] Feature works in Firebase emulator
- [ ] Tests cover new functionality
- [ ] Code follows examples/ patterns

---

## 🚫 Anti-Patterns & Common Mistakes

### React Anti-Patterns
```javascript
// ❌ BAD: Direct DOM manipulation
document.getElementById('myDiv').style.color = 'red';

// ✅ GOOD: Use React state
const [color, setColor] = useState('red');

// ❌ BAD: Inline arrow functions in render
<button onClick={() => handleClick(id)}>Click</button>

// ✅ GOOD: Stable callback reference
const handleButtonClick = useCallback(() => handleClick(id), [id]);

// ❌ BAD: Missing keys in lists
items.map(item => <Item {...item} />)

// ✅ GOOD: Unique, stable keys
items.map(item => <Item key={item.id} {...item} />)
```

### Firebase Anti-Patterns
```javascript
// ❌ BAD: Client-side only validation
const addTask = async (task) => {
  await addDoc(collection(db, 'tasks'), task);
};

// ✅ GOOD: Validate in security rules + cloud functions
const addTask = async (task) => {
  const validated = validateTask(task); // Client validation
  await addDoc(collection(db, 'tasks'), validated);
  // Server-side validation in security rules
};

// ❌ BAD: Nested promises
getUserProfile().then(profile => {
  getFamily(profile.familyId).then(family => {
    // ...
  });
});

// ✅ GOOD: Async/await
const profile = await getUserProfile();
const family = await getFamily(profile.familyId);
```

### General Anti-Patterns
- ❌ `console.log()` in production code
- ❌ Commented out code blocks
- ❌ Magic numbers without constants
- ❌ Missing error boundaries
- ❌ Hardcoded configuration values
- ❌ Unhandled promise rejections

---

## 🧪 Testing Requirements

### Every Feature MUST Include:

1. **Component Tests** (`*.test.js`)
   ```javascript
   // Example: Button.test.js
   import { render, fireEvent } from '@testing-library/react';
   import Button from './Button';
   
   test('calls onClick when clicked', () => {
     const handleClick = jest.fn();
     const { getByText } = render(
       <Button onClick={handleClick}>Click me</Button>
     );
     fireEvent.click(getByText('Click me'));
     expect(handleClick).toHaveBeenCalledTimes(1);
   });
   ```

2. **Integration Tests** (Firebase operations)
   ```javascript
   // Example: useFamily.test.js
   test('fetches family data for authenticated user', async () => {
     // Test with Firebase emulator
   });
   ```

3. **Snapshot Tests** (UI consistency)
   ```javascript
   test('renders correctly', () => {
     const tree = renderer.create(<Component />).toJSON();
     expect(tree).toMatchSnapshot();
   });
   ```

### Test Coverage Requirements
- New components: Minimum 80% coverage
- Critical paths: 100% coverage
- Firebase operations: Integration tests required

---

## 🚀 Commands

### Web Application (in `/web-app` directory)
```bash
cd web-app
npm start          # Start development server on localhost:3000
npm run build      # Build production bundle
npm test           # Run tests in watch mode
npm run lint       # Run ESLint
npm run lint:fix   # Auto-fix ESLint issues
```

### Firebase Functions - TypeScript (in `/functions` directory)
```bash
cd functions
npm run build      # Compile TypeScript to JavaScript
npm run lint       # Run ESLint
npm run serve      # Start Firebase emulators with functions
npm run deploy     # Deploy functions to Firebase
npm run logs       # View Firebase function logs
npm test           # Run function tests
```

### Firebase Emulators
```bash
firebase emulators:start              # Start all emulators
firebase emulators:start --only auth  # Start specific emulator
firebase emulators:export ./data      # Export emulator data
```

---

## 🔥 Firebase Gotchas & Library Quirks

### Firestore Limitations
- **Query Limits**: Max 10 inequality filters per query
- **Compound Queries**: Require composite indexes (check console for links)
- **Real-time Listeners**: Count against read quotas
- **Batch Writes**: Limited to 500 operations
- **Document Size**: Max 1MB per document
- **Collection Groups**: Must be explicitly enabled

### Common Firebase Errors & Solutions
```javascript
// Error: Missing or insufficient permissions
// Solution: Check security rules and user authentication

// Error: Quota exceeded
// Solution: Implement caching, reduce listener usage

// Error: Deadline exceeded
// Solution: Paginate large queries, optimize indexes
```

### React + Firebase Integration
```javascript
// CRITICAL: Always cleanup listeners
useEffect(() => {
  const unsubscribe = onSnapshot(doc(db, 'users', uid), (doc) => {
    setUserData(doc.data());
  });
  
  return () => unsubscribe(); // CRITICAL: Prevent memory leaks
}, [uid]);
```

---

## 🛠️ Progressive Enhancement Workflow

### For Every Feature Implementation:

1. **MVP First** (Basic Functionality)
   - Core feature works
   - Basic error handling
   - Simple UI

2. **Enhance** (After MVP Validation)
   - Loading states
   - Error boundaries
   - Optimistic updates
   - Animations

3. **Polish** (After Enhancement Validation)
   - Performance optimization
   - Advanced error handling
   - Analytics integration
   - A11y improvements

### Example: Shopping List Feature
```javascript
// Stage 1: MVP
// - Add/remove items
// - Mark as purchased
// - Basic list display

// Stage 2: Enhanced
// - Real-time sync
// - Loading spinners
// - Error toasts

// Stage 3: Polished
// - Drag-to-reorder
// - Batch operations
// - Offline support
```

---

## 🎨 UI Design Guidelines

Based on the dashboard mockup in `/design-assets/`, the FamilySync app follows a mobile-first, card-based design with:

### Design System
- **Color Palette**: Soft, calming colors with colorful accent cards
  - Orange: Work/family events
  - Red: Personal events
  - Green: Other categories
  - Neutral grays: UI elements

- **Layout**: Clean card-based design
  - Rounded corners (8px)
  - Subtle shadows
  - 16px spacing grid

- **Typography**:
  - Headers: 24px, semi-bold
  - Body: 16px, regular
  - Small text: 14px, regular

### Component Patterns
- Profile pictures throughout for personalization
- Progress indicators and checkboxes for task completion  
- Color-coded event cards for easy categorization
- Bottom navigation with icons (Home, Calendar, Tasks, Messages, Profile)
- Task cards showing assignee profile pictures and completion status

---

## 📄 Important Files

### Configuration & Rules
- `/firestore.rules` - Database security rules (**CRITICAL: Currently permissive, expires August 2, 2025**)
- `/storage.rules` - Storage security rules
- `/firebase.json` - Firebase configuration
- `/.firebaserc` - Firebase project aliases

### Source Code
- `/web-app/src/` - React application
- `/functions/src/index.ts` - TypeScript Cloud Functions
- `/examples/` - Code patterns and examples
- `/PRPs/` - Product Requirements Prompts

### Documentation
- `/CLAUDE.md` - This file
- `/IMPLEMENTATION_SUMMARY.md` - Recent changes log
- `/CONTEXT_ENGINEERING_STRATEGY.md` - Implementation strategy
- `/design-assets/dashboard-mockup.jpeg` - UI reference

---

## ⚠️ Critical Issues & Deadlines

1. **Security Rules** (Deadline: August 2, 2025)
   - Current rules are permissive
   - Must implement proper authentication checks
   - Add data validation rules

2. **Functions Consolidation**
   - Merge `/familysyncapp` into `/functions`
   - Standardize on TypeScript

3. **Data Connect Schema**
   - Replace movie review example
   - Implement FamilySync schema

---

## 🆘 When You're Stuck

1. **Check Examples**: Look in `/examples/` for patterns
2. **Read Tests**: Tests often show proper usage
3. **Firebase Console**: Check for detailed error messages
4. **Emulator UI**: Use local emulator UI for debugging
5. **Ask for Validation Command**: If unsure about testing

Remember: Context is everything. When in doubt, provide more information rather than less.