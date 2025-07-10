# Profile Button & Menu - Initial Requirements

## FEATURE
<!-- 
Comprehensive profile button and dropdown menu system for the FamilySync application header.
The profile button serves as the main user access point for profile management, settings, and navigation.
Must differentiate between Parent and Au Pair user types with appropriate menu options and functionality.
-->

### User Story
As a **Parent** or **Au Pair**, I want to access my profile information, settings, and user management options through a profile button in the header so that I can manage my account and family interactions efficiently.

### Detailed Requirements

#### Profile Button (Top-Right Header)
1. **Visual Design**
   - 36px circular profile button with user's profile picture or initials
   - Blue accent color (#007AFF) for initial placeholder
   - Subtle drop shadow and hover effects
   - Active state with slight scale and glow effect

2. **Profile Picture Display**
   - Display user's uploaded profile picture if available
   - Fallback to user initials (first letter of first/last name) if no picture
   - Circular crop for profile images
   - Responsive design for mobile and desktop

3. **Interaction States**
   - Default: Subtle shadow, blue background for initials
   - Hover: Darker blue (#0056D6), slight scale (1.05x)
   - Active/Open: Maintained scale with blue glow ring
   - Focus: Blue outline for keyboard navigation

#### Profile Dropdown Menu
4. **Menu Structure & Animation**
   - Dropdown appears below profile button with smooth slide-down animation
   - White background with rounded corners (12px radius)
   - Drop shadow for depth
   - Backdrop click to close
   - Escape key support

5. **User Information Header**
   - Larger profile picture/initials (40px)
   - User's full name in bold
   - Role display: "Host Parent" or "Au Pair"
   - Light background (#FAFAFA) to separate from menu items

6. **Menu Items - Common for Both User Types**
   - 👤 Edit Profile - Navigate to profile editing page
   - 🔔 Notifications - Notification settings and history
   - ⚙️ Settings - App preferences and configuration
   - 📊 Analytics - Usage statistics and insights (if applicable)
   - 🔓 Sign Out - Logout with confirmation modal

7. **Menu Items - Parent-Specific**
   - 👥 Family Management - Manage family members, invite au pairs
   - 🏠 Household Settings - House rules, schedules, preferences
   - 💰 Payment & Billing - Au pair payments, expense tracking
   - 📋 Task Assignment - Create and assign tasks to au pairs
   - 🚨 Emergency Contacts - Family emergency information

8. **Menu Items - Au Pair-Specific**
   - 👨‍👩‍👧‍👦 Family Info - View family details and preferences
   - 📅 Schedule - View work schedule and availability
   - 💵 Payment History - View payment records and tax documents
   - 🎯 Goal Tracking - Personal and professional development goals
   - 🆘 Emergency Info - Quick access to emergency contacts

### Success Criteria
- [ ] Profile button displays correctly in header with proper sizing and positioning
- [ ] Profile picture uploads and displays correctly, with initials fallback
- [ ] Dropdown menu opens/closes smoothly with proper animations
- [ ] All menu items navigate to appropriate pages or trigger correct actions
- [ ] Role-specific menu items display based on user type (Parent vs Au Pair)
- [ ] Keyboard navigation and accessibility features work properly
- [ ] Logout confirmation modal prevents accidental logouts
- [ ] Mobile responsive design works on all screen sizes

---

## EXAMPLES
<!-- 
Reference existing code patterns that should be followed.
Point to specific files in the examples/ directory.
Include both positive examples (to follow) and negative examples (to avoid).
-->

### Patterns to Follow
- Profile component structure: See `web-app/src/components/Profile/ProfileIcon.js`
- Menu dropdown pattern: See `web-app/src/components/Profile/ProfileMenu.js`
- User data handling: See `web-app/src/components/Profile/ProfilePage.js`
- Authentication hooks: See existing `useAuth` implementations
- CSS-in-JS styling: Follow existing component style patterns

### Similar Features in Codebase
- Existing ProfileIcon component with basic menu functionality
- ProfileMenu component with user info header and basic menu items
- ProfilePage component for profile editing functionality
- LogoutConfirmModal for logout confirmation

### UI/UX Reference
- Follow existing design system colors and typography
- Maintain consistency with other dropdown menus in the app
- Use existing animation patterns for smooth transitions
- Reference iOS-style design elements for consistency

---

## DOCUMENTATION
<!-- 
Include all relevant documentation links.
This includes API docs, library guides, and internal documentation.
Be specific - link to exact sections when possible.
-->

### External Documentation
- React Hooks: https://react.dev/reference/react
- Firebase Auth: https://firebase.google.com/docs/auth
- Firebase Firestore: https://firebase.google.com/docs/firestore
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro

### Internal Documentation
- Architecture overview: See CLAUDE.md section "Architecture"
- UI Guidelines: See CLAUDE.md section "UI Design Guidelines"
- Authentication flow: See existing auth implementation
- User roles and permissions: See userData structure

### Relevant PRDs/Specs
- User authentication and profile management requirements
- Role-based access control specifications
- UI/UX design guidelines for header components

---

## OTHER CONSIDERATIONS
<!-- 
Capture all edge cases, gotchas, and special requirements.
This is critical for preventing common mistakes.
-->

### Known Gotchas
- Firestore limitation: User profile updates may require cache invalidation
- React pattern: Avoid inline arrow functions in render for performance
- Performance consideration: Lazy load profile picture uploads
- Menu positioning: Ensure dropdown doesn't overflow viewport boundaries

### Security Requirements
- [ ] User must be authenticated to access profile features
- [ ] User can only edit their own profile information
- [ ] Input validation required for profile updates
- [ ] Rate limiting needed for profile picture uploads
- [ ] Role-based menu item visibility enforcement

### Performance Requirements
- Profile button render time: < 100ms
- Dropdown menu animation: < 200ms
- Profile picture loading: < 2 seconds
- Support concurrent profile updates gracefully

### Testing Requirements
- [ ] Unit tests for ProfileIcon component interactions
- [ ] Unit tests for ProfileMenu component rendering
- [ ] Integration tests for profile data updates
- [ ] E2E test for complete profile management flow
- [ ] Manual testing for different user roles

### Accessibility Requirements
- [ ] Keyboard navigation support (Tab, Enter, Escape)
- [ ] Screen reader compatibility with proper ARIA labels
- [ ] WCAG 2.1 AA compliance for contrast ratios
- [ ] Focus management for dropdown menu
- [ ] Alt text for profile pictures

### Internationalization
- [ ] All menu item labels use i18n keys
- [ ] Support for English and German languages
- [ ] Right-to-left language support consideration
- [ ] Localized role names ("Host Parent" vs "Gastfamilie")

### Error Handling
- User-friendly error messages for:
  - Profile picture upload failures
  - Network connectivity issues
  - Invalid profile data
  - Authentication session expiry
  - Permission denied errors

### Edge Cases
1. What happens when user has no profile picture and no name?
2. What if user role is undefined or invalid?
3. How to handle profile updates while menu is open?
4. What if Firebase user data is inconsistent?
5. How to handle profile picture upload size limits?

### Dependencies
- New npm packages needed: None (using existing Firebase and React)
- Firebase services required: Auth, Firestore, Storage (for profile pictures)
- Environment variables: Firebase configuration

### Rollback Plan
- Feature flag: Profile menu can be disabled via environment variable
- Data migration reversible: Profile updates are non-destructive
- Backward compatibility maintained: Yes, existing auth flow unchanged

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
```

### Manual Validation
- [ ] Profile button appears correctly in header for both user types
- [ ] Profile picture uploads and displays properly
- [ ] Dropdown menu animations are smooth and responsive
- [ ] All menu items navigate to correct destinations
- [ ] Role-specific menu items display correctly
- [ ] Logout confirmation modal works properly
- [ ] Mobile responsive design verified
- [ ] Keyboard navigation functions correctly
- [ ] No console errors or warnings

### Integration Points
- [ ] Firebase authentication integrated
- [ ] Firestore user data sync working
- [ ] Profile picture storage working
- [ ] Real-time profile updates reflected
- [ ] Error states handled gracefully
- [ ] Loading states implemented appropriately

---

## NOTES
<!-- 
Any additional context, decisions made, or open questions.
-->

### Family Management Implementation Details

#### Invitation System Architecture
1. **Data Structure**
   - Store invitations in `families` collection with status fields
   - Each invitation has unique random alphanumeric code
   - Track invitation status: pending, viewed, accepted, expired
   - Parent invitations pre-set role as "Parent" with full permissions

2. **Parent Invitation Flow**
   - Enter only email address for invited parent
   - System generates unique invitation code per email
   - Email contains family name, inviting parent name, and signup link
   - Special messaging identifies this as parent/co-parent invitation
   - Both parents have equal permissions automatically

3. **Au Pair Invitation Flow**
   - Enter only au pair email address
   - Unique code generated for each invitation
   - Parents can view/cancel pending invitations
   - No permission management (removed from scope)

4. **Dashboard Integration**
   - **Parent View**: Family Management shows sections:
     - Current Family Members (parents and au pairs)
     - Children (using existing child cards, editable)
     - Pending Invitations (with status tracking)
   - **Au Pair View**: 
     - Invitation card with family preview (size, children ages, location)
     - Countdown to start date after acceptance
     - Welcome message with quick links on arrival date (dismissible)

5. **Family Member Management**
   - Reuse children overview cards from main dashboard
   - Allow editing of child profiles (name, birthdate, etc.)
   - Add/remove family members functionality
   - Grid layout within sectioned view

### Open Questions
1. Should expired invitations be automatically deleted or archived?
2. What should the invitation email template look like?
3. Should we log invitation history for audit purposes?
4. How long should invitation codes remain valid?

### Assumptions
1. Users will have either Parent or Au Pair role (no admin role initially)
2. Profile pictures will be stored in Firebase Storage
3. User preferences will be stored in Firestore user document
4. All parents have equal permissions (no primary/secondary parent roles)
5. Email sending will use Firebase Cloud Functions
6. Invitation codes are single-use only

### Out of Scope
1. Permission management for au pairs (all have same access level)
2. Bulk invitation sending
3. Invitation templates or customization
4. Au pair rating or review system
5. Historical au pair tracking
6. Integration with external au pair agencies

---

*Template Version: 1.0*
*Based on Context Engineering principles from https://github.com/coleam00/context-engineering-intro*