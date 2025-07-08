import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Event Override Schema
 * Allows one-off modifications to routine events without changing the underlying routine
 */
export const createEventOverride = async (familyId, overrideData) => {
  try {
    const overrideId = `${overrideData.eventType}_${overrideData.date}_${overrideData.childId}_${overrideData.time}`;
    const overrideRef = doc(db, 'families', familyId, 'eventOverrides', overrideId);
    
    await setDoc(overrideRef, {
      ...overrideData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    return overrideId;
  } catch (error) {
    console.error('Error creating event override:', error);
    throw error;
  }
};

/**
 * Delete an event override
 */
export const deleteEventOverride = async (familyId, overrideId) => {
  try {
    await deleteDoc(doc(db, 'families', familyId, 'eventOverrides', overrideId));
  } catch (error) {
    console.error('Error deleting event override:', error);
    throw error;
  }
};

/**
 * Subscribe to event overrides for a family
 */
export const subscribeToEventOverrides = (familyId, callback) => {
  if (!familyId) return null;
  
  const q = query(
    collection(db, 'families', familyId, 'eventOverrides')
  );
  
  return onSnapshot(q, (snapshot) => {
    const overrides = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      overrides[doc.id] = data;
    });
    callback(overrides);
  });
};

/**
 * Check if an event is overridden
 */
export const getEventOverride = (overrides, eventType, date, childId, time) => {
  const overrideId = `${eventType}_${date}_${childId}_${time}`;
  return overrides[overrideId];
};

/**
 * Apply override to an event
 */
export const applyEventOverride = (event, override) => {
  if (!override) return event;
  
  // If event is cancelled
  if (override.cancelled) {
    return null;
  }
  
  // Apply modifications
  return {
    ...event,
    title: override.title || event.title,
    description: override.description || event.description,
    time: override.newTime || override.time || event.time, // Use newTime if available, fallback to time, then original
    responsibility: override.responsibility || event.responsibility,
    location: override.location || event.location,
    additionalInfo: override.additionalInfo || event.additionalInfo,
    isModified: true,
    overrideId: override.id
  };
};