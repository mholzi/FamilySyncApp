import React, { useState, useEffect } from 'react';
import { useFamily } from '../hooks/useFamily';
import { useShopping } from '../hooks/useShopping';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { createShoppingList } from '../utils/familyUtils';
import ShoppingList from '../components/Shopping/ShoppingList';
import AddShoppingList from '../components/Shopping/AddShoppingList';
import './ShoppingListPage.css';

const ShoppingListPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const { familyData: family } = useFamily(currentUser?.uid);
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

  const activeLists = shoppingLists.filter(list => !list.isArchived && list.status !== 'paid-out');
  const pendingApproval = shoppingLists.filter(list => 
    list.status === 'needs-approval' || list.paymentStatus === 'approved'
  );

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
        <h1>Shopping Lists</h1>
        <button 
          className="add-list-btn"
          onClick={() => setShowAddList(true)}
          disabled={!family?.id || !currentUser?.uid}
        >
          + New List
        </button>
      </div>

      {pendingApproval.length > 0 && (
        <div className="pending-section">
          <h2>Pending Approval</h2>
          {pendingApproval.map(list => (
            <ShoppingList 
              key={list.id}
              list={list}
              familyId={family?.id}
              currentUser={currentUser}
              mode="approval"
            />
          ))}
        </div>
      )}

      <div className="active-lists">
        <h2>Active Lists</h2>
        {activeLists.length === 0 ? (
          <div className="empty-state">
            <p>No active shopping lists</p>
            <button 
              className="create-first-btn"
              onClick={() => setShowAddList(true)}
              disabled={!family?.id || !currentUser?.uid}
            >
              Create your first shopping list
            </button>
          </div>
        ) : (
          activeLists.map(list => (
            <ShoppingList 
              key={list.id}
              list={list}
              familyId={family?.id}
              currentUser={currentUser}
              mode="active"
            />
          ))
        )}
      </div>

      {showAddList && (
        <AddShoppingList
          onCancel={() => setShowAddList(false)}
          onCreate={handleCreateList}
          creating={creating}
        />
      )}
    </div>
  );
};

export default ShoppingListPage;