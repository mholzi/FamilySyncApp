import { useState, useEffect, useMemo } from 'react';
import { optimizeFamilySchedule } from '../../utils/familyOptimizer';
import { getIntegrationStatus } from '../../utils/externalIntegration';

function FamilyAnalyticsDashboard({ children, familyData, userData }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('week'); // week, month, quarter
  const [selectedMetric, setSelectedMetric] = useState('balance'); // balance, diversity, stress, coordination
  const [integrationStatus, setIntegrationStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Generate analytics when data changes
  useEffect(() => {
    if (children && children.length > 0) {
      generateAnalytics();
      loadIntegrationStatus();
    }
  }, [children, familyData, selectedTimeframe]);

  const generateAnalytics = async () => {
    setLoading(true);
    try {
      // Get optimization data for current week
      const optimizationData = optimizeFamilySchedule(children, familyData);
      
      // Calculate family analytics
      const analytics = {
        familyBalance: calculateFamilyBalance(children, optimizationData),
        activityDiversity: calculateActivityDiversity(children, optimizationData),
        stressIndicators: calculateStressIndicators(children, optimizationData),
        coordinationMetrics: calculateCoordinationMetrics(optimizationData),
        developmentProgress: calculateDevelopmentProgress(children),
        timeOptimization: calculateTimeOptimization(optimizationData),
        costEfficiency: calculateCostEfficiency(optimizationData),
        trendData: generateTrendData(children)
      };

      setAnalyticsData(analytics);
    } catch (error) {
      console.error('Error generating analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadIntegrationStatus = async () => {
    try {
      const status = await getIntegrationStatus(userData.familyId);
      setIntegrationStatus(status);
    } catch (error) {
      console.error('Error loading integration status:', error);
    }
  };

  const calculateFamilyBalance = (children, optimizationData) => {
    const childrenBalances = children.map(child => {
      const childSchedule = optimizationData.individualSchedules[child.id];
      return childSchedule?.metadata?.balanceScore || 0;
    });

    const averageBalance = childrenBalances.reduce((sum, score) => sum + score, 0) / children.length;
    
    return {
      overall: Math.round(averageBalance),
      individual: children.map((child, index) => ({
        childId: child.id,
        name: child.name,
        score: childrenBalances[index],
        trend: 'stable', // Would track over time
        issues: identifyBalanceIssues(child, optimizationData.individualSchedules[child.id])
      })),
      familyWide: {
        coordinationScore: optimizationData.optimizationScore,
        familyTimeProtected: optimizationData.familyTimeSlots.length,
        conflictsResolved: optimizationData.recommendations.filter(r => r.type === 'balance').length
      }
    };
  };

  const calculateActivityDiversity = (children, optimizationData) => {
    const diversityData = children.map(child => {
      const activities = getAllChildActivities(child, optimizationData);
      const categories = categorizeActivities(activities);
      
      return {
        childId: child.id,
        name: child.name,
        categories: categories,
        diversityScore: calculateDiversityScore(categories),
        recommendations: generateDiversityRecommendations(categories, child)
      };
    });

    const familyDiversity = {
      averageScore: diversityData.reduce((sum, child) => sum + child.diversityScore, 0) / children.length,
      strongestAreas: findStrongestDiversityAreas(diversityData),
      improvementAreas: findImprovementAreas(diversityData),
      sharedActivities: optimizationData.coordinatedActivities.length
    };

    return {
      individual: diversityData,
      family: familyDiversity
    };
  };

  const calculateStressIndicators = (children, optimizationData) => {
    const stressMetrics = {
      overScheduling: calculateOverSchedulingStress(children, optimizationData),
      conflicts: calculateConflictStress(optimizationData),
      transportation: calculateTransportationStress(optimizationData),
      preparation: calculatePreparationStress(children, optimizationData),
      familyTime: calculateFamilyTimeStress(optimizationData)
    };

    const overallStress = Object.values(stressMetrics).reduce((sum, metric) => sum + metric.level, 0) / 5;
    
    return {
      overall: {
        level: Math.round(overallStress * 100),
        status: overallStress < 0.3 ? 'low' : overallStress < 0.6 ? 'moderate' : 'high',
        trend: 'stable' // Would track over time
      },
      categories: stressMetrics,
      recommendations: generateStressRecommendations(stressMetrics),
      alerts: generateStressAlerts(stressMetrics)
    };
  };

  const calculateCoordinationMetrics = (optimizationData) => {
    return {
      opportunities: {
        total: optimizationData.coordinatedActivities.length,
        utilized: optimizationData.coordinatedActivities.filter(a => a.feasibility.score > 0.8).length,
        carpools: optimizationData.carpoolOptions.length,
        sharedActivities: optimizationData.parallelActivities.length
      },
      efficiency: {
        transportationSaved: optimizationData.carpoolOptions.reduce((total, option) => 
          total + (option.estimatedSavings?.timeMinutes || 0), 0),
        costSavings: optimizationData.carpoolOptions.reduce((total, option) => 
          total + (option.estimatedSavings?.costReduction || 0), 0),
        stressReduction: calculateCoordinationStressReduction(optimizationData)
      },
      familyTime: {
        slotsAvailable: optimizationData.familyTimeSlots.length,
        qualityScore: optimizationData.familyTimeSlots.reduce((sum, slot) => sum + slot.priority, 0),
        weeklyHours: optimizationData.familyTimeSlots.reduce((sum, slot) => sum + (slot.duration / 60), 0)
      }
    };
  };

  const calculateDevelopmentProgress = (children) => {
    return children.map(child => {
      const age = calculateAge(child.dateOfBirth);
      const developmentAreas = {
        physical: calculatePhysicalDevelopment(child, age),
        cognitive: calculateCognitiveDevelopment(child, age),
        social: calculateSocialDevelopment(child, age),
        emotional: calculateEmotionalDevelopment(child, age),
        creative: calculateCreativeDevelopment(child, age)
      };

      return {
        childId: child.id,
        name: child.name,
        age,
        areas: developmentAreas,
        overallProgress: Object.values(developmentAreas).reduce((sum, area) => sum + area.score, 0) / 5,
        recommendations: generateDevelopmentRecommendations(developmentAreas, age)
      };
    });
  };

  const renderBalanceScoreCard = () => (
    <div style={styles.scoreCard}>
      <h3 style={styles.cardTitle}>Family Balance Score</h3>
      <div style={styles.scoreDisplay}>
        <div style={styles.mainScore}>
          {analyticsData?.familyBalance?.overall || 0}
          <span style={styles.scoreUnit}>/100</span>
        </div>
        <div style={styles.scoreTrend}>
          <span style={styles.trendIcon}>📈</span>
          <span style={styles.trendText}>+5 this week</span>
        </div>
      </div>
      <div style={styles.scoreBreakdown}>
        {analyticsData?.familyBalance?.individual?.map(child => (
          <div key={child.childId} style={styles.individualScore}>
            <span style={styles.childName}>{child.name}</span>
            <span style={styles.childScore}>{child.score}/100</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStressIndicators = () => (
    <div style={styles.stressCard}>
      <h3 style={styles.cardTitle}>Stress Indicators</h3>
      <div style={styles.stressLevel}>
        <div style={styles.stressGauge}>
          <div 
            style={{
              ...styles.stressGaugeFill,
              width: `${analyticsData?.stressIndicators?.overall?.level || 0}%`,
              backgroundColor: getStressColor(analyticsData?.stressIndicators?.overall?.level || 0)
            }}
          />
        </div>
        <span style={styles.stressStatus}>
          {analyticsData?.stressIndicators?.overall?.status || 'Unknown'}
        </span>
      </div>
      <div style={styles.stressCategories}>
        {analyticsData?.stressIndicators?.categories && 
          Object.entries(analyticsData.stressIndicators.categories).map(([category, data]) => (
            <div key={category} style={styles.stressCategory}>
              <span style={styles.categoryName}>{formatCategoryName(category)}</span>
              <div style={styles.categoryBar}>
                <div 
                  style={{
                    ...styles.categoryBarFill,
                    width: `${data.level * 100}%`,
                    backgroundColor: getStressColor(data.level * 100)
                  }}
                />
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );

  const renderActivityDiversity = () => (
    <div style={styles.diversityCard}>
      <h3 style={styles.cardTitle}>Activity Diversity</h3>
      <div style={styles.diversityChart}>
        {analyticsData?.activityDiversity?.individual?.map(child => (
          <div key={child.childId} style={styles.childDiversity}>
            <h4 style={styles.childName}>{child.name}</h4>
            <div style={styles.diversityCategories}>
              {Object.entries(child.categories).map(([category, count]) => (
                <div key={category} style={styles.diversityCategory}>
                  <span style={styles.categoryLabel}>{formatCategoryName(category)}</span>
                  <div style={styles.categoryCount}>{count}</div>
                </div>
              ))}
            </div>
            <div style={styles.diversityScore}>
              Score: {child.diversityScore}/100
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCoordinationMetrics = () => (
    <div style={styles.coordinationCard}>
      <h3 style={styles.cardTitle}>Family Coordination</h3>
      <div style={styles.coordinationStats}>
        <div style={styles.stat}>
          <div style={styles.statValue}>
            {analyticsData?.coordinationMetrics?.opportunities?.utilized || 0}
          </div>
          <div style={styles.statLabel}>Coordinated Activities</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statValue}>
            {analyticsData?.coordinationMetrics?.efficiency?.transportationSaved || 0}
          </div>
          <div style={styles.statLabel}>Minutes Saved</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statValue}>
            {Math.round(analyticsData?.coordinationMetrics?.familyTime?.weeklyHours || 0)}h
          </div>
          <div style={styles.statLabel}>Family Time</div>
        </div>
      </div>
      <div style={styles.carpoolOpportunities}>
        <h4 style={styles.subsectionTitle}>Carpool Opportunities</h4>
        {analyticsData?.coordinationMetrics?.opportunities?.carpools > 0 ? (
          <div style={styles.carpoolList}>
            <div style={styles.carpoolItem}>
              <span style={styles.carpoolActivity}>Soccer Practice</span>
              <span style={styles.carpoolSavings}>Save 30min/week</span>
            </div>
          </div>
        ) : (
          <div style={styles.noCarpools}>No carpool opportunities identified</div>
        )}
      </div>
    </div>
  );

  const renderRecommendations = () => (
    <div style={styles.recommendationsCard}>
      <h3 style={styles.cardTitle}>Optimization Recommendations</h3>
      <div style={styles.recommendations}>
        {analyticsData?.stressIndicators?.recommendations?.map((rec, index) => (
          <div key={index} style={styles.recommendation}>
            <div style={styles.recIcon}>💡</div>
            <div style={styles.recContent}>
              <div style={styles.recTitle}>{rec.title}</div>
              <div style={styles.recDescription}>{rec.description}</div>
            </div>
            <div style={styles.recPriority}>
              {rec.priority}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Helper functions
  const identifyBalanceIssues = (child, schedule) => {
    const issues = [];
    if (schedule?.conflicts?.length > 0) {
      issues.push('Schedule conflicts');
    }
    if (schedule?.metadata?.busyDays > 3) {
      issues.push('Over-scheduled');
    }
    if (schedule?.metadata?.totalFreeTimeHours < 2) {
      issues.push('Insufficient free time');
    }
    return issues;
  };

  const getAllChildActivities = (child, optimizationData) => {
    const schedule = optimizationData.individualSchedules[child.id];
    const activities = [];
    
    if (schedule?.schedule) {
      Object.values(schedule.schedule).forEach(day => {
        day.events.forEach(event => {
          if (event.type === 'activity') {
            activities.push(event);
          }
        });
      });
    }
    
    return activities;
  };

  const categorizeActivities = (activities) => {
    const categories = {
      physical: 0,
      creative: 0,
      educational: 0,
      social: 0,
      outdoor: 0
    };
    
    activities.forEach(activity => {
      const category = activity.metadata?.category || 'other';
      if (categories.hasOwnProperty(category)) {
        categories[category]++;
      }
    });
    
    return categories;
  };

  const calculateDiversityScore = (categories) => {
    const totalActivities = Object.values(categories).reduce((sum, count) => sum + count, 0);
    if (totalActivities === 0) return 0;
    
    const diversityFactor = Object.values(categories).filter(count => count > 0).length / Object.keys(categories).length;
    return Math.round(diversityFactor * 100);
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 0;
    const birthDate = dateOfBirth.toDate ? dateOfBirth.toDate() : new Date(dateOfBirth);
    return Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const getStressColor = (level) => {
    if (level < 30) return '#4CAF50';
    if (level < 60) return '#FF9800';
    return '#F44336';
  };

  const formatCategoryName = (category) => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1');
  };

  // Mock implementations for development metrics
  const calculateOverSchedulingStress = () => ({ level: 0.3, factors: ['moderate activity load'] });
  const calculateConflictStress = () => ({ level: 0.2, factors: ['few conflicts'] });
  const calculateTransportationStress = () => ({ level: 0.4, factors: ['multiple locations'] });
  const calculatePreparationStress = () => ({ level: 0.3, factors: ['manageable prep time'] });
  const calculateFamilyTimeStress = () => ({ level: 0.2, factors: ['adequate family time'] });
  const generateStressRecommendations = () => [
    { title: 'Optimize Transportation', description: 'Consider carpooling for soccer practice', priority: 'medium' }
  ];
  const generateStressAlerts = () => [];
  const calculateCoordinationStressReduction = () => 0.15;
  const calculatePhysicalDevelopment = () => ({ score: 85, activities: ['soccer', 'playground'] });
  const calculateCognitiveDevelopment = () => ({ score: 78, activities: ['reading', 'puzzles'] });
  const calculateSocialDevelopment = () => ({ score: 82, activities: ['playdates', 'group activities'] });
  const calculateEmotionalDevelopment = () => ({ score: 80, activities: ['art', 'music'] });
  const calculateCreativeDevelopment = () => ({ score: 75, activities: ['art class', 'free play'] });
  const generateDevelopmentRecommendations = () => ['Add more creative activities', 'Increase social interactions'];
  const findStrongestDiversityAreas = () => ['Physical activities', 'Educational content'];
  const findImprovementAreas = () => ['Creative expression', 'Outdoor time'];
  const generateDiversityRecommendations = () => ['Add art classes', 'Increase outdoor time'];
  const calculateTimeOptimization = () => ({ savedMinutes: 120, efficiency: 85 });
  const calculateCostEfficiency = () => ({ potentialSavings: 150, currentEfficiency: 78 });
  const generateTrendData = () => ({ weeklyTrend: [75, 78, 82, 85, 83], monthlyAverage: 81 });

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingSpinner}></div>
        <div style={styles.loadingText}>Generating family analytics...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Family Analytics Dashboard</h2>
        <p style={styles.subtitle}>
          Insights into your family's schedule balance, activity diversity, and optimization opportunities
        </p>
      </div>

      <div style={styles.metricsGrid}>
        {renderBalanceScoreCard()}
        {renderStressIndicators()}
        {renderActivityDiversity()}
        {renderCoordinationMetrics()}
      </div>

      {renderRecommendations()}

      {/* Integration Status */}
      {integrationStatus && (
        <div style={styles.integrationCard}>
          <h3 style={styles.cardTitle}>External Integrations</h3>
          <div style={styles.integrationStatus}>
            <div style={styles.integration}>
              <span style={styles.integrationName}>School Calendar</span>
              <span style={integrationStatus.school?.connected ? styles.statusConnected : styles.statusDisconnected}>
                {integrationStatus.school?.connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <div style={styles.integration}>
              <span style={styles.integrationName}>Activity Providers</span>
              <span style={integrationStatus.activities?.connected ? styles.statusConnected : styles.statusDisconnected}>
                {integrationStatus.activities?.connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#F2F2F7',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
  },
  
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 10px 0'
  },
  
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
    lineHeight: '1.5'
  },
  
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  
  scoreCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 20px 0'
  },
  
  scoreDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px'
  },
  
  mainScore: {
    fontSize: '48px',
    fontWeight: '700',
    color: '#007AFF'
  },
  
  scoreUnit: {
    fontSize: '18px',
    color: '#666'
  },
  
  scoreTrend: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  trendIcon: {
    fontSize: '20px'
  },
  
  trendText: {
    fontSize: '14px',
    color: '#4CAF50',
    fontWeight: '500'
  },
  
  scoreBreakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  
  individualScore: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #F0F0F0'
  },
  
  childName: {
    fontSize: '14px',
    color: '#333'
  },
  
  childScore: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#007AFF'
  },
  
  stressCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  
  stressLevel: {
    marginBottom: '20px'
  },
  
  stressGauge: {
    width: '100%',
    height: '8px',
    backgroundColor: '#E5E5EA',
    borderRadius: '4px',
    marginBottom: '8px',
    overflow: 'hidden'
  },
  
  stressGaugeFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },
  
  stressStatus: {
    fontSize: '16px',
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  
  stressCategories: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  
  stressCategory: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  
  categoryName: {
    fontSize: '14px',
    color: '#333',
    minWidth: '100px'
  },
  
  categoryBar: {
    flex: 1,
    height: '6px',
    backgroundColor: '#E5E5EA',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  
  categoryBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease'
  },
  
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px'
  },
  
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E5E5EA',
    borderTop: '4px solid #007AFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  
  loadingText: {
    fontSize: '16px',
    color: '#666'
  },
  
  diversityCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  
  diversityChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  
  childDiversity: {
    padding: '16px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px'
  },
  
  diversityCategories: {
    display: 'flex',
    gap: '12px',
    marginBottom: '8px',
    flexWrap: 'wrap'
  },
  
  diversityCategory: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  
  categoryLabel: {
    fontSize: '12px',
    color: '#666'
  },
  
  categoryCount: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#007AFF'
  },
  
  diversityScore: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333'
  },
  
  coordinationCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  
  coordinationStats: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px'
  },
  
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#007AFF'
  },
  
  statLabel: {
    fontSize: '12px',
    color: '#666',
    textAlign: 'center'
  },
  
  subsectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 12px 0'
  },
  
  carpoolList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  
  carpoolItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#F8F9FA',
    borderRadius: '6px'
  },
  
  carpoolActivity: {
    fontSize: '14px',
    color: '#333'
  },
  
  carpoolSavings: {
    fontSize: '12px',
    color: '#4CAF50',
    fontWeight: '500'
  },
  
  noCarpools: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic'
  },
  
  recommendationsCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  
  recommendations: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  
  recommendation: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px'
  },
  
  recIcon: {
    fontSize: '20px'
  },
  
  recContent: {
    flex: 1
  },
  
  recTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '4px'
  },
  
  recDescription: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.4'
  },
  
  recPriority: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: '#FFF3E0',
    color: '#F57C00'
  },
  
  integrationCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  
  integrationStatus: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  
  integration: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px'
  },
  
  integrationName: {
    fontSize: '14px',
    color: '#333'
  },
  
  statusConnected: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#4CAF50',
    backgroundColor: '#E8F5E8',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  
  statusDisconnected: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#F44336',
    backgroundColor: '#FFEBEE',
    padding: '4px 8px',
    borderRadius: '4px'
  }
};

// Add CSS animation for loading spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  if (!document.head.querySelector('style[data-analytics-spinner]')) {
    style.setAttribute('data-analytics-spinner', 'true');
    document.head.appendChild(style);
  }
}

export default FamilyAnalyticsDashboard;