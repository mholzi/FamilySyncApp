import { ROUTINE_VALIDATION_RULES, getAgeGroup } from './routineTemplates';

// Validation utility functions for child routines
export class RoutineValidator {
  constructor(routine, childDateOfBirth) {
    this.routine = routine;
    this.ageGroup = getAgeGroup(childDateOfBirth);
    this.errors = [];
    this.warnings = [];
  }

  // Convert time string to minutes since midnight
  timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Convert minutes back to time string
  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Calculate sleep duration accounting for overnight sleep
  calculateSleepDuration() {
    if (!this.routine.bedtime || !this.routine.wakeUpTime) return 0;
    
    const bedtimeMinutes = this.timeToMinutes(this.routine.bedtime);
    const wakeUpMinutes = this.timeToMinutes(this.routine.wakeUpTime);
    
    // Handle overnight sleep (bedtime after midnight)
    if (bedtimeMinutes > wakeUpMinutes) {
      return (24 * 60 - bedtimeMinutes) + wakeUpMinutes;
    } else {
      return wakeUpMinutes - bedtimeMinutes;
    }
  }

  // Validate sleep duration
  validateSleep() {
    const sleepMinutes = this.calculateSleepDuration();
    const sleepHours = sleepMinutes / 60;
    const minSleepHours = ROUTINE_VALIDATION_RULES.minSleepHours[this.ageGroup];
    
    if (sleepHours < minSleepHours) {
      this.warnings.push({
        type: 'sleep_duration',
        message: `Sleep duration (${sleepHours.toFixed(1)} hours) is less than recommended ${minSleepHours} hours for ${this.ageGroup}`,
        severity: 'medium',
        suggestion: `Consider adjusting bedtime or wake time to ensure at least ${minSleepHours} hours of sleep`
      });
    }
    
    // Check for reasonable bedtime
    const bedtimeHour = Math.floor(this.timeToMinutes(this.routine.bedtime) / 60);
    if (this.ageGroup === 'toddler' && bedtimeHour > 21) {
      this.warnings.push({
        type: 'late_bedtime',
        message: 'Bedtime seems late for a toddler',
        severity: 'low',
        suggestion: 'Consider an earlier bedtime for better sleep quality'
      });
    }
  }

  // Validate meal timing and spacing
  validateMeals() {
    if (!this.routine.mealTimes) return;

    const meals = [];
    
    // Collect main meals
    ['breakfast', 'dinner'].forEach(meal => {
      if (this.routine.mealTimes[meal]) {
        meals.push({
          name: meal,
          time: this.routine.mealTimes[meal],
          minutes: this.timeToMinutes(this.routine.mealTimes[meal])
        });
      }
    });

    // Handle lunch (which can be an array)
    if (this.routine.mealTimes.lunch) {
      if (Array.isArray(this.routine.mealTimes.lunch)) {
        this.routine.mealTimes.lunch.forEach((lunchTime, index) => {
          if (lunchTime) {
            meals.push({
              name: `lunch${index > 0 ? ` ${index + 1}` : ''}`,
              time: lunchTime,
              minutes: this.timeToMinutes(lunchTime)
            });
          }
        });
      } else {
        // Legacy format - single lunch time
        meals.push({
          name: 'lunch',
          time: this.routine.mealTimes.lunch,
          minutes: this.timeToMinutes(this.routine.mealTimes.lunch)
        });
      }
    }

    // Sort meals by time
    meals.sort((a, b) => a.minutes - b.minutes);

    // Check meal spacing
    for (let i = 1; i < meals.length; i++) {
      const prevMeal = meals[i - 1];
      const currentMeal = meals[i];
      const timeDiff = (currentMeal.minutes - prevMeal.minutes) / 60; // Convert to hours

      if (timeDiff < ROUTINE_VALIDATION_RULES.mealSpacing.minHours) {
        this.errors.push({
          type: 'meal_spacing',
          message: `${prevMeal.name} and ${currentMeal.name} are too close together (${timeDiff.toFixed(1)} hours)`,
          severity: 'high',
          suggestion: `Meals should be at least ${ROUTINE_VALIDATION_RULES.mealSpacing.minHours} hours apart`
        });
      }

      if (timeDiff > ROUTINE_VALIDATION_RULES.mealSpacing.maxHours) {
        this.warnings.push({
          type: 'meal_spacing',
          message: `Long gap between ${prevMeal.name} and ${currentMeal.name} (${timeDiff.toFixed(1)} hours)`,
          severity: 'low',
          suggestion: 'Consider adding a snack between meals'
        });
      }
    }

    // Check if breakfast is reasonably close to wake time
    if (this.routine.wakeUpTime && this.routine.mealTimes.breakfast) {
      const wakeUpMinutes = this.timeToMinutes(this.routine.wakeUpTime);
      const breakfastMinutes = this.timeToMinutes(this.routine.mealTimes.breakfast);
      const timeDiff = (breakfastMinutes - wakeUpMinutes) / 60;

      if (timeDiff > 2) {
        this.warnings.push({
          type: 'breakfast_timing',
          message: `Long gap between wake up and breakfast (${timeDiff.toFixed(1)} hours)`,
          severity: 'low',
          suggestion: 'Consider an earlier breakfast time'
        });
      }
    }
  }

  // Validate nap times
  validateNaps() {
    if (!this.routine.napTimes || this.routine.napTimes.length === 0) {
      // Check if naps are expected for this age group
      if (this.ageGroup === 'infant' || this.ageGroup === 'toddler') {
        this.warnings.push({
          type: 'missing_naps',
          message: `${this.ageGroup}s typically need regular naps`,
          severity: 'medium',
          suggestion: 'Consider adding nap times to the routine'
        });
      }
      return;
    }

    this.routine.napTimes.forEach((nap, index) => {
      // Check nap duration
      if (nap.duration < 30) {
        this.warnings.push({
          type: 'short_nap',
          message: `Nap ${index + 1} is very short (${nap.duration} minutes)`,
          severity: 'low',
          suggestion: 'Most children need at least 30-45 minutes for a restorative nap'
        });
      }

      if (nap.duration > 180) {
        this.warnings.push({
          type: 'long_nap',
          message: `Nap ${index + 1} is very long (${nap.duration} minutes)`,
          severity: 'medium',
          suggestion: 'Very long naps might interfere with nighttime sleep'
        });
      }

      // Check nap timing relative to bedtime
      if (this.routine.bedtime) {
        const napStartMinutes = this.timeToMinutes(nap.startTime);
        const bedtimeMinutes = this.timeToMinutes(this.routine.bedtime);
        const napEndMinutes = napStartMinutes + nap.duration;
        
        // Check if nap is too close to bedtime
        const timeToBedtime = (bedtimeMinutes - napEndMinutes) / 60;
        if (timeToBedtime < 3) {
          this.warnings.push({
            type: 'nap_bedtime_proximity',
            message: `Nap ${index + 1} ends too close to bedtime`,
            severity: 'medium',
            suggestion: 'Naps should end at least 3 hours before bedtime'
          });
        }
      }
    });

    // Check for overlapping naps
    for (let i = 0; i < this.routine.napTimes.length - 1; i++) {
      const currentNap = this.routine.napTimes[i];
      const nextNap = this.routine.napTimes[i + 1];
      
      const currentEnd = this.timeToMinutes(currentNap.startTime) + currentNap.duration;
      const nextStart = this.timeToMinutes(nextNap.startTime);
      
      if (currentEnd > nextStart) {
        this.errors.push({
          type: 'overlapping_naps',
          message: `Nap ${i + 1} overlaps with nap ${i + 2}`,
          severity: 'high',
          suggestion: 'Adjust nap times to prevent overlaps'
        });
      }
    }
  }

  // Validate free play periods
  validateFreePlay() {
    if (!this.routine.freePlayPeriods || this.routine.freePlayPeriods.length === 0) {
      this.warnings.push({
        type: 'missing_free_play',
        message: 'No free play periods scheduled',
        severity: 'medium',
        suggestion: 'Children need unstructured play time for development'
      });
      return;
    }

    const totalFreePlayMinutes = this.routine.freePlayPeriods.reduce((total, period) => {
      return total + (period.duration || 0);
    }, 0);

    const minFreePlay = ROUTINE_VALIDATION_RULES.minFreePLayMinutes[this.ageGroup];
    if (totalFreePlayMinutes < minFreePlay) {
      this.warnings.push({
        type: 'insufficient_free_play',
        message: `Only ${totalFreePlayMinutes} minutes of free play scheduled`,
        severity: 'medium',
        suggestion: `Recommend at least ${minFreePlay} minutes of free play for ${this.ageGroup}`
      });
    }
  }

  // Check for scheduling conflicts
  validateConflicts() {
    const events = [];

    // Add all timed events
    if (this.routine.mealTimes) {
      Object.entries(this.routine.mealTimes).forEach(([meal, time]) => {
        if (time && meal !== 'snacks') {
          events.push({
            name: meal,
            start: this.timeToMinutes(time),
            end: this.timeToMinutes(time) + 30, // Assume 30 min for meals
            type: 'meal'
          });
        }
      });

      // Add snacks
      this.routine.mealTimes.snacks?.forEach((time, index) => {
        events.push({
          name: `snack ${index + 1}`,
          start: this.timeToMinutes(time),
          end: this.timeToMinutes(time) + 15, // Assume 15 min for snacks
          type: 'snack'
        });
      });
    }

    // Add naps
    this.routine.napTimes?.forEach((nap, index) => {
      events.push({
        name: `nap ${index + 1}`,
        start: this.timeToMinutes(nap.startTime),
        end: this.timeToMinutes(nap.startTime) + nap.duration,
        type: 'nap'
      });
    });

    // Add free play periods
    this.routine.freePlayPeriods?.forEach((period, index) => {
      events.push({
        name: `free play ${index + 1}`,
        start: this.timeToMinutes(period.startTime),
        end: this.timeToMinutes(period.startTime) + period.duration,
        type: 'activity'
      });
    });

    // Sort events by start time
    events.sort((a, b) => a.start - b.start);

    // Check for overlaps
    for (let i = 0; i < events.length - 1; i++) {
      const current = events[i];
      const next = events[i + 1];

      if (current.end > next.start) {
        this.errors.push({
          type: 'schedule_conflict',
          message: `${current.name} conflicts with ${next.name}`,
          severity: 'high',
          suggestion: 'Adjust timing to prevent overlapping activities'
        });
      }
    }
  }

  // Run all validations
  validate() {
    this.errors = [];
    this.warnings = [];

    if (!this.routine) {
      return { isValid: false, errors: [{ message: 'No routine data provided' }], warnings: [] };
    }

    this.validateSleep();
    this.validateMeals();
    this.validateNaps();
    this.validateFreePlay();
    this.validateConflicts();

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        sleepHours: (this.calculateSleepDuration() / 60).toFixed(1),
        totalNaps: this.routine.napTimes?.length || 0,
        totalFreePlay: this.routine.freePlayPeriods?.reduce((total, period) => total + (period.duration || 0), 0) || 0
      }
    };
  }
}

// Convenience function for quick validation
export const validateRoutine = (routine, childDateOfBirth) => {
  const validator = new RoutineValidator(routine, childDateOfBirth);
  return validator.validate();
};

// Activity validation
export const validateActivity = (activity) => {
  const errors = [];
  const warnings = [];

  if (!activity.name || activity.name.trim().length === 0) {
    errors.push({
      type: 'missing_name',
      message: 'Activity name is required',
      severity: 'high'
    });
  }

  if (!activity.schedule.days || activity.schedule.days.length === 0) {
    errors.push({
      type: 'missing_days',
      message: 'At least one day must be selected',
      severity: 'high'
    });
  }

  if (!activity.schedule.startTime) {
    errors.push({
      type: 'missing_time',
      message: 'Start time is required',
      severity: 'high'
    });
  }

  if (!activity.schedule.duration || activity.schedule.duration <= 0) {
    errors.push({
      type: 'invalid_duration',
      message: 'Activity duration must be greater than 0',
      severity: 'high'
    });
  }

  if (activity.schedule.duration > 240) { // 4 hours
    warnings.push({
      type: 'long_activity',
      message: 'Activity duration is very long (over 4 hours)',
      severity: 'medium',
      suggestion: 'Consider breaking long activities into smaller segments'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Weekly schedule validation
export const validateWeeklySchedule = (activities, routine) => {
  const errors = [];
  const warnings = [];
  
  // Group activities by day
  const dayGroups = {
    monday: [], tuesday: [], wednesday: [], thursday: [], 
    friday: [], saturday: [], sunday: []
  };

  activities.forEach(activity => {
    activity.schedule.days.forEach(day => {
      dayGroups[day].push(activity);
    });
  });

  // Validate each day
  Object.entries(dayGroups).forEach(([day, dayActivities]) => {
    if (dayActivities.length === 0) return;

    // Sort activities by time
    dayActivities.sort((a, b) => {
      const timeA = a.schedule.startTime.split(':').map(Number);
      const timeB = b.schedule.startTime.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    // Check for conflicts
    for (let i = 0; i < dayActivities.length - 1; i++) {
      const current = dayActivities[i];
      const next = dayActivities[i + 1];
      
      const currentEnd = current.schedule.startTime.split(':').map(Number);
      const currentEndMinutes = currentEnd[0] * 60 + currentEnd[1] + current.schedule.duration;
      
      const nextStart = next.schedule.startTime.split(':').map(Number);
      const nextStartMinutes = nextStart[0] * 60 + nextStart[1];
      
      if (currentEndMinutes > nextStartMinutes) {
        errors.push({
          type: 'activity_conflict',
          message: `${current.name} conflicts with ${next.name} on ${day}`,
          severity: 'high',
          suggestion: 'Adjust activity times to prevent overlaps'
        });
      }
      
      // Check for insufficient travel time
      if (current.location.name !== next.location.name) {
        const travelTime = Math.max(current.location.travelTime || 0, next.location.travelTime || 0);
        const gapTime = nextStartMinutes - currentEndMinutes;
        
        if (gapTime < travelTime) {
          warnings.push({
            type: 'insufficient_travel_time',
            message: `Not enough time to travel between ${current.name} and ${next.name} on ${day}`,
            severity: 'medium',
            suggestion: `Consider adding ${travelTime - gapTime} more minutes between activities`
          });
        }
      }
    }

    // Check daily activity limits
    const ageGroup = routine ? getAgeGroup(routine.childAge) : 'preschool';
    const maxActivities = ROUTINE_VALIDATION_RULES.maxActivitiesPerDay[ageGroup];
    
    if (dayActivities.length > maxActivities) {
      warnings.push({
        type: 'too_many_activities',
        message: `${dayActivities.length} activities on ${day} might be too many for a ${ageGroup}`,
        severity: 'medium',
        suggestion: `Consider limiting to ${maxActivities} activities per day`
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};