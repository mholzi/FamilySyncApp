export const DashboardStates = {
  FIRST_TIME_NO_CHILDREN: 'first_time_no_children',
  HAS_CHILDREN_NO_TASKS: 'has_children_no_tasks', 
  FULLY_SETUP: 'fully_setup'
};

export const getDashboardState = (userData, children, tasks) => {
  // First time user with no children and hasn't seen welcome screen
  if (!userData?.hasSeenWelcomeScreen && children.length === 0) {
    return DashboardStates.FIRST_TIME_NO_CHILDREN;
  }
  
  // Has children but no tasks yet
  if (children.length > 0 && tasks.length === 0) {
    return DashboardStates.HAS_CHILDREN_NO_TASKS;
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