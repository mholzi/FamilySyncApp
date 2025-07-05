import { ROUTINE_TEMPLATES, getAgeGroup } from '../../utils/routineTemplates';

function TemplateSelector({ childAge, onSelectTemplate, onSkip }) {
  const currentAgeGroup = getAgeGroup(childAge);
  
  // Sort templates to show the most relevant one first
  const sortedTemplates = Object.values(ROUTINE_TEMPLATES).sort((a, b) => {
    if (a.id === `${currentAgeGroup}-standard`) return -1;
    if (b.id === `${currentAgeGroup}-standard`) return 1;
    return 0;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Choose a Routine Template</h3>
        <p style={styles.subtitle}>
          Start with an age-appropriate template and customize it to fit your family's needs
        </p>
      </div>

      <div style={styles.templates}>
        {sortedTemplates.map((template) => {
          const isRecommended = template.id === `${currentAgeGroup}-standard`;
          
          return (
            <div
              key={template.id}
              style={{
                ...styles.templateCard,
                ...(isRecommended ? styles.recommendedCard : {})
              }}
              onClick={() => onSelectTemplate(template)}
            >
              {isRecommended && (
                <div style={styles.recommendedBadge}>Recommended</div>
              )}
              
              <h4 style={styles.templateName}>{template.name}</h4>
              <p style={styles.templateDescription}>{template.description}</p>
              
              <div style={styles.templateDetails}>
                <div style={styles.detailItem}>
                  <span style={styles.detailIcon}>🌅</span>
                  <span style={styles.detailText}>Wake: {template.dailyRoutine.wakeUpTime}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailIcon}>🌙</span>
                  <span style={styles.detailText}>Bed: {template.dailyRoutine.bedtime}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailIcon}>😴</span>
                  <span style={styles.detailText}>
                    {template.dailyRoutine.napTimes.length} nap{template.dailyRoutine.napTimes.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div style={styles.templateSchedule}>
                <div style={styles.scheduleTitle}>Daily Schedule Preview</div>
                <div style={styles.scheduleItems}>
                  <div style={styles.scheduleItem}>
                    🥣 Breakfast: {template.dailyRoutine.mealTimes.breakfast}
                  </div>
                  {template.dailyRoutine.napTimes[0] && (
                    <div style={styles.scheduleItem}>
                      😴 Nap: {template.dailyRoutine.napTimes[0].startTime}
                    </div>
                  )}
                  <div style={styles.scheduleItem}>
                    🥗 Lunch: {template.dailyRoutine.mealTimes.lunch}
                  </div>
                  {template.dailyRoutine.napTimes[1] && (
                    <div style={styles.scheduleItem}>
                      😴 Nap: {template.dailyRoutine.napTimes[1].startTime}
                    </div>
                  )}
                  <div style={styles.scheduleItem}>
                    🍽️ Dinner: {template.dailyRoutine.mealTimes.dinner}
                  </div>
                </div>
              </div>

              <button
                style={styles.selectButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTemplate(template);
                }}
              >
                Use This Template
              </button>
            </div>
          );
        })}
      </div>

      <button style={styles.skipButton} onClick={onSkip}>
        Skip and Create Custom Routine
      </button>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#F2F2F7',
    minHeight: '100%'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0
  },
  templates: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  templateCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    position: 'relative',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)'
    }
  },
  recommendedCard: {
    border: '2px solid #34C759',
    boxShadow: '0 2px 8px rgba(52, 199, 89, 0.2)'
  },
  recommendedBadge: {
    position: 'absolute',
    top: '-10px',
    right: '20px',
    backgroundColor: '#34C759',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  templateName: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 8px 0'
  },
  templateDescription: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 16px 0'
  },
  templateDetails: {
    display: 'flex',
    gap: '15px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  detailIcon: {
    fontSize: '16px'
  },
  detailText: {
    fontSize: '14px',
    color: '#333'
  },
  templateSchedule: {
    backgroundColor: '#F2F2F7',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px'
  },
  scheduleTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '8px',
    textTransform: 'uppercase'
  },
  scheduleItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  scheduleItem: {
    fontSize: '13px',
    color: '#333'
  },
  selectButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  skipButton: {
    display: 'block',
    margin: '0 auto',
    padding: '12px 24px',
    borderRadius: '8px',
    border: '1px solid #E5E5EA',
    backgroundColor: 'white',
    color: '#666',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  }
};

export default TemplateSelector;