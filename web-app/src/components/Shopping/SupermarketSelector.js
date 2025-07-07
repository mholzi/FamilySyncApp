import React, { useState } from 'react';
import './SupermarketSelector.css';

// Common supermarket chains with sample locations
const COMMON_SUPERMARKETS = {
  'rewe': {
    name: 'REWE',
    logo: '🛒',
    color: '#FF0000',
    locations: [
      { id: 'rewe_downtown', address: 'Hauptstraße 123, 10115 Berlin', phone: '+49 30 12345678' },
      { id: 'rewe_westside', address: 'Kantstraße 45, 10625 Berlin', phone: '+49 30 87654321' },
      { id: 'rewe_center', address: 'Friedrichstraße 200, 10117 Berlin', phone: '+49 30 11223344' }
    ]
  },
  'edeka': {
    name: 'EDEKA',
    logo: '🍃',
    color: '#0066CC',
    locations: [
      { id: 'edeka_center', address: 'Alexanderplatz 1, 10178 Berlin', phone: '+49 30 55667788' },
      { id: 'edeka_south', address: 'Potsdamer Straße 180, 10783 Berlin', phone: '+49 30 99887766' }
    ]
  },
  'aldi': {
    name: 'ALDI',
    logo: '💰',
    color: '#0099CC',
    locations: [
      { id: 'aldi_nord', address: 'Müllerstraße 85, 13349 Berlin', phone: '+49 30 33445566' },
      { id: 'aldi_east', address: 'Karl-Marx-Allee 100, 10243 Berlin', phone: '+49 30 77889900' }
    ]
  },
  'lidl': {
    name: 'Lidl',
    logo: '🔵',
    color: '#0050AA',
    locations: [
      { id: 'lidl_west', address: 'Kurfürstendamm 89, 10709 Berlin', phone: '+49 30 22334455' },
      { id: 'lidl_center', address: 'Unter den Linden 50, 10117 Berlin', phone: '+49 30 66778899' }
    ]
  },
  'kaufland': {
    name: 'Kaufland',
    logo: '🏪',
    color: '#FF6600',
    locations: [
      { id: 'kaufland_big', address: 'Warschauer Straße 25, 10243 Berlin', phone: '+49 30 44556677' }
    ]
  },
  'custom': {
    name: 'Other Store',
    logo: '🏬',
    color: '#666666',
    locations: []
  }
};

const SupermarketSelector = ({ 
  selectedSupermarket, 
  onSelect, 
  showTitle = true,
  disabled = false 
}) => {
  const [selectedChain, setSelectedChain] = useState(
    selectedSupermarket?.chain || ''
  );
  const [selectedLocation, setSelectedLocation] = useState(
    selectedSupermarket?.location || null
  );
  const [customStore, setCustomStore] = useState({
    name: selectedSupermarket?.chain === 'custom' ? selectedSupermarket.name : '',
    address: selectedSupermarket?.chain === 'custom' ? selectedSupermarket.location?.address : '',
    phone: selectedSupermarket?.chain === 'custom' ? selectedSupermarket.location?.phone : ''
  });

  const handleChainSelect = (chainKey) => {
    setSelectedChain(chainKey);
    setSelectedLocation(null);
    
    if (chainKey === 'custom') {
      // For custom stores, we'll handle the selection after they fill out the form
      return;
    }
    
    const chain = COMMON_SUPERMARKETS[chainKey];
    if (chain.locations.length === 1) {
      // Auto-select if only one location
      const location = chain.locations[0];
      setSelectedLocation(location);
      onSelect({
        chain: chainKey,
        name: chain.name,
        logo: chain.logo,
        color: chain.color,
        location: location
      });
    }
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    const chain = COMMON_SUPERMARKETS[selectedChain];
    onSelect({
      chain: selectedChain,
      name: chain.name,
      logo: chain.logo,
      color: chain.color,
      location: location
    });
  };

  const handleCustomStoreSubmit = () => {
    if (customStore.name.trim() && customStore.address.trim()) {
      const customLocation = {
        id: `custom_${Date.now()}`,
        address: customStore.address.trim(),
        phone: customStore.phone.trim() || null
      };
      
      onSelect({
        chain: 'custom',
        name: customStore.name.trim(),
        logo: '🏬',
        color: '#666666',
        location: customLocation
      });
    }
  };

  const chain = selectedChain ? COMMON_SUPERMARKETS[selectedChain] : null;

  return (
    <div className="supermarket-selector">
      {showTitle && (
        <div className="selector-title">
          <span className="title-icon">📍</span>
          <span className="title-text">Select Supermarket</span>
          <span className="title-subtitle">Choose where to shop</span>
        </div>
      )}

      {/* Chain Selection */}
      <div className="chain-selection">
        <label className="field-label">Supermarket Chain</label>
        <div className="chain-grid">
          {Object.entries(COMMON_SUPERMARKETS).map(([key, supermarket]) => (
            <button
              key={key}
              type="button"
              className={`chain-option ${selectedChain === key ? 'selected' : ''}`}
              onClick={() => handleChainSelect(key)}
              disabled={disabled}
              style={{
                borderColor: selectedChain === key ? supermarket.color : '#E5E5EA'
              }}
            >
              <span className="chain-logo">{supermarket.logo}</span>
              <span className="chain-name">{supermarket.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Location Selection for Chain Stores */}
      {selectedChain && selectedChain !== 'custom' && chain?.locations.length > 1 && (
        <div className="location-selection">
          <label className="field-label">Choose Location</label>
          <div className="location-options">
            {chain.locations.map((location) => (
              <button
                key={location.id}
                type="button"
                className={`location-option ${selectedLocation?.id === location.id ? 'selected' : ''}`}
                onClick={() => handleLocationSelect(location)}
                disabled={disabled}
              >
                <div className="location-info">
                  <div className="location-address">{location.address}</div>
                  {location.phone && (
                    <div className="location-phone">📞 {location.phone}</div>
                  )}
                </div>
                <div className="location-indicator">
                  {selectedLocation?.id === location.id ? '✓' : '→'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Store Form */}
      {selectedChain === 'custom' && (
        <div className="custom-store-form">
          <label className="field-label">Store Details</label>
          
          <div className="form-field">
            <input
              type="text"
              placeholder="Store name (e.g., Local Market)"
              value={customStore.name}
              onChange={(e) => setCustomStore(prev => ({ ...prev, name: e.target.value }))}
              onBlur={handleCustomStoreSubmit}
              disabled={disabled}
            />
          </div>
          
          <div className="form-field">
            <input
              type="text"
              placeholder="Full address"
              value={customStore.address}
              onChange={(e) => setCustomStore(prev => ({ ...prev, address: e.target.value }))}
              onBlur={handleCustomStoreSubmit}
              disabled={disabled}
            />
          </div>
          
          <div className="form-field">
            <input
              type="text"
              placeholder="Phone number (optional)"
              value={customStore.phone}
              onChange={(e) => setCustomStore(prev => ({ ...prev, phone: e.target.value }))}
              onBlur={handleCustomStoreSubmit}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {/* Selected Store Display */}
      {selectedSupermarket && (
        <div className="selected-store-preview">
          <div className="preview-header">
            <span className="preview-logo">{selectedSupermarket.logo}</span>
            <div className="preview-info">
              <div className="preview-name">{selectedSupermarket.name}</div>
              <div className="preview-address">{selectedSupermarket.location?.address}</div>
              {selectedSupermarket.location?.phone && (
                <div className="preview-phone">📞 {selectedSupermarket.location.phone}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupermarketSelector;