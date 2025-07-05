import { addDays, format, startOfWeek, isSameDay, parseISO, addMinutes } from 'date-fns';

// Age-based scheduling rules
export const SCHEDULING_RULES = {
  infant: {
    maxActivitiesPerDay: 1,
    napTimeProtection: 45, // minutes buffer
    maxActivityDuration: 30,
    minBufferBetweenActivities: 60,
    latestActivityStart: '17:00'
  },
  toddler: {
    maxActivitiesPerDay: 2,
    napTimeProtection: 30,
    maxActivityDuration: 60,
    minBufferBetweenActivities: 45,
    latestActivityStart: '17:30'
  },
  preschool: {
    maxActivitiesPerDay: 3,
    napTimeProtection: 15,
    maxActivityDuration: 90,
    minBufferBetweenActivities: 30,
    latestActivityStart: '18:00'
  },
  school: {
    maxActivitiesPerDay: 4,
    napTimeProtection: 0,
    maxActivityDuration: 120,
    minBufferBetweenActivities: 15,
    latestActivityStart: '19:00'
  }
};

// Activity priority levels
export const ACTIVITY_PRIORITIES = {
  ESSENTIAL: 1,    // School, meals, sleep
  HIGH: 2,         // Medical appointments, mandatory activities
  MEDIUM: 3,       // Regular activities, sports
  LOW: 4,          // Optional activities, playdates
  FLEXIBLE: 5      // Activities that can be moved easily
};

export class ScheduleGenerator {
  constructor(familyData) {
    this.familyData = familyData;
    this.conflicts = [];
    this.suggestions = [];
  }

  /**
   * Generate a complete weekly schedule for a child
   * @param {Object} childData - Child information including routines and activities
   * @param {Date} startDate - Start date for the week
   * @returns {Object} Generated schedule with events and metadata
   */
  generateWeeklySchedule(childData, startDate = new Date()) {
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 }); // Monday start
    const schedule = this.initializeWeeklySchedule(weekStart);
    
    // Step 1: Place fixed commitments (school schedule)
    this.placeFixedActivities(schedule, childData, weekStart);
    
    // Step 2: Add daily routine activities (meals, naps, bedtime)
    this.addRoutineActivities(schedule, childData, weekStart);
    
    // Step 3: Add recurring weekly activities
    this.addRecurringActivities(schedule, childData, weekStart);
    
    // Step 4: Validate and detect conflicts
    this.validateSchedule(schedule, childData);
    
    // Step 5: Generate suggestions for optimization
    this.generateSuggestions(schedule, childData);
    
    return {
      schedule,
      conflicts: this.conflicts,
      suggestions: this.suggestions,
      metadata: this.generateScheduleMetadata(schedule, childData)
    };
  }

  /**
   * Initialize empty weekly schedule structure
   */
  initializeWeeklySchedule(weekStart) {
    const schedule = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach((day, index) => {
      const date = addDays(weekStart, index);
      schedule[day] = {
        date: format(date, 'yyyy-MM-dd'),
        events: [],
        freeTimeSlots: [],
        totalActivityTime: 0,
        activityCount: 0
      };
    });
    
    return schedule;
  }

  /**
   * Place fixed activities like school schedule
   */
  placeFixedActivities(schedule, childData, weekStart) {
    if (!childData.schoolSchedule) return;

    Object.entries(childData.schoolSchedule).forEach(([day, blocks]) => {
      if (!blocks || blocks.length === 0) return;

      blocks.forEach(block => {
        const event = {
          id: `school-${day}-${block.startTime}`,
          title: block.type,
          type: 'school',
          startTime: block.startTime,
          endTime: block.endTime,
          priority: ACTIVITY_PRIORITIES.ESSENTIAL,
          isFixed: true,
          childId: childData.id,
          metadata: {
            isSchool: true,
            preparation: block.type === 'School' ? ['Backpack', 'Lunch', 'Homework'] : ['Snack', 'Comfort items'],
            travelTime: 15 // Default 15 minutes travel time
          }
        };

        schedule[day].events.push(event);
        schedule[day].activityCount++;
        
        // Calculate duration
        const duration = this.calculateDuration(block.startTime, block.endTime);
        schedule[day].totalActivityTime += duration;
      });
    });
  }

  /**
   * Add daily routine activities
   */
  addRoutineActivities(schedule, childData, weekStart) {
    if (!childData.carePreferences?.dailyRoutine) return;

    const routine = childData.carePreferences.dailyRoutine;
    const days = Object.keys(schedule);

    days.forEach(day => {
      // Add wake up time
      if (routine.wakeUpTime) {
        schedule[day].events.push({
          id: `wakeup-${day}`,
          title: 'Wake Up',
          type: 'routine',
          startTime: routine.wakeUpTime,
          endTime: this.addMinutesToTime(routine.wakeUpTime, 30),
          priority: ACTIVITY_PRIORITIES.ESSENTIAL,
          isFixed: true,
          metadata: { isRoutine: true, category: 'sleep' }
        });
      }

      // Add bedtime
      if (routine.bedtime) {
        schedule[day].events.push({
          id: `bedtime-${day}`,
          title: 'Bedtime',
          type: 'routine',
          startTime: routine.bedtime,
          endTime: this.addMinutesToTime(routine.bedtime, 60),
          priority: ACTIVITY_PRIORITIES.ESSENTIAL,
          isFixed: true,
          metadata: { isRoutine: true, category: 'sleep' }
        });
      }

      // Add meal times
      if (routine.mealTimes) {
        // Breakfast
        if (routine.mealTimes.breakfast) {
          schedule[day].events.push({
            id: `breakfast-${day}`,
            title: 'Breakfast',
            type: 'meal',
            startTime: routine.mealTimes.breakfast,
            endTime: this.addMinutesToTime(routine.mealTimes.breakfast, 30),
            priority: ACTIVITY_PRIORITIES.ESSENTIAL,
            isFixed: true,
            metadata: { isRoutine: true, category: 'meal' }
          });
        }

        // Lunch times (can be multiple)
        if (routine.mealTimes.lunch && Array.isArray(routine.mealTimes.lunch)) {
          routine.mealTimes.lunch.forEach((lunchTime, index) => {
            schedule[day].events.push({
              id: `lunch-${day}-${index}`,
              title: 'Lunch',
              type: 'meal',
              startTime: lunchTime,
              endTime: this.addMinutesToTime(lunchTime, 45),
              priority: ACTIVITY_PRIORITIES.ESSENTIAL,
              isFixed: true,
              metadata: { isRoutine: true, category: 'meal' }
            });
          });
        }

        // Dinner
        if (routine.mealTimes.dinner) {
          schedule[day].events.push({
            id: `dinner-${day}`,
            title: 'Dinner',
            type: 'meal',
            startTime: routine.mealTimes.dinner,
            endTime: this.addMinutesToTime(routine.mealTimes.dinner, 45),
            priority: ACTIVITY_PRIORITIES.ESSENTIAL,
            isFixed: true,
            metadata: { isRoutine: true, category: 'meal' }
          });
        }

        // Snack times
        if (routine.mealTimes.snacks && Array.isArray(routine.mealTimes.snacks)) {
          routine.mealTimes.snacks.forEach((snackTime, index) => {
            schedule[day].events.push({
              id: `snack-${day}-${index}`,
              title: 'Snack',
              type: 'meal',
              startTime: snackTime,
              endTime: this.addMinutesToTime(snackTime, 15),
              priority: ACTIVITY_PRIORITIES.HIGH,
              isFixed: true,
              metadata: { isRoutine: true, category: 'snack' }
            });
          });
        }
      }

      // Add nap times
      if (routine.napTimes && Array.isArray(routine.napTimes)) {
        routine.napTimes.forEach((nap, index) => {
          schedule[day].events.push({
            id: `nap-${day}-${index}`,
            title: 'Nap Time',
            type: 'routine',
            startTime: nap.startTime,
            endTime: this.addMinutesToTime(nap.startTime, nap.duration),
            priority: ACTIVITY_PRIORITIES.ESSENTIAL,
            isFixed: true,
            metadata: { isRoutine: true, category: 'sleep', duration: nap.duration }
          });
        });
      }
    });
  }

  /**
   * Add recurring weekly activities
   */
  addRecurringActivities(schedule, childData, weekStart) {
    if (!childData.weeklyActivities || !Array.isArray(childData.weeklyActivities)) return;

    childData.weeklyActivities.forEach(activity => {
      if (!activity.schedule || !activity.schedule.days) return;

      activity.schedule.days.forEach(day => {
        if (!schedule[day]) return;

        const event = {
          id: `activity-${activity.id || activity.name}-${day}`,
          title: activity.name,
          type: 'activity',
          startTime: activity.schedule.startTime,
          endTime: this.addMinutesToTime(activity.schedule.startTime, activity.schedule.duration),
          priority: ACTIVITY_PRIORITIES.MEDIUM,
          isFixed: false,
          location: activity.location,
          metadata: {
            isRecurring: true,
            category: activity.category || 'activity',
            equipment: activity.equipment || [],
            preparation: activity.preparation || [],
            travelTime: activity.location?.travelTime || 15,
            contact: activity.contact
          }
        };

        schedule[day].events.push(event);
        schedule[day].activityCount++;
        schedule[day].totalActivityTime += activity.schedule.duration;
      });
    });
  }

  /**
   * Validate schedule and detect conflicts
   */
  validateSchedule(schedule, childData) {
    this.conflicts = [];
    const ageGroup = this.getAgeGroup(childData.dateOfBirth);
    const rules = SCHEDULING_RULES[ageGroup];

    Object.entries(schedule).forEach(([day, daySchedule]) => {
      // Sort events by start time
      daySchedule.events.sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));

      // Check for overlapping events
      for (let i = 0; i < daySchedule.events.length - 1; i++) {
        const current = daySchedule.events[i];
        const next = daySchedule.events[i + 1];

        if (this.timeToMinutes(current.endTime) > this.timeToMinutes(next.startTime)) {
          this.conflicts.push({
            type: 'overlap',
            severity: 'high',
            day,
            events: [current, next],
            message: `${current.title} overlaps with ${next.title}`,
            suggestion: 'Adjust timing or move one activity to another day'
          });
        }
      }

      // Check daily activity limits
      if (daySchedule.activityCount > rules.maxActivitiesPerDay) {
        this.conflicts.push({
          type: 'overload',
          severity: 'medium',
          day,
          message: `Too many activities (${daySchedule.activityCount}/${rules.maxActivitiesPerDay})`,
          suggestion: 'Consider moving some activities to other days'
        });
      }

      // Check nap time protection
      if (rules.napTimeProtection > 0) {
        this.checkNapTimeProtection(daySchedule, rules, day);
      }

      // Check activity durations
      daySchedule.events.forEach(event => {
        if (event.type === 'activity') {
          const duration = this.calculateDuration(event.startTime, event.endTime);
          if (duration > rules.maxActivityDuration) {
            this.conflicts.push({
              type: 'duration',
              severity: 'low',
              day,
              event,
              message: `${event.title} is too long (${duration}/${rules.maxActivityDuration} minutes)`,
              suggestion: 'Consider breaking into shorter sessions'
            });
          }
        }
      });
    });
  }

  /**
   * Generate scheduling suggestions
   */
  generateSuggestions(schedule, childData) {
    this.suggestions = [];
    const ageGroup = this.getAgeGroup(childData.dateOfBirth);

    // Identify free time slots
    Object.entries(schedule).forEach(([day, daySchedule]) => {
      const freeSlots = this.identifyFreeTimeSlots(daySchedule);
      schedule[day].freeTimeSlots = freeSlots;

      // Suggest free play time
      if (freeSlots.length > 0) {
        freeSlots.forEach(slot => {
          if (slot.duration >= 60) {
            this.suggestions.push({
              type: 'free_play',
              priority: 'medium',
              day,
              timeSlot: slot,
              message: `${slot.duration} minutes available for free play`,
              suggestion: 'Add unstructured play time for child development'
            });
          }
        });
      }

      // Suggest outdoor time
      const hasOutdoorActivity = daySchedule.events.some(event => 
        event.metadata?.category === 'outdoor' || event.location?.type === 'outdoor'
      );

      if (!hasOutdoorActivity && freeSlots.some(slot => slot.duration >= 30)) {
        this.suggestions.push({
          type: 'outdoor_time',
          priority: 'medium',
          day,
          message: 'No outdoor activities scheduled',
          suggestion: 'Consider adding outdoor play or nature time'
        });
      }
    });

    // Suggest weekly balance
    this.analyzeWeeklyBalance(schedule, childData);
  }

  /**
   * Check nap time protection
   */
  checkNapTimeProtection(daySchedule, rules, day) {
    const napEvents = daySchedule.events.filter(event => 
      event.metadata?.category === 'sleep' && event.title.includes('Nap')
    );

    napEvents.forEach(napEvent => {
      const napStart = this.timeToMinutes(napEvent.startTime);
      const napEnd = this.timeToMinutes(napEvent.endTime);
      const buffer = rules.napTimeProtection;

      // Check activities before nap
      const beforeNap = daySchedule.events.filter(event => 
        event !== napEvent && 
        this.timeToMinutes(event.endTime) > napStart - buffer &&
        this.timeToMinutes(event.endTime) <= napStart
      );

      // Check activities after nap  
      const afterNap = daySchedule.events.filter(event =>
        event !== napEvent &&
        this.timeToMinutes(event.startTime) < napEnd + buffer &&
        this.timeToMinutes(event.startTime) >= napEnd
      );

      if (beforeNap.length > 0 || afterNap.length > 0) {
        this.conflicts.push({
          type: 'nap_protection',
          severity: 'medium',
          day,
          message: `Activities too close to nap time (${buffer} min buffer needed)`,
          suggestion: 'Move activities to protect nap time'
        });
      }
    });
  }

  /**
   * Identify free time slots in a day
   */
  identifyFreeTimeSlots(daySchedule) {
    const events = daySchedule.events
      .filter(event => !event.metadata?.isRoutine || event.metadata?.category === 'sleep')
      .sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));

    const freeSlots = [];
    const dayStart = 7 * 60; // 7 AM
    const dayEnd = 20 * 60;  // 8 PM

    if (events.length === 0) {
      freeSlots.push({
        startTime: '07:00',
        endTime: '20:00',
        duration: dayEnd - dayStart
      });
      return freeSlots;
    }

    // Check gap before first event
    const firstEventStart = this.timeToMinutes(events[0].startTime);
    if (firstEventStart > dayStart) {
      freeSlots.push({
        startTime: this.minutesToTime(dayStart),
        endTime: events[0].startTime,
        duration: firstEventStart - dayStart
      });
    }

    // Check gaps between events
    for (let i = 0; i < events.length - 1; i++) {
      const currentEnd = this.timeToMinutes(events[i].endTime);
      const nextStart = this.timeToMinutes(events[i + 1].startTime);
      
      if (nextStart > currentEnd) {
        freeSlots.push({
          startTime: events[i].endTime,
          endTime: events[i + 1].startTime,
          duration: nextStart - currentEnd
        });
      }
    }

    // Check gap after last event
    const lastEventEnd = this.timeToMinutes(events[events.length - 1].endTime);
    if (lastEventEnd < dayEnd) {
      freeSlots.push({
        startTime: events[events.length - 1].endTime,
        endTime: this.minutesToTime(dayEnd),
        duration: dayEnd - lastEventEnd
      });
    }

    return freeSlots.filter(slot => slot.duration >= 15); // Only slots of 15+ minutes
  }

  /**
   * Analyze weekly balance and suggest improvements
   */
  analyzeWeeklyBalance(schedule, childData) {
    const weeklyStats = {
      totalActivities: 0,
      activityTypes: {},
      freeTimeTotal: 0,
      outdoorTime: 0,
      screenTime: 0
    };

    Object.values(schedule).forEach(daySchedule => {
      weeklyStats.totalActivities += daySchedule.activityCount;
      weeklyStats.freeTimeTotal += daySchedule.freeTimeSlots.reduce((sum, slot) => sum + slot.duration, 0);

      daySchedule.events.forEach(event => {
        const category = event.metadata?.category || 'other';
        weeklyStats.activityTypes[category] = (weeklyStats.activityTypes[category] || 0) + 1;
      });
    });

    // Suggest balance improvements
    if (weeklyStats.totalActivities > 20) {
      this.suggestions.push({
        type: 'balance',
        priority: 'high',
        message: 'Weekly schedule may be too packed',
        suggestion: 'Consider reducing activities to prevent overstimulation'
      });
    }

    if (weeklyStats.freeTimeTotal < 300) { // Less than 5 hours per week
      this.suggestions.push({
        type: 'balance',
        priority: 'medium',
        message: 'Limited free play time scheduled',
        suggestion: 'Add more unstructured play time for creativity and independence'
      });
    }
  }

  /**
   * Generate schedule metadata
   */
  generateScheduleMetadata(schedule, childData) {
    const ageGroup = this.getAgeGroup(childData.dateOfBirth);
    const rules = SCHEDULING_RULES[ageGroup];
    
    let totalActivities = 0;
    let totalFreeTime = 0;
    let busyDays = 0;

    Object.values(schedule).forEach(daySchedule => {
      totalActivities += daySchedule.activityCount;
      totalFreeTime += daySchedule.freeTimeSlots.reduce((sum, slot) => sum + slot.duration, 0);
      
      if (daySchedule.activityCount >= rules.maxActivitiesPerDay) {
        busyDays++;
      }
    });

    return {
      ageGroup,
      totalActivities,
      averageActivitiesPerDay: Math.round(totalActivities / 7 * 10) / 10,
      totalFreeTimeHours: Math.round(totalFreeTime / 60 * 10) / 10,
      busyDays,
      conflictCount: this.conflicts.length,
      suggestionCount: this.suggestions.length,
      balanceScore: this.calculateBalanceScore(schedule, rules),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Calculate a balance score for the schedule (0-100)
   */
  calculateBalanceScore(schedule, rules) {
    let score = 100;
    
    // Penalize for conflicts
    score -= this.conflicts.length * 10;
    
    // Penalize for overloaded days
    Object.values(schedule).forEach(daySchedule => {
      if (daySchedule.activityCount > rules.maxActivitiesPerDay) {
        score -= 15;
      }
    });

    // Reward for good free time distribution
    const freeTimeVariation = this.calculateFreeTimeVariation(schedule);
    if (freeTimeVariation < 60) { // Less than 1 hour variation
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate variation in free time across days
   */
  calculateFreeTimeVariation(schedule) {
    const freeTimeTotals = Object.values(schedule).map(day => 
      day.freeTimeSlots.reduce((sum, slot) => sum + slot.duration, 0)
    );

    const average = freeTimeTotals.reduce((sum, time) => sum + time, 0) / freeTimeTotals.length;
    const variance = freeTimeTotals.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / freeTimeTotals.length;
    
    return Math.sqrt(variance);
  }

  // Utility methods
  getAgeGroup(dateOfBirth) {
    if (!dateOfBirth) return 'preschool';
    
    const birthDate = dateOfBirth.toDate ? dateOfBirth.toDate() : new Date(dateOfBirth);
    const ageInMonths = (new Date() - birthDate) / (1000 * 60 * 60 * 24 * 30.44);
    
    if (ageInMonths < 18) return 'infant';
    if (ageInMonths < 36) return 'toddler';
    if (ageInMonths < 72) return 'preschool';
    return 'school';
  }

  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  addMinutesToTime(timeStr, minutesToAdd) {
    const totalMinutes = this.timeToMinutes(timeStr) + minutesToAdd;
    return this.minutesToTime(totalMinutes);
  }

  calculateDuration(startTime, endTime) {
    return this.timeToMinutes(endTime) - this.timeToMinutes(startTime);
  }
}

// Export convenience function
export const generateChildSchedule = (childData, startDate) => {
  const generator = new ScheduleGenerator();
  return generator.generateWeeklySchedule(childData, startDate);
};