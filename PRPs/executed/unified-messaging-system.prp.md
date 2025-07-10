# Product Requirements Prompt (PRP): Unified Messaging System

## Overview
Transform the existing "Notes" feature into a comprehensive "Messages" hub that consolidates all family communication - including family notes, task comments, and direct messaging - into one centralized location with smart organization and clear visual indicators for unanswered questions.

## Current State Analysis

### Problems to Solve
1. **Scattered Communication**: Messages spread across notes, task comments, and help requests
2. **Visibility Issues**: Au pair comments on tasks don't show up for parents
3. **Duplicate Functionality**: Both "comments" and "help requests" exist for similar purposes
4. **No Direct Messaging**: No way for family members to have quick chats outside of tasks
5. **Unclear Question Status**: No clear way to track which questions need responses

### Existing Components to Modify
- `/components/Notes/` - Current family notes system
- `/components/HouseholdTodos/TaskDetailModal.js` - Contains current comment/help request UI
- `/components/HouseholdTodos/TaskFeedback/HelpRequest.js` - Current help request modal
- `/components/BottomNavigation.js` - Need to rename "Notes" to "Messages"

## Desired Outcome

### Core Features
1. **Unified Messages Tab** with three sections:
   - Family Notes (existing announcements/reminders)
   - Task Comments (all task-related communication)
   - Direct Messages (new chat functionality)

2. **Smart Organization**:
   - Unanswered questions always appear first
   - Filter options for Notes, Tasks, and Chats
   - Expandable task context (minimal by default)

3. **Natural Communication**:
   - No message type selection - just write comments
   - Automatic question detection (messages ending with "?")
   - Visual indicators for unanswered questions

### User Experience

#### Messages Tab View
```
Messages [Alert badge if unanswered questions]
├─ [Search Bar]
├─ [Filter: All | Notes | Tasks | Chats]
│
├─ Unanswered Questions (Priority Section)
│  └─ [Task: Clean Kitchen] "Which products for the oven?"
│
├─ Family Notes
│  └─ 📌 "Doctor appointment tomorrow at 3pm"
│
├─ Task Comments
│  └─ [Task: Grocery Shopping] • 1 new
│
└─ Direct Messages
   └─ Maria (Parent) • 3 new messages
```

#### Task Comment Thread (Within Task Detail)
```
💬 Comments
├─ [Au Pair] • 2 hours ago
│  "Which cleaning products should I use for the oven?"
│  [Soft yellow background]
│  [Awaiting response...]
│
├─ [Parent] • 1 hour ago
│  "Use the green bottle under the sink"
│
└─ [Add Comment input field]
```

### Visual Design Requirements
- **Yellow Highlight**: Soft yellow background for unanswered questions
- **"Awaiting response..."**: Text indicator below unanswered questions
- **Alert Badge**: Show count on Messages tab for unanswered questions
- **Minimal Context**: Show only task title initially, expand on tap
- **Material Design 3**: Follow existing MD3 design tokens

## Technical Requirements

### Data Structure
```javascript
// Store in Firestore under family document
{
  messages: {
    familyNotes: { /* existing structure */ },
    
    taskComments: {
      [taskId]: {
        comments: [{
          id: string,
          message: string,
          authorId: string,
          authorName: string,
          authorRole: 'aupair' | 'parent',
          timestamp: serverTimestamp(),
          isQuestion: boolean, // Auto-detect "?"
          hasResponse: boolean,
          seenBy: []
        }]
      }
    },
    
    directMessages: {
      [conversationId]: {
        participants: [],
        messages: [{
          id: string,
          message: string,
          authorId: string,
          timestamp: serverTimestamp(),
          seenBy: []
        }]
      }
    }
  }
}
```

### Implementation Phases

#### Phase 1: Rename & Restructure
1. Rename "Notes" to "Messages" in BottomNavigation
2. Create MessagesPage with three sections
3. Add filter UI (All | Notes | Tasks | Chats)
4. Implement smart ordering (unanswered questions first)

#### Phase 2: Task Comments Integration
1. Remove HelpRequest modal/functionality
2. Simplify TaskDetailModal comment section
3. Add automatic question detection
4. Implement yellow highlight for unanswered questions
5. Add "Awaiting response..." indicator

#### Phase 3: Direct Messaging
1. Create conversation list UI
2. Implement chat interface
3. Add real-time message updates
4. Support group conversations

#### Phase 4: Polish & Migration
1. Add search functionality
2. Implement read/unread indicators
3. Archive old help requests
4. Add expandable task context

### Key Implementation Details

1. **Question Detection**:
```javascript
const isQuestion = message.trim().endsWith('?');
```

2. **Response Detection**:
```javascript
// Mark question as answered when parent comments after it
const updateQuestionStatus = (comments) => {
  comments.forEach((comment, index) => {
    if (comment.isQuestion && !comment.hasResponse) {
      // Check if any parent commented after this
      const hasParentResponse = comments
        .slice(index + 1)
        .some(c => c.authorRole === 'parent');
      comment.hasResponse = hasParentResponse;
    }
  });
};
```

3. **Smart Ordering**:
```javascript
const sortMessages = (messages) => {
  // Unanswered questions first
  const unanswered = messages.filter(m => 
    m.isQuestion && !m.hasResponse
  );
  const others = messages.filter(m => 
    !m.isQuestion || m.hasResponse
  );
  
  return [...unanswered, ...others];
};
```

## Success Criteria
1. All family communication accessible in one place
2. Parents never miss au pair questions
3. Natural conversation flow without type selection
4. Clear visual indicators for pending responses
5. Improved response times to questions
6. Positive user feedback on simplified system

## Dependencies
- Existing family notes functionality
- Current task comment system
- Firebase Firestore for real-time updates
- Material Design 3 components

## Migration Strategy
1. Start fresh - don't migrate old help requests
2. Keep existing family notes as-is
3. New task comments use simplified system
4. Remove help request button from task details
5. Update parent onboarding to explain Messages tab