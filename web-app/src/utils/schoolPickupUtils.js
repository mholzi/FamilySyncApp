/**
 * Utility functions for school pickup person options and labels
 */

export const PICKUP_PERSON_OPTIONS = [
  { value: 'parent', label: 'Parent' },
  { value: 'aupair', label: 'Au Pair' },
  { value: 'alone', label: 'Kid comes home alone' }
];

/**
 * Get the display label for a pickup person value
 * @param {string} value - The pickup person value (parent, aupair, alone)
 * @returns {string} - The display label
 */
export const getPickupPersonLabel = (value) => {
  const option = PICKUP_PERSON_OPTIONS.find(opt => opt.value === value);
  return option ? option.label : 'Au Pair'; // Default fallback
};

/**
 * Convert pickup person value to responsibility value for event system
 * @param {string} pickupPersonValue - The pickup person value (parent, aupair, alone)
 * @returns {string} - The responsibility value for events
 */
export const pickupPersonToResponsibility = (pickupPersonValue) => {
  switch (pickupPersonValue) {
    case 'parent':
      return 'parent';
    case 'aupair':
      return 'au_pair';
    case 'alone':
      return 'aware';
    default:
      return 'au_pair';
  }
};

/**
 * Convert responsibility value to pickup person value
 * @param {string} responsibilityValue - The responsibility value (parent, au_pair, aware)
 * @returns {string} - The pickup person value
 */
export const responsibilityToPickupPerson = (responsibilityValue) => {
  switch (responsibilityValue) {
    case 'parent':
      return 'parent';
    case 'au_pair':
      return 'aupair';
    case 'aware':
      return 'alone';
    default:
      return 'aupair';
  }
};