import { generateChildSchedule } from './scheduleGenerator';
import { addDays, format, startOfWeek, differenceInMinutes } from 'date-fns';

export class FamilyOptimizer {
  constructor(familyData) {
    this.familyData = familyData;
    this.optimizationResults = {};
    this.carpoolOpportunities = [];
    this.sharedActivities = [];
    this.familyTimeSlots = [];
  }

  /**
   * Optimize schedule for entire family with multiple children
   * @param {Array} children - Array of child data objects
   * @param {Date} weekStart - Start of week to optimize
   * @returns {Object} Optimized family schedule with recommendations
   */
  optimizeMultiChildSchedule(children, weekStart = new Date()) {
    const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
    
    // Step 1: Generate individual schedules for all children
    const individualSchedules = this.generateIndividualSchedules(children, weekStartDate);
    
    // Step 2: Find shared opportunities and coordination possibilities
    const coordinatedActivities = this.findSharedOpportunities(children, individualSchedules);
    
    // Step 3: Optimize transportation and carpool opportunities
    const carpoolOptions = this.identifyCarpoolOpportunities(children, coordinatedActivities);
    
    // Step 4: Protect and optimize family time
    const familyTimeSlots = this.reserveFamilyTime(children, individualSchedules);
    
    // Step 5: Identify parallel activities for siblings
    const parallelActivities = this.findParallelActivities(children, individualSchedules);
    
    // Step 6: Generate optimization recommendations
    const recommendations = this.generateOptimizationRecommendations(
      children, 
      individualSchedules, 
      coordinatedActivities, 
      carpoolOptions,
      familyTimeSlots
    );

    return {
      individualSchedules,
      coordinatedActivities,
      carpoolOptions,
      parallelActivities,
      familyTimeSlots,
      recommendations,
      optimizationScore: this.calculateOptimizationScore(children, individualSchedules),
      metadata: this.generateOptimizationMetadata(children, individualSchedules)
    };
  }

  /**
   * Generate individual schedules for all children
   */
  generateIndividualSchedules(children, weekStartDate) {
    const schedules = {};
    
    children.forEach(child => {
      schedules[child.id] = generateChildSchedule(child, weekStartDate);
    });
    
    return schedules;
  }

  /**
   * Find opportunities for shared activities and coordination
   */
  findSharedOpportunities(children, individualSchedules) {
    const opportunities = [];
    
    // Find activities that multiple children could attend together
    const allActivities = this.getAllActivities(children, individualSchedules);
    
    // Group activities by type, location, and time proximity
    const activityGroups = this.groupSimilarActivities(allActivities);
    
    activityGroups.forEach(group => {
      if (group.children.length > 1) {
        const ageCompatible = this.checkAgeCompatibility(group.children);
        const timeCompatible = this.checkTimeCompatibility(group.activities);
        
        if (ageCompatible && timeCompatible) {
          opportunities.push({
            type: 'shared_activity',
            activity: group.activityType,
            children: group.children,
            location: group.location,
            timeSlot: group.timeSlot,
            benefits: {
              transportationSaving: this.calculateTransportationSaving(group),
              socialBenefit: group.children.length > 1,
              costSaving: this.calculateCostSaving(group)
            },
            feasibility: this.assessFeasibility(group)
          });
        }
      }
    });
    
    return opportunities;
  }

  /**
   * Identify carpool opportunities with other families
   */
  identifyCarpoolOpportunities(children, coordinatedActivities) {
    const carpoolOpportunities = [];
    
    children.forEach(child => {
      if (child.weeklyActivities) {
        child.weeklyActivities.forEach(activity => {
          // Check if activity has other participants from different families
          if (activity.location && activity.schedule) {
            const carpoolPotential = this.analyzeCarpoolPotential(child, activity);
            
            if (carpoolPotential.score > 0.7) {
              carpoolOpportunities.push({
                childId: child.id,
                childName: child.name,
                activity: activity.name,
                location: activity.location,
                schedule: activity.schedule,
                carpoolScore: carpoolPotential.score,
                estimatedSavings: {
                  timeMinutes: carpoolPotential.timeSavings,
                  costReduction: carpoolPotential.costSavings,
                  stressReduction: carpoolPotential.stressReduction
                },
                recommendedPartners: carpoolPotential.potentialPartners
              });
            }
          }
        });
      }
    });
    
    return carpoolOpportunities;
  }

  /**
   * Reserve and optimize family time across all children's schedules
   */
  reserveFamilyTime(children, individualSchedules) {
    const familyTimeSlots = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
      // Find overlapping free time for all children
      const commonFreeTime = this.findCommonFreeTime(children, individualSchedules, day);
      
      commonFreeTime.forEach(slot => {
        if (slot.duration >= 60) { // Minimum 1 hour for family time
          familyTimeSlots.push({
            day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            duration: slot.duration,
            availableChildren: slot.children,
            type: this.categorizeFamilyTime(slot),
            priority: this.calculateFamilyTimePriority(slot, day),
            suggestions: this.generateFamilyTimeActivities(slot, children)
          });
        }
      });
    });
    
    return familyTimeSlots.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Find parallel activities that work well for multiple children
   */
  findParallelActivities(children, individualSchedules) {
    const parallelOpportunities = [];
    
    // Look for activities that can be done simultaneously by different age groups
    const ageGroups = this.groupChildrenByAge(children);
    
    Object.keys(ageGroups).forEach(ageGroup => {
      const groupChildren = ageGroups[ageGroup];
      
      if (groupChildren.length > 1) {
        // Find activities suitable for this age group
        const suitableActivities = this.findAgeAppropriateActivities(ageGroup);
        
        suitableActivities.forEach(activity => {
          const availability = this.checkChildrenAvailability(groupChildren, individualSchedules, activity.timeRequirement);
          
          if (availability.feasible) {
            parallelOpportunities.push({
              ageGroup,
              activity: activity.name,
              children: availability.availableChildren,
              timeSlot: availability.bestTimeSlot,
              benefits: {
                socialDevelopment: true,
                parentSupervisionEfficiency: true,
                siblingBonding: groupChildren.length > 1
              },
              requirements: activity.requirements
            });
          }
        });
      }
    });
    
    return parallelOpportunities;
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(children, individualSchedules, coordinatedActivities, carpoolOptions, familyTimeSlots) {
    const recommendations = [];
    
    // Transportation optimization recommendations
    if (carpoolOptions.length > 0) {
      recommendations.push({
        type: 'transportation',
        priority: 'high',
        title: 'Carpool Opportunities Available',
        description: `${carpoolOptions.length} carpool opportunities could save ${this.calculateTotalTransportationSavings(carpoolOptions)} minutes per week`,
        action: 'setup_carpools',
        data: carpoolOptions,
        estimatedBenefit: 'time_saving'
      });
    }
    
    // Schedule balance recommendations
    const scheduleBalance = this.analyzeScheduleBalance(children, individualSchedules);
    if (scheduleBalance.overloadedDays > 0) {
      recommendations.push({
        type: 'balance',
        priority: 'medium',
        title: 'Schedule Rebalancing Suggested',
        description: `${scheduleBalance.overloadedDays} days have too many activities. Consider redistributing.`,
        action: 'rebalance_schedule',
        data: scheduleBalance,
        estimatedBenefit: 'stress_reduction'
      });
    }
    
    // Family time recommendations
    if (familyTimeSlots.length < 3) {
      recommendations.push({
        type: 'family_time',
        priority: 'high',
        title: 'Insufficient Family Time',
        description: 'Schedule lacks adequate family bonding opportunities',
        action: 'protect_family_time',
        data: { currentSlots: familyTimeSlots.length, recommended: 5 },
        estimatedBenefit: 'family_bonding'
      });
    }
    
    // Activity diversity recommendations
    const diversityAnalysis = this.analyzeActivityDiversity(children, individualSchedules);
    if (diversityAnalysis.needsImprovement) {
      recommendations.push({
        type: 'diversity',
        priority: 'medium',
        title: 'Activity Diversity Enhancement',
        description: diversityAnalysis.suggestions.join(', '),
        action: 'improve_diversity',
        data: diversityAnalysis,
        estimatedBenefit: 'child_development'
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate overall optimization score for the family
   */
  calculateOptimizationScore(children, individualSchedules) {
    let score = 100;
    
    // Deduct points for conflicts across all children
    Object.values(individualSchedules).forEach(schedule => {
      score -= (schedule.conflicts?.length || 0) * 5;
    });
    
    // Deduct points for poor balance
    const balanceAnalysis = this.analyzeScheduleBalance(children, individualSchedules);
    score -= balanceAnalysis.overloadedDays * 10;
    
    // Add points for coordination opportunities used
    score += this.sharedActivities.length * 5;
    
    // Add points for family time protection
    score += this.familyTimeSlots.length * 3;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate metadata about the optimization
   */
  generateOptimizationMetadata(children, individualSchedules) {
    const totalActivities = Object.values(individualSchedules)
      .reduce((sum, schedule) => sum + (schedule.metadata?.totalActivities || 0), 0);
    
    const averageBalanceScore = Object.values(individualSchedules)
      .reduce((sum, schedule) => sum + (schedule.metadata?.balanceScore || 0), 0) / children.length;
    
    return {
      familySize: children.length,
      totalWeeklyActivities: totalActivities,
      averageChildBalanceScore: Math.round(averageBalanceScore),
      coordinationOpportunities: this.sharedActivities.length,
      carpoolPotential: this.carpoolOpportunities.length,
      familyTimeSlots: this.familyTimeSlots.length,
      optimizationDate: new Date().toISOString()
    };
  }

  // Helper methods
  getAllActivities(children, individualSchedules) {
    const allActivities = [];
    
    children.forEach(child => {
      const schedule = individualSchedules[child.id];
      if (schedule?.schedule) {
        Object.entries(schedule.schedule).forEach(([day, daySchedule]) => {
          daySchedule.events.forEach(event => {
            if (event.type === 'activity') {
              allActivities.push({
                childId: child.id,
                childName: child.name,
                childAge: this.calculateAge(child.dateOfBirth),
                day,
                event,
                location: event.location
              });
            }
          });
        });
      }
    });
    
    return allActivities;
  }

  groupSimilarActivities(activities) {
    const groups = {};
    
    activities.forEach(activity => {
      const key = `${activity.event.title}-${activity.location?.name || 'unknown'}-${activity.day}`;
      
      if (!groups[key]) {
        groups[key] = {
          activityType: activity.event.title,
          location: activity.location,
          day: activity.day,
          timeSlot: {
            start: activity.event.startTime,
            end: activity.event.endTime
          },
          children: [],
          activities: []
        };
      }
      
      groups[key].children.push({
        id: activity.childId,
        name: activity.childName,
        age: activity.childAge
      });
      groups[key].activities.push(activity.event);
    });
    
    return Object.values(groups);
  }

  checkAgeCompatibility(children) {
    if (children.length < 2) return false;
    
    const ages = children.map(child => child.age);
    const ageRange = Math.max(...ages) - Math.min(...ages);
    
    // Compatible if age range is within 3 years
    return ageRange <= 3;
  }

  checkTimeCompatibility(activities) {
    if (activities.length < 2) return false;
    
    // Check if activities are within 30 minutes of each other
    const startTimes = activities.map(activity => this.timeToMinutes(activity.startTime));
    const timeRange = Math.max(...startTimes) - Math.min(...startTimes);
    
    return timeRange <= 30;
  }

  calculateAge(dateOfBirth) {
    if (!dateOfBirth) return 5;
    const birthDate = dateOfBirth.toDate ? dateOfBirth.toDate() : new Date(dateOfBirth);
    return Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
  }

  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  analyzeCarpoolPotential(child, activity) {
    // Simplified carpool analysis - in reality would integrate with external data
    const baseScore = 0.5;
    let score = baseScore;
    let timeSavings = 0;
    let costSavings = 0;
    let stressReduction = 0.3;
    
    // Increase score based on distance and frequency
    if (activity.location?.travelTime > 20) {
      score += 0.2;
      timeSavings += activity.location.travelTime * 0.5; // 50% time savings
      costSavings += 0.25; // 25% cost reduction
    }
    
    if (activity.schedule?.days?.length > 2) {
      score += 0.1;
      stressReduction += 0.2;
    }
    
    return {
      score: Math.min(1, score),
      timeSavings,
      costSavings,
      stressReduction,
      potentialPartners: [] // Would be populated with real data
    };
  }

  findCommonFreeTime(children, individualSchedules, day) {
    const childrenFreeTime = children.map(child => {
      const schedule = individualSchedules[child.id];
      return schedule?.schedule?.[day]?.freeTimeSlots || [];
    });
    
    if (childrenFreeTime.length === 0) return [];
    
    // Find overlapping free time slots
    const commonSlots = [];
    const firstChildSlots = childrenFreeTime[0];
    
    firstChildSlots.forEach(slot => {
      const overlap = this.findTimeOverlap(slot, childrenFreeTime.slice(1));
      if (overlap) {
        commonSlots.push({
          ...overlap,
          children: children.map(child => child.id)
        });
      }
    });
    
    return commonSlots;
  }

  findTimeOverlap(slot, otherChildrenSlots) {
    let overlapStart = this.timeToMinutes(slot.startTime);
    let overlapEnd = this.timeToMinutes(slot.endTime);
    
    for (const childSlots of otherChildrenSlots) {
      let hasOverlap = false;
      
      for (const otherSlot of childSlots) {
        const otherStart = this.timeToMinutes(otherSlot.startTime);
        const otherEnd = this.timeToMinutes(otherSlot.endTime);
        
        if (otherStart < overlapEnd && otherEnd > overlapStart) {
          overlapStart = Math.max(overlapStart, otherStart);
          overlapEnd = Math.min(overlapEnd, otherEnd);
          hasOverlap = true;
          break;
        }
      }
      
      if (!hasOverlap) return null;
    }
    
    const duration = overlapEnd - overlapStart;
    if (duration <= 0) return null;
    
    return {
      startTime: this.minutesToTime(overlapStart),
      endTime: this.minutesToTime(overlapEnd),
      duration
    };
  }

  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  categorizeFamilyTime(slot) {
    const hour = Math.floor(this.timeToMinutes(slot.startTime) / 60);
    
    if (hour >= 17 && hour <= 19) return 'dinner_time';
    if (hour >= 19 && hour <= 21) return 'evening_bonding';
    if (hour >= 7 && hour <= 9) return 'morning_routine';
    if (hour >= 10 && hour <= 16) return 'weekend_activity';
    
    return 'flexible';
  }

  calculateFamilyTimePriority(slot, day) {
    let priority = slot.duration / 60; // Base priority on duration
    
    // Higher priority for weekends
    if (day === 'saturday' || day === 'sunday') {
      priority += 2;
    }
    
    // Higher priority for evening times
    const hour = Math.floor(this.timeToMinutes(slot.startTime) / 60);
    if (hour >= 17 && hour <= 20) {
      priority += 1;
    }
    
    return priority;
  }

  generateFamilyTimeActivities(slot, children) {
    const activities = [];
    const duration = slot.duration;
    const ages = children.map(child => this.calculateAge(child.dateOfBirth));
    const minAge = Math.min(...ages);
    const maxAge = Math.max(...ages);
    
    if (duration >= 120) { // 2+ hours
      activities.push('Family outing', 'Board games', 'Cooking together');
    }
    
    if (duration >= 60) { // 1+ hour
      activities.push('Story time', 'Arts and crafts', 'Outdoor play');
    }
    
    if (minAge >= 5) {
      activities.push('Family bike ride', 'Movie night', 'Educational games');
    }
    
    return activities;
  }

  groupChildrenByAge(children) {
    const groups = {
      infant: [],
      toddler: [],
      preschool: [],
      school: []
    };
    
    children.forEach(child => {
      const age = this.calculateAge(child.dateOfBirth);
      
      if (age < 2) groups.infant.push(child);
      else if (age < 4) groups.toddler.push(child);
      else if (age < 6) groups.preschool.push(child);
      else groups.school.push(child);
    });
    
    return groups;
  }

  findAgeAppropriateActivities(ageGroup) {
    const activities = {
      infant: [
        { name: 'Sensory play', timeRequirement: 30, requirements: ['Supervision'] },
        { name: 'Reading time', timeRequirement: 20, requirements: ['Quiet space'] }
      ],
      toddler: [
        { name: 'Building blocks', timeRequirement: 45, requirements: ['Play area'] },
        { name: 'Music and movement', timeRequirement: 30, requirements: ['Open space'] }
      ],
      preschool: [
        { name: 'Arts and crafts', timeRequirement: 60, requirements: ['Art supplies'] },
        { name: 'Educational games', timeRequirement: 45, requirements: ['Learning materials'] }
      ],
      school: [
        { name: 'Board games', timeRequirement: 60, requirements: ['Table space'] },
        { name: 'Science experiments', timeRequirement: 90, requirements: ['Materials', 'Supervision'] }
      ]
    };
    
    return activities[ageGroup] || [];
  }

  checkChildrenAvailability(children, individualSchedules, timeRequirement) {
    // Simplified availability check
    return {
      feasible: true,
      availableChildren: children,
      bestTimeSlot: {
        day: 'saturday',
        startTime: '10:00',
        duration: timeRequirement
      }
    };
  }

  calculateTransportationSaving(group) {
    // Estimate transportation savings from coordination
    return group.children.length * 15; // 15 minutes per child
  }

  calculateCostSaving(group) {
    // Estimate cost savings from shared activities
    return group.children.length * 0.15; // 15% cost reduction per additional child
  }

  assessFeasibility(group) {
    // Simple feasibility assessment
    return {
      score: 0.8,
      factors: ['Age compatibility', 'Schedule alignment', 'Location proximity']
    };
  }

  calculateTotalTransportationSavings(carpoolOptions) {
    return carpoolOptions.reduce((total, option) => 
      total + (option.estimatedSavings?.timeMinutes || 0), 0
    );
  }

  analyzeScheduleBalance(children, individualSchedules) {
    let overloadedDays = 0;
    let totalConflicts = 0;
    
    Object.values(individualSchedules).forEach(schedule => {
      if (schedule.metadata?.busyDays) {
        overloadedDays += schedule.metadata.busyDays;
      }
      if (schedule.conflicts) {
        totalConflicts += schedule.conflicts.length;
      }
    });
    
    return {
      overloadedDays,
      totalConflicts,
      averageBalance: Object.values(individualSchedules)
        .reduce((sum, schedule) => sum + (schedule.metadata?.balanceScore || 0), 0) / children.length
    };
  }

  analyzeActivityDiversity(children, individualSchedules) {
    const activityTypes = new Set();
    let needsImprovement = false;
    const suggestions = [];
    
    // Collect all activity types across children
    Object.values(individualSchedules).forEach(schedule => {
      if (schedule.schedule) {
        Object.values(schedule.schedule).forEach(day => {
          day.events.forEach(event => {
            if (event.metadata?.category) {
              activityTypes.add(event.metadata.category);
            }
          });
        });
      }
    });
    
    // Check for missing activity categories
    const recommendedCategories = ['physical', 'creative', 'social', 'educational', 'outdoor'];
    recommendedCategories.forEach(category => {
      if (!activityTypes.has(category)) {
        needsImprovement = true;
        suggestions.push(`Add ${category} activities`);
      }
    });
    
    return {
      needsImprovement,
      currentCategories: Array.from(activityTypes),
      missingCategories: recommendedCategories.filter(cat => !activityTypes.has(cat)),
      suggestions
    };
  }
}

// Export convenience function
export const optimizeFamilySchedule = (children, familyData, weekStart) => {
  const optimizer = new FamilyOptimizer(familyData);
  return optimizer.optimizeMultiChildSchedule(children, weekStart);
};