export const DashboardStates = {
  WELCOME: 'welcome',
  SETUP_CHILDREN: 'setup_children',
  FIRST_TIME_NO_CHILDREN: 'first_time_no_children',
  HAS_CHILDREN_NO_TASKS: 'has_children_no_tasks', 
  FULLY_SETUP: 'fully_setup'
};

export const getDashboardState = (userData, familyData, children, familyLoading, userRole) => {
  // Add null checks for arrays
  const childrenArray = children || [];
  
  // If still loading, return a default state
  if (familyLoading) {
    return DashboardStates.FULLY_SETUP;
  }
  
  // First time user with no children and hasn't seen welcome screen
  if (!userData?.hasSeenWelcomeScreen && childrenArray.length === 0) {
    return DashboardStates.WELCOME;
  }
  
  // Parent users need to set up children first
  if (childrenArray.length === 0 && userRole === 'parent') {
    return DashboardStates.SETUP_CHILDREN;
  }
  
  // Fully set up
  return DashboardStates.FULLY_SETUP;
};

export const COMMON_ALLERGIES = [
  'nuts', 'peanuts', 'tree nuts', 'shellfish', 'fish', 
  'milk', 'dairy', 'lactose', 'eggs', 'soy', 'wheat', 
  'gluten', 'sesame', 'kiwi', 'strawberries'
];

export const COMMON_MEDICATIONS = [
  'inhaler', 'albuterol', 'epipen', 'epinephrine',
  'vitamins', 'iron', 'calcium', 'probiotics',
  'tylenol', 'ibuprofen', 'antihistamine'
];

export const filterSuggestions = (input, suggestions) => {
  if (!input.trim()) return [];
  return suggestions.filter(item => 
    item.toLowerCase().includes(input.toLowerCase())
  ).slice(0, 5);
};