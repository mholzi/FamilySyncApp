import React, { useState, useEffect, useMemo } from 'react';
import { useFamily } from '../hooks/useFamily';
import { useShopping } from '../hooks/useShopping';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { createShoppingList } from '../utils/familyUtils';
import ShoppingList from '../components/Shopping/ShoppingList';
import AddShoppingList from '../components/Shopping/AddShoppingList';
import PaymentStatusCard from '../components/Shopping/PaymentStatusCard';
import ShoppingErrorBoundary from '../components/ErrorBoundary/ShoppingErrorBoundary';
import { Typography } from '../components/MD3';
import './ShoppingListPage.css';

const ShoppingListPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const { familyData: family, userData } = useFamily(currentUser?.uid);
  const { shoppingLists, loading, error } = useShopping(family?.id);
  const [showAddList, setShowAddList] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateList = async (listData) => {
    console.log('handleCreateList called with:', listData);
    console.log('family:', family);
    console.log('currentUser:', currentUser);
    
    if (!family?.id || !currentUser?.uid || creating) {
      console.log('Early return - family.id:', family?.id, 'currentUser.uid:', currentUser?.uid, 'creating:', creating);
      return;
    }
    
    setCreating(true);
    try {
      console.log('Creating shopping list...');
      const result = await createShoppingList(family.id, {
        ...listData,
        createdBy: currentUser.uid,
        status: 'pending',
        receiptStatus: 'pending',
        paymentStatus: 'pending',
        needsReimbursement: false,
        items: {}
      });
      console.log('Shopping list created successfully:', result);
      setShowAddList(false);
    } catch (error) {
      console.error('Error creating shopping list:', error);
      alert('Failed to create shopping list. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Determine user role
  const userRole = userData?.role || (family?.parentUids?.includes(currentUser?.uid) ? 'parent' : 'aupair');

  // Memoize filtered lists to prevent unnecessary re-renders and potential Firestore conflicts
  const activeLists = useMemo(() => {
    return shoppingLists.filter(list => !list.isArchived && list.status !== 'paid-out' && list.status !== 'needs-approval');
  }, [shoppingLists]);
  
  // For parents: show pending approval lists
  const pendingApproval = useMemo(() => {
    return userRole === 'parent' 
      ? shoppingLists.filter(list => list.status === 'needs-approval' || list.paymentStatus === 'approved')
      : [];
  }, [shoppingLists, userRole]);

  // For au pairs: show payment tracking for receipts they uploaded
  const paymentTracking = useMemo(() => {
    return userRole === 'aupair' 
      ? shoppingLists.filter(list => 
          list.receiptUploadedBy === currentUser?.uid && 
          (list.status === 'needs-approval' || list.paymentStatus === 'pending' || list.paymentStatus === 'approved' || list.paymentStatus === 'paid-out' || list.paymentStatus === 'confirmed')
        )
      : [];
  }, [shoppingLists, userRole, currentUser?.uid]);

  if (loading) {
    return (
      <div className="shopping-page">
        <div className="loading">Loading shopping lists...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shopping-page">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="shopping-page">
      <div className="shopping-header">
        <Typography variant="headline-small" color="on-surface">Shopping Lists</Typography>
        {userRole === 'parent' && (
          <button 
            className="add-list-btn"
            onClick={() => setShowAddList(true)}
            disabled={!family?.id || !currentUser?.uid}
          >
            Add New List
          </button>
        )}
      </div>

      <ShoppingErrorBoundary>
        <div className="active-lists">
          <Typography variant="headline-small" color="on-surface">Active Lists</Typography>
          {activeLists.length === 0 ? (
            <div className="empty-state">
              <p>No active shopping lists</p>
              {userRole === 'parent' ? (
                <button 
                  className="create-first-btn"
                  onClick={() => setShowAddList(true)}
                  disabled={!family?.id || !currentUser?.uid}
                >
                  Create your first shopping list
                </button>
              ) : (
                <p>Parents will create shopping lists for you to complete</p>
              )}
            </div>
          ) : (
            activeLists.map(list => (
              <ShoppingList 
                key={list.id}
                list={list}
                familyId={family?.id}
                currentUser={currentUser}
                family={family}
                mode="active"
              />
            ))
          )}
        </div>
      </ShoppingErrorBoundary>

      {pendingApproval.length > 0 && (
        <ShoppingErrorBoundary>
          <div className="pending-section">
            <Typography variant="headline-small" color="on-surface">Pending Approval</Typography>
            {pendingApproval.map(list => (
              <ShoppingList 
                key={list.id}
                list={list}
                familyId={family?.id}
                currentUser={currentUser}
                family={family}
                mode="approval"
              />
            ))}
          </div>
        </ShoppingErrorBoundary>
      )}

      {paymentTracking.length > 0 && (
        <ShoppingErrorBoundary>
          <div className="payment-tracking-section">
            <Typography variant="headline-small" color="on-surface">Payment Tracking</Typography>
            <p className="section-description">Track the approval and payment status of your shopping receipts</p>
            <div className="payment-tracking-grid">
              {paymentTracking.map(list => (
                <PaymentStatusCard 
                  key={list.id}
                  list={list}
                  familyId={family?.id}
                  currentUser={currentUser}
                  onUpdate={() => {
                    // Optional: trigger a refresh of the shopping lists
                  }}
                />
              ))}
            </div>
          </div>
        </ShoppingErrorBoundary>
      )}


      {showAddList && (
        <AddShoppingList
          onCancel={() => setShowAddList(false)}
          onCreate={handleCreateList}
          creating={creating}
          familyId={family?.id}
          currentUser={currentUser}
          userRole={userRole}
        />
      )}
    </div>
  );
};

export default ShoppingListPage;