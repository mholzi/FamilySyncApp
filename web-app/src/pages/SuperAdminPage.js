import { useState, useEffect } from 'react';
import SuperAdminLogin from '../components/SuperAdmin/SuperAdminLogin';
import SuperAdminDashboard from '../components/SuperAdmin/SuperAdminDashboard';
import useSuperAdminAuth from '../hooks/useSuperAdminAuth';

function SuperAdminPage() {
  const { isAuthenticated, loading, checkSuperAdminAuth } = useSuperAdminAuth();

  useEffect(() => {
    checkSuperAdminAuth();
  }, [checkSuperAdminAuth]);

  if (loading) {
    return (
      <div className="md3-flex md3-flex-center" style={{ minHeight: '100vh' }}>
        <div className="md3-card md3-elevation-1 animate-fade-in" style={{ maxWidth: '400px', width: '100%', margin: '0 20px' }}>
          <div className="md3-p-24 md3-flex md3-flex-column md3-flex-center md3-gap-16">
            <div className="md3-progress w-full">
              <div className="md3-progress-bar" style={{ width: '70%' }}></div>
            </div>
            <p className="md3-body-large">Checking admin access...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="super-admin-page">
      {isAuthenticated ? <SuperAdminDashboard /> : <SuperAdminLogin />}
    </div>
  );
}

export default SuperAdminPage;