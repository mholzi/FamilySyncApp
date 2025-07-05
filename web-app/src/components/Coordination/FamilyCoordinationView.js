import { useState, useEffect } from 'react';
import { optimizeFamilySchedule } from '../../utils/familyOptimizer';
import FamilyAnalyticsDashboard from '../Analytics/FamilyAnalyticsDashboard';

function FamilyCoordinationView({ children, familyData, userData, onUpdateSchedule }) {
  const [optimizationData, setOptimizationData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, coordination, analytics, integration
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (children && children.length > 0) {
      generateOptimization();
    }
  }, [children, familyData]);

  const generateOptimization = async () => {
    setLoading(true);
    try {
      const optimization = optimizeFamilySchedule(children, familyData);
      setOptimizationData(optimization);
    } catch (error) {
      console.error('Error generating optimization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRecommendation = (recommendation) => {
    setSelectedRecommendation(recommendation);
    // Implementation would apply the specific recommendation
    console.log('Applying recommendation:', recommendation);
  };

  const handleSetupCarpool = (carpoolOption) => {
    // Implementation would initiate carpool setup
    console.log('Setting up carpool:', carpoolOption);
  };

  const handleCoordinateActivity = (coordinatedActivity) => {
    // Implementation would coordinate the activity
    console.log('Coordinating activity:', coordinatedActivity);
  };

  const renderOverviewTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.overviewGrid}>
        {/* Family Overview Card */}
        <div style={styles.overviewCard}>
          <h3 style={styles.cardTitle}>Family Overview</h3>
          <div style={styles.familyStats}>
            <div style={styles.stat}>
              <span style={styles.statValue}>{children.length}</span>
              <span style={styles.statLabel}>Children</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statValue}>
                {optimizationData?.metadata?.totalWeeklyActivities || 0}
              </span>
              <span style={styles.statLabel}>Weekly Activities</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statValue}>
                {optimizationData?.optimizationScore || 0}
              </span>
              <span style={styles.statLabel}>Optimization Score</span>
            </div>
          </div>
        </div>

        {/* Quick Wins Card */}
        <div style={styles.overviewCard}>
          <h3 style={styles.cardTitle}>Quick Wins</h3>
          <div style={styles.quickWins}>
            {optimizationData?.recommendations?.slice(0, 3).map((rec, index) => (
              <div key={index} style={styles.quickWin}>
                <div style={styles.quickWinContent}>
                  <span style={styles.quickWinTitle}>{rec.title}</span>
                  <span style={styles.quickWinBenefit}>{rec.estimatedBenefit}</span>
                </div>
                <button 
                  style={styles.quickWinButton}
                  onClick={() => handleApplyRecommendation(rec)}
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Family Time Card */}
        <div style={styles.overviewCard}>
          <h3 style={styles.cardTitle}>Family Time Protection</h3>
          <div style={styles.familyTime}>
            <div style={styles.familyTimeHeader}>
              <span style={styles.familyTimeCount}>
                {optimizationData?.familyTimeSlots?.length || 0} slots available
              </span>
              <span style={styles.familyTimeHours}>
                {Math.round(
                  (optimizationData?.familyTimeSlots?.reduce((sum, slot) => sum + slot.duration, 0) || 0) / 60
                )}h total
              </span>
            </div>
            <div style={styles.familyTimeSlots}>
              {optimizationData?.familyTimeSlots?.slice(0, 3).map((slot, index) => (
                <div key={index} style={styles.familyTimeSlot}>
                  <span style={styles.slotDay}>{slot.day}</span>
                  <span style={styles.slotTime}>
                    {slot.startTime} - {slot.endTime}
                  </span>
                  <span style={styles.slotType}>{slot.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Children Status */}
      <div style={styles.childrenStatus}>
        <h3 style={styles.sectionTitle}>Individual Child Status</h3>
        <div style={styles.childrenGrid}>
          {children.map(child => {
            const childSchedule = optimizationData?.individualSchedules?.[child.id];
            return (
              <div key={child.id} style={styles.childCard}>
                <div style={styles.childHeader}>
                  <div style={styles.childInfo}>
                    <span style={styles.childName}>{child.name}</span>
                    <span style={styles.childAge}>
                      Age {calculateAge(child.dateOfBirth)}
                    </span>
                  </div>
                  <div style={styles.childScore}>
                    {childSchedule?.metadata?.balanceScore || 0}
                  </div>
                </div>
                <div style={styles.childMetrics}>
                  <div style={styles.childMetric}>
                    <span style={styles.metricLabel}>Activities</span>
                    <span style={styles.metricValue}>
                      {childSchedule?.metadata?.totalActivities || 0}
                    </span>
                  </div>
                  <div style={styles.childMetric}>
                    <span style={styles.metricLabel}>Free Time</span>
                    <span style={styles.metricValue}>
                      {childSchedule?.metadata?.totalFreeTimeHours || 0}h
                    </span>
                  </div>
                  <div style={styles.childMetric}>
                    <span style={styles.metricLabel}>Conflicts</span>
                    <span style={styles.metricValue}>
                      {childSchedule?.conflicts?.length || 0}
                    </span>
                  </div>
                </div>
                {childSchedule?.conflicts?.length > 0 && (
                  <div style={styles.childIssues}>
                    ⚠️ {childSchedule.conflicts.length} conflicts detected
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderCoordinationTab = () => (
    <div style={styles.tabContent}>
      {/* Coordination Opportunities */}
      <div style={styles.coordinationSection}>
        <h3 style={styles.sectionTitle}>Coordination Opportunities</h3>
        <div style={styles.coordinationGrid}>
          {/* Shared Activities */}
          <div style={styles.coordinationCard}>
            <h4 style={styles.cardSubtitle}>Shared Activities</h4>
            <div style={styles.coordinationList}>
              {optimizationData?.coordinatedActivities?.map((activity, index) => (
                <div key={index} style={styles.coordinationItem}>
                  <div style={styles.coordinationInfo}>
                    <span style={styles.coordinationActivity}>{activity.activity}</span>
                    <span style={styles.coordinationChildren}>
                      {activity.children.map(child => child.name).join(', ')}
                    </span>
                    <span style={styles.coordinationBenefit}>
                      Save {activity.benefits?.transportationSaving || 0} min/week
                    </span>
                  </div>
                  <button 
                    style={styles.coordinationButton}
                    onClick={() => handleCoordinateActivity(activity)}
                  >
                    Coordinate
                  </button>
                </div>
              ))}
              {optimizationData?.coordinatedActivities?.length === 0 && (
                <div style={styles.noOpportunities}>
                  No shared activity opportunities found
                </div>
              )}
            </div>
          </div>

          {/* Carpool Options */}
          <div style={styles.coordinationCard}>
            <h4 style={styles.cardSubtitle}>Carpool Opportunities</h4>
            <div style={styles.coordinationList}>
              {optimizationData?.carpoolOptions?.map((carpool, index) => (
                <div key={index} style={styles.coordinationItem}>
                  <div style={styles.coordinationInfo}>
                    <span style={styles.coordinationActivity}>{carpool.activity}</span>
                    <span style={styles.coordinationChildren}>{carpool.childName}</span>
                    <span style={styles.coordinationBenefit}>
                      Save {carpool.estimatedSavings?.timeMinutes || 0} min/week
                    </span>
                    <span style={styles.carpoolScore}>
                      Match: {Math.round((carpool.carpoolScore || 0) * 100)}%
                    </span>
                  </div>
                  <button 
                    style={styles.coordinationButton}
                    onClick={() => handleSetupCarpool(carpool)}
                  >
                    Setup
                  </button>
                </div>
              ))}
              {optimizationData?.carpoolOptions?.length === 0 && (
                <div style={styles.noOpportunities}>
                  No carpool opportunities found
                </div>
              )}
            </div>
          </div>

          {/* Parallel Activities */}
          <div style={styles.coordinationCard}>
            <h4 style={styles.cardSubtitle}>Parallel Activities</h4>
            <div style={styles.coordinationList}>
              {optimizationData?.parallelActivities?.map((parallel, index) => (
                <div key={index} style={styles.coordinationItem}>
                  <div style={styles.coordinationInfo}>
                    <span style={styles.coordinationActivity}>{parallel.activity}</span>
                    <span style={styles.coordinationChildren}>
                      {parallel.children.map(child => child.name).join(', ')}
                    </span>
                    <span style={styles.coordinationBenefit}>
                      Age group: {parallel.ageGroup}
                    </span>
                  </div>
                  <button 
                    style={styles.coordinationButton}
                    onClick={() => handleCoordinateActivity(parallel)}
                  >
                    Schedule
                  </button>
                </div>
              ))}
              {optimizationData?.parallelActivities?.length === 0 && (
                <div style={styles.noOpportunities}>
                  No parallel activity opportunities found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div style={styles.recommendationsSection}>
        <h3 style={styles.sectionTitle}>Optimization Recommendations</h3>
        <div style={styles.recommendationsList}>
          {optimizationData?.recommendations?.map((rec, index) => (
            <div key={index} style={styles.recommendationCard}>
              <div style={styles.recommendationHeader}>
                <span style={styles.recommendationTitle}>{rec.title}</span>
                <span style={styles.recommendationPriority}>{rec.priority}</span>
              </div>
              <p style={styles.recommendationDescription}>{rec.description}</p>
              <div style={styles.recommendationFooter}>
                <span style={styles.recommendationBenefit}>
                  Benefit: {rec.estimatedBenefit}
                </span>
                <button 
                  style={styles.recommendationButton}
                  onClick={() => handleApplyRecommendation(rec)}
                >
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <FamilyAnalyticsDashboard
      children={children}
      familyData={familyData}
      userData={userData}
    />
  );

  const renderIntegrationTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.integrationSection}>
        <h3 style={styles.sectionTitle}>External Integrations</h3>
        <div style={styles.integrationGrid}>
          {/* School Integration */}
          <div style={styles.integrationCard}>
            <h4 style={styles.cardSubtitle}>School Calendar Sync</h4>
            <div style={styles.integrationStatus}>
              <div style={styles.statusBadge}>Not Connected</div>
              <p style={styles.integrationDescription}>
                Automatically sync school holidays, events, and parent-teacher conferences
              </p>
              <button style={styles.integrationButton}>
                Connect School Calendar
              </button>
            </div>
          </div>

          {/* Activity Providers */}
          <div style={styles.integrationCard}>
            <h4 style={styles.cardSubtitle}>Activity Providers</h4>
            <div style={styles.integrationStatus}>
              <div style={styles.statusBadge}>Not Connected</div>
              <p style={styles.integrationDescription}>
                Sync schedules from sports clubs, music schools, and other activity providers
              </p>
              <button style={styles.integrationButton}>
                Connect Providers
              </button>
            </div>
          </div>

          {/* Payment Tracking */}
          <div style={styles.integrationCard}>
            <h4 style={styles.cardSubtitle}>Payment & Registration Tracking</h4>
            <div style={styles.integrationStatus}>
              <div style={styles.statusBadge}>Partially Connected</div>
              <p style={styles.integrationDescription}>
                Track payment deadlines and registration dates for all activities
              </p>
              <button style={styles.integrationButton}>
                Manage Payments
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 0;
    const birthDate = dateOfBirth.toDate ? dateOfBirth.toDate() : new Date(dateOfBirth);
    return Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingSpinner}></div>
        <div style={styles.loadingText}>Optimizing family coordination...</div>
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div style={styles.emptyState}>
        <h3>No Children Found</h3>
        <p>Add children to your family to access coordination features</p>
      </div>
    );
  }

  if (children.length === 1) {
    return (
      <div style={styles.singleChildState}>
        <h3>Single Child Family</h3>
        <p>Coordination features work best with multiple children. Add more children to unlock advanced optimization.</p>
        <button style={styles.addChildButton}>Add Another Child</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Family Coordination Center</h2>
        <p style={styles.subtitle}>
          Multi-child optimization, carpool coordination, and family time protection
        </p>
        <button style={styles.regenerateButton} onClick={generateOptimization}>
          🔄 Regenerate Optimization
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabNav}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'coordination', label: 'Coordination' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'integration', label: 'Integration' }
        ].map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.tabButton,
              ...(activeTab === tab.id ? styles.tabButtonActive : {})
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'coordination' && renderCoordinationTab()}
      {activeTab === 'analytics' && renderAnalyticsTab()}
      {activeTab === 'integration' && renderIntegrationTab()}
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
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    position: 'relative'
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
    margin: '0 0 20px 0',
    lineHeight: '1.5'
  },
  
  regenerateButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  
  tabNav: {
    display: 'flex',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '8px',
    marginBottom: '30px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  
  tabButton: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#666',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  
  tabButtonActive: {
    backgroundColor: '#007AFF',
    color: 'white'
  },
  
  tabContent: {
    minHeight: '400px'
  },
  
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  
  overviewCard: {
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
  
  familyStats: {
    display: 'flex',
    justifyContent: 'space-around',
    gap: '20px'
  },
  
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#007AFF'
  },
  
  statLabel: {
    fontSize: '12px',
    color: '#666',
    textAlign: 'center'
  },
  
  quickWins: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  
  quickWin: {
    display: 'flex',
    alignItems: 'center',
    justify: 'space-between',
    padding: '12px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px'
  },
  
  quickWinContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  
  quickWinTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  
  quickWinBenefit: {
    fontSize: '12px',
    color: '#666'
  },
  
  quickWinButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  
  familyTime: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  
  familyTimeHeader: {
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center'
  },
  
  familyTimeCount: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  
  familyTimeHours: {
    fontSize: '14px',
    color: '#007AFF',
    fontWeight: '500'
  },
  
  familyTimeSlots: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  
  familyTimeSlot: {
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#F8F9FA',
    borderRadius: '6px'
  },
  
  slotDay: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#333',
    textTransform: 'capitalize'
  },
  
  slotTime: {
    fontSize: '12px',
    color: '#666'
  },
  
  slotType: {
    fontSize: '11px',
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  
  childrenStatus: {
    marginBottom: '30px'
  },
  
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 20px 0'
  },
  
  childrenGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px'
  },
  
  childCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  
  childHeader: {
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  
  childInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  
  childName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  
  childAge: {
    fontSize: '12px',
    color: '#666'
  },
  
  childScore: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#007AFF'
  },
  
  childMetrics: {
    display: 'flex',
    justify: 'space-between',
    marginBottom: '12px'
  },
  
  childMetric: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  
  metricLabel: {
    fontSize: '11px',
    color: '#666'
  },
  
  metricValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333'
  },
  
  childIssues: {
    fontSize: '12px',
    color: '#F44336',
    backgroundColor: '#FFEBEE',
    padding: '8px 12px',
    borderRadius: '6px'
  },
  
  coordinationSection: {
    marginBottom: '30px'
  },
  
  coordinationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px'
  },
  
  coordinationCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  
  cardSubtitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 16px 0'
  },
  
  coordinationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  
  coordinationItem: {
    display: 'flex',
    alignItems: 'center',
    justify: 'space-between',
    padding: '16px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px'
  },
  
  coordinationInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  
  coordinationActivity: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  
  coordinationChildren: {
    fontSize: '12px',
    color: '#666'
  },
  
  coordinationBenefit: {
    fontSize: '12px',
    color: '#4CAF50',
    fontWeight: '500'
  },
  
  carpoolScore: {
    fontSize: '11px',
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  
  coordinationButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  
  noOpportunities: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px'
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
  
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
  },
  
  singleChildState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
  },
  
  addChildButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '20px'
  },
  
  recommendationsSection: {
    marginBottom: '30px'
  },
  
  recommendationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  
  recommendationCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  
  recommendationHeader: {
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  
  recommendationTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  
  recommendationPriority: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
    padding: '4px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase'
  },
  
  recommendationDescription: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
    margin: '0 0 16px 0'
  },
  
  recommendationFooter: {
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center'
  },
  
  recommendationBenefit: {
    fontSize: '12px',
    color: '#4CAF50',
    fontWeight: '500'
  },
  
  recommendationButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  
  integrationSection: {
    marginBottom: '30px'
  },
  
  integrationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
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
    gap: '16px'
  },
  
  statusBadge: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#F44336',
    backgroundColor: '#FFEBEE',
    padding: '6px 12px',
    borderRadius: '6px',
    alignSelf: 'flex-start'
  },
  
  integrationDescription: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
    margin: 0
  },
  
  integrationButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
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
  if (!document.head.querySelector('style[data-coordination-spinner]')) {
    style.setAttribute('data-coordination-spinner', 'true');
    document.head.appendChild(style);
  }
}

export default FamilyCoordinationView;