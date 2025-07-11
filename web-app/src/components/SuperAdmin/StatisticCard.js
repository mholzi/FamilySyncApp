function StatisticCard({ title, value, icon, color = 'primary' }) {
  const getColorVariables = () => {
    switch (color) {
      case 'primary':
        return {
          bg: 'var(--md-sys-color-primary-container)',
          color: 'var(--md-sys-color-on-primary-container)',
          iconBg: 'var(--md-sys-color-primary)',
          iconColor: 'var(--md-sys-color-on-primary)'
        };
      case 'secondary':
        return {
          bg: 'var(--md-sys-color-secondary-container)',
          color: 'var(--md-sys-color-on-secondary-container)',
          iconBg: 'var(--md-sys-color-secondary)',
          iconColor: 'var(--md-sys-color-on-secondary)'
        };
      case 'tertiary':
        return {
          bg: 'var(--md-sys-color-tertiary-container)',
          color: 'var(--md-sys-color-on-tertiary-container)',
          iconBg: 'var(--md-sys-color-tertiary)',
          iconColor: 'var(--md-sys-color-on-tertiary)'
        };
      case 'success':
        return {
          bg: '#E7F5E9',
          color: '#1B5E20',
          iconBg: '#4CAF50',
          iconColor: '#FFFFFF'
        };
      default:
        return {
          bg: 'var(--md-sys-color-surface-container)',
          color: 'var(--md-sys-color-on-surface)',
          iconBg: 'var(--md-sys-color-surface-container-high)',
          iconColor: 'var(--md-sys-color-on-surface)'
        };
    }
  };

  const colors = getColorVariables();

  return (
    <div 
      className="md3-card md3-elevation-1 animate-fade-in" 
      style={{ 
        backgroundColor: colors.bg,
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}
    >
      <div className="md3-p-24">
        <div className="md3-flex md3-justify-between md3-flex-center md3-mb-16">
          <div 
            className="md3-fab-small" 
            style={{ 
              backgroundColor: colors.iconBg,
              color: colors.iconColor
            }}
          >
            <span className="material-icons" style={{ fontSize: '20px' }}>
              {icon}
            </span>
          </div>
          <div className="md3-body-small" style={{ color: colors.color, opacity: 0.8 }}>
            Live
          </div>
        </div>
        
        <div className="md3-mb-8">
          <h2 
            className="md3-display-medium" 
            style={{ 
              color: colors.color,
              fontWeight: '500',
              lineHeight: '1.2'
            }}
          >
            {value.toLocaleString()}
          </h2>
        </div>
        
        <p 
          className="md3-body-large" 
          style={{ 
            color: colors.color,
            opacity: 0.9
          }}
        >
          {title}
        </p>
      </div>
    </div>
  );
}

export default StatisticCard;