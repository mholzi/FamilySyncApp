import React, { useState, useEffect } from 'react';
import { addShoppingItem, toggleShoppingItem, markShoppingListCompleted, updateShoppingList } from '../../utils/familyUtils';
import { getFamilyItems, createOrUpdateFamilyItem, updateItemFamiliarity, getItemIcon } from '../../utils/familyItemsUtils';
import AddItemForm from './AddItemForm';
import ItemDetailsModal from './ItemDetailsModal';
import ReceiptUpload from './ReceiptUpload';
import ApprovalInterface from './ApprovalInterface';
import EditShoppingList from './EditShoppingList';

const ShoppingList = ({ list, familyId, currentUser, family, userData, mode = 'active' }) => {
  const [familyItems, setFamilyItems] = useState({});
  const [showAddItem, setShowAddItem] = useState(false);
  const [showItemDetails, setShowItemDetails] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [expandedItemDetails, setExpandedItemDetails] = useState(new Set());

  // Determine user role - consistent with ShoppingListPage
  const userRole = userData?.role || (family?.parentUids?.includes(currentUser?.uid) ? 'parent' : 'aupair');
  

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
    
    if (userRole === 'aupair') {
      // For au pairs, toggle inline expansion
      const newExpanded = new Set(expandedItemDetails);
      if (newExpanded.has(itemName)) {
        newExpanded.delete(itemName);
      } else {
        newExpanded.add(itemName);
      }
      setExpandedItemDetails(newExpanded);
    } else {
      // For parents, show the modal for editing
      setShowItemDetails({ itemName, familyItem, familyItemKey });
    }
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

  const handleUpdateList = async (updateData) => {
    if (!familyId || !list.id || updating) return;
    
    setUpdating(true);
    try {
      console.log('Updating shopping list...');
      await updateShoppingList(familyId, list.id, updateData);
      console.log('Shopping list updated successfully');
      setShowEdit(false);
    } catch (error) {
      console.error('Error updating shopping list:', error);
      alert('Failed to update shopping list. Please try again.');
    } finally {
      setUpdating(false);
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
    // Format completed date
    const formatCompletedDate = () => {
      if (!list.completedAt) return 'Completed';
      const date = list.completedAt.toDate ? list.completedAt.toDate() : new Date(list.completedAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const isToday = date.toDateString() === today.toDateString();
      const isYesterday = date.toDateString() === yesterday.toDateString();
      
      if (isToday) return 'Completed Today';
      if (isYesterday) return 'Completed Yesterday';
      
      // Format as "Completed Dec 25"
      const options = { month: 'short', day: 'numeric' };
      return `Completed ${date.toLocaleDateString('en-US', options)}`;
    };

    return (
      <div style={{
        ...styles.shoppingList,
        ...styles.approvalMode,
        position: 'relative',
        paddingBottom: '60px', // Space for button
        display: 'flex',
        gap: '12px'
      }}>
        {/* Time section on the left - matching task card design */}
        <div style={styles.approvalTimeSection}>
          <div style={styles.approvalTimeDisplay}>
            {(() => {
              if (!list.completedAt) return 'N/A';
              const date = list.completedAt.toDate ? list.completedAt.toDate() : new Date(list.completedAt);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            })()}
          </div>
          <div style={styles.approvalDayIndicator}>
            Completed
          </div>
        </div>
        
        {/* Main content section */}
        <div style={{ flex: 1 }}>
          <div style={styles.listHeader}>
            <div style={styles.listInfo}>
              <h3 style={styles.listTitle}>{list.name}</h3>
            </div>
            <span style={styles.amount}>€{list.totalAmount?.toFixed(2) || list.actualTotal?.toFixed(2) || '0.00'}</span>
          </div>
        </div>
        
        {list.paymentStatus !== 'confirmed' && (
          userRole === 'parent' || (userRole === 'aupair' && list.paymentStatus === 'paid-out' && list.receiptUploadedBy === currentUser?.uid)
        ) && (
          <button 
            style={styles.markAsPaidBtn}
            onClick={() => setShowApproval(true)}
          >
            {userRole === 'aupair' && list.paymentStatus === 'paid-out' 
              ? 'Confirm Receipt' 
              : 'Mark as Paid'
            }
          </button>
        )}
        
        {list.paymentStatus === 'confirmed' && (
          <div style={styles.confirmedBadge}>
            ✓ Confirmed
          </div>
        )}
        
        {showApproval && (
          <ApprovalInterface
            list={list}
            familyId={familyId}
            currentUser={currentUser}
            family={family}
            onClose={() => setShowApproval(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={styles.shoppingList}>
      <div style={styles.listHeader}>
        <div style={styles.listInfo}>
          <h3 style={styles.listTitle}>{list.name}</h3>
          {items.length > 0 && (
            <span style={styles.progress}>
              {items.length - completedItems === 0 
                ? 'List completed' 
                : `${items.length - completedItems}/${items.length} items remaining`
              }
            </span>
          )}
        </div>
        
        <div style={styles.headerActions}>
          {userRole === 'parent' && list.status !== 'completed' && (
            <button 
              style={styles.editBtn}
              onClick={() => setShowEdit(true)}
              title="Edit list details"
            >
              Edit
            </button>
          )}
          
          {allItemsCompleted && list.status !== 'completed' && (
            <button 
              style={styles.completeShoppingBtn}
              onClick={handleCompleteShopping}
            >
              Complete Shopping
            </button>
          )}
          
          {list.status === 'completed' && (
            <button 
              style={styles.uploadReceiptBtn}
              onClick={() => setShowReceipt(true)}
            >
              Receipt
            </button>
          )}
        </div>
      </div>
      
      {list.supermarket && (
        <div style={styles.supermarketInfo}>
          <span style={styles.supermarketLogo}>{list.supermarket.logo}</span>
          <div style={styles.supermarketDetails}>
            <span style={styles.supermarketName}>{list.supermarket.name}</span>
            <span style={styles.supermarketAddress}>{list.supermarket.location?.address}</span>
          </div>
        </div>
      )}
      
      <div style={styles.itemsList}>
        {items.map(item => {
          const isExpanded = expandedItemDetails.has(item.name);
          const familyItemKey = item.name.toLowerCase().replace(/\s+/g, '_');
          const familyItem = familyItems[familyItemKey];
          
          return (
            <div key={item.id} style={{
              ...styles.item,
              ...(item.isPurchased ? styles.itemCompleted : {}),
              ...(isExpanded ? styles.itemExpanded : {})
            }}>
              <div style={styles.itemContent}>
                <button
                  style={{
                    ...styles.itemCheckbox,
                    ...(item.isPurchased ? styles.itemCheckboxCompleted : {})
                  }}
                  onClick={() => handleToggleItem(item.id, !item.isPurchased)}
                >
                  {item.isPurchased ? '✓' : ''}
                </button>
                
                <span style={{
                  ...styles.itemName,
                  ...(item.isPurchased ? styles.itemNameCompleted : {})
                }}>
                  {item.name}
                </span>
                
                {hasItemDetails(item.name) && (
                  <button
                    style={{
                      ...styles.detailsBadge,
                      ...(isExpanded && userRole === 'aupair' ? styles.detailsBadgeExpanded : {})
                    }}
                    onClick={() => handleItemDetails(item.name)}
                    title={userRole === 'aupair' ? (isExpanded ? "Hide details" : "Show details") : "View details"}
                  >
                    {userRole === 'aupair' && isExpanded ? 'Hide' : 'Details'}
                  </button>
                )}
              </div>
              
              {/* Inline expanded details for au pairs */}
              {isExpanded && userRole === 'aupair' && familyItem && (
                <div style={styles.expandedDetails}>
                  {familyItem.referencePhotoUrl && (
                    <div style={styles.expandedPhotoSection}>
                      <img 
                        src={familyItem.referencePhotoUrl} 
                        alt={item.name} 
                        style={styles.expandedPhoto}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {familyItem.guidanceNotes && (
                    <div style={styles.expandedNotesSection}>
                      <div style={styles.expandedNotes}>
                        {familyItem.guidanceNotes}
                      </div>
                    </div>
                  )}
                  
                  {!familyItem.referencePhotoUrl && !familyItem.guidanceNotes && (
                    <div style={styles.expandedEmptyState}>
                      No additional details available.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        
        {items.length === 0 && (
          <div style={styles.emptyItems}>
            <p style={styles.emptyText}>No items added yet</p>
          </div>
        )}
      </div>

      <button 
        style={styles.addItemBtn}
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
          familyId={familyId}
          currentUser={currentUser}
          userRole={userRole}
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

      {showEdit && (
        <EditShoppingList
          list={list}
          onCancel={() => setShowEdit(false)}
          onUpdate={handleUpdateList}
          updating={updating}
          familyId={familyId}
          currentUser={currentUser}
          userRole={userRole}
        />
      )}
    </div>
  );
};

// Material Design 3 styles matching the event card template
const styles = {
  shoppingList: {
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    padding: '16px',
    marginBottom: '20px',
    boxShadow: 'var(--md-sys-elevation-level1)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    position: 'relative',
    transition: 'var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard)'
  },
  approvalMode: {
    borderLeft: '4px solid var(--md-sys-color-error)'
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  listInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1
  },
  listTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    lineHeight: '1.3',
    textAlign: 'left'
  },
  progress: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: '1.4'
  },
  amount: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--md-sys-color-primary)'
  },
  supermarketInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    border: '1px solid var(--md-sys-color-outline-variant)'
  },
  supermarketLogo: {
    fontSize: '24px',
    flexShrink: 0
  },
  supermarketDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1
  },
  supermarketName: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    lineHeight: '1.3'
  },
  supermarketAddress: {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    lineHeight: '1.4'
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px'
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  itemCompleted: {
    opacity: 0.6,
    backgroundColor: 'var(--md-sys-color-surface-container)'
  },
  itemContent: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    gap: '12px'
  },
  itemCheckbox: {
    width: '24px',
    height: '24px',
    border: '2px solid var(--md-sys-color-outline)',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    backgroundColor: 'var(--md-sys-color-surface)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--md-sys-color-on-primary)',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  itemCheckboxCompleted: {
    backgroundColor: 'var(--md-sys-color-primary)',
    borderColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)'
  },
  itemName: {
    flex: 1,
    fontSize: '16px',
    color: 'var(--md-sys-color-on-surface)',
    textAlign: 'left',
    lineHeight: '1.3'
  },
  itemNameCompleted: {
    textDecoration: 'line-through',
    color: 'var(--md-sys-color-on-surface-variant)'
  },
  detailsBadge: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    padding: '4px 8px',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    fontSize: '11px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  detailsBadgeExpanded: {
    backgroundColor: 'var(--md-sys-color-secondary)',
    color: 'var(--md-sys-color-on-secondary)'
  },
  itemExpanded: {
    backgroundColor: 'var(--md-sys-color-surface-container-highest)'
  },
  expandedDetails: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: 'var(--md-sys-color-surface-container)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    border: '1px solid var(--md-sys-color-outline-variant)'
  },
  expandedPhotoSection: {
    marginBottom: '12px',
    textAlign: 'center'
  },
  expandedPhoto: {
    maxWidth: '150px',
    maxHeight: '150px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    boxShadow: 'var(--md-sys-elevation-level1)',
    objectFit: 'cover'
  },
  expandedNotesSection: {
    marginBottom: '8px'
  },
  expandedNotes: {
    fontSize: '14px',
    lineHeight: '1.4',
    color: 'var(--md-sys-color-on-surface)',
    whiteSpace: 'pre-wrap',
    fontStyle: 'italic',
    opacity: 0.9
  },
  expandedEmptyState: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '8px'
  },
  addItemBtn: {
    width: '100%',
    backgroundColor: 'var(--md-sys-color-surface-container)',
    border: '2px dashed var(--md-sys-color-outline)',
    color: 'var(--md-sys-color-on-surface-variant)',
    padding: '12px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  emptyItems: {
    textAlign: 'center',
    padding: '24px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    border: '1px solid var(--md-sys-color-outline-variant)'
  },
  emptyText: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontStyle: 'italic'
  },
  editBtn: {
    backgroundColor: 'var(--md-sys-color-surface-container)',
    color: 'var(--md-sys-color-on-surface)',
    border: '1px solid var(--md-sys-color-outline)',
    padding: '6px 12px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap'
  },
  completeShoppingBtn: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap'
  },
  uploadReceiptBtn: {
    backgroundColor: 'var(--md-sys-color-secondary)',
    color: 'var(--md-sys-color-on-secondary)',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap'
  },
  reviewBtn: {
    backgroundColor: 'var(--md-sys-color-error)',
    color: 'var(--md-sys-color-on-error)',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)'
  },
  completedDateBadge: {
    display: 'inline-block',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    color: 'var(--md-sys-color-on-surface-variant)',
    padding: '4px 8px',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    fontSize: '12px',
    fontWeight: '500',
    marginTop: '4px',
    marginLeft: '3px',
    marginRight: '3px'
  },
  markAsPaidBtn: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    padding: '8px 12px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    minWidth: '80px'
  },
  approvalTimeSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    minWidth: '70px',
    textAlign: 'left'
  },
  approvalTimeDisplay: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--md-sys-color-primary)',
    lineHeight: '1.3'
  },
  approvalDayIndicator: {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface)',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    padding: '4px 8px',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    marginTop: '4px',
    fontWeight: '500'
  },
  confirmedBadge: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    backgroundColor: 'var(--md-sys-color-tertiary-container)',
    color: 'var(--md-sys-color-on-tertiary-container)',
    padding: '8px 12px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    fontSize: '12px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }
};

export default ShoppingList;