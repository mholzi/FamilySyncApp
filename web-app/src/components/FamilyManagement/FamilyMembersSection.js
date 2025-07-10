import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const FamilyMembersSection = ({ familyData, currentUserId }) => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyData?.id) {
      setLoading(false);
      return;
    }

    // Query users that belong to this family
    const q = query(
      collection(db, 'users'),
      where('familyId', '==', familyData.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members = [];
      snapshot.forEach((doc) => {
        members.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort: current user first, then parents, then au pairs
      members.sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        if (a.role === 'parent' && b.role !== 'parent') return -1;
        if (b.role === 'parent' && a.role !== 'parent') return 1;
        return 0;
      });

      setFamilyMembers(members);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [familyData?.id, currentUserId]);

  const getUserInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleDeleteMember = async (member) => {
    const memberType = member.role === 'parent' ? 'parent' : 'au pair';
    const confirmMessage = member.id === currentUserId 
      ? `Are you sure you want to remove yourself as a ${memberType}? This will remove you from the family.`
      : `Are you sure you want to remove ${member.name || member.email} from the family?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const memberRef = doc(db, 'users', member.id);
      await updateDoc(memberRef, {
        familyId: null,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error removing family member:', error);
      alert('Failed to remove family member. Please try again.');
    }
  };


  if (loading) {
    return (
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Current Family Members</h2>
        <div style={styles.loadingText}>Loading members...</div>
      </section>
    );
  }

  const parents = familyMembers.filter(m => m.role === 'parent');
  const auPairs = familyMembers.filter(m => m.role === 'au_pair' || m.role === 'aupair');

  return (
    <>
      {/* Parents Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Parents</h2>
        </div>
        <div style={styles.membersContainer}>
          {parents.length > 0 ? (
            <>
              {parents.map((member) => (
              <div key={member.id} style={styles.memberCard}>
                <div style={styles.cardContent}>
                  <div style={styles.cardLeft}>
                    {member.profilePictureUrl ? (
                      <img 
                        src={member.profilePictureUrl} 
                        alt={member.name}
                        style={styles.profileImage}
                      />
                    ) : (
                      <div style={styles.profileInitials}>
                        {getUserInitials(member.name)}
                      </div>
                    )}
                    <div style={styles.memberInfo}>
                      <h4 style={styles.memberName}>{member.name || 'Unnamed'}</h4>
                      <p style={styles.memberEmail}>{member.email}</p>
                      {member.phone && (
                        <p style={styles.memberPhone}>{member.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
                {member.id !== currentUserId && (
                  <div style={styles.cardActions}>
                    <button
                      style={styles.deleteButton}
                      onClick={() => handleDeleteMember(member)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--md-sys-color-error)';
                        e.currentTarget.style.color = 'var(--md-sys-color-on-error)';
                        e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--md-sys-color-error-container)';
                        e.currentTarget.style.color = 'var(--md-sys-color-on-error-container)';
                        e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level1)';
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
                {member.id === currentUserId && (
                  <span style={styles.youBadge}>You</span>
                )}
              </div>
              ))}
              {/* Add Parent Invite Card */}
              <div style={styles.inviteCard}>
                <div style={styles.inviteContent}>
                  <div style={styles.inviteIcon}>➕</div>
                  <h4 style={styles.inviteTitle}>Invite Parent</h4>
                  <p style={styles.inviteText}>Add another parent to manage the family</p>
                </div>
                <button
                  style={styles.inviteButton}
                  onClick={() => console.log('Invite parent')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary)';
                    e.currentTarget.style.color = 'var(--md-sys-color-on-primary)';
                    e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary-container)';
                    e.currentTarget.style.color = 'var(--md-sys-color-on-primary-container)';
                    e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level1)';
                  }}
                >
                  Send Invite
                </button>
              </div>
            </>
          ) : (
            <div style={styles.inviteCard}>
              <div style={styles.inviteContent}>
                <div style={styles.inviteIcon}>👨‍👩‍👧</div>
                <h4 style={styles.inviteTitle}>No Parents Yet</h4>
                <p style={styles.inviteText}>Start by adding yourself as a parent</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Au Pairs Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Au Pairs</h2>
        </div>
        <div style={styles.membersContainer}>
          {auPairs.length > 0 ? (
            <>
              {auPairs.map((member) => (
              <div key={member.id} style={styles.memberCard}>
                <div style={styles.cardContent}>
                  <div style={styles.cardLeft}>
                    {member.profilePictureUrl ? (
                      <img 
                        src={member.profilePictureUrl} 
                        alt={member.name}
                        style={styles.profileImage}
                      />
                    ) : (
                      <div style={styles.profileInitials}>
                        {getUserInitials(member.name)}
                      </div>
                    )}
                    <div style={styles.memberInfo}>
                      <h4 style={styles.memberName}>{member.name || 'Unnamed'}</h4>
                      <p style={styles.memberEmail}>{member.email}</p>
                      {member.phone && (
                        <p style={styles.memberPhone}>{member.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
                {member.id !== currentUserId && (
                  <div style={styles.cardActions}>
                    <button
                      style={styles.deleteButton}
                      onClick={() => handleDeleteMember(member)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--md-sys-color-error)';
                        e.currentTarget.style.color = 'var(--md-sys-color-on-error)';
                        e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--md-sys-color-error-container)';
                        e.currentTarget.style.color = 'var(--md-sys-color-on-error-container)';
                        e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level1)';
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              ))}
              {/* Add Au Pair Invite Card */}
              <div style={styles.inviteCard}>
                <div style={styles.inviteContent}>
                  <div style={styles.inviteIcon}>➕</div>
                  <h4 style={styles.inviteTitle}>Invite Au Pair</h4>
                  <p style={styles.inviteText}>Connect with your au pair</p>
                </div>
                <button
                  style={styles.inviteButton}
                  onClick={() => console.log('Invite au pair')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary)';
                    e.currentTarget.style.color = 'var(--md-sys-color-on-primary)';
                    e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary-container)';
                    e.currentTarget.style.color = 'var(--md-sys-color-on-primary-container)';
                    e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level1)';
                  }}
                >
                  Send Invite
                </button>
              </div>
            </>
          ) : (
            <div style={styles.inviteCard}>
              <div style={styles.inviteContent}>
                <div style={styles.inviteIcon}>👤</div>
                <h4 style={styles.inviteTitle}>No Au Pair Yet</h4>
                <p style={styles.inviteText}>Invite your au pair to join the family</p>
              </div>
              <button
                style={styles.inviteButton}
                onClick={() => console.log('Invite au pair')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary)';
                  e.currentTarget.style.color = 'var(--md-sys-color-on-primary)';
                  e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary-container)';
                  e.currentTarget.style.color = 'var(--md-sys-color-on-primary-container)';
                  e.currentTarget.style.boxShadow = 'var(--md-sys-elevation-level1)';
                }}
              >
                Send Invite
              </button>
            </div>
          )}
        </div>
      </section>

      {familyMembers.length === 0 && (
        <section style={styles.section}>
          <div style={styles.emptyState}>
            <p>No family members found. Start by inviting family members!</p>
          </div>
        </section>
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
    paddingBottom: '12px'
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
  loadingText: {
    color: 'var(--md-sys-color-on-surface-variant)',
    textAlign: 'center',
    padding: '20px',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)'
  },
  membersContainer: {
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
  memberCard: {
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
  cardContent: {
    flex: 1
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '12px'
  },
  cardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0
  },
  memberInfo: {
    flex: 1,
    minWidth: 0
  },
  profileImage: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    objectFit: 'cover',
    flexShrink: 0
  },
  profileInitials: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '600',
    fontFamily: 'var(--md-sys-typescale-title-medium-font-family-name)',
    flexShrink: 0
  },
  youBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    backgroundColor: 'var(--md-sys-color-tertiary-container)',
    color: 'var(--md-sys-color-on-tertiary-container)',
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    fontFamily: 'var(--md-sys-typescale-label-small-font-family-name)'
  },
  memberName: {
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
  memberEmail: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: '0',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  memberPhone: {
    fontSize: '13px',
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: '2px 0 0 0',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  deleteButton: {
    backgroundColor: 'var(--md-sys-color-error-container)',
    border: '1px solid var(--md-sys-color-error)',
    color: 'var(--md-sys-color-on-error-container)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    boxShadow: 'var(--md-sys-elevation-level1)',
    width: '100%'
  },
  editButton: {
    backgroundColor: 'var(--md-sys-color-primary-container)',
    border: '1px solid var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary-container)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    boxShadow: 'var(--md-sys-elevation-level1)',
    flexShrink: 0
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)'
  },
  inviteCard: {
    backgroundColor: 'var(--md-sys-color-surface-container)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    padding: '16px',
    border: '2px dashed var(--md-sys-color-outline)',
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
  inviteContent: {
    textAlign: 'center',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px'
  },
  inviteIcon: {
    fontSize: '32px',
    marginBottom: '8px'
  },
  inviteTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--md-sys-color-on-surface)',
    margin: '0 0 4px 0',
    fontFamily: 'var(--md-sys-typescale-body-large-font-family-name)'
  },
  inviteText: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface-variant)',
    margin: '0',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)'
  },
  inviteButton: {
    backgroundColor: 'var(--md-sys-color-primary-container)',
    border: '1px solid var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary-container)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    fontFamily: 'var(--md-sys-typescale-label-large-font-family-name)',
    transition: 'all var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    boxShadow: 'var(--md-sys-elevation-level1)',
    width: '100%',
    marginTop: '12px'
  }
};

export default FamilyMembersSection;