import React, { useState } from 'react';
import { respondToTimeOffRequest } from '../../utils/requestUtils';

const RequestApproval = ({ request, onClose, onRespond, familyData, children }) => {
  const [response, setResponse] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChildrenNames = () => {
    if (request.children === 'all') {
      return 'All children';
    }
    if (Array.isArray(request.children)) {
      const names = request.children
        .map(childId => children.find(child => child.id === childId)?.name)
        .filter(Boolean);
      return names.length > 0 ? names.join(', ') : 'Selected children';
    }
    return 'No children specified';
  };

  const handleRespond = async (status) => {
    setIsResponding(true);
    try {
      await respondToTimeOffRequest(request.familyId, request.id, status, response);
      onRespond(request.id, status);
      onClose();
    } catch (error) {
      console.error('Error responding to request:', error);
      alert('Failed to respond. Please try again.');
    } finally {
      setIsResponding(false);
    }
  };

  const getDuration = () => {
    if (!request.startTime || !request.endTime) return '';
    const start = request.startTime.toDate ? request.startTime.toDate() : new Date(request.startTime);
    const end = request.endTime.toDate ? request.endTime.toDate() : new Date(request.endTime);
    const diffHours = Math.round((end - start) / (1000 * 60 * 60));
    return diffHours > 0 ? `${diffHours} hours` : '';
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            {request.type === 'babysitting' ? 'Babysitting Request' : 'Holiday Notification'}
          </h3>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div style={styles.content}>
          {/* Request Summary */}
          <div style={styles.summaryCard}>
            <div style={styles.requestMeta}>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>When:</span>
                <span style={styles.metaValue}>{formatDateTime(request.startTime)}</span>
              </div>
              {request.endTime && (
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Until:</span>
                  <span style={styles.metaValue}>{formatDateTime(request.endTime)}</span>
                </div>
              )}
              {getDuration() && (
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Duration:</span>
                  <span style={styles.metaValue}>{getDuration()}</span>
                </div>
              )}
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Children:</span>
                <span style={styles.metaValue}>{getChildrenNames()}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {request.description && (
            <div style={styles.descriptionCard}>
              <div style={styles.sectionTitle}>Details</div>
              <div style={styles.description}>{request.description}</div>
            </div>
          )}

          {/* Request Type Info */}
          <div style={styles.infoCard}>
            {request.type === 'babysitting' ? (
              <div>
                <div style={styles.sectionTitle}>About This Request</div>
                <p style={styles.infoText}>
                  The parents are asking if you're available for extra babysitting outside your regular hours. 
                  This is completely optional - you can accept or decline based on your availability and preference.
                </p>
              </div>
            ) : (
              <div>
                <div style={styles.sectionTitle}>Holiday Notification</div>
                <p style={styles.infoText}>
                  The parents are letting you know about their holiday plans. During this time, you won't need to 
                  worry about the children's schedules as they'll be away with the family.
                </p>
              </div>
            )}
          </div>

          {/* Response Section */}
          {request.type === 'babysitting' && (
            <div style={styles.responseSection}>
              <div style={styles.sectionTitle}>Your Response (Optional)</div>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Add any questions or notes about availability, rates, etc..."
                style={styles.responseTextarea}
                rows={3}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div style={styles.actions}>
            {request.type === 'babysitting' ? (
              <>
                <button
                  style={styles.declineButton}
                  onClick={() => handleRespond('declined')}
                  disabled={isResponding}
                >
                  {isResponding ? 'Responding...' : 'Decline'}
                </button>
                <button
                  style={styles.acceptButton}
                  onClick={() => handleRespond('accepted')}
                  disabled={isResponding}
                >
                  {isResponding ? 'Responding...' : 'Accept Request'}
                </button>
              </>
            ) : (
              <button
                style={styles.acknowledgeButton}
                onClick={() => handleRespond('acknowledged')}
                disabled={isResponding}
              >
                {isResponding ? 'Acknowledging...' : 'Got It, Thanks!'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: 'var(--space-4)'
  },
  modal: {
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--border-light)'
  },
  title: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: 'var(--font-size-lg)',
    cursor: 'pointer',
    padding: 'var(--space-1)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)'
  },
  content: {
    padding: 'var(--space-4)'
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
    marginBottom: 'var(--space-4)'
  },
  requestTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-3)'
  },
  requestMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)'
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)'
  },
  metaLabel: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-primary)',
    fontWeight: 'var(--font-weight-bold)',
    minWidth: '80px'
  },
  metaValue: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-primary)',
    fontWeight: 'normal'
  },
  descriptionCard: {
    backgroundColor: 'var(--white)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
    marginBottom: 'var(--space-4)'
  },
  infoCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
    marginBottom: 'var(--space-4)'
  },
  sectionTitle: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-2)'
  },
  description: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    lineHeight: 'var(--line-height-normal)'
  },
  infoText: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    lineHeight: 'var(--line-height-normal)',
    margin: 0
  },
  responseSection: {
    marginBottom: 'var(--space-4)'
  },
  responseTextarea: {
    width: '100%',
    padding: 'var(--space-3)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    outline: 'none',
    resize: 'vertical'
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-3)',
    justifyContent: 'flex-end',
    paddingTop: 'var(--space-4)',
    borderTop: '1px solid var(--border-light)'
  },
  declineButton: {
    padding: 'var(--space-3) var(--space-4)',
    border: '1px solid #ef4444',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    color: '#ef4444',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer'
  },
  acceptButton: {
    padding: 'var(--space-3) var(--space-4)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    backgroundColor: '#10b981',
    color: 'var(--white)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer'
  },
  acknowledgeButton: {
    padding: 'var(--space-3) var(--space-4)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer'
  }
};

export default RequestApproval;