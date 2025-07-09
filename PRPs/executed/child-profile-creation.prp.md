# Product Requirements Prompt: Streamlined Child Profile Creation

## Context
You are implementing a streamlined two-step child profile creation and editing system for the FamilySync app. The system emphasizes real-time auto-saving, simplified navigation, and a clear separation between creation and editing workflows.

## Current State
- Basic child creation exists with 3 steps including a confirmation screen
- Phone number capture happens in step 1
- Emergency contacts are captured per child
- No auto-save functionality
- Edit mode uses the same flow as creation
- Profile icon exists in bottom navigation

## Requirements

### 1. Two-Step Creation Flow
**Step 1 - Basic Information (Create Mode Only)**
- Child name with duplicate detection
- Date of birth with age calculation
- Profile photo upload (optional)
- Care type selection (kindergarten/school - both use same schedule interface)
- All fields auto-save on change/blur
- Navigate to Step 2 upon completion
- If returning to incomplete profile, start fresh but pre-populate with draft data

**Step 2 - Care Information (Create & Edit Mode)**
- Daily routine preferences (keep existing implementation unchanged)
- School schedule with visual table (keep existing functionality unchanged)
- Phone number (edit mode only)
- Medical information (optional, at bottom) with autocomplete from:
  - Predefined common allergies/medications list
  - Previous entries from other family children
- Auto-save all changes with 1s debounce
- Show brief success message (1-2 seconds) then auto-return to dashboard

### 2. Edit Mode Behavior
- Clicking "Edit" on child card bypasses Step 1
- Jumps directly to Step 2 (Care Information)
- Shows header "Editing: [Child's Name] Profile" with child's photo and name
- Phone number field only visible in edit mode
- Basic info (name, DOB, photo) editable in Family Management section
- Family Management accessible from top profile icon (remove bottom profile icon)

### 3. Auto-Save Implementation
- Debounced saves (1 second) on field changes
- Global save status indicator (saving/saved) - single indicator, not per-field
- Queue saves when offline, sync when connected
- Failed saves show warning but auto-retry in background
- Prevent navigation during active save
- Timestamp-based conflict resolution

### 4. Data Model Changes
- Move emergency contacts to family level
- Add `lastAutoSaveAt` timestamp
- Remove confirmation step data
- Separate required vs optional fields clearly

### 5. UI/UX Requirements
- Mobile-first responsive design
- Progress indicator (1/2, 2/2)
- Global auto-save status indicator (top or bottom of screen)
- Smooth field transitions
- Clear visual separation of optional sections
- Edit mode header with child's name and photo
- Success message display before dashboard return

### 6. Navigation Flow
```
Create: Dashboard → Step 1 → Step 2 → Success Message → Dashboard
Edit: Dashboard → Step 2 (with header) → Success Message → Dashboard
Basic Info Edit: Top Profile Icon → Family Management → Edit Basic Info
Incomplete Profile: Dashboard → Step 1 (pre-populated) → Step 2 → Dashboard
```

### 7. Performance Targets
- Step load time: < 200ms
- Auto-save response: < 500ms
- Edit mode load: < 300ms
- Dashboard return: < 200ms

### 8. Validation Rules
- Name: 2-50 characters, letters/spaces only
- DOB: Not future, max 18 years ago
- Phone: International format (edit only)
- Photos: Max 5MB, JPEG/PNG/WebP
- School times: End after start

### 9. Error Handling
- User-friendly error messages
- Auto-retry mechanism for failed saves (with warning shown)
- Offline queue for auto-saves
- Duplicate child prevention
- Continue editing while retrying failed saves

### 10. Testing Requirements
- Unit tests for auto-save debouncing
- Integration tests for 2-step flow
- E2E tests for create/edit workflows
- Performance tests for save operations

## Technical Considerations

### Component Architecture
```
AddChildFlow/
├── index.js (orchestrator with auto-save)
├── AddChildBasicInfo.js (step 1 - create only)
├── AddChildCareInfo.js (step 2 - create/edit)
├── AutoSaveIndicator.js (status component)
└── [sub-components]

FamilyManagement/
├── EditChildBasicInfo.js
└── EmergencyContacts.js (family-level)
```

### State Management
- Form state per step
- Auto-save queue management
- Navigation state (1 or 2)
- Edit mode detection
- Save status tracking

### Firebase Integration
- Optimistic updates for better UX
- Batch writes when possible
- Proper security rules
- Audit trail for changes

## Success Criteria
1. Parents can create a child profile in under 2 minutes
2. All changes save automatically without data loss
3. Edit mode provides quick access to care information
4. No confusion between create and edit workflows
5. Works seamlessly on mobile devices
6. Handles poor network conditions gracefully

## Implementation Priority
1. Remove Step 3 (confirmation) and add success message
2. Implement global auto-save with debouncing
3. Create edit mode direct navigation with header
4. Move phone to Step 2 (edit only)
5. Move emergency contacts to family level
6. Add global save status indicator
7. Implement offline queue with auto-retry
8. Update validation and error handling
9. Remove bottom profile icon, enhance top profile icon
10. Add medical information autocomplete

## Notes
- Emergency contacts should be implemented at the family level in a future update
- Consider adding templates for siblings in a future enhancement
- Medical information remains optional to reduce friction
- Basic info editing in Family Management reduces clutter in main flow
- Daily routine and school schedule functionality remain unchanged from current implementation
- Kindergarten and school use the same schedule interface (no simplification)
- Success message provides clear feedback before automatic navigation