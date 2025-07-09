# Upcoming Events Section Enhancement - Comprehensive Product Requirements Prompt

*Generated from detailed codebase analysis on July 9, 2025*

## EXECUTIVE SUMMARY

This PRP provides a comprehensive implementation plan for enhancing the FamilySync Upcoming Events section based on deep analysis of the existing codebase. The current implementation in `UpcomingEventsForMe.js` already handles **4 out of 5 event types** with sophisticated aggregation logic, role-based filtering, and real-time synchronization. This enhancement will complete the system by improving calendar event integration, adding missing event types, and optimizing performance.

## GOAL
**What**: Enhance the existing Upcoming Events section (`UpcomingEventsForMe.js`) to provide a complete, high-performance event aggregation and display system that consolidates all family events into a unified timeline view.

**Why**: The current system is 80% complete but has gaps in calendar event integration, performance optimization, and comprehensive event type coverage. Families need a single source of truth for all upcoming activities, responsibilities, and events.

**Success Looks Like**: A seamless, real-time event system that displays all 5 event types with perfect role-based filtering, consistent child color coding, and sub-2-second load times for families with up to 10 children and 50+ daily events.

## DETAILED CODEBASE ANALYSIS FINDINGS

### Current Implementation Status:

#### ✅ **FULLY IMPLEMENTED (4/5 Event Types)**

**1. Daily Routine Events** - `UpcomingEventsForMe.js:218-506`
```javascript
// Real implementation from codebase
const responsibilities = routine.responsibilities || {
  wakeUp: 'au_pair',
  breakfast: 'au_pair', 
  lunch: 'au_pair',
  dinner: 'shared',
  snacks: 'au_pair',
  naps: 'au_pair',
  bedtime: 'parent'
};
```
- **Data Source**: `child.carePreferences.dailyRoutine` from Firestore
- **Role System**: `au_pair`, `parent`, `shared` responsibilities
- **Override Support**: Via `eventOverridesUtils.js` with unique ID system
- **Real-time**: Via `useFamily` hook Firestore listeners

**2. School Pickup Events** - `UpcomingEventsForMe.js:508-595`
```javascript
// Real implementation from codebase
const todayPickupPerson = child.pickupPerson[currentDay];
if (todayPickupPerson === 'parent') {
  pickupTitle = 'School Pickup (Parent)';
  pickupResponsibility = 'parent';
} else if (todayPickupPerson === 'aupair') {
  pickupTitle = 'School Pickup';
  pickupResponsibility = 'au_pair';
} else if (todayPickupPerson === 'alone') {
  pickupTitle = 'School End (Awareness)';
  pickupResponsibility = 'awareness';
}
```
- **Data Source**: `child.schoolSchedule` + `child.pickupPerson` + `child.schoolInfo`
- **Features**: Travel time calculation, awareness-only events for independent children
- **Day-specific**: Different pickup persons per day of week

**3. Recurring Activities** - `UpcomingEventsForMe.js:628-696`
```javascript
// Real implementation from codebase
const occurrences = getNextOccurrences(activity, 3);
occurrences.forEach(occurrence => {
  activity.assignedChildren.forEach(childId => {
    addEventToGroup({
      title: activity.name,
      time: occurrence.time,
      type: 'recurring_activity',
      location: activity.location?.address,
      additionalInfo: activity.requirements?.items?.length > 0 
        ? `Bring: ${activity.requirements.items.filter(Boolean).join(', ')}`
        : activity.requirements?.notes
    });
  });
});
```
- **Data Source**: `recurringActivities` collection with `familyId` query
- **Features**: Advanced recurrence patterns, multi-child assignment, transportation tracking
- **Algorithm**: `getNextOccurrences()` from `recurringActivityTemplates.js`

**4. Babysitting Requests** - `UpcomingEventsForMe.js:698-752`
```javascript
// Real implementation from codebase
const unsubscribe = onSnapshot(
  query(
    collection(db, 'families', familyId, 'timeOffRequests'),
    where('status', '==', 'accepted'),
    where('type', '==', 'babysitting')
  ),
  (snapshot) => {
    const requestsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setBabysittingRequests(requestsData);
  }
);
```
- **Data Source**: `families/{familyId}/timeOffRequests` subcollection
- **Features**: Real-time sync, multi-child support, duration display
- **Filtering**: Only accepted requests, real-time status updates

#### ⚠️ **NOT YET IMPLEMENTED (1/5 Event Types)**

**5. Calendar Events** - Integration Required
```javascript
// Needs integration into UpcomingEventsForMe.js
const { events: calendarEvents, loading, error } = useCalendar(familyId, userId);
```
- **Data Source**: `families/{familyId}/calendar` collection  
- **Current Status**: `useCalendar` hook exists but not integrated into upcoming events
- **Event Types**: Doctor appointments, playdates, meetings, family events
- **Required Integration**: Add as 5th event type with proper filtering and display

#### **DETAILED CALENDAR EVENTS REQUIREMENTS (Based on Clarifications)**

**Data Structure Requirements**:
```javascript
// Calendar event document structure in families/{familyId}/calendar
{
  id: "unique-event-id",
  title: "Doctor Appointment",
  description: "Annual checkup for Emma",
  startTime: Timestamp,
  endTime: Timestamp,
  location: "Pediatric Clinic",
  attendees: ["userId1", "userId2"], // Array of user IDs who should attend
  childrenIds: ["childId1", "childId2"], // Array of child IDs this event relates to
  responsibility: "parent" | "au_pair" | "shared", // Explicit responsibility assignment
  createdBy: "userId",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Access Control**:
- Show events where `attendees.includes(currentUserId)` only
- User must be in attendees array to see the event in upcoming events

**Responsibility & Filtering**:
- Calendar events require explicit `responsibility` field (parent/au_pair/shared)
- "My Events" filter: Hide events where responsibility doesn't match user role
- "All Family Events" filter: Show all calendar events user attends

**Child Association & Color Coding**:
- Events can be assigned to multiple children via `childrenIds` array
- Use existing child color system for multiple overlapping child indicators
- Events with multiple children show overlapping color badges like other event types

**Time Display Consistency**:
- Extract `startTime` only for display (ignore endTime for consistency)
- Format as single time point like other event types (e.g., "2:00 PM")
- Maintain visual consistency across all 5 event types

**Visual Integration**:
- Map calendar events to existing event type styling system
- No custom icons - use existing styling patterns
- Integrate with current event card design seamlessly

**Error Handling**:
- Calendar loading errors show specific message: "Calendar events unavailable"
- Other event types continue to display normally
- Graceful degradation without affecting overall functionality

**Performance & Prioritization**:
- Implement intelligent time-based prioritization
- Closer events get higher priority than distant ones
- Ensure balanced mix of all 5 event types in display
- Prevent calendar events from overwhelming other event types

**Edit Behavior**:
- Parent overrides modify original calendar event (single source of truth)
- Changes affect all children assigned to the event simultaneously
- Integration with existing `eventOverridesUtils.js` system
- No separate editing paths - unified override system

### Role-Based Filtering System:

```javascript
// Real implementation from UpcomingEventsForMe.js:233-246
const shouldShow = (activity, eventData = null) => {
  if (eventFilter === 'all') {
    return true; // Show all family events
  } else {
    if (eventData && eventData.responsibility) {
      return eventData.responsibility === 'au_pair' || eventData.responsibility === 'shared';
    }
    return responsibilities[activity] === 'au_pair' || responsibilities[activity] === 'shared';
  }
};
```

**Role Detection**: `userData?.role` from `useFamily` hook (`'parent'` or `'aupair'`)
**Filter States**: `'my'` (default) or `'all'` via toggle button
**Au Pair View**: Only sees `au_pair` and `shared` events by default
**Parent View**: Sees all au pair events for oversight, with edit capabilities

### Child Color Coding System:

```javascript
// Real implementation from UpcomingEventsForMe.js:20-31
const getChildColor = (childId, index = 0) => {
  if (!childId) return CHILD_COLORS[index % CHILD_COLORS.length];
  
  let hash = 0;
  for (let i = 0; i < childId.length; i++) {
    hash = ((hash << 5) - hash) + childId.charCodeAt(i);
    hash = hash & hash;
  }
  
  const colorIndex = Math.abs(hash) % CHILD_COLORS.length;
  return CHILD_COLORS[colorIndex];
};
```

**8-Color Palette**: Purple, Pink, Amber, Emerald, Blue, Cyan, Violet, Orange
**Hash-Based Assignment**: Ensures consistent colors across all components
**Multi-Child Events**: Overlapping child indicators with individual colors

### Event Override System:

```javascript
// Real implementation from eventOverridesUtils.js
const createEventOverride = async (event, formData) => {
  const overrideId = `${event.type}_${date}_${childId}_${event.time}`;
  const overrideData = {
    eventType: event.type,
    date: date,
    childId: event.children[0]?.child.id || 'all',
    time: event.time,
    newTime: formData.time,
    title: formData.title,
    description: formData.description,
    responsibility: formData.responsibility,
    location: formData.location,
    cancelled: false
  };
  
  await setDoc(doc(db, 'families', familyId, 'eventOverrides', overrideId), overrideData);
};
```

**Collection**: `families/{familyId}/eventOverrides`
**Features**: Time changes, responsibility reassignment, cancellation, location updates
**Real-time**: Immediate application across all users

## SUCCESS CRITERIA

### Functional Requirements:
- [ ] All 5 event types display correctly with proper aggregation
- [ ] Role-based filtering works for both parents and au pairs
- [ ] Real-time updates reflect changes within 500ms
- [ ] Event overrides apply consistently across all event types
- [ ] Child color coding maintains consistency with existing system
- [ ] Events sort chronologically with today's events prioritized
- [ ] Edit functionality works for parents with proper validation
- [ ] Filter toggles work without affecting other Dashboard components

### Performance Requirements:
- [ ] Page load time < 2 seconds for event aggregation
- [ ] Handles families with 10+ children and 50+ daily events
- [ ] Memory usage remains stable during extended use
- [ ] Real-time listeners don't cause excessive re-renders
- [ ] Event grouping reduces displayed event count appropriately

### Technical Requirements:
- [ ] Uses existing Firestore collections and data structures
- [ ] Maintains compatibility with existing `useFamily` hook
- [ ] Follows existing error handling patterns
- [ ] Integrates with existing `EditEventModal` component
- [ ] Uses existing child color system implementation

## SPECIFIC IMPLEMENTATION REQUIREMENTS

### 1. **Calendar Events Integration Fix**

**Current Issue**: `useCalendar` hook limits to 5 events
**Location**: `web-app/src/hooks/useCalendar.js`

**Required Changes**:
```javascript
// Remove the limit parameter and fetch all relevant events
const { activities, loading } = useCalendar(familyId, userId); // Remove limit of 5

// Modify useCalendar to return family-wide events, not just attendee events
const eventsQuery = query(
  collection(db, 'calendarEvents'),
  where('familyId', '==', familyId),
  where('startTime', '>=', startOfToday()),
  orderBy('startTime', 'asc')
);
```

**Data Source**: `calendarEvents` collection (root-level)
**Query**: Remove attendee filter, add family-wide access
**Integration**: Connect with existing event card rendering

### 2. **Performance Optimization**

**Current Issue**: Large families may experience slow load times
**Solution**: Implement pagination and caching

**Required Changes**:
```javascript
// Add pagination to event aggregation
const MAX_EVENTS_PER_TYPE = 20;
const MAX_TOTAL_EVENTS = 50;

// Implement event caching with staleness check
const eventCache = useMemo(() => {
  return groupEventsByType(allEvents);
}, [allEvents]);
```

**Locations**: `UpcomingEventsForMe.js`, `useCalendar.js`
**Patterns**: Follow existing `useFamily` hook caching patterns

### 3. **Event Grouping Enhancement**

**Current Implementation**: Basic grouping by title/time/type
**Enhancement**: Smart grouping with performance optimization

**Required Changes**:
```javascript
// Enhanced grouping logic from UpcomingEventsForMe.js:181-216
const addEventToGroup = (eventData) => {
  const groupKey = `${finalEvent.title}-${finalEvent.time}-${finalEvent.type}-${finalEvent.isToday}`;
  
  if (eventGroups.has(groupKey)) {
    const existingGroup = eventGroups.get(groupKey);
    const childExists = existingGroup.children.some(childData => childData.child.id === finalEvent.child.id);
    
    if (!childExists) {
      existingGroup.children.push({
        child: finalEvent.child,
        childColor: finalEvent.childColor
      });
    }
  } else {
    eventGroups.set(groupKey, {
      ...finalEvent,
      children: [{ child: finalEvent.child, childColor: finalEvent.childColor }],
      id: groupKey
    });
  }
};
```

**Enhancement**: Add duplicate detection, optimize memory usage
**Performance**: Reduce render cycles through efficient grouping

## CURRENT CODEBASE INTEGRATION POINTS

### Data Sources (Confirmed via Analysis):
1. **Daily Routines**: `child.carePreferences.dailyRoutine` (useFamily hook)
2. **School Pickups**: `child.schoolSchedule` + `child.pickupPerson` (useFamily hook)
3. **Calendar Events**: `calendarEvents` collection (useCalendar hook)
4. **Recurring Activities**: `recurringActivities` collection (direct query)
5. **Babysitting Requests**: `families/{familyId}/timeOffRequests` (real-time listener)

### Existing Components to Extend:
- **Main Component**: `UpcomingEventsForMe.js` - enhance, don't replace
- **Event Cards**: Reuse existing event card rendering logic
- **Edit Modal**: `EditEventModal.js` - already integrated and working
- **Error Handling**: `ErrorBoundary.js` - already implemented

### Hooks and Utilities:
- **Data Fetching**: `useFamily.js` - already provides child and family data
- **Calendar Integration**: `useCalendar.js` - needs modification to remove limits
- **Event Overrides**: `eventOverridesUtils.js` - fully implemented system
- **Color System**: Hash-based child color assignment - maintain consistency

## IMPLEMENTATION BLUEPRINT

### Phase 1: Calendar Events Integration (3 hours)
**Goal**: Integrate calendar events as the 5th event type with proper filtering and display

**Tasks**:
1. Integrate `useCalendar` hook into `UpcomingEventsForMe.js` component
2. Add calendar events to main event aggregation logic
3. Implement attendee-based filtering (show only if user in attendees array)
4. Add responsibility-based role filtering
5. Implement multi-child color coding for calendar events
6. Add time-based prioritization to prevent calendar event overflow
7. Integrate with existing override system for parent editing
8. Add error handling with specific calendar error messages

**Code Changes**:
```javascript
// In UpcomingEventsForMe.js
const { events: calendarEvents, loading: calendarLoading, error: calendarError } = useCalendar(familyId, userId);

// Add calendar events to event aggregation
calendarEvents.forEach(event => {
  // Filter by attendees
  if (!event.attendees?.includes(userId)) return;
  
  // Apply role-based filtering
  const shouldShow = () => {
    if (eventFilter === 'all') return true;
    return event.responsibility === userRole || event.responsibility === 'shared';
  };
  
  if (shouldShow()) {
    // Process each assigned child for color coding
    if (event.childrenIds && event.childrenIds.length > 0) {
      event.childrenIds.forEach(childId => {
        const child = children.find(c => c.id === childId);
        if (child) {
          addEventToGroup({
            title: event.title,
            time: formatTime(event.startTime), // Extract start time only
            minutes: timeToMinutes(formatTime(event.startTime)),
            child: child,
            childColor: getChildColor(child.id),
            type: 'calendar_event',
            isToday: isToday(event.startTime),
            description: event.description,
            location: event.location,
            responsibility: event.responsibility,
            originalResponsibility: event.responsibility
          });
        }
      });
    }
  }
});
```

### Phase 2: Performance Optimization (2 hours)
**Goal**: Optimize for families with many children and events

**Tasks**:
1. Implement event pagination with "Show More" functionality
2. Add memoization for expensive calculations
3. Optimize real-time listener queries
4. Add event caching with staleness detection

**Code Changes**:
```javascript
// In UpcomingEventsForMe.js
const [showAllEvents, setShowAllEvents] = useState(false);
const displayedEvents = showAllEvents ? allEvents : allEvents.slice(0, 15);

const memoizedEvents = useMemo(() => {
  return aggregateAllEvents(children, activities, recurringActivities, babysittingRequests);
}, [children, activities, recurringActivities, babysittingRequests]);
```

### Phase 3: Enhanced Error Handling (1 hour)
**Goal**: Add comprehensive error handling for edge cases

**Tasks**:
1. Handle missing child data gracefully
2. Add network failure recovery
3. Implement fallback states for each event type
4. Add loading states for individual event types

**Code Changes**:
```javascript
// Enhanced error handling
const [eventErrors, setEventErrors] = useState({});

const handleEventError = (eventType, error) => {
  setEventErrors(prev => ({ ...prev, [eventType]: error.message }));
};
```

### Phase 4: Testing and Validation (1 hour)
**Goal**: Ensure all functionality works correctly

**Tasks**:
1. Test role-based filtering with different user roles
2. Validate real-time updates across multiple browser tabs
3. Test event overrides for all event types
4. Verify child color consistency

## VALIDATION REQUIREMENTS

### Automated Testing:
```bash
# Run validation commands
cd web-app
npm run lint
npm test -- --testPathPattern=UpcomingEvents --coverage --watchAll=false
npm run build

# Firebase emulator testing
firebase emulators:start --only firestore,auth
```

### Manual Testing Checklist:
- [ ] All 5 event types display correctly for both parents and au pairs
- [ ] Role-based filtering works with "My Events" and "All Family Events"
- [ ] Real-time updates work when events change in other tabs
- [ ] Event overrides apply correctly and persist
- [ ] Child color coding is consistent across all event cards
- [ ] Performance is acceptable with 10+ children and 50+ events
- [ ] Error states display appropriately for network failures
- [ ] Edit functionality works for parents with proper validation

## SPECIFIC ANSWERS TO CLARIFICATION QUESTIONS

### Q1: Event Data Sources
**Answer**: All 5 event types have existing data sources in Firestore:
- Daily Routines: `child.carePreferences.dailyRoutine`
- School Pickups: `child.schoolSchedule` + `child.pickupPerson`
- Calendar Events: `calendarEvents` collection (needs query modification)
- Recurring Activities: `recurringActivities` collection
- Babysitting Requests: `families/{familyId}/timeOffRequests`

### Q2: Role Detection
**Answer**: User role is determined via `userData?.role` from `useFamily` hook:
- Values: `'parent'` or `'aupair'`
- Storage: `users` collection in Firestore
- Fallback: Infer from `familyData.parentUids.includes(user.uid)`

### Q3: Event Override Storage
**Answer**: Event overrides use existing `families/{familyId}/eventOverrides` collection:
- Unique ID format: `${eventType}_${date}_${childId}_${time}`
- Real-time updates via Firestore listeners
- Override application via `eventOverridesUtils.js`

### Q4: Child Color System
**Answer**: Hash-based color assignment in `UpcomingEventsForMe.js:20-31`:
- 8-color palette with primary and light variants
- Consistent across all components
- Uses child ID for hash calculation

### Q5: Event Limit and Expansion
**Answer**: Current implementation shows unlimited events by default:
- No hard pagination currently implemented
- Events are time-filtered (only future events)
- Can add "Show More" functionality for families with many events

### Q6: Filter Persistence
**Answer**: Filter selection resets on page refresh:
- Current implementation uses local state
- Could be enhanced to persist in localStorage
- Default filter is role-based ("My Events" for au pairs, au pair oversight for parents)

## IMPLEMENTATION TIMELINE

**Total Estimated Time**: 7 hours
**Complexity**: Medium (integrating new event type into existing system)
**Risk Level**: Low (building on proven architecture)

### Breakdown:
- **Phase 1**: Calendar Events Integration (3 hours) - **PRIMARY FOCUS**
- **Phase 2**: Performance Optimization (2 hours)
- **Phase 3**: Enhanced Error Handling (1 hour)
- **Phase 4**: Testing and Validation (1 hour)

### Dependencies:
- No new npm packages required
- No breaking changes to existing components
- Maintains compatibility with existing hooks and utilities
- Uses existing Firebase configuration and security rules

## FINAL VALIDATION CHECKLIST

### Code Quality:
- [ ] All validation loops pass without errors
- [ ] Code follows existing patterns in `UpcomingEventsForMe.js`
- [ ] No modification to existing working functionality
- [ ] Maintains compatibility with existing components

### Functionality:
- [ ] All 5 event types display correctly
- [ ] Role-based filtering works for both user types
- [ ] Real-time updates work across multiple tabs
- [ ] Event overrides apply consistently
- [ ] Child color coding maintains consistency
- [ ] Performance meets requirements (<2s load time)

### Integration:
- [ ] Uses existing Firestore collections and data structures
- [ ] Integrates with existing `useFamily` and `useCalendar` hooks
- [ ] Maintains compatibility with `EditEventModal` component
- [ ] Follows existing error handling patterns

---

*This comprehensive PRP is based on detailed analysis of the existing FamilySync codebase and provides specific implementation guidance for completing the Upcoming Events system while maintaining full compatibility with existing functionality.*

*Estimated implementation time: 6 hours*
*Risk level: Low - building on proven architecture*
*Breaking changes: None - purely additive enhancements*