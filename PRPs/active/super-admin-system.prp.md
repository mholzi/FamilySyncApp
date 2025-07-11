# Super Admin System

## Context
The FamilySync platform needs a dedicated super admin interface for platform monitoring. This system will be completely separate from the regular au pair/family interface but will follow the same Material Design 3 patterns for consistency.

## Goal
Create a minimal super admin system that allows the platform owner (mholzi@gmail.com) to log in securely and view basic platform statistics in real-time.

## Requirements

### 1. Authentication
- Create a dedicated login page at `/superadmin` route
- Implement email/password authentication using Firebase Auth
- Restrict access to only the super admin email (mholzi@gmail.com)
- Use Firebase custom claims to identify super admin role
- Implement proper session management
- Add logout functionality

### 2. Statistics Dashboard
Create a simple dashboard that displays the following metrics in real-time:
- Total number of registered users
- Total number of active families  
- Total number of au pairs
- Total number of host parents

Each statistic should:
- Be displayed in a Material Design 3 card
- Update in real-time using Firestore listeners
- Show loading states while fetching data
- Handle errors gracefully

### 3. Security
- Verify super admin role on every request
- Implement rate limiting on login attempts
- Ensure complete isolation from regular user routes
- Store admin credentials securely in Firebase
- Provide read-only access to statistics

### 4. UI/UX Requirements
- Follow existing Material Design 3 patterns from the main app
- Use the same color scheme from DesignSystem.css
- Ensure mobile-responsive design
- Implement proper loading and error states
- Maintain consistent spacing and layout with existing components

## Implementation Guidelines

### Code Structure
```
web-app/src/
├── components/
│   └── SuperAdmin/
│       ├── SuperAdminLogin.js
│       ├── SuperAdminDashboard.js
│       └── StatisticCard.js
├── hooks/
│   └── useSuperAdminAuth.js
└── pages/
    └── SuperAdminPage.js
```

### Firebase Setup
1. Add custom claim for super admin role
2. Create security rules to protect admin data
3. Set up environment variable: `REACT_APP_SUPER_ADMIN_EMAIL=mholzi@gmail.com`

### Routing
- Add route protection to ensure only authenticated super admins can access
- Redirect unauthorized users to main app login
- Implement proper 404 handling for admin routes

## Technical Specifications

### Authentication Flow
1. User navigates to `/superadmin`
2. If not authenticated, show login form
3. On login, verify email matches REACT_APP_SUPER_ADMIN_EMAIL
4. Set custom claim in Firebase Auth
5. Redirect to dashboard on successful authentication

### Data Queries
Use Firestore to count:
- Users: Query 'users' collection
- Families: Query 'families' collection  
- Au Pairs: Filter users by role
- Host Parents: Filter users by role

Implement efficient aggregation queries to minimize read operations.

### Error Handling
Handle these scenarios:
- Invalid login credentials
- Network failures
- Firebase connection issues
- Unauthorized access attempts

## Testing Requirements
- Unit tests for login component
- Unit tests for dashboard and statistics
- Integration tests for Firebase authentication
- Security tests for role-based access control

## Validation Checklist
- [ ] Super admin can log in at /superadmin with correct credentials
- [ ] Login fails with incorrect credentials
- [ ] Dashboard displays all four statistics accurately
- [ ] Statistics update in real-time when data changes
- [ ] Regular users cannot access /superadmin routes
- [ ] Mobile responsive design works correctly
- [ ] Logout functionality clears session properly
- [ ] All Material Design 3 patterns are followed
- [ ] No console errors or warnings
- [ ] Loading states display during data fetching
- [ ] Error states handle failures gracefully

## Examples to Follow
- Authentication: `web-app/src/components/Auth/AuthWrapper.js`
- Dashboard layout: `web-app/src/components/Dashboard.js`
- Card components: `web-app/src/components/Shopping/ShoppingListCard.js`
- Firebase hooks: `web-app/src/hooks/useAuth.js`
- Material Design patterns: Existing components throughout the app

## Out of Scope
- User management features
- Family management features  
- System monitoring beyond basic stats
- Audit trails
- Multi-factor authentication
- Any write operations to user/family data