# Profile Button & Family Management System

## Context
You are implementing a comprehensive profile button and dropdown menu system for the FamilySync application, with a priority focus on the Family Management functionality. The profile button in the header serves as the main access point for user profile management, settings, and navigation. The system must differentiate between Parent and Au Pair user types with appropriate menu options and functionality.

## Current State
- Basic ProfileIcon, ProfileMenu, and ProfilePage components exist
- Authentication is implemented with Firebase
- User roles (parent/au_pair) are stored in userData
- Basic menu items show "coming soon" alerts
- No invitation system or family management features exist yet

## Requirements

### Profile Button Implementation
1. **Visual Design**
   - 36px circular profile button in top-right header
   - Display user's profile picture or initials fallback
   - Blue accent color (#007AFF) with hover/active states
   - Smooth animations and keyboard navigation support

2. **Dropdown Menu**
   - Appears below profile button with slide-down animation
   - User info header showing name and role
   - Role-specific menu items for Parents vs Au Pairs
   - Backdrop click and Escape key to close

### Priority: Family Management Feature

#### For Parents:
1. **Family Management Page** with three sections:
   - Current Family Members (parents and au pairs)
   - Children (reuse existing child cards, make editable)
   - Pending Invitations (with status tracking)

2. **Invitation System**:
   - Email-only invitations (no extra fields required)
   - Unique random alphanumeric codes per invitation
   - 14-day expiration with parent notifications
   - Separate flows for inviting parents vs au pairs
   - Parent invitations pre-set role with equal permissions
   - Track status: pending, viewed, accepted, expired

3. **Family Member Management**:
   - Add/edit/remove children profiles
   - View all family members in grid layout
   - Immediate updates across app when editing
   - Validation for all profile fields

#### For Au Pairs:
1. **Invitation Experience**:
   - Invitation card showing family name and child count
   - Countdown timer to start date after acceptance
   - Welcome message with quick links on arrival (dismissible)

2. **Menu Items**:
   - Family Info, Schedule, Payment History, Goal Tracking, Emergency Info

### Technical Implementation

1. **Data Structure**:
   - Store invitations in `families` collection
   - Use Firebase Cloud Functions for email sending
   - Track email delivery status and handle bounces
   - Send reminder emails before expiration

2. **Email System**:
   - Simple templates with family name and join link
   - Firebase built-in email service
   - Delivery tracking and bounce handling
   - Expiration reminders to parents

3. **Real-time Updates**:
   - Child profile edits reflect immediately
   - Invitation status updates in real-time
   - Family member changes propagate instantly

## Constraints
- Use existing Firebase and React setup (no new packages)
- Maintain existing authentication flow
- Follow current CSS-in-JS styling patterns
- All parents have equal permissions (no hierarchy)
- No permission management for au pairs (all same access)

## Success Criteria
- Profile button and menu work smoothly with proper animations
- Parents can successfully invite other parents and au pairs via email
- Invitations expire after 14 days with notifications
- Au pairs see countdown and welcome messages appropriately
- Family member editing works with immediate updates
- All features are keyboard accessible and mobile responsive
- Proper error handling for all edge cases

## Files to Reference
- `web-app/src/components/Profile/ProfileIcon.js` - Existing profile button
- `web-app/src/components/Profile/ProfileMenu.js` - Existing dropdown menu
- `web-app/src/components/Profile/ProfilePage.js` - Profile editing page
- `web-app/src/components/Dashboard/ChildrenOverview.js` - Child cards to reuse
- `web-app/src/hooks/useFamily.js` - Family data management
- `functions/src/index.ts` - Firebase Cloud Functions

## Implementation Order
1. Update ProfileMenu with role-specific menu items
2. Create FamilyManagement component with sections layout
3. Implement invitation data structure in Firestore
4. Create invitation UI for parents (email input, status tracking)
5. Build Firebase Cloud Functions for email sending
6. Implement au pair invitation acceptance flow
7. Add countdown and welcome message features
8. Enable child profile editing with validation
9. Add comprehensive error handling and tests

## Notes
- Focus on Family Management first before other menu items
- Email templates should be simple (just family name and link)
- Invitation codes should be random alphanumeric strings
- All UI should match existing FamilySync design patterns
- Consider mobile-first design for all new components