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

  // Don't render anything if loading or no invitations
  if (loading || invitations.length === 0) {
    return null;
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
        
        <div style={styles.invitationsContainer}>
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
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-sys-shape-corner-large)',
    padding: '24px',
    marginBottom: '16px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    position: 'relative'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)',
    paddingBottom: '12px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    margin: 0,
    fontFamily: 'var(--md-sys-typescale-title-medium-font-family-name)',
    lineHeight: 'var(--md-sys-typescale-title-medium-line-height)',
    letterSpacing: 'var(--md-sys-typescale-title-medium-letter-spacing)'
  },
  inviteButtons: {
    display: 'flex',
    gap: '8px'
  },
  inviteButton: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    whiteSpace: 'nowrap'
  },
  loadingText: {
    color: 'var(--md-sys-color-on-surface-variant)',
    textAlign: 'center',
    padding: '20px',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)'
  },
  invitationsContainer: {
    display: 'flex',
    gap: '12px',
    overflowX: 'auto',
    paddingBottom: '8px',
    marginLeft: '-14px',
    marginRight: '-24px',
    paddingLeft: '24px',
    paddingRight: '24px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--md-sys-color-outline-variant) transparent',
    WebkitOverflowScrolling: 'touch',
    scrollSnapType: 'x mandatory'
  },
  invitationCard: {
    backgroundColor: 'var(--md-sys-color-surface)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    padding: '16px',
    border: '1px solid var(--md-sys-color-outline)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    flex: '0 0 calc(70vw - 24px)',
    maxWidth: '320px',
    minHeight: '150px',
    scrollSnapAlign: 'start',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  invitationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  invitationEmail: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    margin: '0 0 4px 0',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)',
    lineHeight: 'var(--md-sys-typescale-body-large-line-height)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  invitationRole: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: 0,
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)'
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    fontSize: '11px',
    fontWeight: '600',
    fontFamily: 'var(--md-sys-typescale-label-small-font-family-name)'
  },
  invitationDetails: {
    flex: 1,
    marginBottom: '12px'
  },
  detailText: {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: '2px 0',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)'
  },
  invitationActions: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    backgroundColor: 'var(--md-sys-color-error-container)',
    color: 'var(--md-sys-color-on-error-container)',
    border: '1px solid var(--md-sys-color-error)',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    boxShadow: 'var(--md-sys-elevation-level1)'
  }
};

export default InvitationsSection;