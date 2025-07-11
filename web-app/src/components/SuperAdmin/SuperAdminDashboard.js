import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../firebase';
import useSuperAdminAuth from '../../hooks/useSuperAdminAuth';
import StatisticCard from './StatisticCard';
import { Button, Typography } from '../MD3';

function SuperAdminDashboard() {
  const { user, logout } = useSuperAdminAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalFamilies: 0,
    totalAuPairs: 0,
    totalHostParents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up real-time listeners for statistics
    const unsubscribers = [];

    // Listen to users collection
    const usersQuery = query(collection(db, 'users'));
    const usersUnsubscribe = onSnapshot(usersQuery, 
      (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Calculate user statistics
        const auPairs = users.filter(user => user.role === 'aupair').length;
        const hostParents = users.filter(user => user.role === 'parent').length;
        
        setStats(prev => ({
          ...prev,
          totalUsers: users.length,
          totalAuPairs: auPairs,
          totalHostParents: hostParents
        }));
      },
      (error) => {
        console.error('Error fetching users:', error);
      }
    );
    unsubscribers.push(usersUnsubscribe);

    // Listen to families collection
    const familiesQuery = query(collection(db, 'families'));
    const familiesUnsubscribe = onSnapshot(familiesQuery,
      (snapshot) => {
        setStats(prev => ({
          ...prev,
          totalFamilies: snapshot.size
        }));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching families:', error);
        setLoading(false);
      }
    );
    unsubscribers.push(familiesUnsubscribe);

    // Cleanup listeners on unmount
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout from the Super Admin panel?')) {
      await logout();
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--md-sys-color-surface)' }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: 'var(--md-sys-color-surface-container)',
        boxShadow: 'var(--md-sys-elevation-level1)',
        padding: '16px 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="md3-fab-small" style={{ 
                background: 'linear-gradient(135deg, var(--md-sys-color-error) 0%, var(--md-sys-color-error-container) 100%)' 
              }}>
                <span className="material-icons" style={{ color: 'var(--md-sys-color-on-error)', fontSize: '20px' }}>
                  admin_panel_settings
                </span>
              </div>
              <div>
                <h1 className="md3-title-large md3-on-surface-color" style={{ margin: 0 }}>
                  Super Admin Dashboard
                </h1>
                <p className="md3-body-small md3-on-surface-variant-color" style={{ margin: 0 }}>
                  Logged in as: {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="md3-button md3-button-text"
              style={{ color: 'var(--md-sys-color-error)' }}
            >
              <span className="material-icons" style={{ marginRight: '8px' }}>logout</span>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <h2 className="md3-headline-small md3-on-surface-color" style={{ marginBottom: '24px' }}>
          Platform Statistics
        </h2>
        
        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            padding: '48px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '48px', 
                height: '48px',
                border: '4px solid var(--md-sys-color-surface-variant)',
                borderTopColor: 'var(--md-sys-color-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }} />
              <p className="md3-body-medium md3-on-surface-variant-color">Loading statistics...</p>
            </div>
          </div>
        ) : (
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            marginBottom: '48px'
          }}>
            <StatisticCard
              title="Total Users"
              value={stats.totalUsers}
              icon="people"
              color="primary"
            />
            <StatisticCard
              title="Total Families"
              value={stats.totalFamilies}
              icon="family_restroom"
              color="secondary"
            />
            <StatisticCard
              title="Au Pairs"
              value={stats.totalAuPairs}
              icon="person"
              color="tertiary"
            />
            <StatisticCard
              title="Host Parents"
              value={stats.totalHostParents}
              icon="supervisor_account"
              color="success"
            />
          </div>
        )}

        {/* Additional Info */}
        <div className="md3-card" style={{ 
          backgroundColor: 'var(--md-sys-color-surface-container-low)',
          padding: '24px'
        }}>
          <h3 className="md3-title-medium md3-on-surface-color" style={{ marginBottom: '16px' }}>
            System Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="material-icons" style={{ 
                fontSize: '18px', 
                marginRight: '8px',
                color: 'var(--md-sys-color-on-surface-variant)'
              }}>
                info
              </span>
              <p className="md3-body-medium md3-on-surface-variant-color" style={{ margin: 0 }}>
                Real-time statistics update automatically
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="material-icons" style={{ 
                fontSize: '18px', 
                marginRight: '8px',
                color: 'var(--md-sys-color-on-surface-variant)'
              }}>
                security
              </span>
              <p className="md3-body-medium md3-on-surface-variant-color" style={{ margin: 0 }}>
                Read-only access to platform data
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="material-icons" style={{ 
                fontSize: '18px', 
                marginRight: '8px',
                color: 'var(--md-sys-color-on-surface-variant)'
              }}>
                update
              </span>
              <p className="md3-body-medium md3-on-surface-variant-color" style={{ margin: 0 }}>
                Last updated: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default SuperAdminDashboard;