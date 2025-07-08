import React, { useState, useEffect } from 'react';
import { getFamilySupermarkets, createFamilySupermarket, updateSupermarketLastUsed, getSupermarketLogo, getSupermarketColor } from '../../utils/familySupermarketsUtils';
import './SupermarketSelector.css';

const SupermarketSelector = ({ 
  selectedSupermarket, 
  onSelect, 
  familyId,
  currentUser,
  showTitle = true,
  disabled = false 
}) => {
  const [familySupermarkets, setFamilySupermarkets] = useState([]);
  const [selectedSupermarketId, setSelectedSupermarketId] = useState(
    selectedSupermarket?.id || ''
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newStore, setNewStore] = useState({
    name: '',
    address: ''
  });

  // Load family supermarkets on component mount
  useEffect(() => {
    const loadSupermarkets = async () => {
      if (!familyId) {
        setLoading(false);
        return;
      }

      try {
        const supermarkets = await getFamilySupermarkets(familyId);
        // Sort by lastUsed descending (most recently used first)
        const sortedSupermarkets = supermarkets.sort((a, b) => {
          const aTime = a.lastUsed?.toDate?.() || a.lastUsed || new Date(0);
          const bTime = b.lastUsed?.toDate?.() || b.lastUsed || new Date(0);
          return new Date(bTime) - new Date(aTime);
        });
        setFamilySupermarkets(sortedSupermarkets);
      } catch (error) {
        console.error('Error loading family supermarkets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSupermarkets();
  }, [familyId]);

  const handleSupermarketSelect = async (supermarket) => {
    setSelectedSupermarketId(supermarket.id);
    
    // Update last used timestamp
    if (familyId) {
      await updateSupermarketLastUsed(familyId, supermarket.id);
    }
    
    // Convert to expected format
    onSelect({
      id: supermarket.id,
      name: supermarket.name,
      logo: supermarket.logo,
      color: supermarket.color,
      location: {
        id: supermarket.id,
        address: supermarket.address
      }
    });
  };

  const handleCreateStore = async () => {
    if (!newStore.name.trim() || !newStore.address.trim() || creating || !familyId || !currentUser?.uid) {
      return;
    }

    setCreating(true);
    try {
      const storeData = {
        name: newStore.name.trim(),
        address: newStore.address.trim(),
        logo: getSupermarketLogo(newStore.name),
        color: getSupermarketColor(newStore.name)
      };

      const createdStore = await createFamilySupermarket(familyId, storeData, currentUser.uid);
      
      // Add to local state
      setFamilySupermarkets(prev => [createdStore, ...prev]);
      
      // Auto-select the newly created store
      handleSupermarketSelect(createdStore);
      
      // Reset form
      setNewStore({ name: '', address: '' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating supermarket:', error);
      alert('Failed to create supermarket. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const selectedStore = familySupermarkets.find(store => store.id === selectedSupermarketId);

  if (loading) {
    return (
      <div className="supermarket-selector">
        {showTitle && (
          <div className="selector-title">
            <span className="title-icon">📍</span>
            <span className="title-text">Select Supermarket</span>
            <span className="title-subtitle">Choose where to shop</span>
          </div>
        )}
        <div className="loading-supermarkets">Loading supermarkets...</div>
      </div>
    );
  }

  return (
    <div className="supermarket-selector">
      {showTitle && (
        <div className="selector-title">
          <span className="title-icon">📍</span>
          <span className="title-text">Select Supermarket</span>
          <span className="title-subtitle">Choose where to shop</span>
        </div>
      )}

      {/* Existing Family Supermarkets */}
      {familySupermarkets.length > 0 && (
        <div className="family-supermarkets">
          <label className="field-label">Your Family's Supermarkets</label>
          <div className="supermarket-list">
            {familySupermarkets.map((supermarket) => (
              <button
                key={supermarket.id}
                type="button"
                className={`supermarket-option ${selectedSupermarketId === supermarket.id ? 'selected' : ''}`}
                onClick={() => handleSupermarketSelect(supermarket)}
                disabled={disabled}
                style={{
                  borderColor: selectedSupermarketId === supermarket.id ? supermarket.color : '#E5E5EA'
                }}
              >
                <div className="supermarket-info">
                  <div className="supermarket-header">
                    <span className="supermarket-logo">{supermarket.logo}</span>
                    <span className="supermarket-name">{supermarket.name}</span>
                  </div>
                  <div className="supermarket-address">{supermarket.address}</div>
                </div>
                <div className="selection-indicator">
                  {selectedSupermarketId === supermarket.id ? '✓' : '→'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add New Supermarket */}
      <div className="add-supermarket-section">
        {!showCreateForm ? (
          <button
            type="button"
            className="add-supermarket-btn"
            onClick={() => setShowCreateForm(true)}
            disabled={disabled}
          >
            <span className="add-icon">+</span>
            <span className="add-text">Add New Supermarket</span>
          </button>
        ) : (
          <div className="create-supermarket-form">
            <label className="field-label">New Supermarket</label>
            
            <div className="form-field">
              <input
                type="text"
                placeholder="Supermarket name (e.g., REWE, Local Market)"
                value={newStore.name}
                onChange={(e) => setNewStore(prev => ({ ...prev, name: e.target.value }))}
                disabled={disabled || creating}
                autoFocus
              />
            </div>
            
            <div className="form-field">
              <input
                type="text"
                placeholder="Full address"
                value={newStore.address}
                onChange={(e) => setNewStore(prev => ({ ...prev, address: e.target.value }))}
                disabled={disabled || creating}
              />
            </div>
            
            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewStore({ name: '', address: '' });
                }}
                disabled={disabled || creating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="create-btn"
                onClick={handleCreateStore}
                disabled={disabled || creating || !newStore.name.trim() || !newStore.address.trim()}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Store Preview */}
      {selectedStore && (
        <div className="selected-store-preview">
          <div className="preview-header">
            <span className="preview-logo">{selectedStore.logo}</span>
            <div className="preview-info">
              <div className="preview-name">{selectedStore.name}</div>
              <div className="preview-address">{selectedStore.address}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupermarketSelector;