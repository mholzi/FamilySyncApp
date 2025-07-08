import React, { useState, useEffect } from 'react';
import { addShoppingItem, toggleShoppingItem, markShoppingListCompleted } from '../../utils/familyUtils';
import { getFamilyItems, createOrUpdateFamilyItem, updateItemFamiliarity, getItemIcon } from '../../utils/familyItemsUtils';
import AddItemForm from './AddItemForm';
import ItemDetailsModal from './ItemDetailsModal';
import ReceiptUpload from './ReceiptUpload';
import ApprovalInterface from './ApprovalInterface';
import './ShoppingList.css';

const ShoppingList = ({ list, familyId, currentUser, family, mode = 'active' }) => {
  const [familyItems, setFamilyItems] = useState({});
  const [showAddItem, setShowAddItem] = useState(false);
  const [showItemDetails, setShowItemDetails] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showApproval, setShowApproval] = useState(false);

  // Determine user role
  const userRole = family?.parentUids?.includes(currentUser?.uid) ? 'parent' : 'aupair';

  useEffect(() => {
    const loadFamilyItems = async () => {
      if (familyId) {
        try {
          const items = await getFamilyItems(familyId);
          setFamilyItems(items);
        } catch (error) {
          console.error('Error loading family items:', error);
        }
      }
    };
    
    loadFamilyItems();
  }, [familyId]);

  const handleAddItem = async (itemName) => {
    if (!itemName.trim() || !familyId) return;

    try {
      const itemId = Date.now().toString();
      const familyItemKey = itemName.toLowerCase().replace(/\s+/g, '_');
      
      // Check if item exists in family database
      let familyItemId = null;
      if (familyItems[familyItemKey]) {
        familyItemId = familyItems[familyItemKey].id;
      } else {
        // Create new family item
        await createOrUpdateFamilyItem(familyId, itemName, { name: itemName }, currentUser.uid);
        familyItemId = `familyitem_${familyItemKey}`;
        
        // Refresh family items
        const updatedItems = await getFamilyItems(familyId);
        setFamilyItems(updatedItems);
      }

      await addShoppingItem(familyId, list.id, {
        name: itemName,
        quantity: 1,
        unit: '',
        familyItemId: familyItemId
      }, currentUser.uid);

      setShowAddItem(false);
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item. Please try again.');
    }
  };

  const handleToggleItem = async (itemId, isPurchased) => {
    try {
      await toggleShoppingItem(familyId, list.id, itemId, isPurchased, currentUser.uid);
      
      // Update familiarity if item was purchased
      if (isPurchased) {
        const item = list.items?.[itemId];
        if (item?.familyItemId) {
          const familyItemKey = item.name.toLowerCase().replace(/\s+/g, '_');
          await updateItemFamiliarity(familyId, item.name, currentUser.uid);
          
          // Refresh family items
          const updatedItems = await getFamilyItems(familyId);
          setFamilyItems(updatedItems);
        }
      }
    } catch (error) {
      console.error('Error toggling item:', error);
      alert('Failed to update item. Please try again.');
    }
  };

  const handleItemDetails = (itemName) => {
    const familyItemKey = itemName.toLowerCase().replace(/\s+/g, '_');
    const familyItem = familyItems[familyItemKey];
    setShowItemDetails({ itemName, familyItem, familyItemKey });
  };

  const handleSaveItemDetails = async (itemData) => {
    try {
      await createOrUpdateFamilyItem(familyId, showItemDetails.itemName, itemData, currentUser.uid);
      
      // Refresh family items
      const updatedItems = await getFamilyItems(familyId);
      setFamilyItems(updatedItems);
      
      setShowItemDetails(null);
    } catch (error) {
      console.error('Error saving item details:', error);
      alert('Failed to save item details. Please try again.');
    }
  };

  const handleCompleteShopping = async () => {
    try {
      await markShoppingListCompleted(familyId, list.id);
    } catch (error) {
      console.error('Error completing shopping list:', error);
      alert('Failed to complete shopping list. Please try again.');
    }
  };

  const getItemDisplayIcon = (itemName) => {
    const familyItemKey = itemName.toLowerCase().replace(/\s+/g, '_');
    const familyItem = familyItems[familyItemKey];
    return getItemIcon(familyItem);
  };

  const hasItemDetails = (itemName) => {
    const familyItemKey = itemName.toLowerCase().replace(/\s+/g, '_');
    const familyItem = familyItems[familyItemKey];
    return familyItem && (familyItem.referencePhotoUrl || familyItem.guidanceNotes);
  };

  const items = list.items ? Object.values(list.items) : [];
  const completedItems = items.filter(item => item.isPurchased).length;
  const allItemsCompleted = items.length > 0 && completedItems === items.length;

  if (mode === 'approval') {
    return (
      <div className="shopping-list approval-mode">
        <div className="list-header">
          <h3>{list.name}</h3>
          <span className="amount">${list.actualTotal || '0.00'}</span>
        </div>
        <button 
          className="review-btn"
          onClick={() => setShowApproval(true)}
        >
          💰 Mark as Paid
        </button>
        
        {showApproval && (
          <ApprovalInterface
            list={list}
            familyId={familyId}
            currentUser={currentUser}
            onClose={() => setShowApproval(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="shopping-list">
      <div className="list-header">
        <div className="list-info">
          <h3>{list.name}</h3>
          {items.length > 0 && (
            <span className="progress">
              {items.length - completedItems === 0 
                ? 'List completed' 
                : `${items.length - completedItems}/${items.length} items remaining`
              }
            </span>
          )}
        </div>
        
        {allItemsCompleted && list.status !== 'completed' && (
          <button 
            className="complete-shopping-btn"
            onClick={handleCompleteShopping}
          >
            Complete Shopping
          </button>
        )}
        
        {list.status === 'completed' && (
          <button 
            className="upload-receipt-btn"
            onClick={() => setShowReceipt(true)}
          >
            Receipt
          </button>
        )}
      </div>
      
      {list.supermarket && (
        <div className="supermarket-info">
          <span className="supermarket-logo">{list.supermarket.logo}</span>
          <div className="supermarket-details">
            <span className="supermarket-name">{list.supermarket.name}</span>
            <span className="supermarket-address">{list.supermarket.location?.address}</span>
          </div>
        </div>
      )}
      
      <div className="list-actions">
      </div>

      <div className="items-list">
        {items.map(item => (
          <div key={item.id} className={`item ${item.isPurchased ? 'completed' : ''}`}>
            <div className="item-content">
              <button
                className="item-checkbox"
                onClick={() => handleToggleItem(item.id, !item.isPurchased)}
              >
                {item.isPurchased ? '✓' : ''}
              </button>
              
              <span className="item-name">
                {item.name}
              </span>
              
              {hasItemDetails(item.name) && (
                <button
                  className="details-badge"
                  onClick={() => handleItemDetails(item.name)}
                  title="View details"
                >
                  Details
                </button>
              )}
            </div>
          </div>
        ))}
        
        {items.length === 0 && (
          <div className="empty-items">
            <p>No items added yet</p>
          </div>
        )}
      </div>

      <button 
        className="add-item-btn"
        onClick={() => setShowAddItem(true)}
      >
        + Add Item
      </button>

      {showAddItem && (
        <AddItemForm
          familyItems={familyItems}
          onAddItem={handleAddItem}
          onCancel={() => setShowAddItem(false)}
          onShowDetails={handleItemDetails}
        />
      )}

      {showItemDetails && (
        <ItemDetailsModal
          itemName={showItemDetails.itemName}
          familyItem={showItemDetails.familyItem}
          familyId={familyId}
          currentUser={currentUser}
          userRole={userRole}
          onSave={handleSaveItemDetails}
          onClose={() => setShowItemDetails(null)}
        />
      )}

      {showReceipt && (
        <ReceiptUpload
          list={list}
          familyId={familyId}
          currentUser={currentUser}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
};

export default ShoppingList;