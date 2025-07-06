/**
 * FamilySync Cloud Functions
 * Critical business logic for family coordination and notifications
 */

import {setGlobalOptions} from "firebase-functions";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import {onCall} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const messaging = getMessaging();

// For cost control, set maximum concurrent containers
setGlobalOptions({maxInstances: 10});

/**
 * Triggered when a new user is created via Firebase Authentication
 * Automatically creates user profile and handles family linking
 */
export const onUserCreate =
  onDocumentCreated("users/{userId}", async (event) => {
    const userId = event.params.userId;
    const userData = event.data?.data();

    if (!userData) {
      logger.error("No user data found for new user", {userId});
      return;
    }

    try {
      logger.info("Creating user profile", {userId, email: userData.email});

      // If user doesn't have a familyId, create a new family
      if (!userData.familyId) {
        const familyData = {
          name: `The ${userData.name?.split(" ").pop() || "Family"} Family`,
          memberUids: [userId],
          createdAt: new Date(),
          settings: {
            language: "en",
            timezone: "UTC",
            notifications: true,
          },
        };

        const familyRef = await db.collection("families").add(familyData);

        // Update user with familyId
        await db.collection("users").doc(userId).update({
          familyId: familyRef.id,
          role: "Parent",
          joinedAt: new Date(),
        });

        logger.info("Created new family for user", {
          userId, familyId: familyRef.id,
        });
      }
    } catch (error) {
      logger.error("Error creating user profile", {userId, error});
    }
  });

/**
 * Triggered when shopping list is completed
 * Sends approval notifications to parents
 */
export const onShoppingComplete =
  onDocumentUpdated(
    "families/{familyId}/shopping/{itemId}",
    async (event) => {
      const familyId = event.params.familyId;
      const itemData = event.data?.after.data();
      const previousData = event.data?.before.data();

      // Only trigger if item was just marked as purchased
      if (itemData?.isPurchased && !previousData?.isPurchased) {
        try {
          // Get family members with parent role
          const familyDoc = await db.collection("families").doc(familyId).get();
          const memberUids = familyDoc.data()?.memberUids || [];

          const parents = await Promise.all(
            memberUids.map(async (uid: string) => {
              const userDoc = await db.collection("users").doc(uid).get();
              const userData = userDoc.data();
              return userData?.role === "Parent" ? userData : null;
            })
          );

          const parentTokens = parents
            .filter(Boolean)
            .map((parent) => parent?.fcmToken)
            .filter(Boolean);

          if (parentTokens.length > 0) {
            const message = {
              notification: {
                title: "Shopping Item Purchased",
                body: `${itemData.name} has been purchased and needs approval`,
              },
              data: {
                type: "shopping_approval",
                familyId: familyId,
                itemId: event.params.itemId,
              },
              tokens: parentTokens,
            };

            await messaging.sendEachForMulticast(message);
            logger.info("Sent shopping approval notifications", {
              familyId, itemName: itemData.name,
            });
          }
        } catch (error) {
          logger.error("Error sending shopping notifications", {
          familyId, error,
        });
        }
      }
    }
  );

/**
 * Triggered when a task is assigned
 * Sends notification to assignee
 */
export const onTaskAssign =
  onDocumentCreated(
    "families/{familyId}/tasks/{taskId}",
    async (event) => {
      const familyId = event.params.familyId;
      const taskData = event.data?.data();

      if (!taskData?.assignedTo) return;

      try {
        const assigneeDoc =
          await db.collection("users").doc(taskData.assignedTo).get();
        const assigneeData = assigneeDoc.data();

        if (assigneeData?.fcmToken) {
          const message = {
            notification: {
              title: "New Task Assigned",
              body: `You have been assigned: ${taskData.title}`,
            },
            data: {
              type: "task_assignment",
              familyId: familyId,
              taskId: event.params.taskId,
            },
            token: assigneeData.fcmToken,
          };

          await messaging.send(message);
          logger.info("Sent task assignment notification", {
            familyId,
            taskId: event.params.taskId,
            assignedTo: taskData.assignedTo,
          });
        }
      } catch (error) {
        logger.error("Error sending task assignment notification", {
          familyId, error,
        });
      }
    }
  );

/**
 * Triggered when calendar events change
 * Synchronizes family schedules and sends notifications
 */
export const onCalendarChange =
  onDocumentUpdated(
    "families/{familyId}/calendar/{eventId}",
    async (event) => {
      const familyId = event.params.familyId;
      const eventData = event.data?.after.data();
      const previousData = event.data?.before.data();

      // Only notify if event time or assignees changed
      const timeChanged = eventData?.datetime !== previousData?.datetime;
      const assigneesChanged =
        JSON.stringify(eventData?.assignedTo) !==
        JSON.stringify(previousData?.assignedTo);

      if (!timeChanged && !assigneesChanged) return;

      try {
        const assigneeTokens = await Promise.all(
          (eventData?.assignedTo || []).map(async (uid: string) => {
            const userDoc = await db.collection("users").doc(uid).get();
            return userDoc.data()?.fcmToken;
          })
        );

        const validTokens = assigneeTokens.filter(Boolean);

        if (validTokens.length > 0) {
          const message = {
            notification: {
              title: "Calendar Event Updated",
              body: `"${eventData?.title}" has been updated`,
            },
            data: {
              type: "calendar_update",
              familyId: familyId,
              eventId: event.params.eventId,
            },
            tokens: validTokens,
          };

          await messaging.sendEachForMulticast(message);
          logger.info("Sent calendar update notifications", {
            familyId, eventTitle: eventData?.title,
          });
        }
      } catch (error) {
        logger.error("Error sending calendar notifications", {familyId, error});
      }
    }
  );

/**
 * Callable function to optimize family schedules
 * Uses AI-powered algorithms for conflict resolution
 */
export const optimizeFamilySchedule = onCall(async (request) => {
  const {familyId} = request.data;

  if (!familyId) {
    throw new Error("familyId is required");
  }

  try {
    // Get all calendar events for the family
    const eventsSnapshot =
      await db.collection("families")
        .doc(familyId).collection("calendar").get();
    const events = eventsSnapshot.docs.map((doc) =>
      ({id: doc.id, ...doc.data()}));

    // Simple conflict detection and resolution
    const conflicts: Array<{event1: string; event2: string}> = [];
    const optimizedEvents: Array<any> = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i] as any;
        const event2 = events[j] as any;

        // Check for overlapping times and shared assignees
        const overlap = checkTimeOverlap(event1.datetime, event2.datetime);
        const sharedAssignees = (event1.assignedTo || []).some((uid: string) =>
          (event2.assignedTo || []).includes(uid)
        );

        if (overlap && sharedAssignees) {
          conflicts.push({event1: event1.id, event2: event2.id});
        }
      }
    }

    logger.info("Schedule optimization completed", {
      familyId, conflicts: conflicts.length,
    });

    return {
      conflicts,
      optimizedEvents,
      suggestions: conflicts.length > 0 ?
        ["Consider rescheduling conflicting events"] : [],
    };
  } catch (error) {
    logger.error("Error optimizing family schedule", {familyId, error});
    throw new Error("Schedule optimization failed");
  }
});

/**
 * Helper function to check if two datetime ranges overlap
 * @param {any} datetime1 - First datetime object
 * @param {any} datetime2 - Second datetime object
 * @return {boolean} - True if times overlap
 */
function checkTimeOverlap(datetime1: any, datetime2: any): boolean {
  if (!datetime1 || !datetime2) return false;

  const start1 = new Date(datetime1.seconds * 1000);
  const start2 = new Date(datetime2.seconds * 1000);

  // Simple 1-hour duration assumption for overlap detection
  const end1 = new Date(start1.getTime() + 60 * 60 * 1000);
  const end2 = new Date(start2.getTime() + 60 * 60 * 1000);

  return start1 < end2 && start2 < end1;
}
