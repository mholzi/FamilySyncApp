const {
  validateUserProfile,
  validateChildProfile,
  validateTask,
  validateCalendarEvent,
  validateShoppingItem,
  sanitizeInput
} = require('../validators');

describe('Validators', () => {
  describe('validateUserProfile', () => {
    it('should validate a correct user profile', () => {
      const validProfile = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        role: 'parent',
        familyId: 'family123'
      };

      const result = validateUserProfile(validProfile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email', () => {
      const invalidProfile = {
        name: 'John Doe',
        email: 'invalid-email',
        role: 'parent',
        familyId: 'family123'
      };

      const result = validateUserProfile(invalidProfile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid email is required');
    });

    it('should reject invalid role', () => {
      const invalidProfile = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        familyId: 'family123'
      };

      const result = validateUserProfile(invalidProfile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid role specified');
    });

    it('should require name', () => {
      const invalidProfile = {
        email: 'john@example.com',
        role: 'parent',
        familyId: 'family123'
      };

      const result = validateUserProfile(invalidProfile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('should reject names with invalid characters', () => {
      const invalidProfile = {
        name: 'John<script>alert("xss")</script>',
        email: 'john@example.com',
        role: 'parent',
        familyId: 'family123'
      };

      const result = validateUserProfile(invalidProfile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name contains invalid characters');
    });
  });

  describe('validateChildProfile', () => {
    it('should validate a correct child profile', () => {
      const validChild = {
        name: 'Alice Doe',
        familyId: 'family123',
        birthDate: '2020-01-01',
        medicalConditions: 'None',
        emergencyContacts: [
          { name: 'John', phone: '+1234567890' }
        ]
      };

      const result = validateChildProfile(validChild);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject future birth dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const invalidChild = {
        name: 'Alice Doe',
        familyId: 'family123',
        birthDate: futureDate.toISOString()
      };

      const result = validateChildProfile(invalidChild);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid birth date');
    });

    it('should require child name', () => {
      const invalidChild = {
        familyId: 'family123'
      };

      const result = validateChildProfile(invalidChild);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Child name is required');
    });
  });

  describe('validateTask', () => {
    it('should validate a correct task', () => {
      const validTask = {
        title: 'Take out trash',
        familyId: 'family123',
        assignedTo: 'user123',
        dueDate: '2024-12-31',
        priority: 'medium'
      };

      const result = validateTask(validTask);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require task title', () => {
      const invalidTask = {
        familyId: 'family123',
        assignedTo: 'user123'
      };

      const result = validateTask(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Task title is required');
    });

    it('should reject invalid priority', () => {
      const invalidTask = {
        title: 'Take out trash',
        familyId: 'family123',
        assignedTo: 'user123',
        priority: 'urgent'
      };

      const result = validateTask(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid priority level');
    });
  });

  describe('validateCalendarEvent', () => {
    it('should validate a correct calendar event', () => {
      const validEvent = {
        title: 'Doctor Appointment',
        familyId: 'family123',
        startTime: '2024-12-25T10:00:00Z',
        endTime: '2024-12-25T11:00:00Z',
        attendees: ['user123']
      };

      const result = validateCalendarEvent(validEvent);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject events where end time is before start time', () => {
      const invalidEvent = {
        title: 'Doctor Appointment',
        familyId: 'family123',
        startTime: '2024-12-25T11:00:00Z',
        endTime: '2024-12-25T10:00:00Z'
      };

      const result = validateCalendarEvent(invalidEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End time must be after start time');
    });

    it('should require event title', () => {
      const invalidEvent = {
        familyId: 'family123',
        startTime: '2024-12-25T10:00:00Z',
        endTime: '2024-12-25T11:00:00Z'
      };

      const result = validateCalendarEvent(invalidEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Event title is required');
    });
  });

  describe('validateShoppingItem', () => {
    it('should validate a correct shopping item', () => {
      const validItem = {
        name: 'Milk',
        familyId: 'family123',
        quantity: 2,
        category: 'Dairy'
      };

      const result = validateShoppingItem(validItem);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require item name', () => {
      const invalidItem = {
        familyId: 'family123',
        quantity: 1
      };

      const result = validateShoppingItem(invalidItem);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item name is required');
    });

    it('should reject negative quantities', () => {
      const invalidItem = {
        name: 'Milk',
        familyId: 'family123',
        quantity: -1
      };

      const result = validateShoppingItem(invalidItem);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Quantity must be a positive number');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove HTML tags from strings', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello scriptalert("xss")/script World');
    });

    it('should handle nested objects', () => {
      const input = {
        name: 'John <script>',
        details: {
          bio: 'Nice <person>'
        }
      };
      
      const result = sanitizeInput(input);
      expect(result.name).toBe('John script');
      expect(result.details.bio).toBe('Nice person');
    });

    it('should handle arrays', () => {
      const input = ['Item <script>', 'Another >item'];
      const result = sanitizeInput(input);
      expect(result).toEqual(['Item script', 'Another item']);
    });

    it('should preserve non-string values', () => {
      const input = {
        name: 'John',
        age: 30,
        active: true,
        score: null
      };
      
      const result = sanitizeInput(input);
      expect(result.age).toBe(30);
      expect(result.active).toBe(true);
      expect(result.score).toBe(null);
    });
  });
});