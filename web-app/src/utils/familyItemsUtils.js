import { doc, setDoc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Get family item database
export const getFamilyItems = async (familyId) => {
  try {
    const itemsRef = doc(db, 'families', familyId, 'data', 'items');
    const itemsDoc = await getDoc(itemsRef);
    
    if (itemsDoc.exists()) {
      return itemsDoc.data().items || {};
    }
    
    return {};
  } catch (error) {
    console.error('Error fetching family items:', error);
    throw error;
  }
};

// Search family items by name
export const searchFamilyItems = async (familyId, searchTerm) => {
  try {
    const items = await getFamilyItems(familyId);
    const searchLower = searchTerm.toLowerCase();
    
    return Object.entries(items)
      .filter(([key, item]) => 
        item.name.toLowerCase().includes(searchLower) ||
        key.toLowerCase().includes(searchLower)
      )
      .map(([key, item]) => ({ key, ...item }));
  } catch (error) {
    console.error('Error searching family items:', error);
    throw error;
  }
};

// Create or update family item
export const createOrUpdateFamilyItem = async (familyId, itemKey, itemData, userId) => {
  try {
    const itemsRef = doc(db, 'families', familyId, 'data', 'items');
    const currentItems = await getFamilyItems(familyId);
    
    const itemId = itemKey.toLowerCase().replace(/\s+/g, '_');
    
    const newItem = {
      id: `familyitem_${itemId}`,
      name: itemData.name || itemKey,
      category: itemData.category || 'general',
      referencePhotoUrl: itemData.referencePhotoUrl || null,
      guidanceNotes: itemData.guidanceNotes || '',
      purchaseHistory: currentItems[itemId]?.purchaseHistory || [],
      familiarityLevel: currentItems[itemId]?.familiarityLevel || 'new',
      lastUpdated: Timestamp.now(),
      createdBy: currentItems[itemId]?.createdBy || userId
    };

    const updatedItems = {
      ...currentItems,
      [itemId]: newItem
    };

    await setDoc(itemsRef, { items: updatedItems }, { merge: true });
    
    return itemId;
  } catch (error) {
    console.error('Error creating/updating family item:', error);
    throw error;
  }
};

// Update item familiarity based on purchase
export const updateItemFamiliarity = async (familyId, itemKey, userId) => {
  try {
    const itemsRef = doc(db, 'families', familyId, 'data', 'items');
    const currentItems = await getFamilyItems(familyId);
    const itemId = itemKey.toLowerCase().replace(/\s+/g, '_');
    
    if (!currentItems[itemId]) return;
    
    const item = currentItems[itemId];
    const purchaseHistory = item.purchaseHistory || [];
    
    // Add purchase to history
    purchaseHistory.push({
      date: Timestamp.now(),
      purchasedBy: userId,
      successful: true
    });
    
    // Update familiarity level based on purchase count
    let familiarityLevel = 'new';
    if (purchaseHistory.length >= 3) {
      familiarityLevel = 'experienced';
    } else if (purchaseHistory.length >= 1) {
      familiarityLevel = 'learning';
    }
    
    const updatedItems = {
      ...currentItems,
      [itemId]: {
        ...item,
        purchaseHistory,
        familiarityLevel,
        lastUpdated: Timestamp.now()
      }
    };
    
    await setDoc(itemsRef, { items: updatedItems }, { merge: true });
  } catch (error) {
    console.error('Error updating item familiarity:', error);
    throw error;
  }
};

// Get item familiarity status
export const getItemStatus = (item) => {
  if (!item) return 'new';
  
  const purchaseCount = item.purchaseHistory?.length || 0;
  
  if (purchaseCount >= 3) return 'experienced';
  if (purchaseCount >= 1) return 'learning';
  return 'new';
};

// Get item display icon
export const getItemIcon = (item) => {
  if (!item) return '';
  
  const status = getItemStatus(item);
  
  switch (status) {
    case 'experienced':
      return '✅';
    case 'learning':
      return '💡';
    default:
      return '';
  }
};