# 🤖 Claude for FamilySync Web App Development

This document serves as a comprehensive guide for leveraging Claude Code (or any integrated Claude client) to accelerate development, improve code quality, and troubleshoot issues for the `FamilySync` web application. It combines general prompting best practices with specific architectural details of our project.

---

## 🎯 Project Overview & Context for Claude

When interacting with Claude, always provide context about our project.

* **Project Name:** `FamilySync`
* **Purpose:** A web app to help au pair families manage day-to-day organization (calendar, tasks, shopping, notes).
* **Target Users:** Host parents (like Maria) and Au Pairs.
* **Key UX Principles:** Clear, Harmonious, Empowered. **English and German UI support.**
* **Current Development Stage:** Firebase authentication implemented, working on dashboard UI implementation.
* **Design Reference:** See `/design-assets/dashboard-mockup.jpeg` for the target mobile-first UI design.

---

## 🏛️ Architecture

The application follows a cloud-native architecture with:

* **Frontend**: React 19.1.0 web app created with Create React App.
* **Backend**: Firebase platform with:
    * Firestore for NoSQL document storage (currently with temporary permissive rules expiring August 2, 2025).
    * Cloud Functions for serverless logic (Node.js 22 runtime). **Note: The project currently has both TypeScript (`/functions`) and JavaScript (`/familysyncapp`) Firebase Functions directories. Consider consolidating to one.**
    * Firebase Hosting for web app deployment.
    * Data Connect for PostgreSQL integration via GraphQL (instance: `familysyncapp-fdc`, database: `fdcdb`). **Note: The PostgreSQL schema in `/dataconnect/schema/schema.gql` is currently commented out and contains example movie review code. This needs to be replaced with the actual family sync data model.**

---

## 🚀 Commands

### Web Application (in `/web-app` directory)

```bash
cd web-app
npm start          # Start development server on localhost:3000
npm run build      # Build production bundle
npm test           # Run tests in watch mode
Firebase Functions - TypeScript (in /functions directory)

(Assuming this is the preferred future direction)

Bash
cd functions
npm run build      # Compile TypeScript to JavaScript
npm run lint       # Run ESLint
npm run serve      # Start Firebase emulators with functions
npm run deploy     # Deploy functions to Firebase
npm run logs       # View Firebase function logs
Firebase Functions - JavaScript (in /familysyncapp directory)

(To be deprecated/consolidated)

Bash
cd familysyncapp
npm run lint       # Run ESLint
npm run serve      # Start Firebase emulators
npm run deploy     # Deploy functions to Firebase
💡 General Prompting Guidelines for Claude
For best results when interacting with Claude, always provide as much relevant context as possible:

State Your Goal Clearly: What are you trying to achieve?

Specify the Technology: "In React," "using Firebase Firestore," "for a CSS module," "with Firebase Cloud Functions (TypeScript)."

Provide Existing Code: Paste relevant code snippets (components, functions, data structures, firestore.rules).

Describe the Problem: If debugging, paste error messages and explain the unexpected behavior.

Define Desired Output: "Give me the JSX," "Provide a useEffect hook," "Show me the Firebase security rules," "Generate a GraphQL query."

Specify Constraints: "Without using external libraries if possible," "Focus on performance," "Ensure it's responsive," "Ensure GDPR compliance."

🛠️ Common Use Cases & Example Prompts for FamilySync
1. User Authentication & Firebase Setup

Goal: Set up initial Firebase connection in a React component.

Prompt: "I'm setting up my React web app (web-app/src/) to connect to Firebase. I have my firebaseConfig object. Show me how to initialize Firebase and export auth and db (Firestore) instances in src/firebase.js. Then, show how to import and use it in src/App.js to check user authentication status using onAuthStateChanged."

Goal: Implement user signup.

Prompt: "I need a React component (src/components/Signup.js) for user signup. It should have email and password input fields and a 'Sign Up' button. Use Firebase Authentication's createUserWithEmailAndPassword. Include basic state management with useState and error handling with try-catch. Assume auth from firebase.js is imported. Show how to navigate to a dashboard route upon successful signup."

Goal: Implement user login.

Prompt: "Now, create a login component (src/components/Login.js) for my React app. Similar to signup, but using signInWithEmailAndPassword. Show how to handle form submission and redirect to the dashboard."

2. Firestore Database Interaction

Goal: Create a new family document upon user signup.

Prompt: "After a user signs up via Firebase Auth, I need to create a new family document in Firestore and link the user to it. The families collection should have documents with id, name (e.g., 'The [User's Last Name] Family'), and memberUids (an array containing the creator's UID initially). The user's profile document (in users collection) also needs to be updated with this familyId and their role ('Parent'). Show me the React code using firebase/firestore to perform these operations atomically using a batch write or a transaction if necessary."

Goal: Fetch data for the current user's family.

Prompt: "In my React dashboard component, I need to fetch the current user's family data from Firestore. The users collection has a familyId field. How can I use useEffect and onSnapshot (for real-time updates) to get the family document (from families collection) based on the familyId in the user's profile?"

Goal: Add a new calendar event.

Prompt: "I'm building the 'Shared Family Calendar'. Show me a React function that takes title, date (Firebase Timestamp), assignedTo (array of user UIDs), notes, and color and adds it to a calendarEvents subcollection within the current user's family document in Firestore. Ensure appropriate error handling and data validation."

3. UI Components & Styling (React)

Goal: Create a reusable Button component.

Prompt: "Create a simple, reusable React Button component (src/components/Button.js). It should accept onClick, children (text), and a variant prop ('primary', 'secondary', 'danger'). Use basic CSS (e.g., a CSS module Button.module.css) for styling that aligns with a calming, minimalist theme (soft blues, greens, neutrals)."

Goal: Implement a responsive layout for the Dashboard.

Prompt: "Based on our UI mockup, create the main JSX and CSS for the Dashboard component (src/pages/Dashboard.js). Use CSS Grid or Flexbox to arrange the 'My Tasks Today', 'Children's Overview', 'Upcoming Events', 'Family Notes', and 'Shopping List' cards. It should adapt from a single column on mobile screens to multiple columns on larger screens. Provide placeholder content for each card."

Goal: Design a single "Children's Overview Card."

Prompt: "Based on the detailed UI mockup for a single 'Children's Overview Card', create a React component (src/components/ChildOverviewCard.js). It should accept childName, profilePictureUrl, and latestLogEntry as props. Include small buttons for 'Log Nap', 'Log Meal', and 'Log Incident'. Use clean, minimalist CSS."

4. Firebase Data Connect (PostgreSQL & GraphQL)

Goal: Replace the placeholder schema.

Prompt: "I need to replace the commented-out example movie review schema in /dataconnect/schema/schema.gql with our FamilySync data model. I need GraphQL types for User (id, name, email, role, familyId), Family (id, name, memberUids), CalendarEvent (id, title, date, assignedTo, notes, familyId), Task (id, description, dueDate, assignedTo, isCompleted, familyId), ShoppingListItem (id, name, quantity, isPurchased, familyId), and Note (id, text, timestamp, type, familyId, childId if applicable). Show the GraphQL schema definitions, including relationships."

Goal: Query family data via Data Connect.

Prompt: "Assuming the GraphQL schema is set up, show me how to write a GraphQL query in Data Connect to fetch all CalendarEvents for a given familyId. Then, show how to use the generated React SDK (e.g., with TanStack Query bindings as per Firebase Blog) to call this query from my Calendar React component."

5. Firebase Cloud Functions (TypeScript)

Goal: Consolidate to TypeScript functions.

Prompt: "My project has both /functions (TypeScript) and /familysyncapp (JavaScript) Cloud Functions directories. I want to consolidate everything into the TypeScript /functions directory. What are the steps to move the JavaScript functions from /familysyncapp/index.js into /functions/src/index.ts and ensure they are properly transpiled and deployed? Assume both directories have their own package.json."

Goal: Write a simple Cloud Function.

Prompt: "Create a TypeScript Firebase Cloud Function that triggers when a new document is added to the families collection in Firestore. This function should log the new family's name to the console. Show the code for functions/src/index.ts."

6. Security Rules & Testing

Goal: Secure Firestore rules.

Prompt: "My current Firestore rules (firestore.rules) are permissive and expire on August 2, 2025. I need to implement secure rules for production. Show me the firestore.rules that enforce:

Only authenticated users can read/write data.

Users can only read/write documents within their own familyId.

Users can only update their own profile document.
Assume the users and families collections are at the root, and other data (calendar, tasks, shopping, notes) are subcollections under families/{familyId}."

Goal: Write basic React component tests.

Prompt: "I'm using React Testing Library. Show me a simple unit test for my Button component (src/components/Button.js) to ensure it renders correctly and calls the onClick handler when clicked."

⚠️ Key Development Notes (From Your Project)
Dual Functions Directories: The project currently has both TypeScript (/functions) and JavaScript (/familysyncapp) Firebase Functions. Prioritize consolidating to one (TypeScript is recommended) to avoid confusion and simplify maintenance.

Security Rules: Current Firestore rules in /firestore.rules are permissive and expire on August 2, 2025. These must be updated to secure, production-ready rules before expiration. Use request.auth and data validation.

Data Connect Schema: The PostgreSQL schema in /dataconnect/schema/schema.gql is currently commented out and contains example movie review code. This needs to be replaced with the actual FamilySync data model as per your PRD and then deployed for PostgreSQL integration.

React App: The web app (/web-app) still contains the default Create React App template. All application logic defined in the PRD needs to be implemented here.

Node Version: Functions use Node.js 22. Ensure local environment matches.

🧪 Testing
React Tests: Run npm test in the /web-app directory. Aim for good test coverage for components and core logic.

Firebase Functions: No test suites are currently implemented for Firebase Functions. This should be added, especially for critical server-side logic (e.g., using firebase-functions-test).

Firebase Emulators: Use npm run serve (from the functions directory) to test functions and database interactions locally before deploying.

📄 Important Files
/firestore.rules - Database security rules (currently permissive, needs immediate attention).

/dataconnect/schema/schema.gql - PostgreSQL/GraphQL schema (needs implementation).

/web-app/src/ - React application source code.

/functions/src/index.ts - TypeScript Firebase Functions entry point.

/familysyncapp/index.js - JavaScript Firebase Functions entry point (to be consolidated).

/design-assets/dashboard-mockup.jpeg - Mobile-first UI design reference showing card-based layout.

🎨 UI Design Guidelines
Design System: Based on the dashboard mockup in /design-assets/, the FamilySync app follows a mobile-first, card-based design with:

Color Palette: Soft, calming colors with colorful accent cards (orange for work/family events, red for personal, green for other categories)

Layout: Clean card-based design with rounded corners, subtle shadows, and good spacing

Typography: Clean, readable fonts with clear hierarchy

Components:
- Profile pictures throughout for personalization
- Progress indicators and checkboxes for task completion  
- Color-coded event cards for easy categorization
- Bottom navigation with icons (Home, Calendar, Tasks, Messages, Profile)
- Task cards showing assignee profile pictures and completion status

Visual Hierarchy: Clear sections for "My Tasks Today", "Children's Overview", "Upcoming Events", "Family Notes", and "Shopping List"

Responsive Design: Mobile-first approach that adapts to larger screens while maintaining the card-based structure

When implementing UI components, reference the dashboard mockup design for spacing, colors, and visual patterns.