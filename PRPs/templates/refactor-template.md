# [Refactor Description] - Refactoring PRP

*Generated on [DATE]*

## GOAL
**What**: Refactor [specific code/component/module]
**Why**: [Performance, maintainability, scalability reasons]
**Success Looks Like**: [Improved code quality without functionality changes]

## REFACTORING DETAILS

### Current State Problems
- **Code Smells**: 
  - [ ] Large functions (>50 lines)
  - [ ] Repeated code blocks
  - [ ] Hard to test components
  - [ ] Unclear naming
  - [ ] Missing abstractions

- **Performance Issues**: 
  - [ ] Unnecessary re-renders
  - [ ] Memory leaks
  - [ ] Large bundle size
  - [ ] Slow database queries

- **Maintainability Issues**: 
  - [ ] Tightly coupled components
  - [ ] Missing error handling
  - [ ] Inconsistent patterns
  - [ ] Poor documentation

### Refactoring Strategy
- **Approach**: [Big bang vs incremental]
- **Risk Level**: [Low/Medium/High]
- **Backward Compatibility**: [Required/Not required]
- **Testing Strategy**: [How to ensure no regressions]

## ALL NEEDED CONTEXT

### Code Examples to Follow
- **Component Pattern**: `examples/components/[BestPractice].example.js`
- **Hook Pattern**: `examples/hooks/[CustomHook].example.js`
- **Service Pattern**: `examples/services/[Service].example.js`
- **Testing Pattern**: `examples/testing/refactor.example.js`

### Documentation References
- **Architecture Guidelines**: See CLAUDE.md "Code Structure Rules"
- **Performance Guidelines**: See CLAUDE.md "Progressive Enhancement"
- **Testing Guidelines**: See CLAUDE.md "Testing Requirements"

### Known Gotchas
- **Breaking Changes**: [What might break]
- **Performance Trade-offs**: [Speed vs maintainability]
- **Dependencies**: [External libraries affected]

## CURRENT CODEBASE ANALYSIS

### Files to Refactor
```
web-app/src/
├── components/[TargetComponent]/
│   ├── [Component].js          # Main refactor target
│   ├── [Component].test.js     # Update tests
│   └── [Component].module.css  # Styling updates
├── hooks/
│   └── [extractedHook].js      # New custom hook
├── services/
│   └── [extractedService].js   # Extracted business logic
└── utils/
    └── [extractedUtils].js     # Extracted utility functions
```

### Dependencies Analysis
- **Internal Dependencies**: [Components that use this code]
- **External Dependencies**: [Libraries that might be affected]
- **Test Dependencies**: [Test files that need updating]

## IMPLEMENTATION BLUEPRINT

### Refactoring Phases

1. **Preparation** (30 minutes)
   - [ ] Analyze current code thoroughly
   - [ ] Identify all dependencies
   - [ ] Ensure comprehensive test coverage
   - [ ] Document current behavior

2. **Extract and Isolate** (1 hour)
   - [ ] Extract business logic into services
   - [ ] Create custom hooks for stateful logic
   - [ ] Extract utility functions
   - [ ] Create smaller, focused components

3. **Restructure** (1 hour)
   - [ ] Improve component hierarchy
   - [ ] Implement better error boundaries
   - [ ] Add proper TypeScript types
   - [ ] Optimize performance bottlenecks

4. **Clean Up** (30 minutes)
   - [ ] Remove dead code
   - [ ] Update imports and exports
   - [ ] Improve naming consistency
   - [ ] Update documentation

### Code Transformation Examples

#### Before (Current Code)
```javascript
// Large, monolithic component
const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Complex logic mixing concerns
    const loadUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        setUser(userDoc.data());
        
        const tasksSnapshot = await getDocs(collection(db, 'tasks'));
        setTasks(tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const eventsSnapshot = await getDocs(collection(db, 'events'));
        setEvents(eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [currentUser]);

  // 200+ lines of JSX with mixed concerns
  return (
    <div>
      {/* Complex rendering logic */}
    </div>
  );
};
```

#### After (Refactored Code)
```javascript
// Extracted custom hooks
const useUserData = (userId) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        setUser(userDoc.data());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) loadUser();
  }, [userId]);

  return { user, loading, error };
};

// Focused, smaller component
const Dashboard = () => {
  const { user, loading, error } = useUserData(currentUser?.uid);
  const tasks = useTasks(user?.familyId);
  const events = useEvents(user?.familyId);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <TasksSection tasks={tasks} />
      <EventsSection events={events} />
    </div>
  );
};
```

### Performance Optimizations
```javascript
// Before: Unnecessary re-renders
const ExpensiveComponent = ({ data, onUpdate }) => {
  return (
    <div>
      {data.map(item => (
        <ItemCard 
          key={item.id} 
          item={item} 
          onClick={() => onUpdate(item.id)} 
        />
      ))}
    </div>
  );
};

// After: Optimized with memoization
const ExpensiveComponent = React.memo(({ data, onUpdate }) => {
  const memoizedOnUpdate = useCallback(
    (id) => onUpdate(id),
    [onUpdate]
  );

  return (
    <div>
      {data.map(item => (
        <ItemCard 
          key={item.id} 
          item={item} 
          onClick={memoizedOnUpdate} 
        />
      ))}
    </div>
  );
});
```

## VALIDATION LOOPS

### Level 1: Refactor Validation
```bash
# Ensure code still compiles and passes linting
cd web-app && npm run lint
cd web-app && npm run build
```

### Level 2: Functionality Validation
```bash
# All existing tests should pass
cd web-app && npm test -- --coverage --watchAll=false
```

### Level 3: Performance Validation
```bash
# Check bundle size impact
cd web-app && npm run build
# Check performance metrics
# Use React DevTools Profiler
```

### Level 4: Manual Validation
- [ ] All existing functionality works
- [ ] No visual regressions
- [ ] Performance improved or maintained
- [ ] No new console errors
- [ ] Accessibility maintained
- [ ] Mobile experience intact

## LIBRARY QUIRKS & GOTCHAS

### Refactoring Gotchas
- **React Hooks**: Rules of hooks still apply
- **Context**: Don't over-use, can cause performance issues
- **Memoization**: Don't memoize everything, profile first
- **Bundle Splitting**: Be careful with dynamic imports

### Performance Considerations
- **Re-renders**: Use React DevTools to measure
- **Memory**: Check for memory leaks after refactoring
- **Bundle Size**: Monitor webpack bundle analyzer
- **Runtime**: Profile with browser dev tools

## ANTI-PATTERNS TO AVOID

### Refactoring Anti-Patterns
- ❌ Changing functionality while refactoring
- ❌ Not having tests before refactoring
- ❌ Making too many changes at once
- ❌ Over-engineering simple solutions
- ❌ Not measuring performance impact
- ❌ Breaking API contracts

### Code Quality Anti-Patterns
- ❌ Creating unnecessary abstractions
- ❌ Premature optimization
- ❌ Not following existing patterns
- ❌ Ignoring edge cases
- ❌ Not updating documentation

## FINAL CHECKLIST

### Functionality
- [ ] All existing tests pass
- [ ] No functionality regressions
- [ ] Error handling improved
- [ ] Edge cases still handled
- [ ] API contracts maintained

### Code Quality
- [ ] Code is more maintainable
- [ ] Components are focused and cohesive
- [ ] Business logic extracted appropriately
- [ ] Naming is clearer and consistent
- [ ] Documentation updated

### Performance
- [ ] Performance metrics improved or maintained
- [ ] Bundle size not significantly increased
- [ ] No memory leaks introduced
- [ ] Render performance optimized
- [ ] Database queries optimized

### Testing
- [ ] Test coverage maintained or improved
- [ ] Tests are easier to write and maintain
- [ ] Integration tests updated
- [ ] Performance tests added if needed

### Documentation
- [ ] Code is self-documenting
- [ ] Complex logic documented
- [ ] API changes documented
- [ ] Migration guide created if needed
- [ ] Examples updated

---

*This PRP should be executed using the `execute-prp` command*
*Estimated refactoring time: 2-4 hours*