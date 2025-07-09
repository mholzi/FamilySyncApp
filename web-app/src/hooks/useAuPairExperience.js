import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Hook for managing au pair experience tracking
 * Handles learning mode, task counts, and experience levels
 */
export const useAuPairExperience = (familyId, userId) => {
  const [experience, setExperience] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!familyId || !userId) {
      setLoading(false);
      return;
    }

    const experienceDocRef = doc(db, 'families', familyId, 'auPairExperience', userId);

    const unsubscribe = onSnapshot(
      experienceDocRef,
      async (docSnapshot) => {
        try {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            setExperience({
              id: docSnapshot.id,
              ...data
            });
          } else {
            // Create initial experience record
            const initialExperience = {
              userId,
              familyId,
              joinedAt: serverTimestamp(),
              experienceLevel: 'new',
              completedTasksCount: 0,
              learningModeEnabled: true,
              learningModeAutoDisabled: false,
              taskThresholdForLearning: 25,
              languagePreference: 'en',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };

            await setDoc(experienceDocRef, initialExperience);
            
            setExperience({
              id: userId,
              ...initialExperience
            });
          }
          setLoading(false);
        } catch (err) {
          console.error('Error managing au pair experience:', err);
          setError(err.message);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to au pair experience:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [familyId, userId]);

  /**
   * Update completed tasks count and recalculate experience level
   */
  const incrementTaskCount = async () => {
    if (!experience) return;

    try {
      const newCount = experience.completedTasksCount + 1;
      const newExperienceLevel = calculateExperienceLevel(newCount);
      
      // Auto-disable learning mode if threshold reached and not manually controlled
      const shouldAutoDisableLearning = 
        newCount >= experience.taskThresholdForLearning && 
        !experience.learningModeAutoDisabled &&
        experience.learningModeEnabled;

      const updates = {
        completedTasksCount: newCount,
        experienceLevel: newExperienceLevel,
        updatedAt: serverTimestamp()
      };

      if (shouldAutoDisableLearning) {
        updates.learningModeEnabled = false;
        updates.learningModeAutoDisabled = true;
      }

      const experienceDocRef = doc(db, 'families', familyId, 'auPairExperience', userId);
      await updateDoc(experienceDocRef, updates);

      console.log(`✅ Au pair task count updated: ${newCount}, level: ${newExperienceLevel}`);
      
      if (shouldAutoDisableLearning) {
        console.log('🎓 Learning mode auto-disabled after reaching threshold');
      }
    } catch (err) {
      console.error('Error incrementing task count:', err);
      throw err;
    }
  };

  /**
   * Toggle learning mode manually
   */
  const toggleLearningMode = async (enabled) => {
    if (!experience) return;

    try {
      const experienceDocRef = doc(db, 'families', familyId, 'auPairExperience', userId);
      await updateDoc(experienceDocRef, {
        learningModeEnabled: enabled,
        learningModeAutoDisabled: false, // Reset auto-disable when manually controlled
        updatedAt: serverTimestamp()
      });

      console.log(`🎓 Learning mode ${enabled ? 'enabled' : 'disabled'} manually`);
    } catch (err) {
      console.error('Error toggling learning mode:', err);
      throw err;
    }
  };

  /**
   * Update language preference
   */
  const updateLanguagePreference = async (language) => {
    if (!experience) return;

    try {
      const experienceDocRef = doc(db, 'families', familyId, 'auPairExperience', userId);
      await updateDoc(experienceDocRef, {
        languagePreference: language,
        updatedAt: serverTimestamp()
      });

      console.log(`🌐 Language preference updated to: ${language}`);
    } catch (err) {
      console.error('Error updating language preference:', err);
      throw err;
    }
  };

  /**
   * Get days since au pair joined
   */
  const getDaysSinceJoined = () => {
    if (!experience?.joinedAt) return 0;
    
    const joinedDate = experience.joinedAt.toDate();
    const now = new Date();
    const diffTime = Math.abs(now - joinedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  /**
   * Check if au pair is considered "new" (within first 30 days)
   */
  const isNewAuPair = () => {
    return getDaysSinceJoined() <= 30;
  };

  /**
   * Check if should show learning mode features
   */
  const shouldShowLearningMode = () => {
    if (!experience) return false;
    return experience.learningModeEnabled || isNewAuPair();
  };

  /**
   * Get experience level display info
   */
  const getExperienceLevelInfo = () => {
    if (!experience) return null;

    const level = experience.experienceLevel;
    const tasksCompleted = experience.completedTasksCount;
    const daysJoined = getDaysSinceJoined();

    const configs = {
      new: {
        icon: '🌱',
        label: 'New Au Pair',
        description: `${daysJoined} days with family`,
        color: '#10b981'
      },
      learning: {
        icon: '📚',
        label: 'Learning',
        description: `${tasksCompleted} tasks completed`,
        color: '#3b82f6'
      },
      experienced: {
        icon: '⭐',
        label: 'Experienced',
        description: `${tasksCompleted}+ tasks completed`,
        color: '#8b5cf6'
      }
    };

    return configs[level] || configs.new;
  };

  return {
    experience,
    loading,
    error,
    
    // Actions
    incrementTaskCount,
    toggleLearningMode,
    updateLanguagePreference,
    
    // Computed values
    getDaysSinceJoined,
    isNewAuPair: isNewAuPair(),
    shouldShowLearningMode: shouldShowLearningMode(),
    experienceLevelInfo: getExperienceLevelInfo()
  };
};

/**
 * Calculate experience level based on completed tasks
 */
const calculateExperienceLevel = (taskCount) => {
  if (taskCount < 10) return 'new';
  if (taskCount < 50) return 'learning';
  return 'experienced';
};

export default useAuPairExperience;