import React, { useState, useEffect } from 'react';
import { useFamily } from '../../hooks/useFamily';
import FamilyMembersSection from './FamilyMembersSection';
import ChildrenSection from './ChildrenSection';
import InvitationsSection from './InvitationsSection';
import LoadingProgress from '../LoadingProgress';

const FamilyManagement = ({ user, onBack }) => {
  const { userData, familyData, loading } = useFamily(user.uid);
  const [activeSection, setActiveSection] = useState('all');

  // Check if user is a parent
  const isParent = userData?.role === 'parent';

  useEffect(() => {
    // Redirect non-parents
    if (!loading && userData && !isParent) {
      alert('Only parents can access Family Management');
      if (onBack) onBack();
    }
  }, [loading, userData, isParent, onBack]);

  if (loading) {
    return <LoadingProgress message="Loading family data..." />;
  }

  if (!isParent) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <h2>Access Denied</h2>
          <p>Only parents can access Family Management.</p>
          <button style={styles.backButton} onClick={onBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backButton} onClick={onBack || (() => window.history.back())}>
          ←
        </button>
        <h1 style={styles.title}>Family Management</h1>
        <div style={styles.headerSpacer} />
      </header>

      {/* Tab Navigation */}
      <div style={styles.tabContainer}>
        <button
          style={{
            ...styles.tab,
            ...(activeSection === 'all' ? styles.activeTab : {})
          }}
          onClick={() => setActiveSection('all')}
        >
          All
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeSection === 'members' ? styles.activeTab : {})
          }}
          onClick={() => setActiveSection('members')}
        >
          Members
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeSection === 'children' ? styles.activeTab : {})
          }}
          onClick={() => setActiveSection('children')}
        >
          Children
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeSection === 'invitations' ? styles.activeTab : {})
          }}
          onClick={() => setActiveSection('invitations')}
        >
          Invitations
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeSection === 'all' && (
          <>
            <FamilyMembersSection 
              familyData={familyData} 
              currentUserId={user.uid}
            />
            <ChildrenSection 
              familyData={familyData} 
              familyId={familyData?.id}
            />
            <InvitationsSection 
              familyData={familyData} 
              familyId={familyData?.id}
              currentUserName={userData?.name}
            />
          </>
        )}
        
        {activeSection === 'members' && (
          <FamilyMembersSection 
            familyData={familyData} 
            currentUserId={user.uid}
          />
        )}
        
        {activeSection === 'children' && (
          <ChildrenSection 
            familyData={familyData} 
            familyId={familyData?.id}
          />
        )}
        
        {activeSection === 'invitations' && (
          <InvitationsSection 
            familyData={familyData} 
            familyId={familyData?.id}
            currentUserName={userData?.name}
          />
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: 'calc(100vh - 64px)',
    backgroundColor: '#F2F2F7',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    paddingBottom: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#007AFF',
    padding: '8px',
    width: '40px'
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    margin: 0,
    flex: 1,
    textAlign: 'center'
  },
  headerSpacer: {
    width: '40px'
  },
  tabContainer: {
    display: 'flex',
    backgroundColor: 'white',
    borderBottom: '1px solid #E5E5EA',
    padding: '0 20px',
    gap: '20px',
    overflowX: 'auto'
  },
  tab: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '12px 4px',
    fontSize: '15px',
    fontWeight: '500',
    color: '#8E8E93',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  },
  activeTab: {
    color: '#007AFF',
    borderBottomColor: '#007AFF'
  },
  content: {
    padding: '20px'
  },
  accessDenied: {
    textAlign: 'center',
    padding: '40px 20px'
  }
};

export default FamilyManagement;