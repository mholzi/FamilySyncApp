import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Task Template Service for FamilySync
 * Manages task templates with childcare/household focus
 */
class TaskTemplateService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get all task templates for a family
   * @param {string} familyId - Family identifier
   * @returns {Promise<Array>} Array of task templates
   */
  async getFamilyTemplates(familyId) {
    try {
      const cacheKey = `templates_${familyId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }

      const q = query(
        collection(db, 'families', familyId, 'taskTemplates'),
        orderBy('name', 'asc')
      );

      const snapshot = await getDocs(q);
      const templates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Cache the results
      this.cache.set(cacheKey, {
        data: templates,
        timestamp: Date.now()
      });

      return templates;
    } catch (error) {
      console.error('Error fetching family templates:', error);
      throw new Error(`Failed to get family templates: ${error.message}`);
    }
  }

  /**
   * Get system default templates
   * @returns {Array} Array of default templates
   */
  getDefaultTemplates() {
    return [
      {
        id: 'general-cleaning',
        name: 'General Cleaning',
        category: 'cleaning',
        defaultTitle: 'Clean [Room]',
        defaultDescription: 'General cleaning tasks for household rooms',
        defaultInstructions: `
          <h3>General Cleaning Steps:</h3>
          <ol>
            <li>Dust all surfaces (tables, shelves, windowsills)</li>
            <li>Vacuum or sweep floor</li>
            <li>Wipe down surfaces with appropriate cleaner</li>
            <li>Empty trash if needed</li>
            <li>Organize any items that are out of place</li>
          </ol>
          <p><strong>Note:</strong> Room-specific instructions will be added based on selection.</p>
        `,
        defaultDifficulty: 'easy',
        defaultEstimatedTime: 30,
        defaultPriority: 'medium',
        examplePhotos: [],
        culturalContext: '',
        isSystemTemplate: true,
        needsRoomSelection: true
      },
      {
        id: 'tidying-kids-rooms',
        name: 'Tidying Kids\' Rooms',
        category: 'organization',
        defaultTitle: 'Tidy [Child\'s Name]\'s Room',
        defaultDescription: 'Organize toys, clothes, and books in children\'s rooms',
        defaultInstructions: `
          <h3>Kids' Room Organization:</h3>
          <ol>
            <li>Put toys back in their designated bins/shelves</li>
            <li>Organize books on bookshelf</li>
            <li>Put dirty clothes in laundry basket</li>
            <li>Fold and put away clean clothes</li>
            <li>Make the bed</li>
            <li>Check under the bed for hidden items</li>
          </ol>
          <p><strong>Safety Note:</strong> Check for any small parts that might be choking hazards.</p>
        `,
        defaultDifficulty: 'easy',
        defaultEstimatedTime: 20,
        defaultPriority: 'medium',
        examplePhotos: [],
        culturalContext: 'Teaching children to keep organized spaces helps them develop good habits.',
        isSystemTemplate: true,
        hasContextualField: true
      },
      {
        id: 'laundry',
        name: 'Laundry',
        category: 'cleaning',
        defaultTitle: 'Do Laundry',
        defaultDescription: 'Wash, dry, and fold family laundry',
        defaultInstructions: `
          <h3>Laundry Process:</h3>
          <ol>
            <li>Sort clothes by color and fabric type</li>
            <li>Check pockets for items</li>
            <li>Load washing machine (don't overfill)</li>
            <li>Add appropriate detergent</li>
            <li>Select correct wash cycle</li>
            <li>Transfer to dryer or hang to dry</li>
            <li>Fold and put away when dry</li>
          </ol>
          <p><strong>Important:</strong> Check care labels for special instructions.</p>
        `,
        defaultDifficulty: 'moderate',
        defaultEstimatedTime: 45,
        defaultPriority: 'medium',
        examplePhotos: [],
        culturalContext: 'We separate whites, colors, and delicates carefully to keep clothes looking their best.',
        isSystemTemplate: true,
        hasContextualField: true
      },
      {
        id: 'vacuuming',
        name: 'Vacuuming',
        category: 'cleaning',
        defaultTitle: 'Vacuum [Area]',
        defaultDescription: 'Vacuum carpets and rugs, focusing on kids\' play areas',
        defaultInstructions: `
          <h3>Vacuuming Guide:</h3>
          <ol>
            <li>Pick up toys and small items from floor</li>
            <li>Move light furniture if needed</li>
            <li>Vacuum thoroughly, especially high-traffic areas</li>
            <li>Pay special attention to corners and under furniture</li>
            <li>Empty vacuum bag/canister if full</li>
            <li>Put furniture back in place</li>
          </ol>
          <p><strong>Focus Areas:</strong> Playroom, living room, and bedrooms.</p>
        `,
        defaultDifficulty: 'easy',
        defaultEstimatedTime: 25,
        defaultPriority: 'low',
        examplePhotos: [],
        culturalContext: '',
        isSystemTemplate: true
      },
      {
        id: 'dishwasher',
        name: 'Dishwasher',
        category: 'cleaning',
        defaultTitle: 'Load/Unload Dishwasher',
        defaultDescription: 'Manage dishwasher after family meals',
        defaultInstructions: `
          <h3>Dishwasher Management:</h3>
          <h4>Loading:</h4>
          <ul>
            <li>Rinse dishes if needed</li>
            <li>Load plates, bowls, and cups on top rack</li>
            <li>Place pots and pans on bottom rack</li>
            <li>Put silverware in basket (mix up/down)</li>
            <li>Add detergent and start cycle</li>
          </ul>
          <h4>Unloading:</h4>
          <ul>
            <li>Start with bottom rack (less hot)</li>
            <li>Put dishes away in correct locations</li>
            <li>Check for items that need hand washing</li>
          </ul>
        `,
        defaultDifficulty: 'easy',
        defaultEstimatedTime: 15,
        defaultPriority: 'medium',
        examplePhotos: [],
        culturalContext: '',
        isSystemTemplate: true
      },
      {
        id: 'trash-recycling',
        name: 'Trash & Recycling',
        category: 'maintenance',
        defaultTitle: 'Take Out Trash/Recycling',
        defaultDescription: 'Empty household trash and manage recycling',
        defaultInstructions: `
          <h3>Waste Management:</h3>
          <ol>
            <li>Empty all trash bins throughout the house</li>
            <li>Replace trash bags</li>
            <li>Take full bags to outdoor bins</li>
            <li>Sort recycling items properly</li>
            <li>Take recycling to curb on collection day</li>
          </ol>
          <p><strong>Collection Day:</strong> Check family calendar for pickup schedule.</p>
        `,
        defaultDifficulty: 'easy',
        defaultEstimatedTime: 10,
        defaultPriority: 'low',
        examplePhotos: [],
        culturalContext: '',
        isSystemTemplate: true
      },
      {
        id: 'bed-making',
        name: 'Bed Making',
        category: 'organization',
        defaultTitle: 'Make Beds',
        defaultDescription: 'Make beds in kids\' rooms and guest areas',
        defaultInstructions: `
          <h3>Bed Making Steps:</h3>
          <ol>
            <li>Strip and straighten bottom sheet</li>
            <li>Smooth out top sheet</li>
            <li>Arrange blankets and comforter</li>
            <li>Fluff and arrange pillows</li>
            <li>Organize stuffed animals (for kids' beds)</li>
          </ol>
          <p><strong>Kids' Beds:</strong> Let children help when possible to teach responsibility.</p>
        `,
        defaultDifficulty: 'easy',
        defaultEstimatedTime: 10,
        defaultPriority: 'low',
        examplePhotos: [],
        culturalContext: '',
        isSystemTemplate: true
      },
      {
        id: 'kids-bathroom',
        name: 'Kids\' Bathroom Maintenance',
        category: 'cleaning',
        defaultTitle: 'Clean Kids\' Bathroom',
        defaultDescription: 'Basic cleaning and restocking of children\'s bathroom',
        defaultInstructions: `
          <h3>Kids' Bathroom Care:</h3>
          <ol>
            <li>Wipe down sink and counter</li>
            <li>Clean toilet (seat, bowl, base)</li>
            <li>Sweep and mop floor</li>
            <li>Restock toilet paper, soap, towels</li>
            <li>Organize bath toys</li>
            <li>Check that step stools are stable</li>
          </ol>
          <p><strong>Safety:</strong> Use child-safe cleaning products and ensure good ventilation.</p>
        `,
        defaultDifficulty: 'moderate',
        defaultEstimatedTime: 20,
        defaultPriority: 'medium',
        examplePhotos: [],
        culturalContext: 'Keeping the kids\' bathroom clean and safe is important for their health and hygiene habits.',
        isSystemTemplate: true,
        hasContextualField: true
      },
      {
        id: 'kids-closet-organization',
        name: 'Kids\' Closet Organization',
        category: 'organization',
        defaultTitle: 'Organize [Child\'s Name]\'s Closet',
        defaultDescription: 'Seasonal clothes organization and closet tidying',
        defaultInstructions: `
          <h3>Closet Organization:</h3>
          <ol>
            <li>Sort clothes by type (shirts, pants, dresses, etc.)</li>
            <li>Check for outgrown items</li>
            <li>Organize by season (current season front)</li>
            <li>Fold and arrange items neatly</li>
            <li>Organize shoes on rack or in bins</li>
            <li>Check for clothes that need washing</li>
          </ol>
          <p><strong>Seasonal Note:</strong> Store out-of-season clothes in bins or back of closet.</p>
        `,
        defaultDifficulty: 'moderate',
        defaultEstimatedTime: 40,
        defaultPriority: 'low',
        examplePhotos: [],
        culturalContext: 'We rotate seasonal clothes to make getting dressed easier and keep the closet organized.',
        isSystemTemplate: true,
        hasContextualField: true
      },
      {
        id: 'playroom-deep-clean',
        name: 'Playroom Deep Clean',
        category: 'cleaning',
        defaultTitle: 'Deep Clean Playroom',
        defaultDescription: 'Thorough cleaning and organization of play areas',
        defaultInstructions: `
          <h3>Playroom Deep Clean:</h3>
          <ol>
            <li>Sort toys by type and put in appropriate bins</li>
            <li>Wipe down all surfaces (tables, shelves, toy boxes)</li>
            <li>Vacuum or sweep floor thoroughly</li>
            <li>Sanitize frequently-touched toys</li>
            <li>Organize books and games</li>
            <li>Check for broken toys (remove if unsafe)</li>
            <li>Dust all surfaces including decorations</li>
          </ol>
          <p><strong>Safety Check:</strong> Look for small parts, broken pieces, or choking hazards.</p>
        `,
        defaultDifficulty: 'complex',
        defaultEstimatedTime: 60,
        defaultPriority: 'medium',
        examplePhotos: [],
        culturalContext: '',
        isSystemTemplate: true
      },
      {
        id: 'outdoor-toys-maintenance',
        name: 'Kids\' Outdoor Toys Maintenance',
        category: 'maintenance',
        defaultTitle: 'Maintain Outdoor Toys',
        defaultDescription: 'Clean and organize outdoor play equipment',
        defaultInstructions: `
          <h3>Outdoor Toy Care:</h3>
          <ol>
            <li>Rinse sand and dirt off toys</li>
            <li>Wipe down with appropriate cleaner</li>
            <li>Check for damage or wear</li>
            <li>Organize in storage shed or garage</li>
            <li>Drain any water from toys</li>
            <li>Check that all parts are present</li>
          </ol>
          <p><strong>Weather Note:</strong> Bring in toys during harsh weather to prevent damage.</p>
        `,
        defaultDifficulty: 'easy',
        defaultEstimatedTime: 25,
        defaultPriority: 'low',
        examplePhotos: [],
        culturalContext: '',
        isSystemTemplate: true
      }
    ];
  }

  /**
   * Create a new task template
   * @param {string} familyId - Family identifier
   * @param {Object} templateData - Template data
   * @returns {Promise<string>} Created template ID
   */
  async createTemplate(familyId, templateData) {
    try {
      const templateRef = await addDoc(collection(db, 'families', familyId, 'taskTemplates'), {
        ...templateData,
        familyId,
        isSystemTemplate: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Clear cache
      this.cache.delete(`templates_${familyId}`);

      return templateRef.id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw new Error(`Failed to create template: ${error.message}`);
    }
  }

  /**
   * Update an existing template
   * @param {string} familyId - Family identifier
   * @param {string} templateId - Template identifier
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updateTemplate(familyId, templateId, updates) {
    try {
      const templateRef = doc(db, 'families', familyId, 'taskTemplates', templateId);
      
      await updateDoc(templateRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      // Clear cache
      this.cache.delete(`templates_${familyId}`);
    } catch (error) {
      console.error('Error updating template:', error);
      throw new Error(`Failed to update template: ${error.message}`);
    }
  }

  /**
   * Delete a template
   * @param {string} familyId - Family identifier
   * @param {string} templateId - Template identifier
   * @returns {Promise<void>}
   */
  async deleteTemplate(familyId, templateId) {
    try {
      const templateRef = doc(db, 'families', familyId, 'taskTemplates', templateId);
      await deleteDoc(templateRef);

      // Clear cache
      this.cache.delete(`templates_${familyId}`);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  }

  /**
   * Initialize default templates for a family
   * @param {string} familyId - Family identifier
   * @returns {Promise<void>}
   */
  async initializeDefaultTemplates(familyId) {
    try {
      const batch = writeBatch(db);
      const defaultTemplates = this.getDefaultTemplates();

      defaultTemplates.forEach(template => {
        const templateRef = doc(collection(db, 'families', familyId, 'taskTemplates'));
        batch.set(templateRef, {
          ...template,
          familyId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      
      // Clear cache
      this.cache.delete(`templates_${familyId}`);
    } catch (error) {
      console.error('Error initializing default templates:', error);
      throw new Error(`Failed to initialize default templates: ${error.message}`);
    }
  }

  /**
   * Clear template cache
   * @param {string} familyId - Family identifier (optional)
   */
  clearCache(familyId = null) {
    if (familyId) {
      this.cache.delete(`templates_${familyId}`);
    } else {
      this.cache.clear();
    }
  }
}

// Export singleton instance
export const taskTemplateService = new TaskTemplateService();
export default taskTemplateService;