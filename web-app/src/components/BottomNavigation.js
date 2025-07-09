import React from 'react';

const BottomNavigation = ({ currentView, onNavigate, pendingApprovalCount = 0 }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white" style={{ borderTop: '1px solid var(--border-light)' }}>
      <div className="flex">
        <div 
          className={`flex-1 flex flex-col items-center p-3 cursor-pointer transition-colors ${
            currentView === 'dashboard' ? 'text-primary' : 'text-tertiary'
          }`}
          onClick={() => onNavigate('dashboard')}
        >
          <span className="text-xl mb-1">🏠</span>
          <span className="text-xs font-medium">Home</span>
        </div>
        <div 
          className={`flex-1 flex flex-col items-center p-3 cursor-pointer transition-colors ${
            currentView === 'smart_calendar' ? 'text-primary' : 'text-tertiary'
          }`}
          onClick={() => onNavigate('smart_calendar')}
        >
          <span className="text-xl mb-1">📅</span>
          <span className="text-xs font-medium">Calendar</span>
        </div>
        <div 
          className={`flex-1 flex flex-col items-center p-3 cursor-pointer transition-colors relative ${
            currentView === 'shopping' ? 'text-primary' : 'text-tertiary'
          }`}
          onClick={() => onNavigate('shopping')}
        >
          <span className="text-xl mb-1">🛒</span>
          <span className="text-xs font-medium">Shopping</span>
          {pendingApprovalCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white" 
                 style={{ backgroundColor: 'var(--secondary-orange)' }}>
              {pendingApprovalCount}
            </div>
          )}
        </div>
        <div 
          className={`flex-1 flex flex-col items-center p-3 cursor-pointer transition-colors ${
            currentView === 'messages' ? 'text-primary' : 'text-tertiary'
          }`}
          onClick={() => onNavigate('messages')}
        >
          <span className="text-xl mb-1">📧</span>
          <span className="text-xs font-medium">Messages</span>
      </div>
      </div>
    </nav>
  );
};


export default BottomNavigation;