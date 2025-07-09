# Au Pair-Friendly Chore Assignment System - Product Requirements Prompt

*Generated from INITIAL.md on 2025-07-09*

## GOAL
**What**: Enhance the existing Household Todos system to better support the parent-au pair relationship through helpful guidance, clear instructions, and trust-building features while avoiding micromanagement.

**Why**: New au pairs need clear guidance to succeed, but the system must respect their autonomy and foster a positive working relationship. The current system lacks instructional features and feedback mechanisms that could help au pairs learn family preferences while building trust.

**Success Looks Like**: Au pairs feel supported (not surveilled), complete tasks correctly from the start, ask questions when needed, and gradually need less guidance as they gain experience. Parents feel confident tasks are understood without constant checking.

## SUCCESS CRITERIA
- [ ] Au pairs can view rich text instructions and photo examples for tasks
- [ ] "Need help?" feature allows au pairs to ask questions without judgment
- [ ] Positive feedback system goes beyond simple "confirmed" status
- [ ] Task difficulty indicators help au pairs prioritize work
- [ ] Learning mode provides extra guidance for first 30 days
- [ ] Parents can create and customize task templates
- [ ] Notification system sends friendly reminders, not nagging messages
- [ ] System adapts to au pair experience level over time
- [ ] Mobile experience is seamless for au pairs on the go
- [ ] Existing task functionality remains intact (backward compatible)

## ALL NEEDED CONTEXT

### Requirements
Enhance the existing Household Todos system to better support the parent-au pair relationship by providing helpful guidance for new au pairs while respecting their autonomy. Focus on clear task instructions, optional photo examples, gentle reminders, and constructive feedback mechanisms that foster trust and learning rather than micromanagement.

Key features include:
- Rich text instructions with step-by-step guidance
- "How we like it done" photo examples
- Difficulty indicators and helpful tips
- Task templates with cultural context
- Supportive completion process with optional photos
- "Need help?" communication feature
- Positive feedback and recognition system
- Gentle reminders and appreciation summaries

### Code Examples to Follow
- Component structure: See `examples/components/Dashboard.example.js`
- Firebase operations: See `examples/firebase/firestore.example.js` 
- Service layer: See `examples/services/taskService.example.js`
- Error handling: See `examples/patterns/error-handling.example.js`
- Testing patterns: See `examples/testing/component.test.example.js`

### Documentation References
- Firebase Storage for photos: https://firebase.google.com/docs/storage/web/upload-files
- Firebase Cloud Messaging: https://firebase.google.com/docs/cloud-messaging
- React Quill for rich text: https://github.com/zenoamaro/react-quill
- Image compression: https://www.npmjs.com/package/browser-image-compression
- Current task data model: See Firestore `householdTodos` collection
- UI Guidelines: See CLAUDE.md section "UI Design Guidelines"

### Known Gotchas
- **Photo storage**: Need proper image compression to manage storage costs
- **Cultural sensitivity**: Task instructions should avoid being prescriptive or condescending
- **Trust balance**: Too many "helpful" features might feel like surveillance
- **New vs experienced au pairs**: System needs to adapt to experience level
- **Notification fatigue**: Balance between helpful reminders and annoying notifications
- **Existing data**: Must maintain compatibility with current `householdTodos` structure

## CURRENT CODEBASE TREE
```
web-app/src/
├── components/
│   ├── HouseholdTodos/
│   │   ├── TodoList.js
│   │   ├── TodoCard.js
│   │   ├── SimpleTodoCard.js
│   │   └── AddTodo.js
│   └── ...
├── hooks/
│   ├── useHouseholdTodos.js
│   └── ...
├── pages/
├── services/
└── utils/
```

## DESIRED CODEBASE CHANGES
```
web-app/src/
├── components/
│   ├── HouseholdTodos/
│   │   ├── TodoList.js (enhanced)
│   │   ├── TodoCard.js (enhanced)
│   │   ├── SimpleTodoCard.js (enhanced)
│   │   ├── AddTodo.js (enhanced)
│   │   ├── TaskInstructions/
│   │   │   ├── TaskInstructions.js
│   │   │   ├── TaskInstructions.module.css
│   │   │   └── TaskInstructions.test.js
│   │   ├── TaskTemplates/
│   │   │   ├── TaskTemplateSelector.js
│   │   │   ├── TaskTemplateEditor.js
│   │   │   └── defaultTemplates.js
│   │   ├── TaskFeedback/
│   │   │   ├── FeedbackModal.js
│   │   │   ├── AppreciationSummary.js
│   │   │   └── HelpRequest.js
│   │   └── TaskGuidance/
│   │       ├── DifficultyBadge.js
│   │       ├── FirstTimeHelper.js
│   │       └── ExamplePhotos.js
│   └── ...
├── hooks/
│   ├── useHouseholdTodos.js (enhanced)
│   ├── useTaskTemplates.js (new)
│   ├── useAuPairExperience.js (new)
│   └── ...
├── services/
│   ├── taskTemplateService.js (new)
│   ├── notificationService.js (new)
│   └── photoStorageService.js (new)
└── utils/
    └── taskHelpers.js (new)
```

## IMPLEMENTATION BLUEPRINT

### Data Models
```javascript
// Enhanced HouseholdTodo model
const EnhancedHouseholdTodo = {
  // Existing fields
  id: string,
  title: string,
  description: string,
  priority: 'high' | 'medium' | 'low',
  category: 'general' | 'cleaning' | 'maintenance' | 'organization',
  estimatedTime: number, // minutes
  dueDate: Timestamp,
  isRecurring: boolean,
  recurringType: 'daily' | 'weekly' | 'monthly',
  recurringDays: number[], // 0-6 for days
  recurringInterval: number,
  status: 'pending' | 'completed' | 'overdue' | 'confirmed',
  assignedTo: 'aupair', // keeping as string for backward compatibility
  createdBy: string, // userId
  completedAt: Timestamp,
  completedBy: string, // userId
  completionNotes: string,
  completionPhotos: string[], // URLs
  
  // New fields for enhanced features
  instructions: {
    richText: string, // HTML from rich text editor
    lastUpdated: Timestamp
  },
  examplePhotos: string[], // URLs of "how we like it done" photos (auto-expire after 2 months)
  difficulty: 'easy' | 'moderate' | 'complex',
  firstTimeHelp: string, // Additional guidance for new au pairs
  preferredTimeOfDay: string, // e.g., "morning", "afternoon", "evening"
  culturalContext: string, // Why this matters to the family
  templateId: string, // Reference to task template if used
  
  // Feedback and communication
  feedback: {
    rating: 'great' | 'good' | 'needs-improvement', // Positive framing
    message: string,
    timestamp: Timestamp,
    givenBy: string // userId
  }[],
  helpRequests: {
    message: string,
    timestamp: Timestamp,
    resolved: boolean,
    response: string
  }[],
  suggestions: {
    message: string,
    timestamp: Timestamp,
    implementedBy: string // userId if accepted
  }[]
};

// Task Template model
const TaskTemplate = {
  id: string,
  familyId: string,
  name: string,
  category: string,
  defaultTitle: string,
  defaultDescription: string,
  defaultInstructions: string,
  defaultDifficulty: 'easy' | 'moderate' | 'complex',
  defaultEstimatedTime: number,
  defaultPriority: 'high' | 'medium' | 'low',
  examplePhotos: string[], // Auto-expire after 2 months
  culturalContext: string, // Contextual - only for relevant tasks
  isSystemTemplate: boolean, // true for pre-built templates
  customizedFrom: string, // templateId if customized from system template
  createdAt: Timestamp,
  updatedAt: Timestamp
};

// Au Pair Experience tracking
const AuPairExperience = {
  userId: string,
  familyId: string,
  joinedAt: Timestamp,
  experienceLevel: 'new' | 'learning' | 'experienced', // Auto-calculated based on completedTasksCount
  completedTasksCount: number,
  learningModeEnabled: boolean, // Au pair can manually toggle
  learningModeAutoDisabled: boolean, // Auto-disabled after task threshold
  taskThresholdForLearning: number, // Default 25 tasks
  languagePreference: 'en' | 'de'
};
```

### Task Breakdown

#### Phase 1: Foundation & Data Model (4 hours)
1. **Extend Firestore Data Model**
   - [ ] Update `householdTodos` collection schema
   - [ ] Create migration script for existing todos
   - [ ] Add new fields with defaults for backward compatibility
   - [ ] Create `taskTemplates` collection
   - [ ] Create `auPairExperience` collection

2. **Set Up Storage Structure**
   - [ ] Configure Firebase Storage folders for photos
   - [ ] Implement image compression utility
   - [ ] Create upload/download helpers
   - [ ] Set up storage security rules

3. **Create Base Services**
   - [ ] Implement `taskTemplateService.js`
   - [ ] Implement `photoStorageService.js`
   - [ ] Enhance `useHouseholdTodos` hook
   - [ ] Create `useAuPairExperience` hook

#### Phase 2: Enhanced Task Creation (6 hours)
4. **Rich Text Instructions**
   - [ ] Install and configure react-quill
   - [ ] Create `TaskInstructions` component
   - [ ] Add rich text editor to `AddTodo` form
   - [ ] Style the editor for mobile
   - [ ] Add image support in instructions

5. **Photo Examples Feature**
   - [ ] Create `ExamplePhotos` component
   - [ ] Add photo upload to `AddTodo` form
   - [ ] Implement photo gallery viewer
   - [ ] Add photo compression
   - [ ] Handle upload progress
   - [ ] Implement 2-month auto-expiration with parent reminder

6. **Task Templates System**
   - [ ] Create 11 default templates focused on childcare/household support
   - [ ] Build `TaskTemplateSelector` component
   - [ ] Build `TaskTemplateEditor` component
   - [ ] Integrate templates into `AddTodo`
   - [ ] Allow template customization
   - [ ] Add contextual "Why this matters" field for relevant tasks

#### Phase 3: Au Pair Experience Enhancement (4 hours)
7. **Task Guidance Features**
   - [ ] Create `DifficultyBadge` component
   - [ ] Create `FirstTimeHelper` component
   - [ ] Enhance `TodoCard` with new fields
   - [ ] Add preferred time indicators
   - [ ] Show cultural context when relevant

8. **Help & Communication System**
   - [ ] Create `HelpRequest` component
   - [ ] Add "Need help?" button to `TodoCard`
   - [ ] Implement help request flow
   - [ ] Create notification for ALL parents in family
   - [ ] Add response mechanism

9. **Learning Mode Implementation**
   - [ ] Track au pair completed tasks count
   - [ ] Auto-calculate experience level based on task count
   - [ ] Show extra guidance for new au pairs
   - [ ] Auto-reduce guidance after 25 completed tasks
   - [ ] Allow au pair to manually toggle learning mode on/off

#### Phase 4: Feedback & Recognition (3 hours)
10. **Positive Feedback System**
    - [ ] Create `FeedbackModal` component
    - [ ] Replace "confirm" with immediate feedback options
    - [ ] Add celebration animation
    - [ ] Store feedback history
    - [ ] Show recent feedback on tasks

11. **Appreciation Features**
    - [ ] Create `AppreciationSummary` component
    - [ ] Generate weekly summaries
    - [ ] Focus on accomplishments, not metrics
    - [ ] Add thank you messages
    - [ ] Include positive highlights

#### Phase 5: Notifications & Polish (3 hours)
12. **Friendly Reminder System**
    - [ ] Implement notification service
    - [ ] Create reminder templates
    - [ ] No quiet hours - notifications can be sent anytime
    - [ ] Implement "How's it going?" check-ins
    - [ ] Test notification delivery

13. **Mobile Optimization**
    - [ ] Optimize all new components for mobile
    - [ ] Test swipe gestures with new features
    - [ ] Ensure photo uploads work on mobile
    - [ ] Verify offline functionality
    - [ ] Performance optimization

14. **Testing & Documentation**
    - [ ] Write unit tests for all new components
    - [ ] Add integration tests
    - [ ] Update user documentation
    - [ ] Create onboarding guide
    - [ ] Record demo video

### Default Task Templates
The system will include 11 pre-built templates focused on childcare and household support:

1. **General cleaning** (with room selection: kitchen, bathroom, living room, etc.)
2. **Tidying kids' rooms** (toys, clothes, books)
3. **Laundry** (kids' clothes, family laundry)
4. **Vacuuming** (mainly kids' areas, playroom)
5. **Dishwasher** (loading/unloading after family meals)
6. **Trash/recycling** (basic household maintenance)
7. **Bed making** (kids' beds, maybe guest room)
8. **Kids' bathroom maintenance** (basic cleaning, restocking)
9. **Kids' closet organization** (seasonal clothes)
10. **Playroom deep clean**
11. **Kids' outdoor toys maintenance**

Templates with contextual "Why this matters" field:
- Tidying kids' rooms
- Laundry
- Kids' bathroom maintenance
- Kids' closet organization

### Per-Task Pseudocode

#### Task 4: Rich Text Instructions
```javascript
// TaskInstructions.js
import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import styles from './TaskInstructions.module.css';

const TaskInstructions = ({ value, onChange, isEditing }) => {
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  if (!isEditing) {
    return (
      <div 
        className={styles.instructionsDisplay}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  return (
    <div className={styles.instructionsEditor}>
      <label className={styles.label}>
        Step-by-Step Instructions (Optional)
        <span className={styles.helper}>
          Help your au pair succeed with clear guidance
        </span>
      </label>
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        placeholder="e.g., 1. Start with the kitchen counters..."
        className={styles.editor}
      />
    </div>
  );
};

// In AddTodo.js enhancement
const [instructions, setInstructions] = useState('');

// In form submission
const todoData = {
  ...existingData,
  instructions: {
    richText: instructions,
    lastUpdated: serverTimestamp()
  }
};
```

#### Task 8: Help Request System
```javascript
// HelpRequest.js
import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import styles from './HelpRequest.module.css';

const HelpRequest = ({ taskId, taskTitle, onClose }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const sendHelpRequest = async () => {
    setSending(true);
    try {
      // Add help request to task
      await updateDoc(doc(db, 'householdTodos', taskId), {
        helpRequests: arrayUnion({
          message,
          timestamp: serverTimestamp(),
          resolved: false,
          response: null
        })
      });

      // Send notification to parents
      await notificationService.sendHelpRequest({
        taskId,
        taskTitle,
        message,
        auPairName: currentUser.displayName
      });

      // Show success message
      toast.success('Your question has been sent! 💬');
      onClose();
    } catch (error) {
      toast.error('Could not send question. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.helpModal}>
      <h3>Need Help with "{taskTitle}"?</h3>
      <p className={styles.subtitle}>
        No question is too small - we're here to help! 😊
      </p>
      
      <textarea
        className={styles.messageInput}
        placeholder="What would you like to know?"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
      />
      
      <div className={styles.actions}>
        <button onClick={onClose} className={styles.cancelBtn}>
          Cancel
        </button>
        <button 
          onClick={sendHelpRequest}
          disabled={!message.trim() || sending}
          className={styles.sendBtn}
        >
          {sending ? 'Sending...' : 'Send Question'}
        </button>
      </div>
    </div>
  );
};
```

### Integration Points
- **Authentication**: Use existing `useAuth` hook
- **Database**: Extend current Firestore operations in `useHouseholdTodos`
- **Storage**: New Firebase Storage integration for photos
- **Notifications**: New Firebase Cloud Functions for friendly reminders
- **State Management**: Local state with existing patterns
- **Error Handling**: Use established error handling patterns
- **i18n**: Integrate with existing internationalization

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
# Ensure >80% coverage for new components
```

### Level 3: Integration Tests
```bash
# Start Firebase emulator
firebase emulators:start --only firestore,auth,storage &
EMULATOR_PID=$!

# Run integration tests
cd web-app && npm run test:integration

# Cleanup
kill $EMULATOR_PID
```

### Level 4: Manual Validation
- [ ] Create task with rich text instructions
- [ ] Upload example photos successfully
- [ ] Au pair can view instructions clearly on mobile
- [ ] "Need help?" sends notification to parent
- [ ] Feedback system shows celebration
- [ ] Templates work correctly
- [ ] Learning mode shows for new au pair
- [ ] Notifications are friendly, not nagging
- [ ] Weekly appreciation summary generates
- [ ] Photos compress properly

## LIBRARY QUIRKS & GOTCHAS

### React Quill
- Must import CSS separately
- Image handling needs custom configuration
- Mobile toolbar can be tricky - use simplified version

### Firebase Storage
- Always validate file types before upload
- Implement proper security rules
- Use resumable uploads for large files
- Clean up orphaned files

### Image Compression
- browser-image-compression works client-side
- Set reasonable max dimensions (1200px)
- Preserve EXIF orientation data

### Notifications
- FCM tokens expire - handle refresh
- iOS requires special permissions
- No quiet hours - notifications can be sent anytime

## ANTI-PATTERNS TO AVOID

### Trust & Relationship
- ❌ NO time tracking or surveillance features
- ❌ NO performance metrics or comparisons
- ❌ NO punitive feedback options
- ❌ NO mandatory fields that feel controlling
- ❌ NO overly detailed activity logs

### Technical
- ❌ Don't store large images uncompressed
- ❌ Don't send notifications during quiet hours
- ❌ Don't make instructions mandatory
- ❌ Don't show experience level publicly
- ❌ Don't break existing task functionality

### UX
- ❌ Avoid patronizing language
- ❌ Don't overwhelm with too many features at once
- ❌ Don't make help requests feel like failure
- ❌ Don't show metrics that create pressure
- ❌ Avoid complex UI on mobile

## FINAL CHECKLIST

### Code Quality
- [ ] All validation loops pass
- [ ] Code follows examples/ patterns
- [ ] Tests achieve >80% coverage
- [ ] No ESLint warnings or errors
- [ ] TypeScript types added where applicable

### Functionality
- [ ] Rich text instructions save and display correctly
- [ ] Photo uploads work on all devices
- [ ] Templates create tasks properly
- [ ] Help requests notify parents
- [ ] Feedback system is positive and encouraging
- [ ] Learning mode adapts to experience
- [ ] Notifications respect preferences
- [ ] All features work on mobile

### User Experience
- [ ] Au pairs feel supported, not monitored
- [ ] Parents can provide guidance easily
- [ ] Instructions are clear without being patronizing
- [ ] System builds trust over time
- [ ] Mobile experience is seamless
- [ ] Features enhance relationship, not harm it

### Performance & Security
- [ ] Photos compress to reasonable size
- [ ] Page load time <2s with images
- [ ] Real-time sync works smoothly
- [ ] Storage costs are manageable
- [ ] Security rules properly restrict access
- [ ] No sensitive data in notifications

### Documentation
- [ ] User guide updated
- [ ] Onboarding flow documented
- [ ] Template examples provided
- [ ] API changes documented
- [ ] Migration guide created

---

*This PRP should be executed using the `execute-prp` command*
*Estimated implementation time: 20 hours*
*Priority: High - Enhances core family-au pair relationship*