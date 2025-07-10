import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { generateInvitationCode, validateInvitation, formatDate } from '../../utils/validation';
import InviteModal from './InviteModal';

const InvitationsSection = ({ familyData, familyId, currentUserName }) => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteType, setInviteType] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    // Query invitations that belong to this family
    const invitationsRef = collection(db, 'families', familyId, 'invitations');
    const q = query(invitationsRef, where('status', '!=', 'accepted'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invitationsData = [];
      snapshot.forEach((doc) => {
        invitationsData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort by creation date (newest first)
      invitationsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
      });

      setInvitations(invitationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [familyId]);

  // Check for expired invitations
  useEffect(() => {
    const checkExpired = async () => {
      const now = new Date();
      const expiredInvitations = invitations.filter(inv => {
        if (inv.status !== 'pending' || !inv.expiresAt) return false;
        const expiryDate = inv.expiresAt.toDate ? inv.expiresAt.toDate() : new Date(inv.expiresAt);
        return expiryDate < now;
      });

      // Update expired invitations
      for (const inv of expiredInvitations) {
        try {
          const invRef = doc(db, 'families', familyId, 'invitations', inv.id);
          await updateDoc(invRef, { status: 'expired' });
        } catch (error) {
          console.error('Error updating expired invitation:', error);
        }
      }
    };

    if (invitations.length > 0) {
      checkExpired();
    }
  }, [invitations, familyId]);

  const handleInviteParent = () => {
    setInviteType('parent');
    setShowInviteModal(true);
  };

  const handleInviteAuPair = () => {
    setInviteType('au_pair');
    setShowInviteModal(true);
  };

  const handleSendInvitation = async (email) => {
    const validation = validateInvitation({ email });
    if (!validation.isValid) {
      alert(validation.errors.email);
      return;
    }

    setSending(true);
    try {
      // Generate unique invitation code
      const invitationCode = generateInvitationCode();
      
      // Create expiration date (14 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      // Create invitation record
      const invitationData = {
        email: email.trim().toLowerCase(),
        role: inviteType,
        invitationCode,
        status: 'pending',
        familyId,
        familyName: familyData?.name || 'Unknown Family',
        invitedBy: currentUserName || 'Family Member',
        createdAt: new Date(),
        expiresAt,
        viewedAt: null,
        acceptedAt: null
      };

      // Save invitation to Firestore
      const invitationsRef = collection(db, 'families', familyId, 'invitations');
      await addDoc(invitationsRef, invitationData);

      // Configure email action settings
      const actionCodeSettings = {
        url: `${window.location.origin}/accept-invitation?code=${invitationCode}&familyId=${familyId}`,
        handleCodeInApp: true
      };

      // Send invitation email using Firebase Auth
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Store email in localStorage for verification on return
      window.localStorage.setItem('emailForSignIn', email);

      alert(`Invitation sent to ${email}!`);
      setShowInviteModal(false);
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert(`Failed to send invitation: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    if (!window.confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }

    try {
      const invRef = doc(db, 'families', familyId, 'invitations', invitationId);
      await deleteDoc(invRef);
    } catch (error) {
      console.error('Error canceling invitation:', error);
      alert('Failed to cancel invitation. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'viewed': return '#3B82F6';
      case 'expired': return '#EF4444';
      default: return '#8E8E93';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'viewed': return 'Viewed';
      case 'expired': return 'Expired';
      default: return status;
    }
  };

  if (loading) {
    return (
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Pending Invitations</h2>
        <div style={styles.loadingText}>Loading invitations...</div>
      </section>
    );
  }

  return (
    <>
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Pending Invitations</h2>
          <div style={styles.inviteButtons}>
            <button style={styles.inviteButton} onClick={handleInviteParent}>
              + Invite Parent
            </button>
            <button style={styles.inviteButton} onClick={handleInviteAuPair}>
              + Invite Au Pair
            </button>
          </div>
        </div>
        
        {invitations.length > 0 ? (
          <div style={styles.invitationsList}>
            {invitations.map((invitation) => (
              <div key={invitation.id} style={styles.invitationCard}>
                <div style={styles.invitationHeader}>
                  <div>
                    <h4 style={styles.invitationEmail}>{invitation.email}</h4>
                    <p style={styles.invitationRole}>
                      {invitation.role === 'parent' ? 'Parent' : 'Au Pair'} Invitation
                    </p>
                  </div>
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: `${getStatusColor(invitation.status)}20`,
                    color: getStatusColor(invitation.status)
                  }}>
                    {getStatusLabel(invitation.status)}
                  </div>
                </div>
                
                <div style={styles.invitationDetails}>
                  <p style={styles.detailText}>
                    Invited on {formatDate(invitation.createdAt)}
                  </p>
                  {invitation.expiresAt && invitation.status === 'pending' && (
                    <p style={styles.detailText}>
                      Expires on {formatDate(invitation.expiresAt)}
                    </p>
                  )}
                  {invitation.viewedAt && (
                    <p style={styles.detailText}>
                      Viewed on {formatDate(invitation.viewedAt)}
                    </p>
                  )}
                </div>
                
                {invitation.status === 'pending' && (
                  <div style={styles.invitationActions}>
                    <button 
                      style={styles.cancelButton}
                      onClick={() => handleCancelInvitation(invitation.id)}
                    >
                      Cancel Invitation
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>No pending invitations. Click the buttons above to invite family members!</p>
          </div>
        )}
      </section>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          type={inviteType}
          onSend={handleSendInvitation}
          onCancel={() => setShowInviteModal(false)}
          sending={sending}
        />
      )}
    </>
  );
};

const styles = {
  section: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #F2F2F7',
    paddingBottom: '12px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    margin: 0
  },
  inviteButtons: {
    display: 'flex',
    gap: '8px'
  },
  inviteButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    whiteSpace: 'nowrap'
  },
  loadingText: {
    color: '#8E8E93',
    textAlign: 'center',
    padding: '20px'
  },
  invitationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  invitationCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: '10px',
    padding: '16px',
    border: '1px solid #E5E5EA'
  },
  invitationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  invitationEmail: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 4px 0'
  },
  invitationRole: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  invitationDetails: {
    marginBottom: '12px'
  },
  detailText: {
    fontSize: '13px',
    color: '#8E8E93',
    margin: '2px 0'
  },
  invitationActions: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    backgroundColor: '#FFF2F2',
    color: '#FF3B30',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#8E8E93'
  }
};

// Add hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .invite-button:hover {
    background-color: #0056D6 !important;
  }
  
  .cancel-invitation-button:hover {
    background-color: #FFE5E5 !important;
  }
`;
document.head.appendChild(styleSheet);

export default InvitationsSection;