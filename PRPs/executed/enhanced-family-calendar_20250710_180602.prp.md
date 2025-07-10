# Enhanced Family Calendar System

## CONTEXT
The FamilySync app needs a comprehensive calendar system that serves as the central coordination hub for all family activities, routines, and schedules. The calendar must intelligently balance the needs of parents, au pairs, and children while providing smart scheduling assistance and conflict resolution.

### Current State
- Basic day view calendar exists with timeline display
- Event cards show child indicators and categories
- Limited to single day navigation
- No agenda or multi-child views
- Basic event creation and editing

### User Needs
**Parents need to:**
- View and manage all family schedules across multiple children
- Receive notifications when au pairs modify events
- Identify scheduling conflicts and find family time
- Manage school schedules and holidays

**Au pairs need to:**
- Clearly see daily responsibilities with timely reminders
- Understand morning coordination and transportation logistics
- Create and modify events with parent awareness
- Receive preparation time alerts

**Families need:**
- Intelligent scheduling that respects routines and free time
- Visual clarity on who's responsible for what
- Flexible system that handles exceptions and changes
- Real-time synchronization across all users

## REQUIREMENTS

### Core Views
1. **Enhanced Day View**
   - Maintain existing timeline (7 AM - 9 PM adaptive)
   - Tap on timeline to create events at specific times
   - Show conflicts with red borders (allow but warn)
   - Reuse existing event modals from dashboard

2. **Agenda/List View**
   - Show today and tomorrow chronologically
   - Expandable cards: Time + Title + Responsibility indicator
   - Filters for responsibility (au pair/parent/school) and specific children
   - Compact by default, tap to expand for full details

3. **Multi-child Overlay View**
   - Same timeline with different child colors overlaid
   - Use child name circles from upcoming events cards
   - Highlight scheduling conflicts automatically
   - Different use cases per role:
     - Au pairs: Morning coordination & transportation
     - Parents: Conflict identification, family time, transportation

### Event Management
- **Color Coding**: By child (using existing name circles)
- **Permissions**: Au pairs have full create/edit rights
- **Notifications**: Parents notified when au pairs modify events
- **Conflicts**: Allow but show with red borders
- **Creation**: Tap timeline to create at that time
- **Editing**: Reuse existing modals from upcoming events

### Recurring Events
- Support monthly patterns (1st Monday, 15th, etc.)
- Allow single occurrence modifications
- Skip/cancel specific dates
- Add end dates to all recurring events
- Integrate with child profile recurring activities

### School Schedule Enhancement
- Add holiday management section in School Schedule tab
- Named holidays with date ranges (e.g., "Summer Holiday: July 1 - Aug 31")
- Hide school events completely during holiday periods
- Maintain existing school schedule functionality

### Notifications & Reminders
- 15-minute reminders for routine events (au pairs)
- Slide-in alerts from the right side of screen
- Parent notifications for any au pair modifications
- No complex smart reminders - keep it simple

### Technical Requirements
- **Performance**: Load in <2 seconds (focus on today/tomorrow)
- **Sync**: Instant real-time updates via Firestore
- **Loading**: Current week as base unit, fetch more as needed
- **Offline**: No offline support required
- **Integration**: Self-contained, no external calendar sync

## DESIGN DECISIONS

1. **No External Integration**: Keep calendar within FamilySync only
2. **Trust-Based Permissions**: Au pairs can edit everything, parents notified
3. **Visual Simplicity**: Child colors, red conflict borders, clean layouts
4. **Reuse Components**: Use existing event modals and UI patterns
5. **Mobile-First**: Touch-friendly with tap-to-create
6. **Real-Time Focus**: Instant sync, no offline mode

## IMPLEMENTATION PRIORITIES

### Phase 1: Core Enhancements
1. Enhance day view with tap-to-create
2. Add conflict visualization (red borders)
3. Implement parent notifications for changes
4. Add 15-minute slide-in reminders

### Phase 2: New Views
1. Build Agenda view (today/tomorrow)
2. Add filters for responsibility and children
3. Implement expandable card design
4. Create multi-child overlay view

### Phase 3: Advanced Features
1. Add school holiday management to child profiles
2. Enhance recurring events with end dates
3. Implement monthly recurrence patterns
4. Complete real-time sync optimization

## SUCCESS METRICS

- Calendar loads in <2 seconds with 100+ events
- Au pairs receive reminders 15 minutes before events
- Parents notified within 5 seconds of changes
- Zero data conflicts with instant sync
- 90% of events created with single tap
- Reduced scheduling conflicts by 50%

## RISKS & MITIGATIONS

**Risk**: Performance with many events
- **Mitigation**: Focus loading on today/tomorrow, progressive fetch

**Risk**: Notification overload
- **Mitigation**: Simple rules - only routine reminders and modifications

**Risk**: Complex UI overwhelming users
- **Mitigation**: Reuse familiar patterns, progressive disclosure

**Risk**: Conflicting real-time edits
- **Mitigation**: Last write wins with instant sync

## VALIDATION

### Automated Tests
- Unit tests for date calculations and conflict detection
- Integration tests for Firestore sync
- Performance tests with 500+ events
- Accessibility audit for all views

### Manual Validation
- Create events in all categories
- Test conflict warnings
- Verify notification timing
- Check responsive design
- Validate with real family scenarios

## FUTURE ENHANCEMENTS

- External calendar integration (Google, Apple)
- AI-powered schedule optimization
- Attendance tracking
- Budget integration for activities
- Multi-timezone support for traveling families

---

*Generated from initial_calendar.md on 2025-01-10*