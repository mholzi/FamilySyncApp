# Initial Requirements Document: Child Profile Creation

## FEATURE: Multi-Step Child Profile Creation

### Overview
A streamlined two-step flow for parents to create and edit child profiles in the FamilySync app. This feature enables parents to add their children with essential information including basic details, care preferences, school schedules, and medical information. All changes auto-save immediately, eliminating the need for explicit save actions.

### User Journey

#### Entry Points
1. **First-time setup**: After family creation, prompted to add first child
2. **Dashboard**: "Add Child" button in Children's Overview section
3. **Empty state**: "Add Child" button when no children exist
4. **Edit Child**: Click "Edit" on child card jumps directly to Step 2

#### Step 1: Basic Information (Add Child Only)
- **Child Name** (required)
  - Text input with validation
  - Duplicate detection against existing children
  - Auto-save on blur
- **Date of Birth** (required)
  - Date picker with age calculation
  - Future date prevention
  - Auto-save on change
- **Profile Photo** (optional)
  - Camera capture or gallery selection
  - Preview before upload
  - Progress indicator during upload
  - 5MB size limit
  - Supported formats: JPEG, PNG, WebP
  - Auto-save after successful upload
- **Care Type Selection** (required)
  - Kindergarten (shows simplified schedule)
  - School (shows full weekly schedule)
  - Auto-save on selection

Note: Basic information (name, DOB, photo) can be edited later in Family Management section under Profile

#### Step 2: Care Information
- **Daily Routine** (optional)
  - Nap times for younger children
  - Bedtime preferences
  - Meal preferences and restrictions
  - Special care instructions
  - Auto-save on change
- **School Schedule**
  - Visual weekly table
  - Quick-set for uniform schedules
  - Pickup/delivery person assignment
  - School address and travel time
  - Different views for kindergarten vs school
  - Auto-save after each modification
- **Phone Number** (optional - Edit mode only)
  - International format support
  - Auto-formatting
  - Only shown when editing existing child
- **Medical Information** (optional)
  - Allergies with autocomplete suggestions
  - Severity levels (mild, moderate, severe)
  - Medications with dosage and frequency
  - Notes field for additional medical info
  - Auto-save on blur

Note: Emergency contacts are managed at family level in Family Management section

### Technical Implementation

#### Data Model
```javascript
{
  // Basic Info (Step 1 - Editable in Family Management)
  id: string (auto-generated),
  tempId: string (for draft management),
  name: string,
  dateOfBirth: Timestamp,
  profilePictureUrl: string,
  scheduleType: 'kindergarten' | 'school',
  
  // Contact Info (Step 2 - Edit mode only)
  phoneNumber: string,
  
  // Preferences (Step 2)
  carePreferences: {
    napTimes: [{ start: string, end: string }],
    bedtime: string,
    mealPreferences: string[],
    dietaryRestrictions: string[],
    comfortItems: string[],
    behaviorNotes: string,
    quickNotes: string
  },
  
  // School (Step 2)
  schoolSchedule: {
    monday: { start: string, end: string },
    tuesday: { start: string, end: string },
    // ... other days
  },
  pickupPerson: {
    monday: string,
    // ... other days
  },
  deliveryPerson: {
    monday: string,
    // ... other days
  },
  schoolInfo: {
    name: string,
    address: string,
    phone: string,
    teacherName: string,
    classRoom: string,
    travelTime: number // minutes
  },
  
  // Medical & Care (Step 2 - Optional)
  allergies: [{
    name: string,
    severity: 'mild' | 'moderate' | 'severe',
    notes: string
  }],
  medications: [{
    name: string,
    dosage: string,
    frequency: string,
    prescribedBy: string
  }],
  
  // Metadata
  familyId: string,
  createdBy: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  isActive: boolean,
  lastModifiedBy: string,
  lastAutoSaveAt: Timestamp
}
```

Note: Emergency contacts are stored at family level, not child level

#### State Management
- **Form State**: Managed per step with local state
- **Auto-save**: Debounced saves on every field change
- **Navigation State**: Track current step (1 or 2)
- **Edit Mode**: Detect if editing vs creating
- **Validation State**: Real-time validation with auto-save
- **Upload State**: Track photo upload progress

#### API Endpoints (Firebase Functions)
- `createChild`: Creates child profile with initial data
- `updateChild`: Auto-saves individual field updates
- `uploadChildPhoto`: Handles photo upload with optimization
- `navigateToStep2`: Transitions from Step 1 to Step 2
- `returnToDashboard`: Cleanup and navigation after Step 2

### UI/UX Requirements

#### Visual Design
- **Mobile-first** responsive design
- **Progress indicator** showing current step (1/2 or 2/2)
- **Card-based layout** with clear sections
- **Inline validation** with helpful error messages
- **Auto-save indicators** showing save status
- **Smooth transitions** between fields

#### Interactions
- **Real-time auto-save** on every field change (debounced 1s)
- **Save status indicator** (saving/saved)
- **Keyboard navigation** support
- **Touch-friendly** inputs and buttons
- **Direct navigation** to Step 2 when editing
- **Automatic return** to dashboard after Step 2

#### Accessibility
- **ARIA labels** for all form inputs
- **Keyboard navigation** through entire flow
- **Screen reader** announcements for step changes
- **High contrast** mode support
- **Focus management** between steps

### Validation Rules

#### Frontend Validation
- **Name**: 2-50 characters, letters and spaces only
- **Date of Birth**: Not future date, not more than 18 years ago
- **Phone**: Valid international format (edit mode only)
- **Photo**: Max 5MB, supported formats only
- **School Times**: End time after start time
- **Auto-save**: Validate before each save attempt

#### Backend Validation
- **Duplicate Check**: Same name + birthdate in family
- **Family Membership**: User must belong to family
- **Photo Storage**: Verify upload success
- **Data Completeness**: Only name, DOB, and care type required
- **Auto-save**: Validate incremental updates

### Error Handling

#### User-Facing Errors
- "A child with this name and birthdate already exists"
- "Photo upload failed. Please try again"
- "Unable to save. Please check your connection"
- "Some required information is missing"

#### System Errors
- Network failures: Show retry option
- Firebase quota exceeded: Queue for later
- Invalid data: Log and show generic message

### Edge Cases
1. **Twins/Triplets**: Allow same birthdate, different names
2. **No Internet**: Queue auto-saves, sync when connected
3. **Large Photos**: Compress before upload
4. **Session Timeout**: Auto-save preserves all data
5. **Multiple Tabs**: Last write wins with timestamps
6. **Rapid Field Changes**: Debounce auto-save (1s)
7. **Navigation During Save**: Complete save before navigation
8. **Edit Mode Entry**: Load latest data directly to Step 2

## EXAMPLES

### Similar Features in Codebase
- **Profile Creation**: `/web-app/src/components/Profile/ProfilePage.js`
- **Multi-Step Forms**: `/web-app/src/components/AddChild/AddChildFlow.js`
- **Photo Upload**: `/web-app/src/utils/optimizedPhotoUpload.js`
- **Form Validation**: `/web-app/src/utils/validation.js`

### Component Structure
```
AddChildFlow/
├── index.js (orchestrator with auto-save logic)
├── AddChildBasicInfo.js (step 1 - create mode only)
├── AddChildCareInfo.js (step 2 - create and edit mode)
├── AddChildSchoolSchedule.js (sub-component)
├── AddChildSchoolScheduleTable.js (sub-component)
├── AutoSaveIndicator.js (save status component)
└── styles/ (component styles)

FamilyManagement/
├── EditChildBasicInfo.js (edit name, DOB, photo)
└── EmergencyContacts.js (family-level contacts)
```

## DOCUMENTATION

### External References
- [React Hook Form](https://react-hook-form.com/) - Form state management
- [Firebase Storage](https://firebase.google.com/docs/storage/web/start) - Photo uploads
- [Material-UI Date Pickers](https://mui.com/x/react-date-pickers/) - Date selection

### Internal Documentation
- Architecture: `/docs/ARCHITECTURE.md`
- Firebase Setup: `/docs/FIREBASE_SETUP.md`
- Component Guidelines: `/docs/COMPONENT_GUIDELINES.md`

## OTHER_CONSIDERATIONS

### Security Requirements
- **Data Encryption**: All child data encrypted at rest
- **Photo Access**: Restricted to family members only
- **Audit Trail**: Log all create/update operations
- **PII Protection**: No child data in logs or analytics

### Performance Requirements
- **Step Load Time**: < 200ms
- **Photo Upload**: Progress indication required
- **Auto-save**: Debounced 1s, < 500ms save time
- **Form Response**: < 100ms for all interactions
- **Edit Mode Load**: < 300ms to Step 2
- **Dashboard Return**: < 200ms after Step 2

### Testing Requirements

#### Unit Tests
- Form validation logic
- Date calculations (age)
- Photo compression utility
- Auto-save debouncing
- Edit mode detection

#### Integration Tests
- Complete 2-step flow
- Auto-save functionality
- Photo upload with various file types
- Duplicate detection accuracy
- Direct Step 2 navigation for edit

#### E2E Tests
- Create first child (Step 1 → Step 2 → Dashboard)
- Create additional child
- Edit existing child (Dashboard → Step 2 → Dashboard)
- Upload and change photo
- Auto-save during field changes
- Family Management basic info editing

### Accessibility Requirements
- **WCAG 2.1 AA** compliance
- **Screen Reader**: Full flow navigable
- **Keyboard**: All actions accessible
- **Color Contrast**: 4.5:1 minimum
- **Error Messages**: Clear and actionable

### Internationalization
- **Languages**: English, German
- **Date Formats**: Locale-specific
- **Phone Formats**: Country-specific
- **Translations**: All UI text
- **RTL Support**: Future consideration

### Analytics Events
- `child_creation_started`
- `child_step1_completed`
- `child_step2_started`
- `child_photo_uploaded`
- `child_creation_completed`
- `child_edit_started`
- `child_field_autosaved`
- `child_edit_completed`

### Future Enhancements
1. **Voice Input**: For accessibility
2. **Multiple Photos**: Gallery per child
3. **Document Upload**: Medical records, etc.
4. **Growth Tracking**: Height, weight over time
5. **Sharing**: Grandparent access
6. **Templates**: Quick setup for siblings

## VALIDATION_CHECKLIST

### Automated Validation
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] No console errors
- [ ] No accessibility violations
- [ ] Bundle size < threshold
- [ ] Performance metrics met

### Manual Validation
- [ ] Create child with minimum info (name, DOB, care type)
- [ ] Create child with all optional fields
- [ ] Edit child jumps directly to Step 2
- [ ] Phone number only appears in edit mode
- [ ] Upload various photo formats
- [ ] Test auto-save on each field change
- [ ] Verify auto-save indicator shows status
- [ ] Test on slow connection (queued saves)
- [ ] Dashboard return after Step 2
- [ ] Check responsive design
- [ ] Verify in English and German
- [ ] Test with screen reader
- [ ] Validate keyboard navigation

### Parent Testing
- [ ] Two-step flow is intuitive
- [ ] Auto-save works seamlessly
- [ ] Edit mode goes directly to care info
- [ ] Photo upload works smoothly
- [ ] Schedule builder clear
- [ ] Returns to dashboard automatically
- [ ] Can edit basic info in Family Management

### Au Pair Testing
- [ ] Can view child profiles
- [ ] Cannot edit without permission
- [ ] Phone numbers visible when present
- [ ] Schedule clearly displayed
- [ ] Medical info accessible at bottom