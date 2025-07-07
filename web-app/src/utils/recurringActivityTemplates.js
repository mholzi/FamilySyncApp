// Recurring Activity Templates and Utilities for FamilySync

// Activity Categories
export const ACTIVITY_CATEGORIES = {
  sports: {
    label: 'Sports & Physical',
    icon: '⚽',
    color: '#34C759',
    subcategories: ['soccer', 'tennis', 'swimming', 'basketball', 'gymnastics', 'martial_arts', 'dance']
  },
  education: {
    label: 'Education & Learning',
    icon: '📚',
    color: '#007AFF',
    subcategories: ['tutoring', 'language_lessons', 'music_lessons', 'art_classes', 'coding', 'math']
  },
  creative: {
    label: 'Creative Arts',
    icon: '🎨',
    color: '#FF9500',
    subcategories: ['music', 'art', 'drama', 'crafts', 'singing', 'instrument']
  },
  social: {
    label: 'Social Activities',
    icon: '👥',
    color: '#5856D6',
    subcategories: ['playdate', 'birthday_party', 'community_event', 'club']
  },
  medical: {
    label: 'Medical & Health',
    icon: '🏥',
    color: '#FF3B30',
    subcategories: ['checkup', 'therapy', 'dental', 'specialist', 'counseling']
  },
  other: {
    label: 'Other',
    icon: '📌',
    color: '#8E8E93',
    subcategories: ['custom']
  }
};

// Predefined Activity Templates
export const ACTIVITY_TEMPLATES = {
  soccer_practice: {
    name: 'Soccer Practice',
    category: 'sports',
    icon: '⚽',
    defaultDuration: 90, // minutes
    typicalItems: ['Soccer cleats', 'Shin guards', 'Water bottle', 'Soccer ball'],
    typicalLocations: ['Local soccer field', 'Community sports center', 'School field'],
    defaultRecurrence: { type: 'weekly', days: ['tuesday', 'thursday'] },
    arrivalBuffer: 15, // minutes before start time
    notes: 'Bring weather-appropriate clothing'
  },
  piano_lessons: {
    name: 'Piano Lessons',
    category: 'creative',
    icon: '🎹',
    defaultDuration: 45,
    typicalItems: ['Sheet music', 'Music books', 'Pencil'],
    typicalLocations: ['Music school', 'Teacher\'s home', 'Community center'],
    defaultRecurrence: { type: 'weekly', days: ['wednesday'] },
    arrivalBuffer: 10,
    notes: 'Practice pieces beforehand'
  },
  swimming_lessons: {
    name: 'Swimming Lessons',
    category: 'sports',
    icon: '🏊',
    defaultDuration: 60,
    typicalItems: ['Swimsuit', 'Towel', 'Goggles', 'Swim cap'],
    typicalLocations: ['Community pool', 'Local gym', 'Aquatic center'],
    defaultRecurrence: { type: 'weekly', days: ['monday', 'friday'] },
    arrivalBuffer: 20,
    notes: 'Arrive early for changing time'
  },
  tutoring: {
    name: 'Tutoring Session',
    category: 'education',
    icon: '📖',
    defaultDuration: 60,
    typicalItems: ['Textbooks', 'Notebooks', 'Homework', 'Calculator'],
    typicalLocations: ['Library', 'Tutor\'s home', 'Community center'],
    defaultRecurrence: { type: 'weekly', days: ['tuesday'] },
    arrivalBuffer: 5,
    notes: 'Bring current homework and questions'
  },
  art_class: {
    name: 'Art Class',
    category: 'creative',
    icon: '🎨',
    defaultDuration: 90,
    typicalItems: ['Art supplies', 'Apron', 'Water bottle'],
    typicalLocations: ['Art studio', 'Community center', 'School'],
    defaultRecurrence: { type: 'weekly', days: ['saturday'] },
    arrivalBuffer: 10,
    notes: 'Wear clothes that can get messy'
  },
  dentist_checkup: {
    name: 'Dental Checkup',
    category: 'medical',
    icon: '🦷',
    defaultDuration: 45,
    typicalItems: ['Insurance card', 'Previous X-rays', 'List of medications'],
    typicalLocations: ['Dental office'],
    defaultRecurrence: { type: 'custom', interval: 6, unit: 'months' },
    arrivalBuffer: 15,
    notes: 'Brush teeth before appointment'
  }
};

// Recurrence Pattern Types
export const RECURRENCE_TYPES = {
  weekly: {
    label: 'Weekly',
    description: 'Repeats every week on selected days',
    options: {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }
  },
  biweekly: {
    label: 'Every 2 Weeks',
    description: 'Repeats every two weeks',
    options: {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }
  },
  monthly: {
    label: 'Monthly',
    description: 'Repeats every month on the same day',
    options: {
      monthType: ['same_date', 'same_weekday'] // e.g., 15th vs 2nd Tuesday
    }
  },
  custom: {
    label: 'Custom',
    description: 'Custom interval (e.g., every 3 months)',
    options: {
      interval: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      unit: ['days', 'weeks', 'months']
    }
  }
};

// Day Names
export const DAY_NAMES = {
  monday: { short: 'Mon', full: 'Monday' },
  tuesday: { short: 'Tue', full: 'Tuesday' },
  wednesday: { short: 'Wed', full: 'Wednesday' },
  thursday: { short: 'Thu', full: 'Thursday' },
  friday: { short: 'Fri', full: 'Friday' },
  saturday: { short: 'Sat', full: 'Saturday' },
  sunday: { short: 'Sun', full: 'Sunday' }
};

// Time Slots (for quick selection)
export const COMMON_TIME_SLOTS = [
  { label: 'Morning', times: ['08:00', '09:00', '10:00', '11:00'] },
  { label: 'Afternoon', times: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'] },
  { label: 'Evening', times: ['18:00', '19:00', '20:00'] }
];

// Helper Functions
export const getNextOccurrences = (activity, count = 10) => {
  const occurrences = [];
  
  try {
    if (!activity || !activity.time || !activity.recurrence) {
      return occurrences;
    }

    const now = new Date();
    let currentDate = new Date(now);
    
    // Start from today
    currentDate.setHours(0, 0, 0, 0);
    
    // Limit to next year to prevent infinite loops
    const maxDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
    let iterations = 0;
    const maxIterations = 400; // Safety net
    
    while (occurrences.length < count && currentDate < maxDate && iterations < maxIterations) {
      iterations++;
      
      try {
        if (shouldOccurOnDate(activity, currentDate)) {
          const occurrence = {
            date: new Date(currentDate),
            time: activity.time || '09:00',
            location: activity.location || {},
            duration: activity.duration || 60
          };
          occurrences.push(occurrence);
        }
      } catch (error) {
        console.warn('Error checking occurrence for date:', currentDate, error);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  } catch (error) {
    console.warn('Error generating occurrences for activity:', activity, error);
  }
  
  return occurrences;
};

export const shouldOccurOnDate = (activity, date) => {
  try {
    if (!activity || !activity.recurrence || !date) {
      return false;
    }

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    switch (activity.recurrence.type) {
      case 'weekly':
        return Array.isArray(activity.recurrence.days) && activity.recurrence.days.includes(dayName);
        
      case 'biweekly':
        // Check if it's the right week (need start date for this)
        if (!activity.recurrence.startDate && !activity.startDate) return false;
        try {
          const startDate = new Date(activity.recurrence.startDate || activity.startDate);
          const weeksDiff = Math.floor((date - startDate) / (7 * 24 * 60 * 60 * 1000));
          return weeksDiff % 2 === 0 && Array.isArray(activity.recurrence.days) && activity.recurrence.days.includes(dayName);
        } catch (error) {
          console.warn('Error calculating biweekly occurrence:', error);
          return false;
        }
        
      case 'monthly':
        if (activity.recurrence.monthType === 'same_date') {
          const startDate = activity.recurrence.startDate || activity.startDate;
          if (!startDate) return false;
          try {
            const start = new Date(startDate);
            return date.getDate() === start.getDate();
          } catch (error) {
            console.warn('Error calculating monthly occurrence:', error);
            return false;
          }
        } else {
          // Same weekday (e.g., 2nd Tuesday of each month)
          // Implementation would need start date context
          return false;
        }
        
      case 'custom':
        // Implementation depends on start date and interval
        return false;
        
      default:
        return false;
    }
  } catch (error) {
    console.warn('Error checking if activity should occur on date:', error, activity, date);
    return false;
  }
};

export const formatRecurrenceDescription = (recurrence) => {
  switch (recurrence.type) {
    case 'weekly':
      const days = recurrence.days.map(day => DAY_NAMES[day]?.short).join(', ');
      return `Weekly on ${days}`;
      
    case 'biweekly':
      const biweeklyDays = recurrence.days.map(day => DAY_NAMES[day]?.short).join(', ');
      return `Every 2 weeks on ${biweeklyDays}`;
      
    case 'monthly':
      return recurrence.monthType === 'same_date' 
        ? 'Monthly on the same date'
        : 'Monthly on the same weekday';
        
    case 'custom':
      return `Every ${recurrence.interval} ${recurrence.unit}`;
      
    default:
      return 'Custom schedule';
  }
};

export const validateActivityData = (activity) => {
  const errors = [];
  
  if (!activity.name?.trim()) {
    errors.push('Activity name is required');
  }
  
  if (!activity.time) {
    errors.push('Start time is required');
  }
  
  if (!activity.duration || activity.duration < 15) {
    errors.push('Duration must be at least 15 minutes');
  }
  
  if (!activity.location?.address?.trim()) {
    errors.push('Location address is required');
  }
  
  if (!activity.recurrence?.type) {
    errors.push('Recurrence pattern is required');
  }
  
  if (activity.recurrence?.type === 'weekly' && (!activity.recurrence.days || activity.recurrence.days.length === 0)) {
    errors.push('At least one day must be selected for weekly recurrence');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Default activity structure
export const createDefaultActivity = (template = null) => {
  const base = {
    id: null,
    name: '',
    category: 'other',
    icon: '📌',
    time: '15:00',
    duration: 60,
    location: {
      name: '',
      address: '',
      notes: ''
    },
    contact: {
      name: '',
      phone: '',
      email: '',
      role: '' // e.g., 'coach', 'teacher', 'instructor'
    },
    requirements: {
      items: [], // Things to bring
      preparation: [], // What to do beforehand
      notes: ''
    },
    recurrence: {
      type: 'weekly',
      days: [],
      startDate: new Date(),
      endDate: null // Optional end date
    },
    assignedChildren: [], // Array of child IDs
    createdBy: null,
    familyId: null,
    isActive: true,
    arrivalTime: null, // Calculated from time - arrivalBuffer
    createdAt: null,
    updatedAt: null
  };
  
  if (template) {
    return {
      ...base,
      name: template.name,
      category: template.category,
      icon: template.icon,
      duration: template.defaultDuration,
      requirements: {
        ...base.requirements,
        items: [...template.typicalItems],
        notes: template.notes
      },
      recurrence: {
        ...base.recurrence,
        ...template.defaultRecurrence
      }
    };
  }
  
  return base;
};