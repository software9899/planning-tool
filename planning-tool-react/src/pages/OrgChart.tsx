import { useState, useEffect, useMemo, useRef } from 'react';
import { getUsers } from '../services/api';

// Single color for all user avatars
const USER_AVATAR_COLOR = '#667eea';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  line_manager?: string;
  position?: string;
  color?: string;
  start_date?: string;
  end_date?: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: string[];
  lead?: string;
  color?: string;
}

interface LineCoordinates {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isDashed?: boolean;
}

export default function OrgChart() {
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showInactivePositions, setShowInactivePositions] = useState<boolean>(true);
  const [showAddMemberButtons, setShowAddMemberButtons] = useState<boolean>(true);
  const [limitMembersPerRow, setLimitMembersPerRow] = useState<boolean>(true);
  const [addMemberSeparated, setAddMemberSeparated] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'tree' | 'stack'>('tree');
  const [lines, setLines] = useState<LineCoordinates[]>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Convert vacancy to member states
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertingVacancy, setConvertingVacancy] = useState<Member | null>(null);
  const [convertName, setConvertName] = useState('');
  const [convertEmail, setConvertEmail] = useState('');
  const [convertPassword, setConvertPassword] = useState('');
  const [convertRole, setConvertRole] = useState('Developer');

  useEffect(() => {
    loadMembers();
    loadTeams();

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'members' || e.key === 'users') {
        loadMembers();
      }
      if (e.key === 'teams') {
        loadTeams();
      }
    };

    // Listen for custom events from same tab
    const handleDataChange = () => {
      loadMembers();
      loadTeams();
    };

    // Listen for window focus (when switching back to this tab)
    const handleFocus = () => {
      loadMembers();
      loadTeams();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('membersChanged', handleDataChange);
    window.addEventListener('teamsChanged', handleDataChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('membersChanged', handleDataChange);
      window.removeEventListener('teamsChanged', handleDataChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadMembers = async () => {
    try {
      // Load regular users
      const users = await getUsers();
      const formattedMembers = users.map((user: any) => {
        const status = user.status || 'active';
        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
          status: status,
          line_manager: user.line_manager ? String(user.line_manager) : undefined,
          position: user.position,
          color: status === 'inactive' ? '#ef4444' : USER_AVATAR_COLOR, // Red for inactive (leaving), blue for active
          start_date: user.start_date,
          end_date: user.end_date
        };
      });

      // Load draft headcount entries
      const draftResponse = await fetch('/api/draft-headcount');
      let draftMembers = [];
      if (draftResponse.ok) {
        const drafts = await draftResponse.json();
        draftMembers = drafts.map((draft: any) => ({
          id: `draft-${draft.id}`,
          name: draft.position_title,
          email: `draft-${draft.id}@vacancy.temp`,
          role: 'Position Open',
          status: 'inactive',
          line_manager: draft.line_manager ? String(draft.line_manager) : undefined,
          position: draft.position_title,
          color: '#ef4444',
          start_date: draft.start_date
        }));
      }

      // Combine both lists
      setMembers([...formattedMembers, ...draftMembers]);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const addVacancy = async (managerId: string) => {
    try {
      // Create vacancy in draft_headcount table
      const response = await fetch('/api/draft-headcount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          position_title: 'Vacancy',
          department: '',
          line_manager: parseInt(managerId),
          required_skills: '',
          description: '',
          status: 'open'
        }),
      });

      if (response.ok) {
        const createdEntry = await response.json();

        // Add to local state as a member for org chart display
        const newVacancy: Member = {
          id: `draft-${createdEntry.id}`, // Prefix with 'draft-' to distinguish from actual users
          name: createdEntry.position_title,
          email: `draft-${createdEntry.id}@vacancy.temp`,
          role: 'Position Open',
          status: 'inactive',
          line_manager: createdEntry.line_manager ? String(createdEntry.line_manager) : undefined,
          position: createdEntry.position_title,
          color: '#ef4444',
          start_date: createdEntry.start_date
        };

        setMembers(prev => [...prev, newVacancy]);
      } else {
        const errorData = await response.json();
        console.error('Failed to create vacancy:', errorData);
        alert(`Failed to create vacancy: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error('Error creating vacancy:', error);
      alert('Error creating vacancy. Please try again.');
    }
  };

  const deleteVacancy = async (memberId: string) => {
    if (!confirm('Are you sure you want to delete this vacancy?')) {
      return;
    }

    try {
      const isDraft = memberId.startsWith('draft-');
      const actualId = isDraft ? memberId.replace('draft-', '') : memberId;

      if (isDraft) {
        // Delete from draft_headcount
        const response = await fetch(`/api/draft-headcount/${actualId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // Remove from local state
          setMembers(prev => prev.filter(m => m.id !== memberId));
        } else {
          alert('Failed to delete vacancy. Please try again.');
        }
      } else {
        // Delete from users
        const response = await fetch(`/api/users/${actualId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // Remove from local state
          setMembers(prev => prev.filter(m => m.id !== memberId));
        } else {
          alert('Failed to delete member. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting. Please try again.');
    }
  };

  const handleStartConvert = (vacancy: Member) => {
    setConvertingVacancy(vacancy);
    const cleanName = vacancy.name.replace('Position Open - ', '');
    setConvertName(cleanName);

    // Auto-generate default email from name
    const emailName = cleanName.toLowerCase().replace(/\s+/g, '.');
    const defaultEmail = `${emailName}@company.com`;
    setConvertEmail(defaultEmail);

    setConvertPassword('');
    setConvertRole('Developer');
    setShowConvertModal(true);
  };

  const handleConvertVacancy = async () => {
    if (!convertingVacancy) return;

    if (!convertName.trim() || !convertEmail.trim() || !convertPassword.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const draftId = convertingVacancy.id.replace('draft-', '');

      // Create new user via registration API
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: convertName.trim(),
          email: convertEmail.trim(),
          password: convertPassword.trim(),
          role: convertRole.toLowerCase(),
          line_manager: convertingVacancy.line_manager ? parseInt(convertingVacancy.line_manager) : undefined,
          status: 'active'
        })
      });

      if (!registerResponse.ok) {
        const error = await registerResponse.json();
        throw new Error(error.detail || 'Failed to create member');
      }

      // Delete the draft headcount entry
      const deleteResponse = await fetch(`/api/draft-headcount/${draftId}`, {
        method: 'DELETE'
      });

      if (!deleteResponse.ok) {
        console.warn('Failed to delete draft entry, but user was created');
      }

      // Reload members and teams to show the new member
      await loadMembers();
      await loadTeams();

      // Dispatch event to notify other components
      window.dispatchEvent(new Event('membersChanged'));

      setShowConvertModal(false);
      setConvertingVacancy(null);
      alert(`✅ Vacancy converted to member "${convertName}" successfully!`);
    } catch (error: any) {
      console.error('Failed to convert vacancy:', error);
      alert(`❌ Failed to convert vacancy: ${error.message}`);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      if (response.ok) {
        const dbTeams = await response.json();

        // Load members for each team
        const mappedTeams: Team[] = await Promise.all(
          dbTeams.map(async (t: any) => {
            // Fetch team members
            let teamMembers: string[] = [];
            try {
              const membersResponse = await fetch(`/api/teams/${t.id}/members`);
              if (membersResponse.ok) {
                const membersList = await membersResponse.json();
                teamMembers = membersList.map((m: any) => String(m.id));
              }
            } catch (error) {
              console.error(`Failed to load members for team ${t.id}:`, error);
            }

            return {
              id: String(t.id),
              name: t.name,
              description: t.description || '',
              members: teamMembers,
              lead: t.lead_id ? String(t.lead_id) : undefined,
              color: '#667eea'
            };
          })
        );

        setTeams(mappedTeams);
      }
    } catch (error) {
      console.error('Failed to load teams from API:', error);
    }
  };

  // Filter members based on selected team (memoized for performance)
  const filteredMembers = useMemo(() => {
    if (selectedTeam === 'all') {
      // Show all members in "All Teams" view
      return members;
    }

    const team = teams.find(t => t.id === selectedTeam);
    if (!team) {
      return members;
    }

    // Get all members in the team and their line managers (recursively up the chain)
    const includedMembers = new Set<string>();

    // Helper function to traverse management chain safely (prevent infinite loops)
    const addManagerChain = (memberId: string, memberType: string) => {
      const visited = new Set<string>();
      let currentMember = members.find(m => m.id === memberId);

      if (!currentMember) {
        console.warn(`Member ${memberId} (${memberType}) not found in members list`);
        return;
      }

      let iterations = 0;
      const MAX_ITERATIONS = 50; // Safety limit

      while (currentMember?.line_manager && !visited.has(currentMember.id) && iterations < MAX_ITERATIONS) {
        visited.add(currentMember.id);
        includedMembers.add(currentMember.line_manager);

        const nextMember = members.find(m => m.id === currentMember?.line_manager);
        if (!nextMember) {
          console.warn(`Line manager ${currentMember.line_manager} not found for ${currentMember.name}`);
          break;
        }

        currentMember = nextMember;
        iterations++;
      }

      if (iterations >= MAX_ITERATIONS) {
        console.error('Max iterations reached - possible circular reference detected');
      }
    };

    // Add team lead if exists
    if (team.lead) {
      includedMembers.add(team.lead);
      addManagerChain(team.lead, 'team lead');
    }

    // Add all team members
    team.members.forEach(memberId => {
      includedMembers.add(memberId);
      addManagerChain(memberId, 'team member');
    });

    const result = members.filter(m => includedMembers.has(m.id));

    return result;
  }, [members, selectedTeam, teams]);

  // Calculate SVG line positions after render
  useEffect(() => {
    const calculateLines = () => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLines: LineCoordinates[] = [];

      // Iterate through all cards and draw lines to their children
      cardRefs.current.forEach((parentCard, parentId) => {
        const parentMember = filteredMembers.find(m => m.id === parentId);
        if (!parentMember) return;

        // Find children (direct reports)
        let children: Member[] = [];

        if (selectedTeam !== 'all') {
          const currentTeam = teams.find(t => t.id === selectedTeam);
          const isTeamLead = currentTeam?.lead === parentId;

          if (isTeamLead && currentTeam) {
            children = filteredMembers.filter(m =>
              currentTeam.members.includes(m.id) && m.id !== parentId
            );
          }
        } else {
          children = filteredMembers.filter(m => m.line_manager === parentId);

          // Handle inactive positions
          if (!showInactivePositions) {
            const expandedChildren: Member[] = [];
            children.forEach(child => {
              if (child.status === 'inactive') {
                const indirectChildren = filteredMembers.filter(m => m.line_manager === child.id);
                expandedChildren.push(...indirectChildren);
              } else {
                expandedChildren.push(child);
              }
            });
            children = expandedChildren;
          }
        }

        const parentRect = parentCard.getBoundingClientRect();
        const parentCenterX = parentRect.left + parentRect.width / 2 - containerRect.left;
        const parentBottomY = parentRect.bottom - containerRect.top;

        // Get positions of all child cards
        const childPositions = children
          .map(child => {
            const childCard = cardRefs.current.get(child.id);
            if (!childCard) return null;
            const childRect = childCard.getBoundingClientRect();
            return {
              id: child.id,
              centerX: childRect.left + childRect.width / 2 - containerRect.left,
              topY: childRect.top - containerRect.top,
              isAddButton: false
            };
          })
          .filter(pos => pos !== null) as { id: string; centerX: number; topY: number; isAddButton: boolean }[];

        // Check for Add Member button for this parent
        Array.from(cardRefs.current.keys()).forEach(key => {
          if (key.startsWith(`add-member-${parentId}-`)) {
            const addButtonCard = cardRefs.current.get(key);
            if (addButtonCard) {
              const addButtonRect = addButtonCard.getBoundingClientRect();
              childPositions.push({
                id: key,
                centerX: addButtonRect.left + addButtonRect.width / 2 - containerRect.left,
                topY: addButtonRect.top - containerRect.top,
                isAddButton: true
              });
            }
          }
        });

        // Skip if no children and no Add Member button
        if (childPositions.length === 0) return;

        // Vertical line from parent down
        const verticalLineY = parentBottomY + 30;
        newLines.push({
          x1: parentCenterX,
          y1: parentBottomY,
          x2: parentCenterX,
          y2: verticalLineY
        });

        if (childPositions.length === 1) {
          // Single child - straight line down
          const child = childPositions[0];
          newLines.push({
            x1: parentCenterX,
            y1: verticalLineY,
            x2: child.centerX,
            y2: child.topY,
            isDashed: child.isAddButton
          });
        } else {
          // Multiple children - horizontal connector with vertical drops
          const regularChildren = childPositions.filter(c => !c.isAddButton);
          const addButtons = childPositions.filter(c => c.isAddButton);

          const leftmostX = Math.min(...childPositions.map(c => c.centerX));
          const rightmostX = Math.max(...childPositions.map(c => c.centerX));

          if (regularChildren.length > 0) {
            // Solid horizontal line connecting regular children
            const regularLeftmost = Math.min(...regularChildren.map(c => c.centerX));
            const regularRightmost = Math.max(...regularChildren.map(c => c.centerX));

            newLines.push({
              x1: regularLeftmost,
              y1: verticalLineY,
              x2: regularRightmost,
              y2: verticalLineY,
              isDashed: false
            });

            // If there are Add Member buttons, draw dashed horizontal line to them
            if (addButtons.length > 0) {
              const addButtonX = Math.max(...addButtons.map(c => c.centerX));
              newLines.push({
                x1: regularRightmost,
                y1: verticalLineY,
                x2: addButtonX,
                y2: verticalLineY,
                isDashed: true
              });
            }
          } else {
            // Only Add Member buttons - draw dashed horizontal line
            newLines.push({
              x1: leftmostX,
              y1: verticalLineY,
              x2: rightmostX,
              y2: verticalLineY,
              isDashed: true
            });
          }

          // Vertical lines to each child
          childPositions.forEach(child => {
            newLines.push({
              x1: child.centerX,
              y1: verticalLineY,
              x2: child.centerX,
              y2: child.topY,
              isDashed: child.isAddButton
            });
          });
        }
      });

      setLines(newLines);
    };

    // Calculate lines after a short delay to ensure DOM is ready
    const timer = setTimeout(calculateLines, 100);

    // Recalculate on window resize
    window.addEventListener('resize', calculateLines);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateLines);
    };
  }, [filteredMembers, selectedTeam, showInactivePositions, teams, showAddMemberButtons, limitMembersPerRow]);

  // Stack View - Render member with direct reports horizontally
  const renderStackMember = (member: Member, level: number = 0, ancestorIds = new Set<string>()): JSX.Element => {
    // Prevent circular references
    if (ancestorIds.has(member.id)) {
      console.error(`Circular reference detected for ${member.name} (ID: ${member.id})`);
      return (
        <div key={member.id} style={{ padding: '20px', background: '#fee', border: '2px solid #f00', borderRadius: '8px', margin: '10px' }}>
          <strong>⚠️ Circular Reference Detected</strong>
          <p>Cannot render {member.name} - creates infinite loop</p>
        </div>
      );
    }

    // Prevent too deep nesting
    if (level > 10) {
      return (
        <div key={member.id} style={{ padding: '10px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
          <p>⚠️ Max depth reached</p>
        </div>
      );
    }

    const newAncestors = new Set(ancestorIds);
    newAncestors.add(member.id);

    const isInactive = member.status === 'inactive';
    const isUnnamedVacancy = isInactive && (member.name === 'Vacancy' || member.name.includes('Position Open'));
    const directReports = filteredMembers.filter(m => m.line_manager === member.id);

    const cardGradient = level === 0
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : directReports.length > 0
        ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        : 'white';

    // Split direct reports into chunks of 4 (if enabled)
    const maxPerRow = limitMembersPerRow ? 4 : directReports.length;
    const reportChunks: Member[][] = [];
    for (let i = 0; i < directReports.length; i += maxPerRow) {
      reportChunks.push(directReports.slice(i, i + maxPerRow));
    }

    return (
      <>
        {/* Current member card with their direct reports (max 5 per row) */}
        {reportChunks.map((chunk, chunkIndex) => (
          <div key={`${member.id}-chunk-${chunkIndex}`} style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            marginBottom: '12px',
            marginLeft: `${level * 32 + (chunkIndex > 0 ? 176 : 0)}px`
          }}>
            {/* Manager card - only show on first chunk */}
            {chunkIndex === 0 && (
              <div
                onClick={() => isInactive && handleStartConvert(member)}
                style={{
                  background: isUnnamedVacancy ? '#fee2e2' : isInactive ? '#fef3c7' : cardGradient,
                  border: isUnnamedVacancy ? '2px dashed #ef4444' : isInactive ? '2px dashed #fbbf24' : (level === 0 || directReports.length > 0 ? 'none' : '1px solid #e5e7eb'),
                  borderRadius: '8px',
                  padding: '12px 16px',
                  minWidth: '160px',
                  maxWidth: '160px',
                  boxShadow: isUnnamedVacancy ? '0 4px 12px rgba(239, 68, 68, 0.3)' : isInactive ? '0 4px 12px rgba(251, 191, 36, 0.3)' : '0 2px 4px rgba(0,0,0,0.08)',
                  transition: 'all 0.2s',
                  cursor: isInactive ? 'pointer' : 'default'
                }}
                title={isInactive ? 'Click to convert vacancy to member' : ''}
              >
                <div style={{
                  fontWeight: 600,
                  fontSize: level === 0 ? '16px' : '15px',
                  color: isInactive ? '#ef4444' : (level === 0 || directReports.length > 0 ? 'white' : '#111827'),
                  marginBottom: '6px',
                  wordBreak: 'break-word'
                }}>
                  {member.name}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: isInactive ? '#f87171' : (level === 0 || directReports.length > 0 ? 'rgba(255,255,255,0.9)' : '#6b7280'),
                  marginBottom: '4px'
                }}>
                  {member.position || member.role}
                </div>
                {isInactive && (
                  <div style={{
                    fontSize: '11px',
                    color: '#ef4444',
                    marginTop: '8px',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}>
                    Vacant Position
                  </div>
                )}
              </div>
            )}

            {/* Direct reports for this chunk */}
            {chunk.map(report => {
              const reportDirectReports = filteredMembers.filter(m => m.line_manager === report.id);
              const reportIsInactive = report.status === 'inactive';
              const reportCardGradient = reportDirectReports.length > 0
                ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                : 'white';

              return (
                <div
                  key={report.id}
                  style={{
                    background: reportIsInactive ? '#fee' : reportCardGradient,
                    border: reportIsInactive ? '2px dashed #ef4444' : (reportDirectReports.length > 0 ? 'none' : '1px solid #e5e7eb'),
                    borderRadius: '8px',
                    padding: '12px 16px',
                    minWidth: '160px',
                    maxWidth: '160px',
                    boxShadow: reportIsInactive ? '0 4px 12px rgba(239, 68, 68, 0.3)' : '0 2px 4px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    fontWeight: 600,
                    fontSize: '15px',
                    color: reportIsInactive ? '#ef4444' : (reportDirectReports.length > 0 ? 'white' : '#111827'),
                    marginBottom: '6px',
                    wordBreak: 'break-word'
                  }}>
                    {report.name}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: reportIsInactive ? '#f87171' : (reportDirectReports.length > 0 ? 'rgba(255,255,255,0.9)' : '#6b7280'),
                    marginBottom: '4px'
                  }}>
                    {report.position || report.role}
                  </div>
                  {reportIsInactive && (
                    <div style={{
                      fontSize: '11px',
                      color: '#ef4444',
                      marginTop: '8px',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      Vacant Position
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Recursively render each direct report's team on subsequent rows */}
        {directReports.map(report => {
          const reportTeam = filteredMembers.filter(m => m.line_manager === report.id);
          // Only recursively render if the report has their own team
          if (reportTeam.length > 0) {
            return renderStackMember(report, level + 1, newAncestors);
          }
          return null;
        })}
      </>
    );
  };

  // MS Teams style OrgNode component
  const OrgNode = ({ member, level = 0, ancestorIds = new Set<string>() }: { member: Member; level?: number; ancestorIds?: Set<string> }) => {
    // Prevent circular references - if this member is already in the ancestor chain, stop rendering
    if (ancestorIds.has(member.id)) {
      console.error(`Circular reference detected for ${member.name} (ID: ${member.id})`);
      return (
        <div style={{ padding: '20px', background: '#fee', border: '2px solid #f00', borderRadius: '8px', margin: '10px' }}>
          <strong>⚠️ Circular Reference Detected</strong>
          <p>Cannot render {member.name} - creates infinite loop</p>
        </div>
      );
    }

    // Prevent rendering too deep (safety check)
    if (level > 10) {
      console.error(`Max depth reached for ${member.name}`);
      return null;
    }

    // Check if this member is a team lead
    const currentTeam = selectedTeam !== 'all' ? teams.find(t => t.id === selectedTeam) : null;
    const isTeamLead = currentTeam?.lead === member.id;

    // Get direct reports
    let directReports: Member[] = [];

    // Create new ancestor set including current member
    const newAncestors = new Set(ancestorIds);
    newAncestors.add(member.id);

    if (selectedTeam !== 'all' && currentTeam) {
      // When viewing a specific team, use team-based hierarchy (not global line_manager)
      if (isTeamLead) {
        // Team lead shows all team members (except themselves) as direct reports
        directReports = filteredMembers.filter(m =>
          currentTeam.members.includes(m.id) &&
          m.id !== member.id
        );
      } else {
        // Regular members don't have direct reports in team view
        directReports = [];
      }
    } else {
      // In "All Teams" view, use global line_manager for hierarchy
      directReports = filteredMembers.filter(m => m.line_manager === member.id);

      // If hiding inactive positions, replace inactive direct reports with their children
      if (!showInactivePositions) {
        const expandedReports: Member[] = [];
        directReports.forEach(report => {
          if (report.status === 'inactive') {
            // Get this inactive person's direct reports instead
            const indirectReports = filteredMembers.filter(m => m.line_manager === report.id);
            expandedReports.push(...indirectReports);
          } else {
            expandedReports.push(report);
          }
        });
        directReports = expandedReports;
      }
    }

    const isTopLevel = level === 0;
    const isInactive = member.status === 'inactive';
    const isUnnamedVacancy = isInactive && (member.name === 'Vacancy' || member.name.includes('Position Open'));

    // If hiding inactive positions and this member is inactive, don't render this node at all
    if (!showInactivePositions && isInactive) {
      return null;
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative'
      }}>
        {/* Member Card - MS Teams Style */}
        <div
          ref={(el) => {
            if (el) {
              cardRefs.current.set(member.id, el);
            } else {
              cardRefs.current.delete(member.id);
            }
          }}
          data-member-id={member.id}
          style={{
            background: isUnnamedVacancy ? '#fee2e2' : isInactive ? '#fef3c7' : 'white',
            border: isUnnamedVacancy ? '2px solid #ef4444' : isInactive ? '2px solid #fbbf24' : '1px solid #e1e1e1',
            borderRadius: '8px',
            padding: '16px 20px',
            minWidth: '220px',
            maxWidth: '220px',
            minHeight: '180px',
            boxShadow: isUnnamedVacancy ? '0 4px 12px rgba(239, 68, 68, 0.3)' : isInactive ? '0 4px 12px rgba(251, 191, 36, 0.3)' : '0 2px 4px rgba(0,0,0,0.08)',
            transition: 'all 0.2s',
            cursor: 'pointer',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = isUnnamedVacancy ? '0 6px 16px rgba(239, 68, 68, 0.4)' : isInactive ? '0 6px 16px rgba(251, 191, 36, 0.4)' : '0 4px 12px rgba(0,0,0,0.15)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            setHoveredNodeId(member.id);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = isUnnamedVacancy ? '0 4px 12px rgba(239, 68, 68, 0.3)' : isInactive ? '0 4px 12px rgba(251, 191, 36, 0.3)' : '0 2px 4px rgba(0,0,0,0.08)';
            e.currentTarget.style.transform = 'translateY(0)';
            setHoveredNodeId(null);
          }}
        >
          {/* Edit Icon for Unnamed Vacancy */}
          {isUnnamedVacancy && (
            <div
              onClick={async (e) => {
                e.stopPropagation();
                const currentName = member.name === 'Vacancy' || member.name === 'Position Open' ? '' : member.name;
                const newName = prompt('Enter name for this position:', currentName);
                if (newName && newName.trim()) {
                  try {
                    const isDraft = member.id.startsWith('draft-');
                    const actualId = isDraft ? member.id.replace('draft-', '') : member.id;
                    const endpoint = isDraft
                      ? `/api/draft-headcount/${actualId}`
                      : `/api/users/${actualId}`;

                    const payload = isDraft
                      ? {
                          position_title: newName.trim(),
                          department: '',
                          line_manager: member.line_manager ? parseInt(member.line_manager) : null,
                          required_skills: '',
                          description: '',
                          status: 'open'
                        }
                      : {
                          name: newName.trim(),
                          email: member.email,
                          role: member.role,
                          status: 'active',
                          line_manager: member.line_manager ? parseInt(member.line_manager) : null,
                          position: member.position
                        };

                    const response = await fetch(endpoint, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(payload),
                    });

                    if (response.ok) {
                      setMembers(prev => prev.map(m =>
                        m.id === member.id ? { ...m, name: newName.trim(), position: newName.trim() } : m
                      ));
                    } else {
                      alert('Failed to update position. Please try again.');
                    }
                  } catch (error) {
                    console.error('Error updating position:', error);
                    alert('Error updating position. Please try again.');
                  }
                }
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#ef4444',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'all 0.2s',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
              }}
            >
              ✏️
            </div>
          )}

          {/* Delete Icon for Unnamed Vacancy */}
          {isUnnamedVacancy && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                deleteVacancy(member.id);
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '48px',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#dc2626',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'all 0.2s',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
              }}
            >
              🗑️
            </div>
          )}

          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: isTopLevel
                ? 'linear-gradient(135deg, #0078d4 0%, #106ebe 100%)'
                : member.color || '#5b5fc7',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '28px',
              marginBottom: '8px',
              border: '3px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              {isUnnamedVacancy ? '🔍' : member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
          </div>

          {/* Name with Position */}
          <div style={{
            textAlign: 'center',
            marginBottom: '4px'
          }}>
            <div style={{
              fontWeight: 600,
              fontSize: '15px',
              color: '#242424',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {member.name}
            </div>
            {!isInactive && (member.position || member.role) && (
              <div style={{
                fontSize: '13px',
                color: '#6b7280',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {member.position || member.role}
              </div>
            )}

            {/* Start Date for Vacancy/Open Positions Only */}
            {isUnnamedVacancy && (
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <span>Start: {member.start_date || 'Not set'}</span>
                <span
                  onClick={async (e) => {
                    e.stopPropagation();
                    const newDate = prompt('Enter start date (YYYY-MM-DD):', member.start_date || '');
                    if (newDate !== null && newDate.trim()) {
                      try {
                        const response = await fetch(`/api/users/${member.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            name: member.name,
                            email: member.email,
                            role: member.role,
                            status: member.status,
                            line_manager: member.line_manager ? parseInt(member.line_manager) : null,
                            position: member.position,
                            start_date: newDate.trim()
                          }),
                        });

                        if (response.ok) {
                          setMembers(prev => prev.map(m =>
                            m.id === member.id ? { ...m, start_date: newDate.trim() } : m
                          ));
                        } else {
                          alert('Failed to update start date. Please try again.');
                        }
                      } catch (error) {
                        console.error('Error updating start date:', error);
                        alert('Error updating start date. Please try again.');
                      }
                    }
                  }}
                  style={{
                    cursor: 'pointer',
                    fontSize: '12px',
                    transition: 'transform 0.2s'
                  }}
                  title="Edit start date"
                >
                  ✏️
                </span>
              </div>
            )}

            {/* End Date for Inactive Users */}
            {isInactive && !isUnnamedVacancy && (
              <div style={{
                fontSize: '13px',
                color: '#92400e',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <span>End: {member.end_date || 'Not set'}</span>
              </div>
            )}
          </div>

          {/* Team Lead Badge */}
          {!isInactive && isTeamLead && (
            <div style={{
              display: 'inline-block',
              padding: '3px 10px',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              color: 'white',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 600,
              marginBottom: '8px',
              boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
            }}>
              👑 Team Lead
            </div>
          )}

          {/* Hover Add Member Button */}
          {hoveredNodeId === member.id && member.name !== 'Admin User' && !isInactive && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                addVacancy(member.id);
              }}
              style={{
                position: 'absolute',
                bottom: '-25px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '24px',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.5)',
                transition: 'all 0.2s',
                zIndex: 100,
                border: '3px solid white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(-50%) scale(1.1)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.5)';
              }}
            >
              ➕
            </div>
          )}
        </div>

        {/* Spacer for vertical gap */}
        {(directReports.length > 0 || level === 0) && (
          <div style={{ height: '30px' }} />
        )}

        {/* Direct Reports and Add Member Button */}
        {(directReports.length > 0 || level === 0) && (() => {
          // Split direct reports into chunks of 4 for multi-row layout (if enabled)
          const maxPerRow = limitMembersPerRow ? 4 : directReports.length;
          const reportChunks: Member[][] = [];
          for (let i = 0; i < directReports.length; i += maxPerRow) {
            reportChunks.push(directReports.slice(i, i + maxPerRow));
          }

          return (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '60px',
              alignItems: 'center'
            }}>
              {reportChunks.map((chunk, rowIndex) => (
                <div key={`row-${rowIndex}`} style={{
                  display: 'inline-flex',
                  gap: '40px',
                  position: 'relative',
                  alignItems: 'flex-start'
                }}>
                  {/* Direct Reports in this row */}
                  {chunk.map((report) => (
                    <div key={report.id} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative'
                    }}>
                      {/* Spacer for vertical gap */}
                      <div style={{ height: '30px' }} />

                      {/* Recursive render */}
                      <OrgNode member={report} level={level + 1} ancestorIds={newAncestors} />
                    </div>
                  ))}

                  {/* Add Member Button - Show only in first row */}
                  {rowIndex === 0 && showAddMemberButtons && member.name !== 'Admin User' && (level === 0 || (level >= 1 && directReports.length > 0)) && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative'
                    }}>
                      {/* Spacer for vertical gap */}
                      <div style={{ height: '30px' }} />

                      {/* Add Member Button Card */}
                      <div
                        ref={(el) => {
                          const addMemberId = `add-member-${member.id}-level-${level}`;
                          if (el) {
                            cardRefs.current.set(addMemberId, el);
                          } else {
                            cardRefs.current.delete(addMemberId);
                          }
                        }}
                        data-member-id={`add-member-${member.id}-level-${level}`}
                        data-is-add-button="true"
                        onClick={() => {
                          addVacancy(member.id);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: '2px dashed white',
                          borderRadius: '8px',
                          padding: '30px 20px',
                          minWidth: '220px',
                          maxWidth: '220px',
                          minHeight: '160px',
                          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                        }}
                      >
                        <div style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '32px',
                          marginBottom: '12px',
                          border: '3px solid white'
                        }}>
                          ➕
                        </div>
                        <div style={{
                          fontWeight: 600,
                          fontSize: '15px',
                          color: 'white',
                          textAlign: 'center'
                        }}>
                          Add Member
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.8)',
                          marginTop: '6px',
                          textAlign: 'center'
                        }}>
                          Click to add
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <p>Loading organization chart...</p>
      </div>
    );
  }

  // Get top-level members
  const topLevelMembers = (() => {
    if (selectedTeam !== 'all') {
      // When viewing a specific team, show only the team lead at the top
      const team = teams.find(t => t.id === selectedTeam);

      if (team?.lead) {
        const leadMember = filteredMembers.find(m => m.id === team.lead);

        if (leadMember) {
          return [leadMember];
        } else {
          const fallback = filteredMembers.filter(m => !m.line_manager);
          return fallback;
        }
      }
    }
    // For "All Teams" view, show members without line_manager
    const allTeamsTop = filteredMembers.filter(m => !m.line_manager);
    return allTeamsTop;
  })();

  return (
    <div className="org-chart-container" style={{ padding: '24px', minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', color: '#111827' }}>
              🏢 Organization Chart
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Visual representation of reporting structure and hierarchy
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
            {/* View Mode Toggle */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                View Mode
              </label>
              <div style={{ display: 'flex', gap: '8px', background: '#f3f4f6', borderRadius: '8px', padding: '4px' }}>
                <button
                  onClick={() => setViewMode('tree')}
                  style={{
                    padding: '8px 16px',
                    background: viewMode === 'tree' ? 'white' : 'transparent',
                    color: viewMode === 'tree' ? '#111827' : '#6b7280',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: viewMode === 'tree' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  🌳 Tree
                </button>
                <button
                  onClick={() => setViewMode('stack')}
                  style={{
                    padding: '8px 16px',
                    background: viewMode === 'stack' ? 'white' : 'transparent',
                    color: viewMode === 'stack' ? '#111827' : '#6b7280',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: viewMode === 'stack' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  📚 Stack
                </button>
              </div>
            </div>

            {/* Toggle for Inactive Positions */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                Display Options
              </label>
              <button
                onClick={() => setShowInactivePositions(!showInactivePositions)}
                style={{
                  padding: '10px 16px',
                  background: showInactivePositions ? '#ef4444' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '10px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {showInactivePositions ? '👁️ Hide' : '👁️‍🗨️ Show'} Inactive Positions
              </button>
              <button
                onClick={() => setShowAddMemberButtons(!showAddMemberButtons)}
                style={{
                  padding: '10px 16px',
                  background: showAddMemberButtons ? '#ef4444' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {showAddMemberButtons ? '➕ Hide' : '➕ Show'} Add Member Buttons
              </button>
              <button
                onClick={() => setLimitMembersPerRow(!limitMembersPerRow)}
                style={{
                  padding: '10px 16px',
                  background: limitMembersPerRow ? '#3b82f6' : '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '10px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {limitMembersPerRow ? '📊 Limit 4/Row' : '📈 Unlimited/Row'}
              </button>
            </div>

            <div style={{ minWidth: '250px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                Filter by Team/Project
              </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white',
                cursor: 'pointer',
                outline: 'none',
                transition: 'border 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
            >
              <option value="all">🌐 All Teams (Full Organization)</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  👥 {team.name}
                </option>
              ))}
            </select>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} />
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Top Level</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }} />
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Managers</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'white', border: '2px solid #e5e7eb' }} />
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Team Members</span>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '40px',
          overflowX: 'auto',
          position: 'relative'
        }}
      >
        {/* SVG Overlay for connecting lines - Only show in Tree view */}
        {viewMode === 'tree' && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 0
            }}
          >
            {lines.map((line, index) => (
              <line
                key={index}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.isDashed ? "#667eea" : "#c8c6c4"}
                strokeWidth="2"
                strokeDasharray={line.isDashed ? "8 4" : undefined}
              />
            ))}
          </svg>
        )}

{topLevelMembers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
            <p style={{ color: '#6b7280' }}>No organization structure found. Add members with reporting relationships to build the chart.</p>
          </div>
        ) : viewMode === 'stack' ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            padding: '20px',
            position: 'relative',
            zIndex: 1
          }}>
            {topLevelMembers.map(member => renderStackMember(member, 0))}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            gap: '60px',
            justifyContent: 'center',
            minWidth: 'fit-content',
            position: 'relative',
            zIndex: 1
          }}>
            {topLevelMembers.map(member => (
              <OrgNode key={member.id} member={member} level={0} />
            ))}
          </div>
        )}
      </div>

      {/* Convert Vacancy to Member Modal */}
      {showConvertModal && convertingVacancy && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '24px', fontWeight: 700 }}>
              Convert Vacancy to Member
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Name *</label>
              <input
                type="text"
                value={convertName}
                onChange={(e) => setConvertName(e.target.value)}
                placeholder="Enter member name"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Email *</label>
              <input
                type="email"
                value={convertEmail}
                onChange={(e) => setConvertEmail(e.target.value)}
                placeholder="Enter email address"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Password *</label>
              <input
                type="password"
                value={convertPassword}
                onChange={(e) => setConvertPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Role</label>
              <select
                value={convertRole}
                onChange={(e) => setConvertRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="Developer">Developer</option>
                <option value="Designer">Designer</option>
                <option value="QA">QA</option>
                <option value="Product Owner">Product Owner</option>
                <option value="Project Manager">Project Manager</option>
                <option value="Scrum Master">Scrum Master</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConvertModal(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: 'white',
                  color: '#374151',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConvertVacancy}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Convert to Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
