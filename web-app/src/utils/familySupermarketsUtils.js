import { db } from '../firebase';
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  getDoc,
  Timestamp 
} from 'firebase/firestore';

/**
 * Get all supermarkets created by a family
 */
export const getFamilySupermarkets = async (familyId) => {
  try {
    const familyRef = doc(db, 'families', familyId);
    const familyDoc = await getDoc(familyRef);
    
    if (familyDoc.exists()) {
      return familyDoc.data().supermarkets || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching family supermarkets:', error);
    throw error;
  }
};

/**
 * Create a new supermarket for a family
 */
export const createFamilySupermarket = async (familyId, supermarketData, userId) => {
  try {
    const supermarket = {
      id: `supermarket_${Date.now()}`,
      name: supermarketData.name.trim(),
      address: supermarketData.address.trim(),
      logo: supermarketData.logo || '🏪',
      color: supermarketData.color || '#666666',
      createdBy: userId,
      createdAt: Timestamp.now(),
      lastUsed: Timestamp.now()
    };

    const familyRef = doc(db, 'families', familyId);
    await updateDoc(familyRef, {
      supermarkets: arrayUnion(supermarket)
    });

    return supermarket;
  } catch (error) {
    console.error('Error creating family supermarket:', error);
    throw error;
  }
};

/**
 * Update the lastUsed timestamp for a supermarket when it's selected
 */
export const updateSupermarketLastUsed = async (familyId, supermarketId) => {
  try {
    const familyRef = doc(db, 'families', familyId);
    const familyDoc = await getDoc(familyRef);
    
    if (familyDoc.exists()) {
      const supermarkets = familyDoc.data().supermarkets || [];
      const updatedSupermarkets = supermarkets.map(supermarket => 
        supermarket.id === supermarketId 
          ? { ...supermarket, lastUsed: Timestamp.now() }
          : supermarket
      );
      
      await updateDoc(familyRef, {
        supermarkets: updatedSupermarkets
      });
    }
  } catch (error) {
    console.error('Error updating supermarket last used:', error);
    // Don't throw error as this is not critical
  }
};

/**
 * Get a default logo for supermarket based on name
 */
export const getSupermarketLogo = (name) => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('rewe')) return '🛒';
  if (lowerName.includes('edeka')) return '🍃';
  if (lowerName.includes('aldi')) return '💰';
  if (lowerName.includes('lidl')) return '🔵';
  if (lowerName.includes('kaufland')) return '🏪';
  if (lowerName.includes('netto')) return '🅝';
  if (lowerName.includes('penny')) return '🪙';
  if (lowerName.includes('real')) return '🏬';
  if (lowerName.includes('dm')) return '💊';
  if (lowerName.includes('rossmann')) return '💄';
  if (lowerName.includes('market') || lowerName.includes('markt')) return '🏪';
  if (lowerName.includes('bio') || lowerName.includes('organic')) return '🌱';
  
  return '🏪'; // Default store icon
};

/**
 * Get a color for supermarket based on name
 */
export const getSupermarketColor = (name) => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('rewe')) return '#FF0000';
  if (lowerName.includes('edeka')) return '#0066CC';
  if (lowerName.includes('aldi')) return '#0099CC';
  if (lowerName.includes('lidl')) return '#0050AA';
  if (lowerName.includes('kaufland')) return '#FF6600';
  if (lowerName.includes('netto')) return '#FFD700';
  if (lowerName.includes('penny')) return '#FF4500';
  if (lowerName.includes('real')) return '#FF1493';
  if (lowerName.includes('dm')) return '#8A2BE2';
  if (lowerName.includes('rossmann')) return '#FF69B4';
  if (lowerName.includes('bio') || lowerName.includes('organic')) return '#228B22';
  
  return '#666666'; // Default gray
};