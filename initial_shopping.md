# Shopping System - Initial Requirements

## FEATURE
<!-- 
Provide a comprehensive description of what needs to be built.
Be specific about functionality, user interactions, and expected outcomes.
Include acceptance criteria if applicable.
-->

### User Story
As a **parent**, I want to **create and schedule shopping lists for the au pair with receipt tracking and reimbursement** so that **household shopping is organized, transparent, and financially accountable**.

As an **au pair**, I want to **complete assigned shopping lists and get reimbursed** so that **I can efficiently handle family shopping needs**.

### Detailed Requirements
1. **Shopping List Management**
   - Parents manually create shopping lists with name and supermarket selection
   - Parents schedule shopping trips with specific dates/times for au pair
   - Parents can add/remove/modify items even after scheduling
   - Track completion status per item and overall list (no substitution notes)
   - All shopping lists are assigned to au pair for completion
   - No recurring/automatic list creation

2. **Item Management & Family Database**
   - Maintain family item database with product photos and guidance notes
   - Track item familiarity based on purchase history
   - Provide item details and suggestions during shopping
   - Support autocomplete from previously purchased items

3. **Receipt & Payment System**
   - Upload multiple receipt photos per shopping trip (for split purchases across stores)
   - Upload receipt photos automatically marks shopping as completed
   - Enter actual total amount spent across all receipts
   - Parent approval workflow for reimbursements
   - Payment status tracking (pending → approved → paid out → confirmed)
   - Support for au pair payment confirmation
   - Completed shopping lists remain visible with "completed" status (not archived)

4. **Role-Based Access Control**
   - **Parents**: Create and schedule shopping lists, approve receipts, manage payments
   - **Au Pairs**: Complete assigned shopping lists, upload receipts, confirm payments
   - Different UI modes based on user role

5. **Supermarket Integration**
   - Family supermarket database with locations and auto-generated logos
   - Track usage frequency and sort by last used
   - Support for German supermarket chains with branding

### Success Criteria
- [ ] Parents can create and schedule shopping lists for au pair
- [ ] Au pair can complete assigned shopping lists and mark items as purchased
- [ ] Items are tracked with completion status and linked to family item database
- [ ] Receipt upload and approval workflow functions correctly
- [ ] Payment tracking provides transparency for all parties
- [ ] Role-based permissions are enforced appropriately
- [ ] Real-time synchronization works across devices

---

## EXAMPLES
<!-- 
Reference existing code patterns that should be followed.
Point to specific files in the examples/ directory.
Include both positive examples (to follow) and negative examples (to avoid).
-->

### Patterns to Follow
- Component structure: Follow existing modal patterns like `AddShoppingList.js`
- Firebase operations: Use error handling patterns from `useShopping.js`
- Real-time data: Follow listener patterns with cleanup in `useShopping.js`
- Role-based UI: Follow conditional rendering patterns in `ShoppingList.js`

### Similar Features in Codebase
- **Task Management**: Similar card-based interface with completion tracking - shopping tasks appear as cards when scheduled for today
- **Family Notes**: Similar user role permissions and family-scoped data
- **Calendar Events**: Similar real-time synchronization and family sharing
- **Photo Upload**: Similar to receipt upload functionality

### UI/UX Reference
- Design mockup: `/design-assets/dashboard-mockup.jpeg` (shows shopping task cards)
- Shopping list cards: `web-app/src/components/Shopping/ShoppingListTaskCard.js`
- Modal patterns: `web-app/src/components/Shopping/AddShoppingList.js`

---

## DOCUMENTATION
<!-- 
Include all relevant documentation links.
This includes API docs, library guides, and internal documentation.
Be specific - link to exact sections when possible.
-->

### External Documentation
- React Hooks: https://react.dev/reference/react
- Firebase Firestore: https://firebase.google.com/docs/firestore
- Firebase Storage: https://firebase.google.com/docs/storage (for receipt/photo uploads)
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro

### Internal Documentation
- Architecture overview: See CLAUDE.md section "Architecture"
- UI Guidelines: See CLAUDE.md section "UI Design Guidelines"
- Firebase patterns: See CLAUDE.md section "Firebase Gotchas & Library Quirks"
- File organization: See CLAUDE.md section "Code Structure Rules"

### Relevant PRDs/Specs
- Shopping system implementation in `/web-app/src/components/Shopping/`
- Firebase utils in `/web-app/src/utils/familyUtils.js`
- Shopping-specific utilities in `/web-app/src/utils/shoppingValidation.js`

---

## OTHER CONSIDERATIONS
<!-- 
Capture all edge cases, gotchas, and special requirements.
This is critical for preventing common mistakes.
-->

### Known Gotchas
- **Firestore limitation**: Items must be stored as objects, not arrays (handled in `useShopping.js:65-67`)
- **React pattern**: Shopping lists use optimistic updates with rollback on errors
- **Performance consideration**: Family items are cached locally to reduce Firestore reads
- **Real-time sync**: Multiple users can edit same list, requires conflict resolution

### Security Requirements
- [x] User must be authenticated to access shopping lists
- [x] User can only access their family's shopping data
- [x] Input validation required for: shopping list names, item names, amounts
- [x] Rate limiting needed for: receipt uploads, list creation
- [x] Receipt photos stored securely in Firebase Storage with family-scoped access rules

### Performance Requirements
- Page load time: < 2 seconds for shopping list page
- Real-time sync latency: < 500ms for item updates
- Support concurrent users: Up to 6 family members editing simultaneously
- Photo upload size: Max 5MB per receipt image

### Testing Requirements
- [x] Unit tests for shopping validation utilities
- [x] Integration tests for Firebase shopping operations
- [x] E2E test for complete shopping workflow (create → shop → upload → approve)
- [x] Manual testing checklist for cross-browser compatibility

### Accessibility Requirements
- [x] Keyboard navigation support for shopping lists and items
- [x] Screen reader compatibility for shopping status updates
- [x] WCAG 2.1 AA compliance for shopping interface
- [x] Color contrast ratios met for shopping list status indicators

### Internationalization
- [x] All user-facing text uses i18n keys (shopping errors, status messages)
- [x] Support for English and German supermarket names
- [x] Currency formatting for EUR (German families)
- [x] Date/time formatting respects locale for shopping timestamps

### Error Handling
- User-friendly error messages for:
  - Network failures during shopping list sync
  - Permission denied for shopping operations
  - Invalid shopping list data
  - Receipt upload failures
  - Payment processing errors

### Edge Cases
1. **Offline shopping**: What happens when au pair shops without internet?
2. **Concurrent editing**: How to handle parent editing list while au pair is shopping?
3. **Large receipts**: What if receipt photo is too large to upload?
4. **Payment disputes**: How to handle rejected reimbursement requests?
5. **Archived data**: How to handle deleted shopping lists with pending payments?
6. **Real-time updates**: How to notify au pair when parent modifies active shopping list?

### Dependencies
- **New npm packages needed**: None (uses existing Firebase, React dependencies)
- **Firebase services required**: Firestore, Storage, Auth
- **Environment variables**: Firebase config keys already configured

### Rollback Plan
- **Feature flag**: Shopping can be disabled via environment variable
- **Data migration reversible**: Yes, shopping data is in separate subcollection
- **Backward compatibility maintained**: Yes, existing families unaffected

---

## VALIDATION CHECKLIST
<!-- 
Define how to verify the feature is working correctly.
Include both automated and manual validation steps.
-->

### Automated Validation
```bash
# Run these commands to validate implementation
cd web-app
npm run lint
npm test -- --coverage
npm run build

cd ../functions
npm run lint
npm run build
npm test

# Specific shopping tests
npm test -- --testPathPattern=shopping
```

### Manual Validation
- [x] Shopping list creation works in development environment
- [x] Shopping list sync works with Firebase emulator
- [x] No console errors during shopping operations
- [x] Performance meets requirements for list loading
- [x] Receipt upload works with photo capture
- [x] Payment workflow completes successfully
- [x] Cross-browser testing completed (Chrome, Safari, Firefox)
- [x] Mobile responsive design verified on iOS/Android

### Integration Points
- [x] Authentication flow integrated with shopping access
- [x] Real-time sync working across multiple devices
- [x] Error states handled gracefully with user feedback
- [x] Loading states implemented for all async operations
- [x] Empty states designed for new families/lists
- [x] Dashboard integration shows shopping task cards
- [ ] Todo/Task section shows shopping task cards when scheduled for today

---

## NOTES
<!-- 
Any additional context, decisions made, or open questions.
-->

### Current Implementation Status
The shopping system is **fully implemented** with the following components:
- Complete shopping list CRUD operations
- Receipt upload and approval workflow
- Payment tracking and confirmation
- Family item database with photo storage
- Role-based access control
- Real-time synchronization
- Comprehensive error handling

### Key Architecture Decisions
1. **Data Structure**: Shopping lists stored as subcollection under families
2. **Item Storage**: Items stored as objects (not arrays) for Firestore compatibility
3. **Photo Storage**: Receipt photos in Firebase Storage with family-scoped security
4. **Role Management**: Role-based UI rendering with server-side validation
5. **Caching Strategy**: Family items cached locally to reduce database reads

### Recent Improvements
1. **Security fixes**: Enhanced data validation and access control
2. **Performance optimization**: Implemented listener management and caching
3. **Error handling**: Added comprehensive error boundaries and user feedback
4. **UI polish**: Improved loading states and empty state handling

### Open Questions
1. Should we add shopping analytics/reporting for families?
2. How to handle shopping list templates for recurring purchases?
3. Should we integrate with external grocery delivery services?

### Assumptions
1. Families primarily shop at German supermarkets (logos/branding)
2. Maximum 6 family members will use shopping system simultaneously
3. Receipt photos will be under 5MB (mobile camera quality)
4. Au pairs need reimbursement tracking (not just expense sharing)

### Out of Scope
1. Integration with external grocery delivery APIs
2. Barcode scanning for item entry
3. Price comparison across supermarkets
4. Shopping list sharing with non-family members
5. Bulk operations for managing multiple lists
6. Recurring/automatic shopping list creation
7. Spending limits or budget tracking
8. Shopping completion time tracking
9. Substitution notes during shopping

---

*Template Version: 1.0*
*Based on Context Engineering principles from https://github.com/coleam00/context-engineering-intro*