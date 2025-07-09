import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import './AppreciationSummary.css';

const AppreciationSummary = ({ familyId, auPairId, auPairName }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');

  useEffect(() => {
    if (familyId && auPairId) {
      generateSummary();
    }
  }, [familyId, auPairId, timeRange]);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      // Calculate date range
      switch (timeRange) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      // Query completed tasks in date range
      const tasksQuery = query(
        collection(db, 'families', familyId, 'householdTodos'),
        where('completedBy', '==', auPairId),
        where('completedAt', '>=', Timestamp.fromDate(startDate)),
        where('completedAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('completedAt', 'desc')
      );

      const tasksSnapshot = await getDocs(tasksQuery);
      const tasks = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const summaryData = processTasks(tasks, timeRange);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error generating appreciation summary:', error);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const processTasks = (tasks, period) => {
    const stats = {
      totalTasks: tasks.length,
      categoriesCompleted: new Set(),
      feedbackReceived: [],
      streakDays: 0,
      averageRating: 0,
      highlights: [],
      accomplishments: []
    };

    let ratingSum = 0;
    let ratingCount = 0;
    const dailyTasks = new Map();

    tasks.forEach(task => {
      // Track categories
      stats.categoriesCompleted.add(task.category);
      
      // Process feedback
      if (task.feedback && task.feedback.length > 0) {
        task.feedback.forEach(fb => {
          stats.feedbackReceived.push({
            ...fb,
            taskTitle: task.title
          });
          
          // Calculate rating average
          const ratingValue = getRatingValue(fb.rating);
          ratingSum += ratingValue;
          ratingCount++;
        });
      }

      // Track daily completion for streaks
      const completedDate = task.completedAt.toDate().toDateString();
      if (!dailyTasks.has(completedDate)) {
        dailyTasks.set(completedDate, []);
      }
      dailyTasks.get(completedDate).push(task);
    });

    // Calculate average rating
    stats.averageRating = ratingCount > 0 ? (ratingSum / ratingCount) : 0;

    // Calculate streak days
    stats.streakDays = calculateStreakDays(dailyTasks);

    // Generate highlights
    stats.highlights = generateHighlights(tasks, stats);

    // Generate accomplishments
    stats.accomplishments = generateAccomplishments(tasks, stats, period);

    return stats;
  };

  const getRatingValue = (rating) => {
    switch (rating) {
      case 'great': return 3;
      case 'good': return 2;
      case 'needs-improvement': return 1;
      default: return 2;
    }
  };

  const calculateStreakDays = (dailyTasks) => {
    const sortedDates = Array.from(dailyTasks.keys()).sort((a, b) => new Date(b) - new Date(a));
    let streak = 0;
    let currentDate = new Date();
    
    for (const dateStr of sortedDates) {
      const taskDate = new Date(dateStr);
      const dayDiff = Math.floor((currentDate - taskDate) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === streak) {
        streak++;
        currentDate = taskDate;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const generateHighlights = (tasks, stats) => {
    const highlights = [];
    
    // Most productive day
    const dailyTaskCounts = new Map();
    tasks.forEach(task => {
      const date = task.completedAt.toDate().toDateString();
      dailyTaskCounts.set(date, (dailyTaskCounts.get(date) || 0) + 1);
    });
    
    const mostProductiveDay = Array.from(dailyTaskCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostProductiveDay && mostProductiveDay[1] > 1) {
      highlights.push({
        icon: '🌟',
        title: 'Most Productive Day',
        description: `Completed ${mostProductiveDay[1]} tasks on ${new Date(mostProductiveDay[0]).toLocaleDateString()}`
      });
    }

    // Perfect feedback streak
    const perfectFeedback = stats.feedbackReceived.filter(fb => fb.rating === 'great').length;
    if (perfectFeedback > 0) {
      highlights.push({
        icon: '⭐',
        title: 'Excellence Recognition',
        description: `Received "Amazing!" feedback ${perfectFeedback} time${perfectFeedback > 1 ? 's' : ''}`
      });
    }

    // Category mastery
    if (stats.categoriesCompleted.size >= 3) {
      highlights.push({
        icon: '🎯',
        title: 'Versatility',
        description: `Mastered ${stats.categoriesCompleted.size} different task categories`
      });
    }

    // Consistency
    if (stats.streakDays >= 3) {
      highlights.push({
        icon: '🔥',
        title: 'Consistency',
        description: `${stats.streakDays} days in a row of completing tasks`
      });
    }

    return highlights.slice(0, 3); // Return top 3 highlights
  };

  const generateAccomplishments = (tasks, stats, period) => {
    const accomplishments = [];
    
    // Task completion
    if (stats.totalTasks > 0) {
      accomplishments.push({
        icon: '✅',
        title: 'Tasks Completed',
        value: stats.totalTasks,
        description: `tasks completed this ${period}`
      });
    }

    // Average rating
    if (stats.averageRating > 0) {
      const ratingEmoji = stats.averageRating >= 2.5 ? '🌟' : stats.averageRating >= 2 ? '👍' : '💪';
      accomplishments.push({
        icon: ratingEmoji,
        title: 'Average Rating',
        value: stats.averageRating.toFixed(1),
        description: 'out of 3.0 stars'
      });
    }

    // Categories mastered
    accomplishments.push({
      icon: '📂',
      title: 'Categories',
      value: stats.categoriesCompleted.size,
      description: 'different types of tasks'
    });

    // Positive feedback
    const positiveCount = stats.feedbackReceived.filter(fb => 
      fb.rating === 'great' || fb.rating === 'good'
    ).length;
    
    if (positiveCount > 0) {
      accomplishments.push({
        icon: '💝',
        title: 'Positive Feedback',
        value: positiveCount,
        description: 'appreciative messages'
      });
    }

    return accomplishments;
  };

  if (loading) {
    return (
      <div className="appreciation-summary loading">
        <div className="loading-spinner"></div>
        <p>Generating your appreciation summary...</p>
      </div>
    );
  }

  if (!summary || summary.totalTasks === 0) {
    return (
      <div className="appreciation-summary empty">
        <div className="empty-icon">📊</div>
        <h3>No Data Yet</h3>
        <p>Complete some tasks to see your appreciation summary!</p>
      </div>
    );
  }

  return (
    <div className="appreciation-summary">
      <div className="summary-header">
        <div className="summary-title">
          <span className="summary-icon">🎉</span>
          <div>
            <h3>Your Accomplishments</h3>
            <p>Here's what {auPairName || 'you'} achieved this {timeRange}!</p>
          </div>
        </div>
        
        <div className="time-range-selector">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">Last 3 Months</option>
          </select>
        </div>
      </div>

      {/* Accomplishments Grid */}
      <div className="accomplishments-grid">
        {summary.accomplishments.map((accomplishment, index) => (
          <div key={index} className="accomplishment-card">
            <div className="accomplishment-icon">{accomplishment.icon}</div>
            <div className="accomplishment-content">
              <div className="accomplishment-value">{accomplishment.value}</div>
              <div className="accomplishment-title">{accomplishment.title}</div>
              <div className="accomplishment-description">{accomplishment.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Highlights */}
      {summary.highlights.length > 0 && (
        <div className="highlights-section">
          <h4>✨ Highlights</h4>
          <div className="highlights-list">
            {summary.highlights.map((highlight, index) => (
              <div key={index} className="highlight-item">
                <span className="highlight-icon">{highlight.icon}</span>
                <div className="highlight-content">
                  <div className="highlight-title">{highlight.title}</div>
                  <div className="highlight-description">{highlight.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Positive Feedback */}
      {summary.feedbackReceived.length > 0 && (
        <div className="feedback-section">
          <h4>💝 Recent Appreciation</h4>
          <div className="feedback-list">
            {summary.feedbackReceived.slice(0, 3).map((feedback, index) => (
              <div key={index} className="feedback-item">
                <div className="feedback-rating">
                  {feedback.rating === 'great' ? '🌟' : 
                   feedback.rating === 'good' ? '👍' : '💪'}
                </div>
                <div className="feedback-content">
                  <div className="feedback-message">"{feedback.message}"</div>
                  <div className="feedback-task">For: {feedback.taskTitle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Motivation Message */}
      <div className="motivation-section">
        <div className="motivation-message">
          {getMotivationMessage(summary, auPairName)}
        </div>
      </div>
    </div>
  );
};

// Helper function for motivation messages
const getMotivationMessage = (stats, name) => {
  const messages = [
    `🌟 ${name || 'You'} are doing amazing work! The family really appreciates your dedication.`,
    `💪 Keep up the fantastic effort! Your attention to detail makes such a difference.`,
    `🎯 ${name || 'You'} have shown great consistency. The family is lucky to have you!`,
    `✨ Your positive attitude and hard work are truly valued by the family.`,
    `🔥 ${name || 'You'} are building great habits and showing real growth!`
  ];

  // Choose message based on performance
  let messageIndex = 0;
  if (stats.averageRating >= 2.5) messageIndex = 0;
  else if (stats.streakDays >= 3) messageIndex = 2;
  else if (stats.totalTasks >= 10) messageIndex = 1;
  else if (stats.feedbackReceived.length > 0) messageIndex = 3;
  else messageIndex = 4;

  return messages[messageIndex];
};

export default AppreciationSummary;