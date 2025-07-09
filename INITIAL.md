# Au Pair-Friendly Chore Assignment System - Initial Requirements

## FEATURE
Enhance the existing Household Todos system to better support the parent-au pair relationship by providing helpful guidance for new au pairs while respecting their autonomy. Focus on clear task instructions, optional photo examples, gentle reminders, and constructive feedback mechanisms that foster trust and learning rather than micromanagement.

### User Story
As a parent, I want to provide clear, helpful guidance to my au pair (especially when they're new) through detailed task instructions and visual examples, while maintaining a respectful and trusting relationship. The system should help au pairs succeed without feeling overly monitored or micromanaged.

### Detailed Requirements
1. **Guidance-Focused Task Creation**
   - Rich text instructions with step-by-step guidance (optional)
   - "How we like it done" photo examples (uploaded by parents)
   - Difficulty indicators (easy/moderate/complex) to help au pairs prioritize
   - "First time doing this?" helpful tips section
   - Preferred time of day/week for specific tasks

2. **Task Templates with Cultural Context**
   - Pre-built templates for common household chores with customizable instructions
   - Include cultural/family-specific preferences (e.g., "We use this specific cleaning product")
   - "Why this matters to our family" context field
   - Seasonal task templates (spring cleaning, holiday prep, etc.)

3. **Supportive Completion Process**
   - Optional photo upload for au pair to show completion or ask questions
   - "Need help?" button to request clarification without feeling judged
   - Positive feedback mechanism (beyond just "confirmed")
   - Learning mode for first 30 days with extra guidance

4. **Trust-Building Features**
   - Au pair can suggest task improvements or efficiency tips
   - Collaborative task notes (both parties can add helpful hints)
   - "Great job!" recognition system (not surveillance)
   - Monthly check-in prompts for process improvements

5. **Gentle Reminders & Communication**
   - Friendly reminder notifications (not nagging)
   - "How's it going?" check-ins for complex tasks
   - Thank you messages upon completion
   - Weekly appreciation summary (tasks completed, not performance metrics)

### Success Criteria
- [ ] Au pairs report feeling supported, not micromanaged
- [ ] Task instructions are clear enough for new au pairs to succeed
- [ ] Photo examples help clarify expectations without being prescriptive
- [ ] Communication features encourage questions and feedback
- [ ] The system builds trust over time (less guidance needed as au pair gains experience)
- [ ] Parents feel confident tasks are understood without constant checking
- [ ] Mobile-first design works well for au pairs on the go

---

## EXAMPLES
<!-- Reference existing code patterns -->

### Patterns to Follow
- Component structure: See `examples/components/Dashboard.example.js`
- Firebase operations: See `examples/firebase/firestore.example.js` 
- Service layer: See `examples/services/taskService.example.js`
- Error handling: See `examples/patterns/error-handling.example.js`
- Testing patterns: See `examples/testing/component.test.example.js`

### Similar Features in Codebase
- Current implementation: `web-app/src/components/HouseholdTodos/`
- Task cards: `web-app/src/components/HouseholdTodos/TodoCard.js`
- Add task form: `web-app/src/components/HouseholdTodos/AddTodo.js`
- Data fetching: `web-app/src/hooks/useHouseholdTodos.js`
- Shopping list integration: `web-app/src/components/Shopping/ShoppingListTaskCard.js`

### UI/UX Reference
- Maintain current card-based design with swipe gestures
- Follow existing color scheme for priorities (red=high, yellow=medium, blue=low)
- Keep mobile-first approach with touch-friendly interactions

---

## DOCUMENTATION
### External Documentation
- Firebase Storage for photos: https://firebase.google.com/docs/storage/web/upload-files
- Firebase Cloud Messaging: https://firebase.google.com/docs/cloud-messaging
- React Chart.js for analytics: https://react-chartjs-2.js.org/
- Image compression: https://www.npmjs.com/package/browser-image-compression

### Internal Documentation
- Current task data model: See Firestore `householdTodos` collection
- Architecture overview: See CLAUDE.md section "Architecture"
- Security requirements: See SECURITY_ASSESSMENT.md
- UI Guidelines: See CLAUDE.md section "UI Design Guidelines"

### Relevant PRDs/Specs
- Original household todos implementation
- Dashboard design mockup: `/design-assets/dashboard-mockup.jpeg`

---

## OTHER CONSIDERATIONS

### Known Gotchas
- **Photo storage**: Need to implement proper image compression to manage storage costs
- **Cultural sensitivity**: Task instructions should avoid being prescriptive or condescending
- **Trust balance**: Too many "helpful" features might feel like surveillance
- **New vs experienced au pairs**: System needs to adapt to experience level
- **Notification fatigue**: Balance between helpful reminders and annoying notifications

### Security Requirements
- [ ] User must be authenticated
- [ ] User can only access their family's tasks
- [ ] Photo uploads must validate file type and size (both parent examples and au pair completion photos)
- [ ] Au pair feedback/suggestions remain within family
- [ ] Task history respects privacy (no detailed tracking beyond completion)

### Performance Requirements
- Photo uploads: < 5 seconds for 5MB image (parent examples and au pair photos)
- Task list: Handle 100+ active tasks smoothly
- Real-time updates: < 500ms sync latency
- Notification delivery: < 30 seconds delay

### Testing Requirements
- [ ] Unit tests for all new components
- [ ] Integration tests for task assignment logic
- [ ] E2E test for photo upload flow
- [ ] Performance tests for analytics queries
- [ ] Manual testing on iOS and Android devices

### Accessibility Requirements
- [ ] Task assignment dropdown is keyboard navigable
- [ ] Analytics charts have text alternatives
- [ ] Photo upload supports screen readers
- [ ] Color-blind friendly priority indicators

### Internationalization
- [ ] All new UI text uses i18n keys
- [ ] Task template names are translatable
- [ ] Date/time formatting respects locale
- [ ] Photo upload instructions in German and English

### Error Handling
User-friendly error messages for:
- Photo upload failures (size, network, format) - "Photo couldn't upload, but your task is saved!"
- Task creation errors - with helpful suggestions
- Notification delivery failures - graceful degradation
- "Need help?" request failures - alternative contact method provided

### Edge Cases
1. What happens when au pair leaves the family? - Graceful task reassignment
2. How to handle language barriers? - Consider multi-language support for instructions
3. What if au pair is overwhelmed with tasks? - Workload indicators
4. How to onboard a new au pair mid-contract? - Transfer learning/preferences
5. What about offline functionality for au pairs with limited data?

### Dependencies
- New npm packages needed: 
  - `browser-image-compression` for photo optimization
  - `react-quill` or similar for rich text instructions
  - `date-fns` for better date handling
  - `react-confetti` for celebrations (optional fun element)
- Firebase services required: 
  - Firebase Storage for instruction photos and completion photos
  - Cloud Functions for friendly notifications
- Environment variables: None new required

### Migration Strategy
1. Add new fields to existing tasks (instructions, example photos, difficulty)
2. Grandfather existing tasks with minimal required fields
3. Prompt parents to enhance frequently used tasks
4. Au pair experience level tracked from join date

### Rollback Plan
- Feature flag: `enableEnhancedChoreAssignment`
- Data migration reversible: Yes (keep original assignedTo field)
- Backward compatibility maintained: Yes

---

## VALIDATION CHECKLIST

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
- [ ] Au pair finds task instructions clear and helpful
- [ ] Parent can add example photos easily
- [ ] "Need help?" feature feels supportive, not judgmental
- [ ] Notifications are friendly and timely
- [ ] New au pair onboarding experience is smooth
- [ ] Trust-building features encourage collaboration
- [ ] Mobile experience is seamless for au pairs
- [ ] System adapts to au pair experience level over time

### Integration Points
- [ ] Authentication flow integrated
- [ ] Real-time sync working
- [ ] Photo storage integrated properly (examples and completion)
- [ ] Notifications respect preferences and quiet hours
- [ ] Positive feedback system integrated with UI

---

## NOTES

### Open Questions
1. Should we track au pair experience level automatically or let parents set it?
2. How many task templates should we start with? (10-15 common household tasks?)
3. Should "Need help?" requests go to all parents or just task creator?
4. Do we need quiet hours for notifications (e.g., no reminders after 8pm)?
5. Should example photos expire/update seasonally?

### Assumptions
1. Parents want to help au pairs succeed, not micromanage
2. Au pairs appreciate guidance, especially when new
3. Photo examples are helpful but optional
4. Positive reinforcement is more effective than criticism
5. Trust grows over time and the system should reflect this

### Out of Scope
1. Performance metrics or surveillance features
2. Punitive measures or negative feedback systems
3. Time tracking or productivity monitoring
4. Comparison between different au pairs
5. Integration with au pair agency systems

---

*Template Version: 1.0*
*Based on Context Engineering principles from https://github.com/coleam00/context-engineering-intro*