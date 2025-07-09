# [Feature Name] - Product Requirements Prompt

*Generated from INITIAL.md on [DATE]*

## GOAL
<!-- What are we trying to achieve? Include the "why" -->
**What**: [Brief description of the feature]
**Why**: [Business value and user benefit]
**Success Looks Like**: [Clear vision of the end state]

## SUCCESS CRITERIA
<!-- Measurable outcomes that define completion -->
- [ ] User can [specific action] successfully
- [ ] Feature handles [error scenario] gracefully
- [ ] Performance meets [specific metric]
- [ ] Accessibility standards are met
- [ ] Tests achieve [coverage percentage]

## ALL NEEDED CONTEXT

### Requirements
<!-- Copy from INITIAL.md FEATURE section -->
[Paste detailed requirements here]

### Code Examples to Follow
<!-- Copy from INITIAL.md EXAMPLES section -->
- **Component Pattern**: `examples/components/[Pattern].example.js`
- **Firebase Integration**: `examples/firebase/[Operation].example.js`
- **Error Handling**: `examples/patterns/error-handling.example.js`
- **Testing Pattern**: `examples/testing/[TestType].example.js`

### Documentation References
<!-- Copy from INITIAL.md DOCUMENTATION section -->
- [External API docs]
- [Internal architecture docs]
- [Design system reference]

### Known Gotchas
<!-- Copy from INITIAL.md OTHER CONSIDERATIONS section -->
- **Firestore**: [Specific limitation]
- **React**: [Common pitfall]
- **Performance**: [Critical consideration]

## CURRENT CODEBASE TREE
```
web-app/src/
├── components/
│   ├── Button/
│   ├── Dashboard/
│   └── ...
├── hooks/
│   ├── useAuth.js
│   └── ...
├── pages/
├── services/
└── utils/
```

## DESIRED CODEBASE CHANGES
```
web-app/src/
├── components/
│   └── [NewFeature]/
│       ├── [NewFeature].js
│       ├── [NewFeature].module.css
│       ├── [NewFeature].test.js
│       └── components/
│           ├── [SubComponent].js
│           └── [SubComponent].test.js
├── hooks/
│   └── use[FeatureName].js
└── services/
    └── [featureName]Service.js
```

## IMPLEMENTATION BLUEPRINT

### Data Models
```javascript
// Define data structures needed
const FeatureData = {
  id: string,
  familyId: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  // ... other fields
};

// Firestore collections
const collections = {
  features: 'families/{familyId}/features',
  // ... other collections
};
```

### Task Breakdown
1. **Setup Phase** (30 minutes)
   - [ ] Create component directory structure
   - [ ] Set up basic React component shell
   - [ ] Create CSS module with design system styles
   - [ ] Add component to routing/navigation

2. **Core Implementation** (2 hours)
   - [ ] Implement main feature functionality
   - [ ] Add Firebase Firestore integration
   - [ ] Handle user input validation
   - [ ] Add basic error handling

3. **Enhancement Phase** (1 hour)
   - [ ] Add loading states and spinners
   - [ ] Implement comprehensive error boundaries
   - [ ] Add real-time sync with onSnapshot
   - [ ] Implement optimistic updates

4. **Polish Phase** (1 hour)
   - [ ] Performance optimization (memoization, etc.)
   - [ ] Accessibility improvements (ARIA labels, keyboard nav)
   - [ ] Add comprehensive test coverage
   - [ ] Code review and refactoring

### Per-Task Pseudocode

#### Task 1: Setup Phase
```javascript
// 1. Create component structure
mkdir -p web-app/src/components/[FeatureName]
touch web-app/src/components/[FeatureName]/[FeatureName].js
touch web-app/src/components/[FeatureName]/[FeatureName].module.css
touch web-app/src/components/[FeatureName]/[FeatureName].test.js

// 2. Basic React component
const [FeatureName] = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  return (
    <div className={styles.container}>
      {/* Basic structure */}
    </div>
  );
};

// 3. CSS module setup
.container {
  /* Follow design system */
}
```

#### Task 2: Core Implementation
```javascript
// 1. Firebase integration
const { user } = useAuth();
const [data, setData] = useState([]);

useEffect(() => {
  if (!user) return;
  
  const unsubscribe = onSnapshot(
    collection(db, `families/${user.familyId}/features`),
    (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setData(items);
    },
    (error) => {
      console.error('Error fetching data:', error);
      setError(error.message);
    }
  );
  
  return unsubscribe;
}, [user]);

// 2. User input handling
const handleSubmit = async (formData) => {
  try {
    setLoading(true);
    await addDoc(collection(db, `families/${user.familyId}/features`), {
      ...formData,
      createdAt: serverTimestamp(),
      createdBy: user.uid
    });
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

### Integration Points
- **Authentication**: Use `useAuth` hook from `hooks/useAuth.js`
- **Database**: Firestore operations via Firebase v9 SDK
- **State Management**: Local state with useState/useReducer
- **Navigation**: React Router for page transitions
- **Error Handling**: Use `useErrorHandler` hook
- **Loading States**: Global loading context or local state

## VALIDATION LOOPS

### Level 1: Syntax Validation
```bash
cd web-app && npm run lint
cd web-app && npm run build
cd functions && npm run lint && npm run build
```

### Level 2: Unit Tests
```bash
cd web-app && npm test -- --coverage --watchAll=false
```

### Level 3: Integration Tests
```bash
# Start Firebase emulator
firebase emulators:start --only firestore,auth &
EMULATOR_PID=$!

# Run integration tests
cd web-app && npm run test:integration

# Cleanup
kill $EMULATOR_PID
```

### Level 4: Manual Validation
- [ ] Feature works in development environment
- [ ] No console errors or warnings
- [ ] Design matches mockup exactly
- [ ] Accessibility scan passes (axe-core)
- [ ] Performance metrics meet requirements
- [ ] Works on mobile devices
- [ ] Error states display correctly
- [ ] Loading states work smoothly

## LIBRARY QUIRKS & GOTCHAS

### Firebase Specific
- **Firestore Query Limitations**: Max 10 inequality filters per query
- **Real-time Listeners**: Always return unsubscribe function
- **Timestamps**: Use `serverTimestamp()` for consistent time
- **Security Rules**: Test with emulator before deploying

### React Specific
- **useEffect Dependencies**: Include all used values in deps array
- **Event Handlers**: Use useCallback for performance
- **State Updates**: Batch updates when possible
- **Memory Leaks**: Clean up listeners in useEffect cleanup

### CSS Module Gotchas
- **Class Names**: Use camelCase for CSS classes
- **Global Styles**: Import global styles separately
- **CSS Variables**: Use CSS custom properties for theming

## ANTI-PATTERNS TO AVOID

### Code Anti-Patterns
- ❌ Direct DOM manipulation with `document.getElementById`
- ❌ Inline styles instead of CSS modules
- ❌ Missing error boundaries around async operations
- ❌ Hardcoded strings instead of i18n keys
- ❌ Missing loading states for async operations
- ❌ Unhandled promise rejections
- ❌ Console.log statements in production code
- ❌ Commented out code blocks

### Firebase Anti-Patterns
- ❌ Client-side only data validation
- ❌ Not cleaning up Firestore listeners
- ❌ Using `.then()` instead of async/await
- ❌ Missing error handling for database operations
- ❌ Overly broad security rules

### React Anti-Patterns
- ❌ Using array indexes as keys in lists
- ❌ Mutating state directly
- ❌ Missing dependencies in useEffect
- ❌ Creating functions inside render
- ❌ Using `useEffect` without cleanup

## FINAL CHECKLIST

### Code Quality
- [ ] All validation loops pass
- [ ] Code follows examples/ patterns
- [ ] Tests achieve minimum 80% coverage
- [ ] No ESLint warnings or errors
- [ ] TypeScript compiles without errors

### Functionality
- [ ] Feature works in all supported browsers
- [ ] Mobile responsive design implemented
- [ ] Error handling comprehensive
- [ ] Loading states implemented
- [ ] Empty states designed

### Performance
- [ ] Performance benchmarks met
- [ ] No memory leaks detected
- [ ] Efficient re-renders (React DevTools)
- [ ] Optimal bundle size

### Security & Accessibility
- [ ] Security review completed
- [ ] Accessibility audit passed
- [ ] Data validation on client and server
- [ ] Proper error messages (no sensitive data)

### Documentation
- [ ] README updated if needed
- [ ] API documentation added
- [ ] Examples updated in examples/
- [ ] IMPLEMENTATION_SUMMARY.md updated

---

*This PRP should be executed using the `execute-prp` command*
*Estimated implementation time: 4-5 hours*