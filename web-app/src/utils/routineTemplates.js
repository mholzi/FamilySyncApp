// Age-appropriate routine templates for different child age groups
export const ROUTINE_TEMPLATES = {
  infant: {
    id: 'infant-standard',
    name: 'Infant (0-12 months)',
    description: 'Typical routine for babies with frequent feeding and naps',
    ageRange: { min: 0, max: 1 },
    dailyRoutine: {
      wakeUpTime: '06:00',
      bedtime: '19:00',
      mealTimes: {
        breakfast: '06:30',
        lunch: ['11:30'],
        dinner: '17:00',
        snacks: ['09:00', '14:00', '16:00']
      },
      napTimes: [
        { startTime: '08:30', duration: 45, isFlexible: true },
        { startTime: '12:30', duration: 90, isFlexible: true },
        { startTime: '15:30', duration: 45, isFlexible: true }
      ],
      freePlayPeriods: [
        { startTime: '07:30', duration: 60, activities: ['tummy_time', 'sensory'] },
        { startTime: '10:00', duration: 30, activities: ['interactive', 'music'] },
        { startTime: '14:00', duration: 30, activities: ['outdoor', 'exploration'] }
      ],
      responsibilities: {
        wakeUp: 'au_pair',
        breakfast: 'au_pair',
        lunch: 'au_pair',
        dinner: 'shared',
        snacks: 'au_pair',
        naps: 'au_pair',
        bedtime: 'parent'
      }
    }
  },
  
  toddler: {
    id: 'toddler-standard',
    name: 'Toddler (1-3 years)',
    description: 'Active routine with one nap and structured activities',
    ageRange: { min: 1, max: 3 },
    dailyRoutine: {
      wakeUpTime: '07:00',
      bedtime: '19:30',
      mealTimes: {
        breakfast: '07:30',
        lunch: ['12:00'],
        dinner: '17:30',
        snacks: ['10:00', '15:00']
      },
      napTimes: [
        { startTime: '13:00', duration: 90, isFlexible: false }
      ],
      freePlayPeriods: [
        { startTime: '09:00', duration: 90, activities: ['creative', 'educational'] },
        { startTime: '15:00', duration: 60, activities: ['outdoor', 'physical'] },
        { startTime: '16:30', duration: 30, activities: ['quiet', 'reading'] }
      ],
      responsibilities: {
        wakeUp: 'au_pair',
        breakfast: 'au_pair',
        lunch: 'au_pair',
        dinner: 'shared',
        snacks: 'au_pair',
        naps: 'au_pair',
        bedtime: 'parent'
      }
    }
  },
  
  preschool: {
    id: 'preschool-standard',
    name: 'Preschool (3-5 years)',
    description: 'School-ready routine with optional quiet time',
    ageRange: { min: 3, max: 5 },
    dailyRoutine: {
      wakeUpTime: '07:00',
      bedtime: '20:00',
      mealTimes: {
        breakfast: '07:30',
        lunch: ['12:00'],
        dinner: '18:00',
        snacks: ['10:00', '15:30']
      },
      napTimes: [
        { startTime: '13:00', duration: 60, isFlexible: true, optional: true }
      ],
      freePlayPeriods: [
        { startTime: '08:30', duration: 90, activities: ['educational', 'creative'] },
        { startTime: '14:30', duration: 90, activities: ['outdoor', 'social'] },
        { startTime: '16:30', duration: 60, activities: ['free_choice'] }
      ],
      responsibilities: {
        wakeUp: 'au_pair',
        breakfast: 'au_pair',
        lunch: 'au_pair',
        dinner: 'shared',
        snacks: 'au_pair',
        naps: 'au_pair',
        bedtime: 'parent'
      }
    }
  },
  
  schoolAge: {
    id: 'school-age-standard',
    name: 'School Age (6-12 years)',
    description: 'After-school routine with homework time',
    ageRange: { min: 6, max: 12 },
    dailyRoutine: {
      wakeUpTime: '06:30',
      bedtime: '21:00',
      mealTimes: {
        breakfast: '07:00',
        lunch: [], // Usually at school
        dinner: '18:30',
        snacks: ['15:30']
      },
      napTimes: [], // No regular naps
      freePlayPeriods: [
        { startTime: '15:00', duration: 30, activities: ['snack', 'decompress'] },
        { startTime: '16:00', duration: 60, activities: ['homework', 'study'] },
        { startTime: '17:00', duration: 60, activities: ['outdoor', 'sports'] },
        { startTime: '19:30', duration: 60, activities: ['free_time', 'hobbies'] }
      ],
      responsibilities: {
        wakeUp: 'shared',
        breakfast: 'au_pair',
        lunch: 'parent',
        dinner: 'shared',
        snacks: 'au_pair',
        naps: 'parent',
        bedtime: 'parent'
      }
    }
  }
};

// Activity type definitions
export const ACTIVITY_TYPES = {
  tummy_time: { label: 'Tummy Time', icon: '🐛', category: 'physical' },
  sensory: { label: 'Sensory Play', icon: '🎨', category: 'creative' },
  interactive: { label: 'Interactive Play', icon: '🤹', category: 'social' },
  music: { label: 'Music Time', icon: '🎵', category: 'creative' },
  outdoor: { label: 'Outdoor Time', icon: '🌳', category: 'physical' },
  exploration: { label: 'Exploration', icon: '🔍', category: 'educational' },
  creative: { label: 'Creative Play', icon: '🎨', category: 'creative' },
  educational: { label: 'Learning Time', icon: '📚', category: 'educational' },
  physical: { label: 'Physical Activity', icon: '🏃', category: 'physical' },
  quiet: { label: 'Quiet Time', icon: '🤫', category: 'rest' },
  reading: { label: 'Reading', icon: '📖', category: 'educational' },
  social: { label: 'Social Play', icon: '👥', category: 'social' },
  free_choice: { label: 'Free Choice', icon: '🎯', category: 'mixed' },
  homework: { label: 'Homework', icon: '✏️', category: 'educational' },
  study: { label: 'Study Time', icon: '📝', category: 'educational' },
  sports: { label: 'Sports', icon: '⚽', category: 'physical' },
  hobbies: { label: 'Hobbies', icon: '🎮', category: 'personal' },
  decompress: { label: 'Decompress', icon: '😌', category: 'rest' },
  snack: { label: 'Snack Time', icon: '🍎', category: 'meal' },
  free_time: { label: 'Free Time', icon: '🎪', category: 'mixed' }
};

// Helper function to calculate child's age group
export const getAgeGroup = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  const ageInYears = (today - birthDate) / (365.25 * 24 * 60 * 60 * 1000);
  
  if (ageInYears < 1) return 'infant';
  if (ageInYears < 3) return 'toddler';
  if (ageInYears < 6) return 'preschool';
  if (ageInYears < 13) return 'schoolAge';
  return 'teen'; // For future expansion
};

// Helper function to get template by age
export const getTemplateByAge = (dateOfBirth) => {
  const ageGroup = getAgeGroup(dateOfBirth);
  return ageGroup ? ROUTINE_TEMPLATES[ageGroup] : null;
};

// Weekly activity categories
export const ACTIVITY_CATEGORIES = {
  education: {
    label: 'Education',
    icon: '🎓',
    color: '#007AFF',
    subcategories: ['school', 'daycare', 'tutoring', 'educational_program']
  },
  sports: {
    label: 'Sports & Physical',
    icon: '⚽',
    color: '#34C759',
    subcategories: ['team_sports', 'individual_sports', 'dance', 'martial_arts']
  },
  creative: {
    label: 'Creative Arts',
    icon: '🎨',
    color: '#FF9500',
    subcategories: ['art', 'music', 'drama', 'crafts']
  },
  social: {
    label: 'Social Activities',
    icon: '👥',
    color: '#5856D6',
    subcategories: ['playdate', 'birthday_party', 'community_event', 'family_event']
  },
  medical: {
    label: 'Medical & Health',
    icon: '🏥',
    color: '#FF3B30',
    subcategories: ['checkup', 'therapy', 'dental', 'specialist']
  },
  other: {
    label: 'Other',
    icon: '📌',
    color: '#8E8E93',
    subcategories: ['custom']
  }
};

// Validation rules for routines
export const ROUTINE_VALIDATION_RULES = {
  minSleepHours: {
    infant: 14,
    toddler: 12,
    preschool: 11,
    schoolAge: 9
  },
  maxActivitiesPerDay: {
    infant: 1,
    toddler: 2,
    preschool: 3,
    schoolAge: 4
  },
  minFreePLayMinutes: {
    infant: 120,
    toddler: 180,
    preschool: 120,
    schoolAge: 60
  },
  mealSpacing: {
    minHours: 2,
    maxHours: 4
  }
};

// Helper function to validate routine
export const validateRoutine = (routine, ageGroup) => {
  const errors = [];
  const warnings = [];
  
  // Check sleep duration
  const sleepStart = new Date(`2000-01-01 ${routine.bedtime}`);
  const sleepEnd = new Date(`2000-01-02 ${routine.wakeUpTime}`);
  const sleepHours = (sleepEnd - sleepStart) / (1000 * 60 * 60);
  
  if (sleepHours < ROUTINE_VALIDATION_RULES.minSleepHours[ageGroup]) {
    warnings.push(`Sleep duration (${sleepHours.toFixed(1)} hours) is less than recommended ${ROUTINE_VALIDATION_RULES.minSleepHours[ageGroup]} hours`);
  }
  
  // Check meal spacing
  const mealTimes = [
    routine.mealTimes.breakfast,
    routine.mealTimes.lunch,
    routine.mealTimes.dinner
  ].sort();
  
  for (let i = 1; i < mealTimes.length; i++) {
    const prev = new Date(`2000-01-01 ${mealTimes[i-1]}`);
    const curr = new Date(`2000-01-01 ${mealTimes[i]}`);
    const hoursDiff = (curr - prev) / (1000 * 60 * 60);
    
    if (hoursDiff < ROUTINE_VALIDATION_RULES.mealSpacing.minHours) {
      errors.push(`Meals are too close together (${mealTimes[i-1]} and ${mealTimes[i]})`);
    }
  }
  
  return { errors, warnings, isValid: errors.length === 0 };
};