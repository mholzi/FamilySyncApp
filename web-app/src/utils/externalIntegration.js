import { collection, addDoc, doc, updateDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export class ExternalIntegration {
  constructor(familyId) {
    this.familyId = familyId;
    this.integrationTypes = {
      school: 'school_calendar',
      activity: 'activity_provider',
      payment: 'payment_tracker',
      communication: 'communication_platform'
    };
  }

  /**
   * Sync school calendar events
   * @param {string} schoolId - School identifier
   * @param {Array} children - Children attending this school
   * @returns {Promise<Object>} Sync results
   */
  async syncSchoolCalendar(schoolId, children) {
    try {
      // In a real implementation, this would connect to school APIs
      const schoolEvents = await this.fetchSchoolEvents(schoolId);
      const familyEvents = this.mapSchoolEventsToFamily(schoolEvents, children);
      
      const syncResults = await this.updateFamilyCalendar(familyEvents);
      
      // Track integration success
      await this.logIntegrationActivity({
        type: this.integrationTypes.school,
        schoolId,
        eventsProcessed: familyEvents.length,
        status: 'success',
        timestamp: new Date()
      });
      
      return {
        success: true,
        eventsAdded: syncResults.added,
        eventsUpdated: syncResults.updated,
        eventsRemoved: syncResults.removed,
        lastSync: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('School calendar sync failed:', error);
      await this.logIntegrationActivity({
        type: this.integrationTypes.school,
        schoolId,
        status: 'failed',
        error: error.message,
        timestamp: new Date()
      });
      
      throw new Error(`School calendar sync failed: ${error.message}`);
    }
  }

  /**
   * Fetch school events (mock implementation)
   */
  async fetchSchoolEvents(schoolId) {
    // In production, this would connect to actual school systems
    // For now, return mock school events
    return this.getMockSchoolEvents(schoolId);
  }

  /**
   * Mock school events for demonstration
   */
  getMockSchoolEvents(schoolId) {
    const currentYear = new Date().getFullYear();
    const events = [
      {
        id: 'school-holiday-christmas',
        title: 'Christmas Holiday',
        type: 'holiday',
        startDate: `${currentYear}-12-23`,
        endDate: `${currentYear}-12-31`,
        allDay: true,
        description: 'School closed for Christmas holiday',
        affectsSchedule: true
      },
      {
        id: 'school-holiday-easter',
        title: 'Easter Break',
        type: 'holiday',
        startDate: `${currentYear + 1}-04-14`,
        endDate: `${currentYear + 1}-04-18`,
        allDay: true,
        description: 'School closed for Easter break',
        affectsSchedule: true
      },
      {
        id: 'school-event-sports-day',
        title: 'Sports Day',
        type: 'event',
        startDate: `${currentYear + 1}-06-15`,
        startTime: '09:00',
        endTime: '15:00',
        allDay: false,
        description: 'Annual school sports day - parents welcome',
        affectsSchedule: false,
        requiresParentAttendance: true
      },
      {
        id: 'school-meeting-parent-teacher',
        title: 'Parent-Teacher Conferences',
        type: 'meeting',
        startDate: `${currentYear + 1}-03-20`,
        startTime: '16:00',
        endTime: '19:00',
        allDay: false,
        description: 'Individual parent-teacher meetings',
        requiresParentAttendance: true,
        requiresScheduling: true
      },
      {
        id: 'school-deadline-registration',
        title: 'Next Year Registration Deadline',
        type: 'deadline',
        startDate: `${currentYear + 1}-05-01`,
        allDay: true,
        description: 'Deadline for next academic year registration',
        actionRequired: true,
        category: 'administrative'
      }
    ];

    return events.map(event => ({
      ...event,
      schoolId,
      source: 'school_calendar',
      importedAt: new Date().toISOString()
    }));
  }

  /**
   * Map school events to family calendar format
   */
  mapSchoolEventsToFamily(schoolEvents, children) {
    const familyEvents = [];

    schoolEvents.forEach(schoolEvent => {
      children.forEach(child => {
        const familyEvent = {
          id: `${schoolEvent.id}-${child.id}`,
          externalId: schoolEvent.id,
          title: schoolEvent.title,
          description: schoolEvent.description,
          type: 'external_event',
          subType: schoolEvent.type,
          source: 'school',
          sourceId: schoolEvent.schoolId,
          
          // Child association
          childId: child.id,
          childName: child.name,
          
          // Timing
          startDate: schoolEvent.startDate,
          endDate: schoolEvent.endDate || schoolEvent.startDate,
          startTime: schoolEvent.startTime,
          endTime: schoolEvent.endTime,
          allDay: schoolEvent.allDay,
          
          // Metadata
          affectsSchedule: schoolEvent.affectsSchedule,
          requiresParentAttendance: schoolEvent.requiresParentAttendance,
          requiresScheduling: schoolEvent.requiresScheduling,
          actionRequired: schoolEvent.actionRequired,
          category: schoolEvent.category || 'school',
          
          // Family-specific data
          familyId: this.familyId,
          importedAt: new Date(),
          lastUpdated: new Date(),
          status: 'active'
        };

        // Add reminders for important events
        if (schoolEvent.requiresParentAttendance || schoolEvent.actionRequired) {
          familyEvent.reminders = this.generateEventReminders(schoolEvent);
        }

        // Add preparation requirements
        if (schoolEvent.type === 'event') {
          familyEvent.preparation = this.generateEventPreparation(schoolEvent);
        }

        familyEvents.push(familyEvent);
      });
    });

    return familyEvents;
  }

  /**
   * Update family calendar with external events
   */
  async updateFamilyCalendar(familyEvents) {
    const results = { added: 0, updated: 0, removed: 0 };

    for (const event of familyEvents) {
      try {
        // Check if event already exists
        const existingEvents = await getDocs(
          query(
            collection(db, 'externalEvents'),
            where('externalId', '==', event.externalId),
            where('familyId', '==', this.familyId),
            where('childId', '==', event.childId)
          )
        );

        if (existingEvents.empty) {
          // Add new event
          await addDoc(collection(db, 'externalEvents'), event);
          results.added++;
        } else {
          // Update existing event
          const existingDoc = existingEvents.docs[0];
          await updateDoc(existingDoc.ref, {
            ...event,
            lastUpdated: new Date()
          });
          results.updated++;
        }
      } catch (error) {
        console.error('Error updating calendar event:', error);
      }
    }

    return results;
  }

  /**
   * Generate reminders for important events
   */
  generateEventReminders(schoolEvent) {
    const reminders = [];

    if (schoolEvent.requiresParentAttendance) {
      reminders.push({
        type: 'attendance',
        timing: '1_day_before',
        message: `Don't forget: ${schoolEvent.title} tomorrow`,
        action: 'calendar_reminder'
      });
    }

    if (schoolEvent.actionRequired) {
      reminders.push({
        type: 'action',
        timing: '1_week_before',
        message: `Action required: ${schoolEvent.title}`,
        action: 'task_reminder'
      });
    }

    if (schoolEvent.requiresScheduling) {
      reminders.push({
        type: 'scheduling',
        timing: '2_weeks_before',
        message: `Schedule your appointment for ${schoolEvent.title}`,
        action: 'scheduling_prompt'
      });
    }

    return reminders;
  }

  /**
   * Generate preparation requirements for events
   */
  generateEventPreparation(schoolEvent) {
    const preparation = [];

    switch (schoolEvent.type) {
      case 'event':
        if (schoolEvent.title.toLowerCase().includes('sports')) {
          preparation.push('Comfortable clothes', 'Water bottle', 'Sunscreen');
        } else if (schoolEvent.title.toLowerCase().includes('concert')) {
          preparation.push('Nice clothes', 'Camera', 'Flowers for performers');
        }
        break;
      case 'meeting':
        preparation.push('Questions list', 'Previous reports', 'Notebook');
        break;
      default:
        preparation.push('Check requirements');
    }

    return preparation;
  }

  /**
   * Sync activity provider schedules
   */
  async syncActivityProvider(providerId, activityType, children) {
    try {
      const providerEvents = await this.fetchProviderEvents(providerId, activityType);
      const familyEvents = this.mapProviderEventsToFamily(providerEvents, children, activityType);
      
      const syncResults = await this.updateFamilyCalendar(familyEvents);
      
      await this.logIntegrationActivity({
        type: this.integrationTypes.activity,
        providerId,
        activityType,
        eventsProcessed: familyEvents.length,
        status: 'success',
        timestamp: new Date()
      });
      
      return {
        success: true,
        provider: providerId,
        activityType,
        eventsAdded: syncResults.added,
        eventsUpdated: syncResults.updated,
        lastSync: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Activity provider sync failed:', error);
      throw new Error(`Activity provider sync failed: ${error.message}`);
    }
  }

  /**
   * Track payment and registration deadlines
   */
  async trackPaymentDeadlines(activities) {
    const deadlines = [];

    activities.forEach(activity => {
      if (activity.payment && activity.payment.dueDate) {
        deadlines.push({
          type: 'payment',
          activityId: activity.id,
          activityName: activity.name,
          amount: activity.payment.amount,
          dueDate: activity.payment.dueDate,
          status: activity.payment.status || 'pending',
          reminders: this.generatePaymentReminders(activity.payment.dueDate)
        });
      }

      if (activity.registration && activity.registration.deadline) {
        deadlines.push({
          type: 'registration',
          activityId: activity.id,
          activityName: activity.name,
          deadline: activity.registration.deadline,
          status: activity.registration.status || 'pending',
          reminders: this.generateRegistrationReminders(activity.registration.deadline)
        });
      }
    });

    // Store deadlines in database
    for (const deadline of deadlines) {
      await addDoc(collection(db, 'paymentDeadlines'), {
        ...deadline,
        familyId: this.familyId,
        createdAt: new Date()
      });
    }

    return deadlines;
  }

  /**
   * Generate payment reminders
   */
  generatePaymentReminders(dueDate) {
    const due = new Date(dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    const reminders = [];

    if (daysUntilDue > 7) {
      reminders.push({
        timing: '1_week_before',
        message: 'Payment due in one week',
        urgency: 'medium'
      });
    }

    if (daysUntilDue > 1) {
      reminders.push({
        timing: '2_days_before',
        message: 'Payment due soon',
        urgency: 'high'
      });
    }

    return reminders;
  }

  /**
   * Generate registration reminders
   */
  generateRegistrationReminders(deadline) {
    const due = new Date(deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    const reminders = [];

    if (daysUntilDeadline > 14) {
      reminders.push({
        timing: '2_weeks_before',
        message: 'Registration deadline approaching',
        urgency: 'low'
      });
    }

    if (daysUntilDeadline > 3) {
      reminders.push({
        timing: '3_days_before',
        message: 'Registration deadline is soon',
        urgency: 'high'
      });
    }

    return reminders;
  }

  /**
   * Get integration status for dashboard
   */
  async getIntegrationStatus() {
    try {
      const integrationLogs = await getDocs(
        query(
          collection(db, 'integrationLogs'),
          where('familyId', '==', this.familyId)
        )
      );

      const status = {
        school: { connected: false, lastSync: null, events: 0 },
        activities: { connected: false, lastSync: null, events: 0 },
        payments: { tracked: 0, overdue: 0 }
      };

      integrationLogs.forEach(doc => {
        const log = doc.data();
        
        if (log.type === this.integrationTypes.school) {
          status.school.connected = log.status === 'success';
          status.school.lastSync = log.timestamp;
          status.school.events += log.eventsProcessed || 0;
        }
        
        if (log.type === this.integrationTypes.activity) {
          status.activities.connected = log.status === 'success';
          status.activities.lastSync = log.timestamp;
          status.activities.events += log.eventsProcessed || 0;
        }
      });

      // Get payment status
      const paymentDeadlines = await getDocs(
        query(
          collection(db, 'paymentDeadlines'),
          where('familyId', '==', this.familyId)
        )
      );

      paymentDeadlines.forEach(doc => {
        const deadline = doc.data();
        status.payments.tracked++;
        
        if (deadline.type === 'payment' && deadline.status === 'overdue') {
          status.payments.overdue++;
        }
      });

      return status;
      
    } catch (error) {
      console.error('Error getting integration status:', error);
      return null;
    }
  }

  /**
   * Log integration activity
   */
  async logIntegrationActivity(activity) {
    try {
      await addDoc(collection(db, 'integrationLogs'), {
        ...activity,
        familyId: this.familyId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error logging integration activity:', error);
    }
  }

  /**
   * Mock provider events (for demonstration)
   */
  async fetchProviderEvents(providerId, activityType) {
    // Mock implementation - would connect to real APIs
    return [
      {
        id: `${providerId}-session-1`,
        title: `${activityType} Session`,
        type: 'session',
        startDate: '2024-01-15',
        startTime: '16:00',
        endTime: '17:00',
        recurring: true,
        frequency: 'weekly'
      }
    ];
  }

  /**
   * Map provider events to family format
   */
  mapProviderEventsToFamily(providerEvents, children, activityType) {
    const familyEvents = [];

    providerEvents.forEach(event => {
      children.forEach(child => {
        familyEvents.push({
          id: `${event.id}-${child.id}`,
          externalId: event.id,
          title: event.title,
          type: 'external_event',
          subType: 'activity_session',
          source: 'activity_provider',
          activityType,
          childId: child.id,
          familyId: this.familyId,
          startDate: event.startDate,
          startTime: event.startTime,
          endTime: event.endTime,
          recurring: event.recurring,
          frequency: event.frequency,
          importedAt: new Date()
        });
      });
    });

    return familyEvents;
  }

  /**
   * Clean up old external events
   */
  async cleanupOldEvents(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldEvents = await getDocs(
        query(
          collection(db, 'externalEvents'),
          where('familyId', '==', this.familyId),
          where('importedAt', '<', cutoffDate)
        )
      );

      const deletePromises = oldEvents.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      return oldEvents.size;
    } catch (error) {
      console.error('Error cleaning up old events:', error);
      return 0;
    }
  }
}

// Convenience functions
export const syncSchoolCalendar = (familyId, schoolId, children) => {
  const integration = new ExternalIntegration(familyId);
  return integration.syncSchoolCalendar(schoolId, children);
};

export const getIntegrationStatus = (familyId) => {
  const integration = new ExternalIntegration(familyId);
  return integration.getIntegrationStatus();
};

export const trackPayments = (familyId, activities) => {
  const integration = new ExternalIntegration(familyId);
  return integration.trackPaymentDeadlines(activities);
};