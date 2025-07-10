import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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

  const formatRole = (role) => {
    if (role === 'parent') return 'Host Parent';
    if (role === 'au_pair') return 'Au Pair';
    return role;
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
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
  const auPairs = familyMembers.filter(m => m.role === 'au_pair');

  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>Current Family Members</h2>
      
      {/* Parents */}
      {parents.length > 0 && (
        <div style={styles.roleGroup}>
          <h3 style={styles.roleTitle}>Parents</h3>
          <div style={styles.memberGrid}>
            {parents.map((member) => (
              <div key={member.id} style={styles.memberCard}>
                <div style={styles.memberHeader}>
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
                  {member.id === currentUserId && (
                    <span style={styles.youBadge}>You</span>
                  )}
                </div>
                <h4 style={styles.memberName}>{member.name || 'Unnamed'}</h4>
                <p style={styles.memberEmail}>{member.email}</p>
                <p style={styles.memberSince}>
                  Member since {formatDate(member.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Au Pairs */}
      {auPairs.length > 0 && (
        <div style={styles.roleGroup}>
          <h3 style={styles.roleTitle}>Au Pairs</h3>
          <div style={styles.memberGrid}>
            {auPairs.map((member) => (
              <div key={member.id} style={styles.memberCard}>
                <div style={styles.memberHeader}>
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
                </div>
                <h4 style={styles.memberName}>{member.name || 'Unnamed'}</h4>
                <p style={styles.memberEmail}>{member.email}</p>
                <p style={styles.memberSince}>
                  Started {formatDate(member.startDate || member.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {familyMembers.length === 0 && (
        <div style={styles.emptyState}>
          <p>No family members found. Start by inviting family members!</p>
        </div>
      )}
    </section>
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
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#000',
    marginBottom: '20px',
    borderBottom: '1px solid #F2F2F7',
    paddingBottom: '12px'
  },
  loadingText: {
    color: '#8E8E93',
    textAlign: 'center',
    padding: '20px'
  },
  roleGroup: {
    marginBottom: '24px'
  },
  roleTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '12px'
  },
  memberGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px'
  },
  memberCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: '10px',
    padding: '16px',
    border: '1px solid #E5E5EA',
    transition: 'all 0.2s ease'
  },
  memberHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
    position: 'relative'
  },
  profileImage: {
    width: '60px',
    height: '60px',
    borderRadius: '30px',
    objectFit: 'cover'
  },
  profileInitials: {
    width: '60px',
    height: '60px',
    borderRadius: '30px',
    backgroundColor: '#007AFF',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: '600'
  },
  youBadge: {
    position: 'absolute',
    top: '0',
    right: '0',
    backgroundColor: '#34C759',
    color: 'white',
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '10px'
  },
  memberName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 4px 0'
  },
  memberEmail: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 8px 0'
  },
  memberSince: {
    fontSize: '13px',
    color: '#8E8E93',
    margin: '0'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#8E8E93'
  }
};

// Add hover effect
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .member-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  }
`;
document.head.appendChild(styleSheet);

export default FamilyMembersSection;