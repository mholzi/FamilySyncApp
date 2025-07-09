# Family Notes Enhancement - Product Requirements Prompt

## Context
The FamilySync app currently has a Family Notes feature that serves as a communication hub for parents and au pairs. Based on the comprehensive analysis in FAMILY_NOTES_FUNCTIONALITY.md, we need to enhance and refine this feature to better serve family communication needs.

## Current State
- ✅ Core note creation and display functionality
- ✅ Real-time Firestore synchronization  
- ✅ Note dismissal system with cleanup
- ✅ Template system for quick messaging
- ✅ Category and priority filtering
- ✅ Mobile-responsive modal interface

## Issues Identified
1. **Priority Implementation**: Code shows priority restrictions in AddFamilyNote component that should be removed - all users should be able to set any priority level
2. **Author Name Resolution**: Sometimes shows "Loading..." briefly before resolving
3. **Mobile Scrolling**: Long note lists may have scrolling issues in modal
4. **Timestamp Formatting**: Relative time doesn't update automatically
5. **Concurrent Editing**: No conflict resolution for simultaneous edits

## Requirements

### 1. Fix Priority Level Access
**User Story**: As any family member, I want to set any priority level on my notes so that I can highlight important information regardless of my role.

**Acceptance Criteria**:
- Remove role-based restrictions on priority levels in AddFamilyNote component
- All users (parents and au pairs) can select normal, urgent, or important priority
- Priority serves only as visual indicator, not permission level
- Update validation in familyNotesUtils.js if needed
- Keep existing color coding (red for urgent, orange for important, gray for normal)

### 2. Improve Dashboard Integration
**User Story**: As a family member, I want to see important notes prominently displayed on the dashboard so I don't miss critical information.

**Acceptance Criteria**:
- Add a Family Notes section to the main Dashboard component
- Display up to 4 most recent/important undismissed notes
- Sort by priority first (urgent > important > normal), then by timestamp
- Include visual priority indicators matching the modal design
- Show "View All" link to open full notes modal

### 3. Enhance Mobile Experience  
**User Story**: As a mobile user, I want a smooth experience when viewing and managing family notes on my phone.

**Acceptance Criteria**:
- Fix scrolling issues in modal on mobile devices
- Ensure touch gestures work properly for dismissing notes
- Optimize button sizes and spacing for mobile
- Test on various screen sizes (iPhone SE to iPad)

### 4. Add Character Counter
**User Story**: As a note creator, I want to see how many characters I have left so I don't exceed the 500 character limit.

**Acceptance Criteria**:
- Display character count below textarea (e.g., "127/500")
- Change color as approaching limit (green < 400, orange 400-450, red > 450)
- Prevent typing beyond 500 characters
- Show in both create and edit modes
- Keep 500 character limit as is

### 5. Implement Auto-refresh for Timestamps
**User Story**: As a user, I want timestamps to automatically update so I always see accurate relative times.

**Acceptance Criteria**:
- Refresh relative timestamps every minute
- Update "Just now" to "1m ago" to "2m ago" etc. automatically
- Ensure performance isn't impacted by frequent re-renders
- Use React.memo or similar optimization if needed

### 6. Add Thank You Category
**User Story**: As a family member, I want to express gratitude through a dedicated "Thank you" category so appreciation messages are easy to identify.

**Acceptance Criteria**:
- Add "Thank you" to the category dropdown in AddFamilyNote component
- Include "Thank you" in category filters in FamilyNotesModal
- Add thank you quick templates for both parents and au pairs
- Parent templates: 
  - "Thank you for handling the emergency so well"
  - "Thanks for teaching [child name] that new skill"
  - "Appreciate you staying late yesterday"
- Au pair templates: 
  - "Thank you for the lovely family dinner"
  - "Thanks for understanding the schedule change"
  - "Appreciate your help with homework"

### 7. Add Note Badge Notifications
**User Story**: As a user, I want to see at a glance how many new notes I haven't read yet so I don't miss important communications.

**Acceptance Criteria**:
- Add badge counter to Family Notes section header showing total unread count (e.g., "5 unread")
- Track "read" status separately from "dismissed" status
- Show badge on dashboard Family Notes section
- Show badge on "View All" button if there are unread notes
- Mark note as read when user interacts with it in any way (like, dismiss, etc.)
- Existing notes in the system will start as "unread" for all users

### 8. Implement Like Feature
**User Story**: As a family member, I want to "like" notes to acknowledge I've seen them without dismissing them completely.

**Acceptance Criteria**:
- Add heart/like button to each note card
- Track likes per user in Firestore
- Show only the total like count (no names revealed)
- When current user has liked, show "You and X others" format
- Allow users to like/unlike notes
- Likes should persist across sessions
- Liking a note marks it as read

## Technical Considerations

### Code Changes Required:
1. **AddFamilyNote.js**: 
   - Remove priority restrictions based on userRole
   - Add "thank you" category option
   - Add thank you templates for both roles
2. **Dashboard.js**: 
   - Update FamilyNotesList to show 4 notes
   - Add unread badge display
3. **FamilyNoteCard.js**: 
   - Add timestamp refresh logic
   - Add like button and functionality
   - Track read status when viewed
4. **FamilyNotesModal.js**: 
   - Fix mobile scrolling CSS
   - Add "thank you" to category filter
5. **FamilyNotesList.js**: 
   - Update to show 4 notes instead of 3
   - Add unread count badge
6. **useFamilyNotes.js**: 
   - Add like/unlike functionality
   - Add read status tracking
   - Update data structure for likes and read status

### Testing Requirements:
- Unit tests for priority level access
- Integration tests for dashboard display showing 4 notes
- Test like functionality and persistence
- Test unread badge updates
- Manual mobile testing on iOS and Android
- Performance testing with 50+ notes

### Security Considerations:
- Maintain existing role-based edit/delete permissions
- Keep content sanitization for XSS prevention
- Ensure dismissal tracking remains user-specific
- Ensure like and read status are user-specific

## Implementation Priority
1. Fix priority level access (High - Bug fix) ✅ Completed
2. Add character counter (High - UX improvement) ✅ Completed
3. Dashboard integration with 4 notes (High - Feature enhancement) 
4. Add Thank You category and templates (High - Feature enhancement)
5. Add like feature (Medium - Engagement feature)
6. Add unread badges (Medium - UX improvement)
7. Auto-refresh timestamps (Medium - Polish) ✅ Completed
8. Mobile scrolling fix (Low - Edge case) ✅ Completed

## Success Metrics
- All family members successfully using all priority levels
- Reduced time to notice important notes (< 2 hours average)
- Mobile user satisfaction improvement
- No character limit errors reported
- Consistent timestamp display across sessions

## Questions for Product Team
1. Should urgent notes trigger push notifications in the future?
2. Do we want to add sound/visual alerts for new urgent notes?
3. Should dismissed notes be archived instead of hidden?
4. Is 500 characters sufficient or should we increase the limit?
5. Should we add @mentions to notify specific family members?

## Next Steps
1. Review and approve these requirements
2. Update component code to remove priority restrictions
3. Design dashboard notes section mockup
4. Implement features in priority order
5. Conduct user testing with 3-5 families

---

*Generated from: FAMILY_NOTES_FUNCTIONALITY.md*
*Date: July 9, 2025*
*Version: 2.1*
*Updates: 
- v2.0: Added Thank You category, like feature, unread badges, and increased dashboard display to 4 notes
- v2.1: Refined requirements based on user feedback - specific thank you templates, like count display format, read marking behavior*