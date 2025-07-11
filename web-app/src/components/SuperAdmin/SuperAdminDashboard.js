import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import useSuperAdminAuth from '../../hooks/useSuperAdminAuth';
import StatisticCard from './StatisticCard';

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
    <div className="super-admin-dashboard" style={{ minHeight: '100vh', backgroundColor: 'var(--md-sys-color-surface)' }}>
      {/* Header */}
      <div className="md3-elevation-1" style={{ backgroundColor: 'var(--md-sys-color-surface-container)' }}>
        <div className="md3-container">
          <div className="md3-flex md3-justify-between md3-flex-center md3-p-16">
            <div className="md3-flex md3-flex-center md3-gap-16">
              <div className="md3-fab-small" style={{ 
                background: 'linear-gradient(135deg, var(--md-sys-color-error) 0%, var(--md-sys-color-error-container) 100%)' 
              }}>
                <span className="material-icons" style={{ color: 'var(--md-sys-color-on-error)', fontSize: '20px' }}>
                  admin_panel_settings
                </span>
              </div>
              <div>
                <h1 className="md3-title-large md3-on-surface-color">Super Admin Dashboard</h1>
                <p className="md3-body-small md3-on-surface-variant-color">
                  Logged in as: {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="md3-button md3-button-text md3-error-color"
            >
              <span className="material-icons md3-mr-8">logout</span>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md3-container md3-p-24">
        <h2 className="md3-headline-small md3-on-surface-color md3-mb-24">Platform Statistics</h2>
        
        {loading ? (
          <div className="md3-flex md3-flex-center md3-p-48">
            <div className="md3-progress-circular">
              <svg viewBox="0 0 48 48" style={{ width: '48px', height: '48px' }}>
                <circle cx="24" cy="24" r="20" fill="none" stroke="var(--md-sys-color-primary)" strokeWidth="4" strokeDasharray="125.66" strokeDashoffset="31.42" />
              </svg>
            </div>
          </div>
        ) : (
          <div className="md3-grid md3-grid-cols-1 md3-grid-cols-2-md md3-grid-cols-4-lg md3-gap-16">
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
        <div className="md3-mt-48">
          <div className="md3-card md3-elevation-0" style={{ backgroundColor: 'var(--md-sys-color-surface-container-low)' }}>
            <div className="md3-p-24">
              <h3 className="md3-title-medium md3-on-surface-color md3-mb-16">System Information</h3>
              <div className="md3-flex md3-flex-column md3-gap-8">
                <p className="md3-body-medium md3-on-surface-variant-color">
                  <span className="material-icons md3-mr-8" style={{ fontSize: '18px', verticalAlign: 'middle' }}>
                    info
                  </span>
                  Real-time statistics update automatically
                </p>
                <p className="md3-body-medium md3-on-surface-variant-color">
                  <span className="material-icons md3-mr-8" style={{ fontSize: '18px', verticalAlign: 'middle' }}>
                    security
                  </span>
                  Read-only access to platform data
                </p>
                <p className="md3-body-medium md3-on-surface-variant-color">
                  <span className="material-icons md3-mr-8" style={{ fontSize: '18px', verticalAlign: 'middle' }}>
                    update
                  </span>
                  Last updated: {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;