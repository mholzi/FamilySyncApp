import React, { useState } from 'react';
import { useTimeOffRequests } from '../../utils/requestUtils';
import RequestApproval from './RequestApproval';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

// Child color utility (same as UpcomingEventsForMe)
const CHILD_COLORS = [
  { primary: '#7C3AED', light: '#EDE9FE' }, // Purple
  { primary: '#EC4899', light: '#FCE7F3' }, // Pink
  { primary: '#F59E0B', light: '#FEF3C7' }, // Amber
  { primary: '#10B981', light: '#D1FAE5' }, // Emerald
  { primary: '#3B82F6', light: '#DBEAFE' }, // Blue
  { primary: '#06B6D4', light: '#E0F2FE' }, // Cyan
  { primary: '#8B5CF6', light: '#F3E8FF' }, // Violet
  { primary: '#F97316', light: '#FED7AA' }, // Orange
];

const getChildColor = (childId, index = 0) => {
  if (!childId) return CHILD_COLORS[index % CHILD_COLORS.length];
  
  let hash = 0;
  for (let i = 0; i < childId.length; i++) {
    hash = ((hash << 5) - hash) + childId.charCodeAt(i);
    hash = hash & hash;
  }
  
  const colorIndex = Math.abs(hash) % CHILD_COLORS.length;
  return CHILD_COLORS[colorIndex];
};

// Get user initials for child indicator
const getUserInitials = (name) => {
  if (!name) return 'C';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const RequestsList = ({ familyId, userId, userRole, children, familyData }) => {
  const { requests, loading, error } = useTimeOffRequests(familyId, userId, userRole);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Debug logging
  console.log('RequestsList props:', { familyId, userId, userRole });
  console.log('Requests data:', { requests, loading, error });

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'accepted': return '#10b981';
      case 'declined': return '#ef4444';
      case 'acknowledged': return '#6366f1';
      default: return '#6b7280';
    }
  };

  const getStatusText = (request) => {
    if (request.type === 'holiday') {
      return request.status === 'pending' ? 'Waiting for acknowledgment' : 'Acknowledged';
    }
    
    switch (request.status) {
      case 'pending': return 'Awaiting response';
      case 'accepted': return 'Accepted';
      case 'declined': return 'Declined';
      default: return request.status;
    }
  };

  const handleRequestResponse = (requestId, status) => {
    // Remove from pending list or update status
    setSelectedRequest(null);
  };

  const handleDeleteRequest = async (requestId) => {
    try {
      await deleteDoc(doc(db, 'families', familyId, 'timeOffRequests', requestId));
      console.log('Request deleted successfully');
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Failed to delete request. Please try again.');
    }
  };

  const handleEditRequest = (request) => {
    // Set the request for editing - this will trigger the edit modal
    setSelectedRequest({ ...request, isEditing: true });
  };

  const handleSaveEditedRequest = async (editedData) => {
    try {
      // Delete the original request and create a new one with status 'pending'
      await deleteDoc(doc(db, 'families', familyId, 'timeOffRequests', selectedRequest.id));
      
      // Create new request with edited data and pending status
      const { createTimeOffRequest } = await import('../../utils/requestUtils');
      await createTimeOffRequest(familyId, {
        ...editedData,
        status: 'pending' // Reset to pending for new approval
      });
      
      setSelectedRequest(null);
      console.log('Request updated and sent for new approval');
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Failed to update request. Please try again.');
    }
  };

  const pendingRequests = requests.filter(req => req.status === 'pending');
  
  // For au pairs, filter accepted requests to only show those in the next 72 hours
  const respondedRequests = requests.filter(req => {
    if (req.status === 'pending') return false;
    
    // For au pairs, only show accepted requests in the next 72 hours
    if (userRole === 'aupair' && req.status === 'accepted') {
      const now = new Date();
      const in72Hours = new Date(now.getTime() + (72 * 60 * 60 * 1000));
      const requestStartTime = req.startTime?.toDate ? req.startTime.toDate() : new Date(req.startTime);
      
      return requestStartTime >= now && requestStartTime <= in72Hours;
    }
    
    // For parents, show all responded requests
    return true;
  });

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingSpinner}></div>
        <span>Loading requests...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        Error loading requests: {error}
      </div>
    );
  }

  return (
    <div style={styles.container}>

      {/* Babysitting */}
      {pendingRequests.length > 0 && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>
            {userRole === 'parent' ? 'Awaiting Response' : 'Babysitting'}
          </h4>
          <div style={styles.requestsList}>
            {pendingRequests.map(request => (
              <div key={request.id} style={styles.requestCard}>
                {/* Time Section */}
                <div style={styles.timeSection}>
                  <div style={styles.timeDisplay}>
                    {new Date(request.startTime?.toDate ? request.startTime.toDate() : request.startTime).toDateString() === new Date().toDateString() ? 'Today' : 'Tomorrow'}
                  </div>
                  <div style={styles.dayIndicator}>
                    {new Date(request.startTime?.toDate ? request.startTime.toDate() : request.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(request.endTime?.toDate ? request.endTime.toDate() : request.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </div>
                </div>

                {/* Request Content */}
                <div style={styles.requestContent}>
                  <div style={styles.requestHeader}>
                    <div style={styles.requestTitle}>{request.title}</div>
                  </div>
                  
                  {request.description && (
                    <div style={styles.requestDescription}>{request.description}</div>
                  )}

                  <div style={styles.requestMeta}>
                  </div>

                  {userRole === 'aupair' && (
                    <div style={styles.requestActions}>
                      <button
                        style={styles.reviewButton}
                        onClick={() => setSelectedRequest(request)}
                      >
                        {request.type === 'babysitting' ? 'Review Request' : 'View Details'}
                      </button>
                    </div>
                  )}

                  {userRole === 'parent' && (
                    <div style={styles.requestActions}>
                      <button
                        style={styles.editButton}
                        onClick={() => handleEditRequest(request)}
                      >
                        Edit
                      </button>
                      <button
                        style={styles.deleteButton}
                        onClick={() => handleDeleteRequest(request.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Child indicators - overlapping badges */}
                <div style={styles.childIndicators}>
                  {request.children === 'all' ? (
                    children.map((child, index) => (
                      <div 
                        key={child.id}
                        style={{
                          ...styles.childIndicator,
                          backgroundColor: getChildColor(child.id, index).primary,
                          right: `${12 + (index * 20)}px`,
                          zIndex: children.length - index
                        }}
                        title={child.name}
                      >
                        {getUserInitials(child.name)}
                      </div>
                    ))
                  ) : Array.isArray(request.children) ? (
                    request.children.map((childId, index) => {
                      const child = children.find(c => c.id === childId);
                      if (!child) return null;
                      return (
                        <div 
                          key={childId}
                          style={{
                            ...styles.childIndicator,
                            backgroundColor: getChildColor(childId, index).primary,
                            right: `${12 + (index * 20)}px`,
                            zIndex: request.children.length - index
                          }}
                          title={child.name}
                        >
                          {getUserInitials(child.name)}
                        </div>
                      );
                    })
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Responses */}
      {respondedRequests.length > 0 && (
        <div style={styles.section}>
          <div style={styles.requestsList}>
            {respondedRequests.slice(0, 5).map(request => (
              <div key={request.id} style={styles.requestCard}>
                {/* Time Section */}
                <div style={styles.timeSection}>
                  <div style={styles.timeDisplay}>
                    {new Date(request.startTime?.toDate ? request.startTime.toDate() : request.startTime).toDateString() === new Date().toDateString() ? 'Today' : 'Tomorrow'}
                  </div>
                  <div style={styles.dayIndicator}>
                    {new Date(request.startTime?.toDate ? request.startTime.toDate() : request.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(request.endTime?.toDate ? request.endTime.toDate() : request.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </div>
                </div>

                {/* Request Content */}
                <div style={styles.requestContent}>
                  <div style={styles.requestHeader}>
                    <div style={styles.requestTitle}>{request.title}</div>
                    {request.status !== 'accepted' && (
                      <div style={{
                        ...styles.statusBadge,
                        backgroundColor: `${getStatusColor(request.status)}20`,
                        color: getStatusColor(request.status)
                      }}>
                        {getStatusText(request)}
                      </div>
                    )}
                  </div>
                  
                  <div style={styles.requestMeta}>
                    {request.status !== 'accepted' && request.respondedAt && (
                      <span style={styles.responseDate}>
                        Responded {formatDateTime(request.respondedAt)}
                      </span>
                    )}
                  </div>

                  {request.status !== 'accepted' && request.response && (
                    <div style={styles.responseText}>
                      <strong>Response:</strong> {request.response}
                    </div>
                  )}

                  {userRole === 'parent' && (
                    <div style={styles.requestActions}>
                      <button
                        style={styles.editButton}
                        onClick={() => handleEditRequest(request)}
                      >
                        Edit
                      </button>
                      <button
                        style={styles.deleteButton}
                        onClick={() => handleDeleteRequest(request.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Child indicators - overlapping badges */}
                <div style={styles.childIndicators}>
                  {request.children === 'all' ? (
                    children.map((child, index) => (
                      <div 
                        key={child.id}
                        style={{
                          ...styles.childIndicator,
                          backgroundColor: getChildColor(child.id, index).primary,
                          right: `${12 + (index * 20)}px`,
                          zIndex: children.length - index
                        }}
                        title={child.name}
                      >
                        {getUserInitials(child.name)}
                      </div>
                    ))
                  ) : Array.isArray(request.children) ? (
                    request.children.map((childId, index) => {
                      const child = children.find(c => c.id === childId);
                      if (!child) return null;
                      return (
                        <div 
                          key={childId}
                          style={{
                            ...styles.childIndicator,
                            backgroundColor: getChildColor(childId, index).primary,
                            right: `${12 + (index * 20)}px`,
                            zIndex: request.children.length - index
                          }}
                          title={child.name}
                        >
                          {getUserInitials(child.name)}
                        </div>
                      );
                    })
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {requests.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            {userRole === 'parent' ? '📝' : '📬'}
          </div>
          <div style={styles.emptyTitle}>
            {userRole === 'parent' ? 'No requests yet' : 'No pending requests'}
          </div>
          <div style={styles.emptyDescription}>
            {userRole === 'parent' 
              ? 'Create your first babysitting request or holiday notification'
              : 'You\'ll see babysitting requests and holiday notifications here'
            }
          </div>
        </div>
      )}

      {/* Request Approval Modal */}
      {selectedRequest && !selectedRequest.isEditing && (
        <RequestApproval
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onRespond={handleRequestResponse}
          familyData={familyData}
          children={children}
        />
      )}

      {/* Edit Request Modal */}
      {selectedRequest && selectedRequest.isEditing && (
        <EditRequestModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onSave={handleSaveEditedRequest}
          familyId={familyId}
          children={children}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    width: '100%'
  },
  section: {
    marginBottom: 'var(--space-6)'
  },
  sectionTitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-3)'
  },
  requestsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)'
  },
  requestCard: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border-light)',
    transition: 'var(--transition-normal)',
    position: 'relative',
    display: 'flex',
    gap: 'var(--space-4)',
    alignItems: 'flex-start'
  },
  timeSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '60px',
    textAlign: 'center'
  },
  timeDisplay: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--text-primary)',
    lineHeight: 'var(--line-height-tight)'
  },
  dayIndicator: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    backgroundColor: '#fafbfc',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    marginTop: 'var(--space-1)',
    fontWeight: 'var(--font-weight-medium)'
  },
  requestContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    minWidth: 0
  },
  requestHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 'var(--space-2)'
  },
  requestTitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    lineHeight: 'var(--line-height-tight)',
    flex: 1
  },
  statusBadge: {
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    whiteSpace: 'nowrap',
    marginLeft: 'var(--space-2)'
  },
  requestMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-3)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)'
  },
  requestDate: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)'
  },
  responseDate: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)'
  },
  requestDescription: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    lineHeight: 'var(--line-height-normal)',
    marginBottom: 'var(--space-3)'
  },
  responseText: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    backgroundColor: '#f8f9fa',
    padding: 'var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    marginTop: 'var(--space-2)'
  },
  requestActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--space-2)',
    marginTop: 'var(--space-3)'
  },
  reviewButton: {
    padding: 'var(--space-2) var(--space-3)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer'
  },
  editButton: {
    padding: 'var(--space-2) var(--space-3)',
    border: '1px solid var(--primary-purple)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    color: 'var(--primary-purple)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  deleteButton: {
    padding: 'var(--space-2) var(--space-3)',
    border: '1px solid #ef4444',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    color: '#ef4444',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  emptyState: {
    textAlign: 'center',
    padding: 'var(--space-8)',
    color: 'var(--text-secondary)'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: 'var(--space-3)'
  },
  emptyTitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-2)'
  },
  emptyDescription: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    maxWidth: '300px',
    margin: '0 auto'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-8)',
    color: 'var(--text-secondary)'
  },
  loadingSpinner: {
    width: '20px',
    height: '20px',
    border: '2px solid var(--gray-200)',
    borderTop: '2px solid var(--primary-purple)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  error: {
    padding: 'var(--space-4)',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: 'var(--radius-md)',
    color: '#DC2626',
    fontSize: 'var(--font-size-sm)'
  },
  childIndicators: {
    position: 'absolute',
    top: 'calc(var(--space-3) + 10px)',
    right: 0,
    display: 'flex',
    alignItems: 'center'
  },
  childIndicator: {
    position: 'absolute',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'white',
    boxShadow: 'var(--shadow-sm)',
    border: '2px solid white'
  },
  // Edit modal styles
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
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)'
  },
  form: {
    padding: 'var(--space-4)'
  },
  formGroup: {
    marginBottom: 'var(--space-4)'
  },
  label: {
    display: 'block',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-2)'
  },
  textarea: {
    width: '100%',
    padding: 'var(--space-3)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    outline: 'none',
    resize: 'vertical'
  },
  dateTimeRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-4)'
  },
  dateTimeGroup: {
    display: 'flex',
    gap: 'var(--space-2)'
  },
  dateInput: {
    flex: 1,
    padding: 'var(--space-3)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    outline: 'none'
  },
  timeInput: {
    padding: 'var(--space-3)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    outline: 'none'
  },
  childrenSelector: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-2)'
  },
  childButton: {
    padding: 'var(--space-2) var(--space-3)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  childButtonActive: {
    backgroundColor: '#10b981',
    color: 'var(--white)',
    border: '1px solid #10b981'
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-3)',
    justifyContent: 'flex-end',
    marginTop: 'var(--space-6)',
    paddingTop: 'var(--space-4)',
    borderTop: '1px solid var(--border-light)'
  },
  cancelButton: {
    padding: 'var(--space-3) var(--space-4)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--white)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer'
  },
  submitButton: {
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

// Edit Request Modal Component
const EditRequestModal = ({ request, onClose, onSave, familyId, children }) => {
  const [formData, setFormData] = useState({
    type: request.type || 'babysitting',
    description: request.description || '',
    startDate: request.startTime ? (request.startTime.toDate ? request.startTime.toDate() : new Date(request.startTime)).toISOString().split('T')[0] : '',
    startTime: request.startTime ? (request.startTime.toDate ? request.startTime.toDate() : new Date(request.startTime)).toTimeString().slice(0, 5) : '18:00',
    endDate: request.endTime ? (request.endTime.toDate ? request.endTime.toDate() : new Date(request.endTime)).toISOString().split('T')[0] : '',
    endTime: request.endTime ? (request.endTime.toDate ? request.endTime.toDate() : new Date(request.endTime)).toTimeString().slice(0, 5) : '22:00',
    selectedChildren: request.children || 'all'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // Auto-fill end date when start date is selected
      if (field === 'startDate' && value && !prev.endDate) {
        updated.endDate = value;
      }
      
      return updated;
    });
  };

  const handleChildSelection = (childId) => {
    if (formData.selectedChildren === 'all') {
      setFormData(prev => ({ ...prev, selectedChildren: [childId] }));
    } else {
      const currentSelection = Array.isArray(formData.selectedChildren) 
        ? formData.selectedChildren 
        : [];
      
      if (currentSelection.includes(childId)) {
        const newSelection = currentSelection.filter(id => id !== childId);
        setFormData(prev => ({ 
          ...prev, 
          selectedChildren: newSelection.length === 0 ? 'all' : newSelection 
        }));
      } else {
        setFormData(prev => ({ 
          ...prev, 
          selectedChildren: [...currentSelection, childId] 
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.startTime) return;

    setIsSubmitting(true);
    try {
      // Combine date and time
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = formData.endDate && formData.endTime 
        ? new Date(`${formData.endDate}T${formData.endTime}`)
        : new Date(startDateTime.getTime() + 4 * 60 * 60 * 1000); // Default 4 hours

      const requestData = {
        type: formData.type,
        title: formData.type === 'babysitting' ? 'Babysitting' : 'Holiday Plans',
        description: formData.description,
        startTime: startDateTime,
        endTime: endDateTime,
        children: formData.selectedChildren,
        requestedBy: request.requestedBy // Keep original requester
      };

      await onSave(requestData);
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Failed to update request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Edit Babysitting Request</h3>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Description */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Additional details about the babysitting needs..."
              style={styles.textarea}
              rows={3}
            />
          </div>

          {/* Date and Time */}
          <div style={styles.dateTimeRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Start Date & Time *</label>
              <div style={styles.dateTimeGroup}>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  style={styles.dateInput}
                  required
                />
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  style={styles.timeInput}
                  required
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>End Date & Time</label>
              <div style={styles.dateTimeGroup}>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  style={styles.dateInput}
                />
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  style={styles.timeInput}
                />
              </div>
            </div>
          </div>

          {/* Children Selection */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Children to Care For</label>
            <div style={styles.childrenSelector}>
              <button
                type="button"
                style={{
                  ...styles.childButton,
                  ...(formData.selectedChildren === 'all' ? styles.childButtonActive : {})
                }}
                onClick={() => handleChange('selectedChildren', 'all')}
              >
                All Children
              </button>
              {children.map(child => (
                <button
                  key={child.id}
                  type="button"
                  style={{
                    ...styles.childButton,
                    ...(Array.isArray(formData.selectedChildren) && 
                        formData.selectedChildren.includes(child.id) 
                        ? styles.childButtonActive : {})
                  }}
                  onClick={() => handleChildSelection(child.id)}
                >
                  {child.name}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div style={styles.actions}>
            <button
              type="button"
              style={styles.cancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={!formData.startDate || !formData.startTime || isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestsList;