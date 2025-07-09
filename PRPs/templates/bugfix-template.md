# [Bug Description] - Bug Fix PRP

*Generated on [DATE]*

## GOAL
**What**: Fix [specific bug/issue]
**Why**: [Impact on users/system]
**Success Looks Like**: [Clear description of fixed behavior]

## BUG DETAILS

### Current Behavior
<!-- Describe what's happening now -->
- **Steps to Reproduce**:
  1. 
  2. 
  3. 

- **Expected Behavior**: 
- **Actual Behavior**: 
- **Affected Components**: 
- **Error Messages**: 
- **Browser/Environment**: 

### Root Cause Analysis
<!-- What's causing the bug? -->
- **Primary Cause**: 
- **Contributing Factors**: 
- **Code Location**: `file:line`
- **Related Issues**: 

## ALL NEEDED CONTEXT

### Code Examples to Follow
- **Error Handling Pattern**: `examples/patterns/error-handling.example.js`
- **Testing Pattern**: `examples/testing/bugfix.example.js`
- **Similar Bug Fix**: `examples/fixes/[similar-fix].example.js`

### Documentation References
- **API Documentation**: [Link to relevant API docs]
- **Error Handling Guidelines**: See CLAUDE.md "Anti-Patterns" section
- **Testing Guidelines**: See CLAUDE.md "Testing Requirements" section

### Known Gotchas
- **Related Bug Patterns**: [Common similar issues]
- **Performance Implications**: [Impact of fix]
- **Backward Compatibility**: [Breaking changes?]

## CURRENT CODEBASE ANALYSIS

### Files to Modify
```
web-app/src/
├── components/[AffectedComponent]/
│   ├── [Component].js          # Primary fix location
│   ├── [Component].test.js     # Update tests
│   └── [Component].module.css  # Styling fixes if needed
├── hooks/
│   └── [affectedHook].js       # If hook needs fixing
└── services/
    └── [affectedService].js    # Backend integration fixes
```

### Dependencies
- **External Libraries**: [Which libraries might be affected]
- **Internal Dependencies**: [Other components that depend on this]
- **Database Schema**: [Any schema changes needed]

## IMPLEMENTATION BLUEPRINT

### Fix Strategy
1. **Immediate Fix** (30 minutes)
   - [ ] Identify exact line causing the bug
   - [ ] Apply minimal fix to resolve immediate issue
   - [ ] Add defensive programming checks
   - [ ] Test fix locally

2. **Comprehensive Solution** (1 hour)
   - [ ] Address root cause systematically
   - [ ] Add proper error handling
   - [ ] Implement input validation
   - [ ] Add logging for debugging

3. **Prevention** (30 minutes)
   - [ ] Add comprehensive tests for bug scenario
   - [ ] Add tests for edge cases
   - [ ] Update documentation
   - [ ] Add monitoring/alerts if needed

### Code Changes

#### Before (Buggy Code)
```javascript
// Example of current buggy implementation
const handleSubmit = async (data) => {
  // Missing error handling
  const result = await someAsyncOperation(data);
  setResult(result.data); // Potential null/undefined access
};
```

#### After (Fixed Code)
```javascript
// Example of fixed implementation
const handleSubmit = async (data) => {
  try {
    // Input validation
    if (!data || !data.requiredField) {
      throw new Error('Required field missing');
    }
    
    setLoading(true);
    const result = await someAsyncOperation(data);
    
    // Defensive programming
    if (result && result.data) {
      setResult(result.data);
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Submit error:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

### Testing Strategy
```javascript
// Test cases to add
describe('Bug Fix: [Bug Description]', () => {
  test('should handle the original bug scenario', () => {
    // Test the exact scenario that caused the bug
  });
  
  test('should handle edge cases', () => {
    // Test null, undefined, empty values
  });
  
  test('should provide meaningful error messages', () => {
    // Test error handling
  });
});
```

## VALIDATION LOOPS

### Level 1: Bug Reproduction
```bash
# Reproduce the bug first
cd web-app
npm start
# Manual testing to confirm bug exists
```

### Level 2: Fix Validation
```bash
# Validate fix works
cd web-app && npm run lint
cd web-app && npm run build
cd web-app && npm test -- --coverage --watchAll=false
```

### Level 3: Regression Testing
```bash
# Run full test suite to ensure no regressions
cd web-app && npm test
cd functions && npm test
```

### Level 4: Manual Validation
- [ ] Bug no longer reproduces
- [ ] Original functionality still works
- [ ] Edge cases handled properly
- [ ] Error messages are user-friendly
- [ ] Performance not degraded
- [ ] No new console errors

## LIBRARY QUIRKS & GOTCHAS

### Common Bug Patterns
- **Async/Await**: Missing try-catch blocks
- **React State**: Stale closures in useEffect
- **Firestore**: Missing error handling for network issues
- **Form Validation**: Not handling edge cases

### Performance Considerations
- **Memory Leaks**: Ensure cleanup in useEffect
- **Re-renders**: Check for unnecessary re-renders
- **Bundle Size**: Don't add unnecessary dependencies

## ANTI-PATTERNS TO AVOID

### Bug Fix Anti-Patterns
- ❌ Fixing symptoms instead of root cause
- ❌ Adding try-catch without proper error handling
- ❌ Not testing edge cases
- ❌ Breaking existing functionality
- ❌ Not documenting the fix
- ❌ Quick and dirty fixes without tests

### Code Quality
- ❌ Adding console.log for debugging (remove them)
- ❌ Commented out code
- ❌ Hard-coded values to "fix" the issue
- ❌ Ignoring ESLint warnings

## FINAL CHECKLIST

### Bug Resolution
- [ ] Original bug is fixed
- [ ] Root cause addressed
- [ ] Edge cases handled
- [ ] Error messages improved
- [ ] No regressions introduced

### Code Quality
- [ ] All validation loops pass
- [ ] Tests cover the bug scenario
- [ ] Code follows project patterns
- [ ] Documentation updated
- [ ] Performance maintained

### User Experience
- [ ] Error states are user-friendly
- [ ] Loading states work correctly
- [ ] Accessibility not broken
- [ ] Mobile experience intact

### Monitoring
- [ ] Add logging for future debugging
- [ ] Consider monitoring/alerts
- [ ] Update error tracking
- [ ] Document lessons learned

---

*This PRP should be executed using the `execute-prp` command*
*Estimated fix time: 1-2 hours*