import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers } from '../services/api';

// Single color for all user avatars
const USER_AVATAR_COLOR = '#667eea';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  teams: string[];
  color?: string;
  line_manager?: string; // ID of line manager
  position?: string; // Job position/title
  start_date?: string; // วันเริ่มงาน
  end_date?: string; // วันทำงานวันสุดท้าย (for inactive members)
  computer?: string; // คอมพิวเตอร์
  mobile?: string; // มือถือ
  phone?: string; // เบอร์โทร
  birthday?: string; // วันเกิด
  disc_type?: string; // DISC personality type
  personality_type?: string; // 16 Personalities type
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: string[];
  lead?: string; // ID of team lead
  color?: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

interface DraftHeadcount {
  id: number;
  position_title: string;
  department: string | null;
  line_manager: number | null;
  required_skills: string | null;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

type TabType = 'members' | 'teams' | 'roles' | 'lookingfor';

export default function Members() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [draftHeadcount, setDraftHeadcount] = useState<DraftHeadcount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Developer');
  const [newMemberPosition, setNewMemberPosition] = useState('');
  const [newMemberLineManager, setNewMemberLineManager] = useState('');
  const [newMemberStartDate, setNewMemberStartDate] = useState('');
  const [newMemberEndDate, setNewMemberEndDate] = useState('');
  const [newMemberStatus, setNewMemberStatus] = useState<'active' | 'inactive'>('active');
  const [newMemberComputer, setNewMemberComputer] = useState('');
  const [newMemberMobile, setNewMemberMobile] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberBirthday, setNewMemberBirthday] = useState('');
  const [newMemberDiscType, setNewMemberDiscType] = useState('');
  const [newMemberPersonalityType, setNewMemberPersonalityType] = useState('');
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [originalUser, setOriginalUser] = useState<Member | null>(null);

  // Team modal state
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);

  // Role modal state
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);

  // Edit member modal state
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberEmail, setEditMemberEmail] = useState('');
  const [editMemberPassword, setEditMemberPassword] = useState('');
  const [editMemberRole, setEditMemberRole] = useState('');
  const [editMemberPosition, setEditMemberPosition] = useState('');
  const [editMemberLineManager, setEditMemberLineManager] = useState('');
  const [editMemberStartDate, setEditMemberStartDate] = useState('');
  const [editMemberEndDate, setEditMemberEndDate] = useState('');
  const [editMemberStatus, setEditMemberStatus] = useState<'active' | 'inactive'>('active');
  const [editMemberComputer, setEditMemberComputer] = useState('');
  const [editMemberMobile, setEditMemberMobile] = useState('');
  const [editMemberPhone, setEditMemberPhone] = useState('');
  const [editMemberBirthday, setEditMemberBirthday] = useState('');
  const [editMemberDiscType, setEditMemberDiscType] = useState('');
  const [editMemberPersonalityType, setEditMemberPersonalityType] = useState('');

  // Set inactive modal state
  const [showSetInactiveModal, setShowSetInactiveModal] = useState(false);
  const [inactivatingMember, setInactivatingMember] = useState<Member | null>(null);
  const [inactiveEndDate, setInactiveEndDate] = useState('');

  // Assign lead modal state
  const [showAssignLeadModal, setShowAssignLeadModal] = useState(false);
  const [assigningTeam, setAssigningTeam] = useState<Team | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState('');

  // Edit team modal state
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDescription, setEditTeamDescription] = useState('');
  const [editTeamMembers, setEditTeamMembers] = useState<string[]>([]);

  // Delete team modal state
  const [showDeleteTeamMembersModal, setShowDeleteTeamMembersModal] = useState(false);

  // Member detail modal state
  const [showMemberDetailModal, setShowMemberDetailModal] = useState(false);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<Member | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);

  // Sorting state for Teams - default sort by team name A-Z
  const [sortColumn, setSortColumn] = useState<'team' | 'description' | 'lead' | 'members' | null>('team');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Sorting state for Members - default sort by name A-Z
  const [memberSortColumn, setMemberSortColumn] = useState<'name' | 'email' | 'role' | 'status' | 'teams' | 'linemanager' | null>('name');
  const [memberSortDirection, setMemberSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter state for Members
  const [memberSearchText, setMemberSearchText] = useState('');
  const [memberFilterRole, setMemberFilterRole] = useState<string>('');
  const [memberFilterStatus, setMemberFilterStatus] = useState<string>('');

  // Column visibility state - default visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name', 'role', 'status', 'effectiveDate', 'teams', 'lineManager', 'mobile', 'birthday', 'actions'
  ]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // All available columns
  const allColumns = [
    { id: 'name', label: 'Member', required: true },
    { id: 'email', label: 'Email', required: false },
    { id: 'role', label: 'Role', required: true },
    { id: 'status', label: 'Status', required: true },
    { id: 'effectiveDate', label: 'Effective Date', required: false },
    { id: 'teams', label: 'Teams', required: false },
    { id: 'lineManager', label: 'Line Manager', required: false },
    { id: 'mobile', label: 'Mobile', required: false },
    { id: 'phone', label: 'Phone', required: false },
    { id: 'computer', label: 'Computer', required: false },
    { id: 'birthday', label: 'Birthday', required: false },
    { id: 'disc_type', label: 'DISC Type', required: false },
    { id: 'personality_type', label: '16 Personalities', required: false },
    { id: 'actions', label: 'Actions', required: true }
  ];

  const toggleColumn = (columnId: string) => {
    const column = allColumns.find(col => col.id === columnId);
    if (column?.required) return; // Don't allow toggling required columns

    if (visibleColumns.includes(columnId)) {
      setVisibleColumns(visibleColumns.filter(id => id !== columnId));
    } else {
      setVisibleColumns([...visibleColumns, columnId]);
    }
  };

  // Close column selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showColumnSelector && !target.closest('.column-selector-container')) {
        setShowColumnSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnSelector]);

  useEffect(() => {
    // Check if user is admin (Lead level)
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.role?.toLowerCase() !== 'admin') {
          alert('Access Denied: Lead level (Admin) privileges required');
          navigate('/');
          return;
        }
      } catch (e) {
        navigate('/');
        return;
      }
    } else {
      navigate('/login');
      return;
    }

    loadData();
    loadCurrentUser();
  }, [navigate]);

  const loadCurrentUser = () => {
    const currentUserData = localStorage.getItem('currentUser');
    if (currentUserData) {
      setCurrentUser(JSON.parse(currentUserData));
    }

    const originalUserData = localStorage.getItem('originalUser');
    if (originalUserData) {
      setOriginalUser(JSON.parse(originalUserData));
    }
  };

  const loadData = async () => {
    // Load members from database only - no localStorage cache
    let loadedMembers: Member[] = [];
    try {
      const users = await getUsers();
      loadedMembers = users.map((user: any) => ({
        id: String(user.id),
        name: user.name,
        email: user.email,
        role: user.role || 'member',
        status: user.status || 'active',
        teams: [],
        color: USER_AVATAR_COLOR,
        line_manager: user.line_manager ? String(user.line_manager) : undefined,
        position: user.position || undefined,
        start_date: user.start_date,
        end_date: user.end_date
      }));
    } catch (error) {
      console.error('Failed to load users from API:', error);
    }

    // Load teams from database API
    try {
      const response = await fetch('http://localhost:8002/api/teams');
      if (response.ok) {
        const dbTeams = await response.json();

        // Load members for each team
        const mappedTeams: Team[] = await Promise.all(
          dbTeams.map(async (t: any) => {
            // Fetch team members
            let teamMembers: string[] = [];
            try {
              const membersResponse = await fetch(`http://localhost:8002/api/teams/${t.id}/members`);
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

        // Sync team memberships back to members
        loadedMembers = loadedMembers.map(member => {
          const memberTeams: string[] = [];
          mappedTeams.forEach(team => {
            if (team.members.includes(member.id)) {
              memberTeams.push(team.name);
            }
          });
          return {
            ...member,
            teams: memberTeams
          };
        });

        setTeams(mappedTeams);
      }
    } catch (error) {
      console.error('Failed to load teams from API:', error);
    }

    // Set members after syncing with teams
    setMembers(loadedMembers);

    // Load roles from localStorage or use default roles
    const savedRoles = localStorage.getItem('roles');
    if (savedRoles) {
      setRoles(JSON.parse(savedRoles));
    } else {
      // Set default roles if none exist
      const defaultRoles: Role[] = [
        { id: '1', name: 'Admin', description: 'System Administrator', permissions: ['Read', 'Write', 'Edit', 'Delete', 'Admin'] },
        { id: '2', name: 'Developer', description: 'Software Developer', permissions: ['Read', 'Write', 'Edit'] },
        { id: '3', name: 'Developer Lead', description: 'Development Team Lead', permissions: ['Read', 'Write', 'Edit', 'Delete'] },
        { id: '4', name: 'Developer Manager', description: 'Development Manager', permissions: ['Read', 'Write', 'Edit', 'Delete'] },
        { id: '5', name: 'Designer', description: 'UI/UX Designer', permissions: ['Read', 'Write', 'Edit'] },
        { id: '6', name: 'Designer Lead', description: 'Design Team Lead', permissions: ['Read', 'Write', 'Edit', 'Delete'] },
        { id: '7', name: 'QA', description: 'Quality Assurance Engineer', permissions: ['Read', 'Write'] },
        { id: '8', name: 'QA Lead', description: 'QA Team Lead', permissions: ['Read', 'Write', 'Edit'] },
        { id: '9', name: 'QA Manager', description: 'QA Manager', permissions: ['Read', 'Write', 'Edit', 'Delete'] },
        { id: '10', name: 'Product Owner', description: 'Product Owner', permissions: ['Read', 'Write', 'Edit'] },
        { id: '11', name: 'Project Manager', description: 'Project Manager', permissions: ['Read', 'Write', 'Edit', 'Delete'] },
        { id: '12', name: 'Scrum Master', description: 'Scrum Master', permissions: ['Read', 'Write', 'Edit'] },
        { id: '13', name: 'Member', description: 'Team Member', permissions: ['Read'] }
      ];
      setRoles(defaultRoles);
      localStorage.setItem('roles', JSON.stringify(defaultRoles));
    }

    // Load draft headcount from database API
    try {
      const response = await fetch('http://localhost:8002/api/draft-headcount');
      if (response.ok) {
        const drafts = await response.json();
        setDraftHeadcount(drafts);
      }
    } catch (error) {
      console.error('Failed to load draft headcount from API:', error);
    }
  };

  const deleteDraftHeadcount = async (id: number) => {
    if (!confirm('Are you sure you want to delete this vacancy?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8002/api/draft-headcount/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setDraftHeadcount(prev => prev.filter(d => d.id !== id));
        alert('Vacancy deleted successfully');
      } else {
        alert('Failed to delete vacancy. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting vacancy:', error);
      alert('Error deleting vacancy. Please try again.');
    }
  };

  const migrateFromLocalStorage = async () => {
    if (!confirm('🔄 Migrate localStorage data to database?\n\nThis will:\n1. Read teams from localStorage\n2. Update database with team lead information\n3. Keep existing database data\n\nContinue?')) {
      return;
    }

    try {
      // Read teams from localStorage
      const savedTeams = localStorage.getItem('teams');
      if (!savedTeams) {
        alert('❌ No teams data found in localStorage');
        return;
      }

      const localTeams = JSON.parse(savedTeams);
      console.log('Found teams in localStorage:', localTeams);

      let migratedCount = 0;
      let errorCount = 0;

      // For each team in localStorage, check if it exists in database and update lead_id
      for (const localTeam of localTeams) {
        try {
          // Find matching team in database by name
          const dbTeam = teams.find(t => t.name.toLowerCase() === localTeam.name.toLowerCase());

          if (dbTeam && localTeam.lead) {
            // Update team lead in database
            const response = await fetch(`http://localhost:8002/api/teams/${dbTeam.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: dbTeam.name,
                description: dbTeam.description || null,
                icon: null,
                lead_id: parseInt(localTeam.lead)
              })
            });

            if (response.ok) {
              migratedCount++;
              console.log(`✅ Migrated team lead for: ${dbTeam.name}`);
            } else {
              errorCount++;
              console.error(`❌ Failed to migrate: ${dbTeam.name}`);
            }
          }
        } catch (error) {
          console.error(`Error migrating team ${localTeam.name}:`, error);
          errorCount++;
        }
      }

      // Reload data
      await loadData();

      alert(`✅ Migration complete!\n\n` +
            `✓ Migrated: ${migratedCount} team(s)\n` +
            `✗ Errors: ${errorCount} team(s)\n\n` +
            `Please refresh to see updated data.`);
    } catch (error: any) {
      console.error('Migration error:', error);
      alert(`❌ Migration failed: ${error.message}`);
    }
  };

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTeams = teams
    .filter(t =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => parseInt(b.id) - parseInt(a.id)); // Sort by ID descending (newest first)

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle column sorting
  const handleSort = (column: 'team' | 'description' | 'lead' | 'members') => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Get sorted teams
  const getSortedTeams = () => {
    if (!sortColumn) return filteredTeams;

    return [...filteredTeams].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'team':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'description':
          aValue = (a.description || '').toLowerCase();
          bValue = (b.description || '').toLowerCase();
          break;
        case 'lead':
          const aLead = a.lead ? members.find(m => m.id === a.lead) : null;
          const bLead = b.lead ? members.find(m => m.id === b.lead) : null;
          aValue = aLead ? aLead.name.toLowerCase() : '';
          bValue = bLead ? bLead.name.toLowerCase() : '';
          break;
        case 'members':
          // Sort by total count (members + lead if not in members)
          let aCount = a.members.length;
          if (a.lead && !a.members.includes(a.lead)) aCount += 1;
          let bCount = b.members.length;
          if (b.lead && !b.members.includes(b.lead)) bCount += 1;
          aValue = aCount;
          bValue = bCount;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Handle member column sorting
  const handleMemberSort = (column: 'name' | 'email' | 'role' | 'status' | 'teams' | 'linemanager') => {
    if (memberSortColumn === column) {
      // Toggle direction if same column
      setMemberSortDirection(memberSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setMemberSortColumn(column);
      setMemberSortDirection('asc');
    }
  };

  // Get filtered and sorted members
  const getSortedMembers = () => {
    // First, filter members based on search text, role, and status
    let filtered = filteredMembers.filter(member => {
      // Search text filter (search in name, email)
      const matchesSearch = memberSearchText.trim() === '' ||
        member.name.toLowerCase().includes(memberSearchText.toLowerCase()) ||
        member.email.toLowerCase().includes(memberSearchText.toLowerCase());

      // Role filter
      const matchesRole = memberFilterRole === '' || member.role === memberFilterRole;

      // Status filter
      const matchesStatus = memberFilterStatus === '' || member.status === memberFilterStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });

    // Then, sort the filtered results
    if (!memberSortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (memberSortColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'role':
          aValue = a.role.toLowerCase();
          bValue = b.role.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'teams':
          aValue = a.teams.length;
          bValue = b.teams.length;
          break;
        case 'linemanager':
          // Sort by line manager name
          const aManager = members.find(m => m.id === a.line_manager);
          const bManager = members.find(m => m.id === b.line_manager);
          aValue = aManager ? aManager.name.toLowerCase() : '';
          bValue = bManager ? bManager.name.toLowerCase() : '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return memberSortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return memberSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !newMemberEmail.trim() || !newMemberPassword.trim()) {
      alert('Please fill in all required fields (name, email, and password)');
      return;
    }

    try {
      // Call API to register new user
      const response = await fetch('http://localhost:8002/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newMemberName.trim(),
          email: newMemberEmail.trim(),
          password: newMemberPassword.trim(),
          role: newMemberRole.toLowerCase(),
          position: newMemberPosition.trim() || undefined,
          line_manager: newMemberLineManager ? parseInt(newMemberLineManager) : undefined,
          status: newMemberStatus,
          start_date: newMemberStartDate || undefined,
          end_date: newMemberStatus === 'inactive' ? newMemberEndDate || undefined : undefined,
          computer: newMemberComputer.trim() || undefined,
          mobile: newMemberMobile.trim() || undefined,
          phone: newMemberPhone.trim() || undefined,
          birthday: newMemberBirthday || undefined,
          disc_type: newMemberDiscType.trim() || undefined,
          personality_type: newMemberPersonalityType.trim() || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create member');
      }

      const newUser = await response.json();

      // Add to local state
      const newMember: Member = {
        id: String(newUser.id),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status || 'active',
        teams: [],
        color: USER_AVATAR_COLOR,
        position: newUser.position,
        line_manager: newUser.line_manager ? String(newUser.line_manager) : undefined,
        start_date: newUser.start_date,
        end_date: newUser.end_date,
        computer: newUser.computer,
        mobile: newUser.mobile,
        phone: newUser.phone,
        birthday: newUser.birthday,
        disc_type: newUser.disc_type,
        personality_type: newUser.personality_type
      };

      const updatedMembers = [...members, newMember];
      setMembers(updatedMembers);

      // Dispatch event to notify other components (like OrgChart) that members have changed
      window.dispatchEvent(new Event('membersChanged'));

      // Reset form
      setNewMemberName('');
      setNewMemberEmail('');
      setNewMemberPassword('');
      setNewMemberRole('Developer');
      setNewMemberPosition('');
      setNewMemberLineManager('');
      setNewMemberStatus('active');
      setNewMemberStartDate('');
      setNewMemberEndDate('');
      setNewMemberComputer('');
      setNewMemberMobile('');
      setNewMemberPhone('');
      setNewMemberBirthday('');
      setNewMemberDiscType('');
      setNewMemberPersonalityType('');
      setShowAddMemberModal(false);

      alert(`✅ Member "${newUser.name}" created successfully!`);
    } catch (error: any) {
      console.error('Failed to create member:', error);
      alert(`❌ Failed to create member: ${error.message}`);
    }
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) {
      alert('Please enter a team name');
      return;
    }

    try {
      const response = await fetch('http://localhost:8002/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTeamName.trim(),
          description: newTeamDescription.trim() || null,
          icon: null,
          lead_id: null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create team');
      }

      const createdTeam = await response.json();

      // Add to local state
      const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#30cfd0', '#a8edea'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newTeam: Team = {
        id: String(createdTeam.id),
        name: createdTeam.name,
        description: createdTeam.description || '',
        members: selectedTeamMembers,
        color: randomColor,
        lead: undefined
      };

      const updatedTeams = [...teams, newTeam];
      setTeams(updatedTeams);

      // Update members' teams array
      const updatedMembers = members.map(member => {
        if (selectedTeamMembers.includes(member.id)) {
          return { ...member, teams: [...member.teams, newTeam.name] };
        }
        return member;
      });
      setMembers(updatedMembers);

      // Reset form
      setNewTeamName('');
      setNewTeamDescription('');
      setSelectedTeamMembers([]);
      setShowAddTeamModal(false);

      alert(`✅ Team "${createdTeam.name}" created successfully!`);
    } catch (error: any) {
      console.error('Failed to create team:', error);
      alert(`❌ Failed to create team: ${error.message}`);
    }
  };

  const handleAddRole = () => {
    if (!newRoleName.trim()) {
      alert('Please enter a role name');
      return;
    }

    const newRole: Role = {
      id: Date.now().toString(),
      name: newRoleName.trim(),
      description: newRoleDescription.trim(),
      permissions: newRolePermissions
    };

    const updatedRoles = [...roles, newRole];
    setRoles(updatedRoles);
    localStorage.setItem('roles', JSON.stringify(updatedRoles));

    // Reset form
    setNewRoleName('');
    setNewRoleDescription('');
    setNewRolePermissions([]);
    setShowAddRoleModal(false);

    console.log('✅ Role created:', newRole.name);
  };

  const handleLoginAs = (member: Member) => {
    if (!confirm(`Login as ${member.name}?\n\nYou will see the system from their perspective.`)) {
      return;
    }

    // Save original user if not already saved
    if (!originalUser && currentUser) {
      localStorage.setItem('originalUser', JSON.stringify(currentUser));
      setOriginalUser(currentUser);
    } else if (!originalUser) {
      const currentUserData = localStorage.getItem('currentUser');
      if (currentUserData) {
        localStorage.setItem('originalUser', currentUserData);
        setOriginalUser(JSON.parse(currentUserData));
      }
    }

    // Switch to new user
    localStorage.setItem('currentUser', JSON.stringify(member));
    setCurrentUser(member);

    alert(`✅ Now logged in as ${member.name}\n\nYou can switch back anytime.`);

    // Reload page to update all components
    window.location.reload();
  };

  const handleSwitchBack = () => {
    if (!originalUser) return;

    if (!confirm(`Switch back to ${originalUser.name}?`)) {
      return;
    }

    // Restore original user
    localStorage.setItem('currentUser', JSON.stringify(originalUser));
    localStorage.removeItem('originalUser');
    setCurrentUser(originalUser);
    setOriginalUser(null);

    alert(`✅ Switched back to ${originalUser.name}`);

    // Reload page to update all components
    window.location.reload();
  };

  const handleShowMemberDetail = (member: Member) => {
    setSelectedMemberDetail(member);
    setShowMemberDetailModal(true);
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
    setEditMemberName(member.name);
    setEditMemberEmail(member.email);
    setEditMemberRole(member.role);
    setEditMemberPosition(member.position || '');
    setEditMemberLineManager(member.line_manager || '');
    setEditMemberStatus(member.status);
    setEditMemberStartDate(member.start_date || '');
    setEditMemberEndDate(member.end_date || '');
    setEditMemberComputer(member.computer || '');
    setEditMemberMobile(member.mobile || '');
    setEditMemberPhone(member.phone || '');
    setEditMemberBirthday(member.birthday || '');
    setEditMemberDiscType(member.disc_type || '');
    setEditMemberPersonalityType(member.personality_type || '');
    setEditMemberPassword(''); // Leave empty - only change if filled
    setShowEditMemberModal(true);
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;

    if (!editMemberName.trim() || !editMemberEmail.trim()) {
      alert('Please fill in name and email');
      return;
    }

    try {
      const updateData: any = {
        name: editMemberName.trim(),
        email: editMemberEmail.trim(),
        role: editMemberRole.toLowerCase(),
        position: editMemberPosition.trim() || null,
        line_manager: editMemberLineManager ? parseInt(editMemberLineManager) : null,
        status: editMemberStatus,
        start_date: editMemberStartDate || null,
        end_date: editMemberStatus === 'inactive' ? editMemberEndDate || null : null,
        computer: editMemberComputer.trim() || null,
        mobile: editMemberMobile.trim() || null,
        phone: editMemberPhone.trim() || null,
        birthday: editMemberBirthday || null,
        disc_type: editMemberDiscType.trim() || null,
        personality_type: editMemberPersonalityType.trim() || null
      };

      // Only include password if it was changed
      if (editMemberPassword.trim()) {
        updateData.password = editMemberPassword.trim();
      }

      const response = await fetch(`http://localhost:8002/api/users/${editingMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update member');
      }

      const updatedUser = await response.json();

      // Update local state
      const updatedMembers = members.map(m =>
        m.id === editingMember.id
          ? {
              ...m,
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.role,
              position: updatedUser.position,
              line_manager: updatedUser.line_manager ? String(updatedUser.line_manager) : undefined,
              status: updatedUser.status,
              start_date: updatedUser.start_date,
              end_date: updatedUser.end_date,
              computer: updatedUser.computer,
              mobile: updatedUser.mobile,
              phone: updatedUser.phone,
              birthday: updatedUser.birthday,
              disc_type: updatedUser.disc_type,
              personality_type: updatedUser.personality_type
            }
          : m
      );
      setMembers(updatedMembers);

      // Dispatch event to notify other components (like OrgChart) that members have changed
      window.dispatchEvent(new Event('membersChanged'));

      setShowEditMemberModal(false);
      setEditingMember(null);
      alert(`✅ Member "${updatedUser.name}" updated successfully!`);
    } catch (error: any) {
      console.error('Failed to update member:', error);
      alert(`❌ Failed to update member: ${error.message}`);
    }
  };

  const handleDeleteMember = async (member: Member) => {
    if (!confirm(`Are you sure you want to delete "${member.name}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8002/api/users/${member.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete member');
      }

      // Remove from local state
      const updatedMembers = members.filter(m => m.id !== member.id);
      setMembers(updatedMembers);

      // Dispatch event to notify other components (like OrgChart) that members have changed
      window.dispatchEvent(new Event('membersChanged'));

      alert(`✅ Member "${member.name}" deleted successfully!`);
    } catch (error: any) {
      console.error('Failed to delete member:', error);
      alert(`❌ Failed to delete member: ${error.message}`);
    }
  };

  const handleToggleStatus = (member: Member) => {
    // Cycle: active → inactive (with end date) → pending → active
    let newStatus: 'active' | 'inactive' | 'pending';

    if (member.status === 'active') {
      newStatus = 'inactive';
    } else if (member.status === 'inactive') {
      newStatus = 'pending';
    } else {
      newStatus = 'active';
    }

    if (newStatus === 'inactive') {
      // Show modal to get end date
      setInactivatingMember(member);
      setInactiveEndDate('');
      setShowSetInactiveModal(true);
    } else {
      // Change to pending or active directly
      handleConfirmStatusChange(member, newStatus, null);
    }
  };

  const handleConfirmStatusChange = async (member: Member, newStatus: 'active' | 'inactive' | 'pending', endDate: string | null) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'inactive' && endDate) {
        updateData.end_date = endDate;
      } else if (newStatus === 'active') {
        updateData.end_date = null; // Clear end_date when changing back to active
      }

      const response = await fetch(`http://localhost:8002/api/users/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update status');
      }

      const updatedMember = await response.json();

      // Update local state
      const updatedMembers = members.map(m =>
        m.id === member.id ? { ...m, status: updatedMember.status, end_date: updatedMember.end_date } : m
      );
      setMembers(updatedMembers);

      // Reload all data to update Team Lead display
      await loadData();

      alert(`✅ ${member.name}'s status updated to ${newStatus.toUpperCase()}`);
    } catch (error: any) {
      console.error('Failed to toggle status:', error);
      alert(`❌ Failed to update status: ${error.message}`);
    }
  };

  const handleSetInactive = () => {
    if (!inactivatingMember || !inactiveEndDate) {
      alert('❌ กรุณาเลือกวันทำงานวันสุดท้าย');
      return;
    }

    setShowSetInactiveModal(false);
    handleConfirmStatusChange(inactivatingMember, 'inactive', inactiveEndDate);
  };

  // Find the next active line manager, recursively climbing the hierarchy
  const findActiveLineManager = (userId: string, visited: Set<string> = new Set()): Member | undefined => {
    // Prevent infinite loops
    if (visited.has(userId)) {
      return undefined;
    }
    visited.add(userId);

    const user = members.find(m => String(m.id) === String(userId));
    if (!user) {
      return undefined;
    }

    // If user is active, return them
    if (user.status === 'active') {
      return user;
    }

    // If user is inactive, climb to their line manager
    if (user.line_manager) {
      return findActiveLineManager(String(user.line_manager), visited);
    }

    // No active manager found
    return undefined;
  };

  const handleAssignLead = (team: Team) => {
    setAssigningTeam(team);
    setSelectedLeadId(team.lead || '');
    setShowAssignLeadModal(true);
  };

  const handleUpdateTeamLead = async () => {
    if (!assigningTeam) return;

    const leadIdToSend = selectedLeadId ? parseInt(selectedLeadId) : null;
    console.log('🔵 Updating team lead:', {
      teamId: assigningTeam.id,
      teamName: assigningTeam.name,
      selectedLeadId,
      leadIdToSend
    });

    try {
      const response = await fetch(`http://localhost:8002/api/teams/${assigningTeam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: assigningTeam.name,
          description: assigningTeam.description || null,
          icon: null,
          lead_id: leadIdToSend
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update team lead');
      }

      const updatedTeam = await response.json();
      console.log('✅ Team updated in DB:', updatedTeam);

      // Reload teams from database to get fresh data
      const teamsResponse = await fetch('http://localhost:8002/api/teams');
      if (teamsResponse.ok) {
        const dbTeams = await teamsResponse.json();
        console.log('📋 Reloaded teams from DB:', dbTeams);

        // Reload all teams with their members
        const reloadedTeams: Team[] = await Promise.all(
          dbTeams.map(async (t: any) => {
            let teamMembers: string[] = [];
            try {
              const membersResponse = await fetch(`http://localhost:8002/api/teams/${t.id}/members`);
              if (membersResponse.ok) {
                const membersList = await membersResponse.json();
                teamMembers = membersList.map((m: any) => String(m.id));
              }
            } catch (error) {
              console.error(`Failed to load members for team ${t.id}:`, error);
            }

            const teamData = {
              id: String(t.id),
              name: t.name,
              description: t.description || '',
              members: teamMembers,
              lead: t.lead_id ? String(t.lead_id) : undefined,
              color: t.color || undefined
            };

            if (String(t.id) === assigningTeam.id) {
              console.log('🔍 Updated team data:', {
                teamId: t.id,
                teamName: t.name,
                lead_id_from_db: t.lead_id,
                lead_after_mapping: teamData.lead
              });
            }

            return teamData;
          })
        );

        console.log('✅ Setting teams state with reloaded data');
        setTeams(reloadedTeams);
      }

      setShowAssignLeadModal(false);
      setAssigningTeam(null);
      setSelectedLeadId('');

      const leadMember = members.find(m => m.id === selectedLeadId);
      alert(`✅ Team lead ${selectedLeadId ? 'updated to ' + leadMember?.name : 'removed'}`);
    } catch (error: any) {
      console.error('❌ Failed to update team lead:', error);
      alert(`❌ Failed to update team lead: ${error.message}`);
    }
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditTeamDescription(team.description);
    setEditTeamMembers(team.members);
    setShowEditTeamModal(true);
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam) return;

    if (!editTeamName.trim()) {
      alert('Please enter a team name');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8002/api/teams/${editingTeam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editTeamName.trim(),
          description: editTeamDescription.trim() || null,
          icon: null,
          lead_id: editingTeam.lead ? parseInt(editingTeam.lead) : null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update team');
      }

      const updatedTeam = await response.json();

      // Update team members in database
      const memberIds = editTeamMembers.map(id => parseInt(id));
      const membersResponse = await fetch(`http://localhost:8002/api/teams/${editingTeam.id}/members`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memberIds)
      });

      if (!membersResponse.ok) {
        throw new Error('Failed to update team members');
      }

      // Update local state
      const updatedTeams = teams.map(t =>
        t.id === editingTeam.id
          ? {
              ...t,
              name: updatedTeam.name,
              description: updatedTeam.description || '',
              members: editTeamMembers
            }
          : t
      );
      setTeams(updatedTeams);

      setShowEditTeamModal(false);
      setEditingTeam(null);
      alert(`✅ Team "${updatedTeam.name}" updated successfully!`);
    } catch (error: any) {
      console.error('Failed to update team:', error);
      alert(`❌ Failed to update team: ${error.message}`);
    }
  };

  const handleRemoveSingleMember = async (team: Team, memberId: string) => {
    try {
      // Remove member from team
      const newMembers = team.members.filter(id => id !== memberId);

      // Update database
      const memberIds = newMembers.map(id => parseInt(id));
      const response = await fetch(`http://localhost:8002/api/teams/${team.id}/members`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memberIds)
      });

      if (!response.ok) {
        throw new Error('Failed to remove team member');
      }

      // Update local state
      const updatedTeams = teams.map(t =>
        t.id === team.id
          ? { ...t, members: newMembers }
          : t
      );
      setTeams(updatedTeams);

    } catch (error: any) {
      console.error('Failed to remove team member:', error);
      alert(`❌ Failed to remove team member: ${error.message}`);
    }
  };

  const handleClearTeamMembers = async (team: Team) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบสมาชิกทั้งหมดออกจากทีม "${team.name}"?`)) {
      return;
    }

    try {
      // Clear all members in database
      const response = await fetch(`http://localhost:8002/api/teams/${team.id}/members`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([])
      });

      if (!response.ok) {
        throw new Error('Failed to clear team members');
      }

      // Update local state
      const updatedTeams = teams.map(t =>
        t.id === team.id
          ? { ...t, members: [] }
          : t
      );
      setTeams(updatedTeams);

      alert(`✅ ลบสมาชิกทั้งหมดจากทีม "${team.name}" สำเร็จ!`);
    } catch (error: any) {
      console.error('Failed to clear team members:', error);
      alert(`❌ Failed to clear team members: ${error.message}`);
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    // Check if team has members
    if (team.members.length > 0) {
      // Show modal to remove members first
      setDeletingTeam(team);
      setShowDeleteTeamMembersModal(true);
    } else {
      // No members, can delete directly
      if (confirm(`Are you sure you want to delete team "${team.name}"?`)) {
        try {
          const response = await fetch(`http://localhost:8002/api/teams/${team.id}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            throw new Error('Failed to delete team');
          }

          // Remove from local state
          const updatedTeams = teams.filter(t => t.id !== team.id);
          setTeams(updatedTeams);

          alert(`✅ Team "${team.name}" deleted successfully!`);
        } catch (error: any) {
          console.error('Failed to delete team:', error);
          alert(`❌ Failed to delete team: ${error.message}`);
        }
      }
    }
  };

  const handleRemoveMemberFromDeletingTeam = async (memberId: string) => {
    if (!deletingTeam) return;

    // Remove member from team
    const updatedMembers = deletingTeam.members.filter(id => id !== memberId);
    const updatedTeam = { ...deletingTeam, members: updatedMembers };

    // Update teams list in local state only (members array is not in database)
    const updatedTeams = teams.map(t =>
      t.id === deletingTeam.id ? updatedTeam : t
    );
    setTeams(updatedTeams);

    // Update local state
    setDeletingTeam(updatedTeam);

    // If no more members, can delete the team
    if (updatedMembers.length === 0) {
      setShowDeleteTeamMembersModal(false);
      if (confirm(`All members removed. Delete team "${deletingTeam.name}" now?`)) {
        try {
          const response = await fetch(`http://localhost:8002/api/teams/${deletingTeam.id}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            throw new Error('Failed to delete team');
          }

          // Remove from local state
          const finalTeams = teams.filter(t => t.id !== deletingTeam.id);
          setTeams(finalTeams);
          setDeletingTeam(null);
          alert(`✅ Team "${deletingTeam.name}" deleted successfully!`);
        } catch (error: any) {
          console.error('Failed to delete team:', error);
          alert(`❌ Failed to delete team: ${error.message}`);
          setDeletingTeam(null);
        }
      } else {
        setDeletingTeam(null);
      }
    }
  };

  return (
    <>
      <style>{`
        .member-avatar-container:hover .delete-member-x {
          display: flex !important;
        }
      `}</style>
      <div className="members-container">
      {/* Impersonation Banner */}
      {originalUser && (
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          padding: '15px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>👤</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px' }}>
                Logged in as: {currentUser?.name}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>
                You are currently viewing the system as this user
              </div>
            </div>
          </div>
          <button
            onClick={handleSwitchBack}
            style={{
              background: 'white',
              color: '#d97706',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          >
            ← Switch back to {originalUser.name}
          </button>
        </div>
      )}

      <div className="page-header">
        <h1>👥 Members & Teams</h1>
        <p style={{ color: '#6b7280', marginTop: '8px' }}>
          Manage your team members, teams, and roles
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => { setActiveTab('members'); setSearchTerm(''); }}
        >
          👤 Members <span style={{
            marginLeft: '6px',
            padding: '2px 8px',
            background: activeTab === 'members' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {members.length}
          </span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => { setActiveTab('teams'); setSearchTerm(''); }}
        >
          👥 Teams <span style={{
            marginLeft: '6px',
            padding: '2px 8px',
            background: activeTab === 'teams' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {teams.length}
          </span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => { setActiveTab('roles'); setSearchTerm(''); }}
        >
          🔐 Roles <span style={{
            marginLeft: '6px',
            padding: '2px 8px',
            background: activeTab === 'roles' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {roles.length}
          </span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'lookingfor' ? 'active' : ''}`}
          onClick={() => { setActiveTab('lookingfor'); setSearchTerm(''); }}
        >
          🔍 Looking for <span style={{
            marginLeft: '6px',
            padding: '2px 8px',
            background: activeTab === 'lookingfor' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {draftHeadcount.length}
          </span>
        </button>
      </div>

      {/* Actions Bar */}
      <div className="actions-bar">
        {activeTab === 'members' ? (
          <>
            {/* Member-specific filters */}
            <input
              type="text"
              className="search-box"
              placeholder="🔍 Search members by name or email..."
              value={memberSearchText}
              onChange={(e) => setMemberSearchText(e.target.value)}
              style={{ flex: '1', minWidth: '200px' }}
            />
            <select
              value={memberFilterStatus}
              onChange={(e) => setMemberFilterStatus(e.target.value)}
              style={{
                padding: '10px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#374151',
                background: 'white',
                cursor: 'pointer',
                minWidth: '120px'
              }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {(memberSearchText || memberFilterRole || memberFilterStatus) && (
              <button
                onClick={() => {
                  setMemberSearchText('');
                  setMemberFilterRole('');
                  setMemberFilterStatus('');
                }}
                style={{
                  padding: '10px 16px',
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                ✕ Clear
              </button>
            )}

            {/* Column Selector */}
            <div className="column-selector-container" style={{ position: 'relative' }}>
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                style={{
                  padding: '10px 16px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                <span>⚙️</span>
                <span>Columns</span>
              </button>

              {showColumnSelector && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  padding: '12px',
                  minWidth: '220px',
                  zIndex: 1000
                }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '10px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    Show/Hide Columns
                  </div>
                  {allColumns.map(column => (
                    <label
                      key={column.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        cursor: column.required ? 'not-allowed' : 'pointer',
                        borderRadius: '6px',
                        transition: 'background 0.2s',
                        opacity: column.required ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!column.required) {
                          e.currentTarget.style.background = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(column.id)}
                        onChange={() => toggleColumn(column.id)}
                        disabled={column.required}
                        style={{
                          marginRight: '8px',
                          cursor: column.required ? 'not-allowed' : 'pointer'
                        }}
                      />
                      <span style={{
                        fontSize: '13px',
                        color: '#374151'
                      }}>
                        {column.label}
                        {column.required && (
                          <span style={{
                            marginLeft: '4px',
                            fontSize: '11px',
                            color: '#9ca3af'
                          }}>
                            (required)
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <input
            type="text"
            className="search-box"
            placeholder={`🔍 Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        )}
        <button className="add-btn" onClick={() => {
          if (activeTab === 'members') {
            setShowAddMemberModal(true);
          } else if (activeTab === 'teams') {
            setShowAddTeamModal(true);
          } else if (activeTab === 'roles') {
            setShowAddRoleModal(true);
          }
        }}>
          ➕ Add {activeTab === 'members' ? 'Member' : activeTab === 'teams' ? 'Team' : 'Role'}
        </button>
        {activeTab === 'teams' && (
          <button
            onClick={migrateFromLocalStorage}
            style={{
              padding: '10px 20px',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#d97706'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f59e0b'}
            title="Migrate team lead data from localStorage to database"
          >
            🔄 Migrate from localStorage
          </button>
        )}
      </div>

      {/* Role Filter Tabs - Only show in Members tab */}
      {activeTab === 'members' && (
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '16px 24px',
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          overflowX: 'auto',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setMemberFilterRole('')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: memberFilterRole === '' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
              color: memberFilterRole === '' ? 'white' : '#6b7280',
              boxShadow: memberFilterRole === '' ? '0 4px 6px rgba(102, 126, 234, 0.4)' : '0 1px 3px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              if (memberFilterRole !== '') {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (memberFilterRole !== '') {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            All
            <span style={{
              marginLeft: '6px',
              padding: '2px 8px',
              background: memberFilterRole === '' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {members.length}
            </span>
          </button>
          {Array.from(new Set(members.map(m => m.role))).sort().map(role => {
            const roleCount = members.filter(m => m.role === role).length;
            return (
              <button
                key={role}
                onClick={() => setMemberFilterRole(role)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: memberFilterRole === role ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                  color: memberFilterRole === role ? 'white' : '#6b7280',
                  boxShadow: memberFilterRole === role ? '0 4px 6px rgba(102, 126, 234, 0.4)' : '0 1px 3px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  if (memberFilterRole !== role) {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.color = '#374151';
                  }
                }}
                onMouseLeave={(e) => {
                  if (memberFilterRole !== role) {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#6b7280';
                  }
                }}
              >
                {role}
                <span style={{
                  marginLeft: '6px',
                  padding: '2px 8px',
                  background: memberFilterRole === role ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {roleCount}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {getSortedMembers().length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
              <p>No members found</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  {visibleColumns.includes('name') && (
                    <th
                      onClick={() => handleMemberSort('name')}
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '14px',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      Member {memberSortColumn === 'name' && (memberSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  )}
                  {visibleColumns.includes('email') && (
                    <th
                      onClick={() => handleMemberSort('email')}
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '14px',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      Email {memberSortColumn === 'email' && (memberSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  )}
                  {visibleColumns.includes('role') && (
                    <th
                      onClick={() => handleMemberSort('role')}
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '14px',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      Role {memberSortColumn === 'role' && (memberSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  )}
                  {visibleColumns.includes('status') && (
                    <th
                      onClick={() => handleMemberSort('status')}
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '14px',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      Status {memberSortColumn === 'status' && (memberSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  )}
                  {visibleColumns.includes('effectiveDate') && (
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '14px'
                      }}
                    >
                      Effective Date
                    </th>
                  )}
                  {visibleColumns.includes('teams') && (
                    <th
                      onClick={() => handleMemberSort('teams')}
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '14px',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      Teams {memberSortColumn === 'teams' && (memberSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  )}
                  {visibleColumns.includes('lineManager') && (
                    <th
                      onClick={() => handleMemberSort('linemanager')}
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '14px',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      Line Manager {memberSortColumn === 'linemanager' && (memberSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  )}
                  {visibleColumns.includes('mobile') && (
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '14px'
                      }}
                    >
                      Mobile
                    </th>
                  )}
                  {visibleColumns.includes('phone') && (
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '14px'
                      }}
                    >
                      Phone
                    </th>
                  )}
                  {visibleColumns.includes('computer') && (
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '14px'
                      }}
                    >
                      Computer
                    </th>
                  )}
                  {visibleColumns.includes('birthday') && (
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '14px'
                      }}
                    >
                      Birthday
                    </th>
                  )}
                  {visibleColumns.includes('disc_type') && (
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '14px'
                      }}
                    >
                      DISC Type
                    </th>
                  )}
                  {visibleColumns.includes('personality_type') && (
                    <th
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '14px'
                      }}
                    >
                      16 Personalities
                    </th>
                  )}
                  {visibleColumns.includes('actions') && currentUser?.role?.toLowerCase() === 'admin' && (
                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {getSortedMembers().map((member, index) => {
                  const isCurrentUser = currentUser?.email === member.email;
                  const isOriginalUser = originalUser?.email === member.email;

                  return (
                    <tr
                      key={member.id}
                      style={{ borderBottom: '1px solid #e5e7eb', transition: 'background 0.2s', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      onClick={() => handleShowMemberDetail(member)}
                    >
                      {/* Member Name & Avatar */}
                      {visibleColumns.includes('name') && (
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: member.color || '#667eea',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 600,
                              fontSize: '14px'
                            }}>
                              {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>
                                {member.name}
                                {isCurrentUser && (
                                  <span style={{
                                    marginLeft: '8px',
                                    fontSize: '11px',
                                    background: '#10b981',
                                    color: 'white',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontWeight: 600
                                  }}>
                                    YOU
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Email */}
                      {visibleColumns.includes('email') && (
                        <td style={{ padding: '16px' }}>
                          <span style={{ color: '#374151', fontSize: '13px' }}>
                            {member.email}
                          </span>
                        </td>
                      )}

                      {/* Role */}
                      {visibleColumns.includes('role') && (
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            padding: '4px 12px',
                            background: '#ede9fe',
                            color: '#7c3aed',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: 500
                          }}>
                            {member.role}
                          </span>
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.includes('status') && (
                        <td style={{ padding: '16px' }}>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            currentUser?.role?.toLowerCase() === 'admin' && handleToggleStatus(member);
                          }}
                          style={{
                            padding: '4px 12px',
                            background: member.status === 'active' ? '#d1fae5' : member.status === 'pending' ? '#fef3c7' : '#fee2e2',
                            color: member.status === 'active' ? '#065f46' : member.status === 'pending' ? '#92400e' : '#991b1b',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: currentUser?.role?.toLowerCase() === 'admin' ? 'pointer' : 'default',
                            transition: 'all 0.2s',
                            display: 'inline-block'
                          }}
                          onMouseEnter={(e) => {
                            if (currentUser?.role?.toLowerCase() === 'admin') {
                              e.currentTarget.style.transform = 'scale(1.05)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (currentUser?.role?.toLowerCase() === 'admin') {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = 'none';
                            }
                          }}
                          title={currentUser?.role?.toLowerCase() === 'admin' ? 'Click to toggle status' : ''}
                        >
                          {member.status === 'active' ? '🟢 Active' : member.status === 'pending' ? '🟡 Pending' : '🔴 Inactive'}
                        </span>
                        </td>
                      )}

                      {/* Effective Date */}
                      {visibleColumns.includes('effectiveDate') && (
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontSize: '13px', color: '#374151' }}>
                            {member.start_date && (
                              <div>
                                <span style={{ fontWeight: 500 }}>Start:</span> {new Date(member.start_date).toLocaleDateString('th-TH')}
                              </div>
                            )}
                            {member.status === 'inactive' && member.end_date && (
                              <div style={{ color: '#ef4444', marginTop: '4px' }}>
                                <span style={{ fontWeight: 500 }}>End:</span> {new Date(member.end_date).toLocaleDateString('th-TH')}
                              </div>
                            )}
                            {!member.start_date && !member.end_date && (
                              <span style={{ color: '#9ca3af' }}>—</span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Teams */}
                      {visibleColumns.includes('teams') && (
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {member.teams.length > 0 ? (
                              member.teams.map((team, idx) => (
                                <span key={idx} style={{
                                  padding: '3px 10px',
                                  background: '#e0e7ff',
                                  color: '#3730a3',
                                  borderRadius: '10px',
                                  fontSize: '12px',
                                  fontWeight: 500
                                }}>
                                  {team}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: '13px' }}>—</span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Line Manager */}
                      {visibleColumns.includes('lineManager') && (
                        <td style={{ padding: '16px' }}>
                          {member.line_manager ? (
                            <span style={{ color: '#374151', fontSize: '13px', fontWeight: 500 }}>
                              {members.find(m => m.id === member.line_manager)?.name || '—'}
                            </span>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '13px' }}>—</span>
                          )}
                        </td>
                      )}

                      {/* Mobile */}
                      {visibleColumns.includes('mobile') && (
                        <td style={{ padding: '16px' }}>
                          <span style={{ color: '#374151', fontSize: '13px' }}>
                            {member.mobile || <span style={{ color: '#9ca3af' }}>—</span>}
                          </span>
                        </td>
                      )}

                      {/* Phone */}
                      {visibleColumns.includes('phone') && (
                        <td style={{ padding: '16px' }}>
                          <span style={{ color: '#374151', fontSize: '13px' }}>
                            {member.phone || <span style={{ color: '#9ca3af' }}>—</span>}
                          </span>
                        </td>
                      )}

                      {/* Computer */}
                      {visibleColumns.includes('computer') && (
                        <td style={{ padding: '16px' }}>
                          <span style={{ color: '#374151', fontSize: '13px' }}>
                            {member.computer || <span style={{ color: '#9ca3af' }}>—</span>}
                          </span>
                        </td>
                      )}

                      {/* Birthday */}
                      {visibleColumns.includes('birthday') && (
                        <td style={{ padding: '16px' }}>
                          <span style={{ color: '#374151', fontSize: '13px' }}>
                            {member.birthday ? new Date(member.birthday).toLocaleDateString('th-TH') : <span style={{ color: '#9ca3af' }}>—</span>}
                          </span>
                        </td>
                      )}

                      {/* DISC Type */}
                      {visibleColumns.includes('disc_type') && (
                        <td style={{ padding: '16px' }}>
                          <span style={{ color: '#374151', fontSize: '13px', fontWeight: 600 }}>
                            {member.disc_type || <span style={{ color: '#9ca3af', fontWeight: 400 }}>—</span>}
                          </span>
                        </td>
                      )}

                      {/* 16 Personalities */}
                      {visibleColumns.includes('personality_type') && (
                        <td style={{ padding: '16px' }}>
                          <span style={{ color: '#374151', fontSize: '13px', fontWeight: 600 }}>
                            {member.personality_type || <span style={{ color: '#9ca3af', fontWeight: 400 }}>—</span>}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.includes('actions') && currentUser?.role?.toLowerCase() === 'admin' && (
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditMember(member);
                              }}
                              style={{
                                padding: '6px 12px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                              title="Edit member"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMember(member);
                              }}
                              style={{
                                padding: '6px 12px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                              title="Delete member"
                            >
                              🗑️
                            </button>
                            {!isOriginalUser && !isCurrentUser && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoginAs(member);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  background: '#667eea',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#5558d1'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
                                title="Login as this user"
                              >
                                👤
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {filteredTeams.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
              <p>No teams found</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th
                    onClick={() => handleSort('team')}
                    style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#374151',
                      fontSize: '14px',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Team {sortColumn === 'team' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('description')}
                    style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#374151',
                      fontSize: '14px',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Description {sortColumn === 'description' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('lead')}
                    style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#374151',
                      fontSize: '14px',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Team Lead {sortColumn === 'lead' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('members')}
                    style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#374151',
                      fontSize: '14px',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Members {sortColumn === 'members' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getSortedTeams().map(team => (
                  <tr key={team.id} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    {/* Team Name */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>
                          {team.name}
                        </div>
                        <div
                          onClick={() => handleEditTeam(team)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            background: team.color || '#667eea',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          title="Click to view team members"
                        >
                          <span>👥</span>
                          <span>
                            {(() => {
                              // Count members
                              let count = team.members.length;
                              // If lead exists and is NOT in members, add 1
                              if (team.lead && !team.members.includes(team.lead)) {
                                count += 1;
                              }
                              return count;
                            })()}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                      {team.description || '—'}
                    </td>

                    {/* Team Lead */}
                    <td style={{ padding: '16px' }}>
                      {(() => {
                        // Find active team lead, handling inactive leads
                        let lead = team.lead ? members.find(m => m.id === team.lead) : null;
                        let isActualLead = true;

                        // If lead is inactive, find their active line manager
                        if (lead && lead.status === 'inactive' && lead.line_manager) {
                          const activeLead = findActiveLineManager(String(lead.line_manager));
                          if (activeLead) {
                            lead = activeLead;
                            isActualLead = false;
                          } else {
                            lead = null; // No active manager found
                          }
                        }

                        // If no lead, try to find line manager from first member
                        if (!lead && team.members.length > 0) {
                          const firstMember = members.find(m => m.id === team.members[0]);
                          const lineManager = firstMember?.line_manager ? findActiveLineManager(String(firstMember.line_manager)) : null;

                          if (lineManager) {
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  padding: '4px 10px',
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  borderRadius: '10px',
                                  fontSize: '13px',
                                  fontWeight: 500
                                }}>
                                  📊 {lineManager.name}
                                </span>
                                <span style={{ fontSize: '11px', color: '#9ca3af' }}>(Line Manager)</span>
                                <button
                                  onClick={() => handleAssignLead(team)}
                                  style={{
                                    padding: '4px 8px',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    transition: 'background 0.2s',
                                    marginLeft: '8px'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                                  title="Assign team lead"
                                >
                                  Change
                                </button>
                              </div>
                            );
                          }
                        }

                        if (lead) {
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {/* Lead Avatar with Crown */}
                              <div
                                onClick={() => handleAssignLead(team)}
                                style={{
                                  position: 'relative',
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  background: lead.color || '#fbbf24',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  border: '3px solid #fbbf24',
                                  boxShadow: '0 4px 8px rgba(251, 191, 36, 0.3)',
                                  cursor: 'pointer',
                                  transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.1)';
                                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(251, 191, 36, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(251, 191, 36, 0.3)';
                                }}
                                title={`Team Lead: ${lead.name} (click to change)`}
                              >
                                {lead.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}

                                {/* Crown icon */}
                                <div style={{
                                  position: 'absolute',
                                  top: '-6px',
                                  right: '-6px',
                                  fontSize: '18px',
                                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                                }}>
                                  👑
                                </div>
                              </div>

                              {/* Lead name text */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: '#166534'
                                }}>
                                  {lead.name}
                                </span>
                                {!isActualLead && (
                                  <span style={{
                                    fontSize: '10px',
                                    color: '#9ca3af',
                                    fontStyle: 'italic'
                                  }}>
                                    (Acting - Lead inactive)
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // No lead assigned - show button instead of text
                        return (
                          <button
                            onClick={() => handleAssignLead(team)}
                            style={{
                              padding: '6px 12px',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: 500,
                              transition: 'background 0.2s',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                            title="Assign team lead"
                          >
                            ⭐ Assign Lead
                          </button>
                        );
                      })()}
                    </td>

                    {/* Members */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {/* Member Avatars with hover effects */}
                        {team.members.slice(0, 5).map((memberId, idx) => {
                          const member = members.find(m => m.id === memberId);
                          if (!member) return null;

                          return (
                            <div
                              key={idx}
                              className="member-avatar-container"
                              onClick={() => handleEditTeam(team)}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: member.color || '#667eea',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: '2px solid white',
                                marginLeft: idx > 0 ? '-8px' : '0',
                                position: 'relative',
                                zIndex: 5 - idx,
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s'
                              }}
                              title={member.name}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.1)';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                                e.currentTarget.style.zIndex = '10';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.zIndex = String(5 - idx);
                              }}
                            >
                              {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}

                              {/* Red X button on hover - top right corner */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSingleMember(team, memberId);
                                }}
                                className="delete-member-x"
                                style={{
                                  position: 'absolute',
                                  top: '-4px',
                                  right: '-4px',
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  background: '#ef4444',
                                  color: 'white',
                                  display: 'none',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  border: '2px solid white',
                                  zIndex: 20
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#dc2626';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#ef4444';
                                }}
                              >
                                ×
                              </div>
                            </div>
                          );
                        })}

                        {/* Show +N if more than 5 members */}
                        {team.members.length > 5 && (
                          <div
                            onClick={() => handleEditTeam(team)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#f3f4f6',
                              color: '#6b7280',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 600,
                              border: '2px solid white',
                              marginLeft: '-8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            title={`+${team.members.length - 5} more members`}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.1)';
                              e.currentTarget.style.background = '#e5e7eb';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.background = '#f3f4f6';
                            }}
                          >
                            +{team.members.length - 5}
                          </div>
                        )}

                        {/* Add Member Button - Dashed circle with + */}
                        <div
                          onClick={() => handleEditTeam(team)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: '2px dashed #d1d5db',
                            background: 'transparent',
                            color: '#9ca3af',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            marginLeft: team.members.length > 0 ? '4px' : '0'
                          }}
                          title="เพิ่มสมาชิก"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#9ca3af';
                            e.currentTarget.style.background = '#f9fafb';
                            e.currentTarget.style.color = '#3b82f6';
                            e.currentTarget.style.transform = 'scale(1.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#d1d5db';
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#9ca3af';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          +
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleEditTeam(team)}
                          style={{
                            padding: '6px 12px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                          title="Edit team"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team)}
                          style={{
                            padding: '6px 12px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                          title="Delete team"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {filteredRoles.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
              <p>No roles found</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Role</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Description</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Permissions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.map(role => (
                  <tr key={role.id} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    {/* Role Name */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px'
                        }}>
                          🔐
                        </div>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>
                          {role.name}
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                      {role.description || '—'}
                    </td>

                    {/* Permissions */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{
                          padding: '3px 10px',
                          background: '#dbeafe',
                          color: '#1e40af',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          {role.permissions.length} {role.permissions.length === 1 ? 'permission' : 'permissions'}
                        </span>
                        {role.permissions.map((perm, idx) => (
                          <span key={idx} style={{
                            padding: '3px 10px',
                            background: '#fef3c7',
                            color: '#92400e',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 500
                          }}>
                            {perm}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Looking for Tab */}
      {activeTab === 'lookingfor' && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {draftHeadcount.filter(draft => {
            // Filter by search term
            const matchesSearch = draft.position_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              draft.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              draft.description?.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            // Exclude positions that have been named (not vacant anymore)
            const title = draft.position_title || '';
            const isVacant = title.toLowerCase().includes('vacancy') ||
                            title.toLowerCase().includes('unnamed') ||
                            title.toLowerCase().includes('ไม่มีชื่อ') ||
                            title.toLowerCase().includes('ว่าง') ||
                            title.toLowerCase().includes('position');

            const jobKeywords = ['engineer', 'developer', 'manager', 'lead', 'senior', 'junior',
                                 'designer', 'analyst', 'specialist', 'coordinator', 'director',
                                 'architect', 'admin', 'officer', 'executive', 'assistant',
                                 'วิศวกร', 'ผู้จัดการ', 'หัวหน้า', 'ผู้เชี่ยวชาญ', 'ผู้ช่วย'];
            const isJobTitle = jobKeywords.some(keyword => title.toLowerCase().includes(keyword));

            return isVacant || isJobTitle;
          }).length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <p>No open positions found</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Position</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Department</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Line Manager</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Created</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {draftHeadcount.filter(draft => {
                  // Filter by search term
                  const matchesSearch = draft.position_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    draft.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    draft.description?.toLowerCase().includes(searchTerm.toLowerCase());

                  if (!matchesSearch) return false;

                  // Exclude positions that have been named (not vacant anymore)
                  const title = draft.position_title || '';
                  const isVacant = title.toLowerCase().includes('vacancy') ||
                                  title.toLowerCase().includes('unnamed') ||
                                  title.toLowerCase().includes('ไม่มีชื่อ') ||
                                  title.toLowerCase().includes('ว่าง') ||
                                  title.toLowerCase().includes('position');

                  const jobKeywords = ['engineer', 'developer', 'manager', 'lead', 'senior', 'junior',
                                       'designer', 'analyst', 'specialist', 'coordinator', 'director',
                                       'architect', 'admin', 'officer', 'executive', 'assistant',
                                       'วิศวกร', 'ผู้จัดการ', 'หัวหน้า', 'ผู้เชี่ยวชาญ', 'ผู้ช่วย'];
                  const isJobTitle = jobKeywords.some(keyword => title.toLowerCase().includes(keyword));

                  return isVacant || isJobTitle;
                }).map(draft => {
                  const manager = members.find(m => m.id === String(draft.line_manager));
                  return (
                    <tr key={draft.id} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: 600
                          }}>
                            V
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>
                              {draft.position_title}
                            </div>
                            {draft.description && (
                              <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>
                                {draft.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                        {draft.department || '—'}
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                        {manager ? manager.name : '—'}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 12px',
                          background: draft.status === 'open' ? '#dcfce7' : '#fef3c7',
                          color: draft.status === 'open' ? '#166534' : '#92400e',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          {draft.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                        {new Date(draft.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <button
                          onClick={() => deleteDraftHeadcount(draft.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            margin: '0 auto'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content small">
            <span className="close-assignee" onClick={() => setShowAddMemberModal(false)}>&times;</span>
            <h3>➕ Add New Member</h3>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Name *
              </label>
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Enter member name"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Email *
              </label>
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="Enter email address"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Password *
              </label>
              <input
                type="password"
                value={newMemberPassword}
                onChange={(e) => setNewMemberPassword(e.target.value)}
                placeholder="Enter password (min 6 characters)"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Role
              </label>
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              >
                {roles.map(role => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Position Level
              </label>
              <select
                value={newMemberPosition}
                onChange={(e) => setNewMemberPosition(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              >
                <option value="">-- No Position Level --</option>
                <option value="Lead">Lead</option>
                <option value="Manager">Manager</option>
                <option value="Head of Department">Head of Department</option>
              </select>

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Line Manager (Lead)
              </label>
              <select
                value={newMemberLineManager}
                onChange={(e) => setNewMemberLineManager(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              >
                <option value="">-- No Line Manager --</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Status
              </label>
              <select
                value={newMemberStatus}
                onChange={(e) => setNewMemberStatus(e.target.value as 'active' | 'inactive')}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Start Date (วันเริ่มงาน) *
              </label>
              <input
                type="date"
                value={newMemberStartDate}
                onChange={(e) => setNewMemberStartDate(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              {newMemberStatus === 'inactive' && (
                <>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    End Date (วันทำงานวันสุดท้าย)
                  </label>
                  <input
                    type="date"
                    value={newMemberEndDate}
                    onChange={(e) => setNewMemberEndDate(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
                  />
                </>
              )}

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Computer (คอมพิวเตอร์)
              </label>
              <input
                type="text"
                value={newMemberComputer}
                onChange={(e) => setNewMemberComputer(e.target.value)}
                placeholder="Enter computer/device info"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Mobile (มือถือ)
              </label>
              <input
                type="text"
                value={newMemberMobile}
                onChange={(e) => setNewMemberMobile(e.target.value)}
                placeholder="Enter mobile number"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Phone (เบอร์โทร)
              </label>
              <input
                type="text"
                value={newMemberPhone}
                onChange={(e) => setNewMemberPhone(e.target.value)}
                placeholder="Enter phone number"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Birthday (วันเกิด)
              </label>
              <input
                type="date"
                value={newMemberBirthday}
                onChange={(e) => setNewMemberBirthday(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                DISC Type
              </label>
              <input
                type="text"
                value={newMemberDiscType}
                onChange={(e) => setNewMemberDiscType(e.target.value)}
                placeholder="e.g., D, I, S, C, Di, Sc"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                16 Personalities Type
              </label>
              <input
                type="text"
                value={newMemberPersonalityType}
                onChange={(e) => setNewMemberPersonalityType(e.target.value)}
                placeholder="e.g., INTJ, ENFP, ISTJ"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '20px' }}
              />
            </div>

            <div className="confirm-buttons">
              <button className="btn-secondary" onClick={() => setShowAddMemberModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddMember}>
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditMemberModal && editingMember && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content small">
            <span className="close-assignee" onClick={() => setShowEditMemberModal(false)}>&times;</span>
            <h3>✏️ Edit Member</h3>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Name *
              </label>
              <input
                type="text"
                value={editMemberName}
                onChange={(e) => setEditMemberName(e.target.value)}
                placeholder="Enter member name"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Email *
              </label>
              <input
                type="email"
                value={editMemberEmail}
                onChange={(e) => setEditMemberEmail(e.target.value)}
                placeholder="Enter email address"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Password
              </label>
              <input
                type="password"
                value={editMemberPassword}
                onChange={(e) => setEditMemberPassword(e.target.value)}
                placeholder="Leave empty to keep current password"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '-10px', marginBottom: '15px' }}>
                💡 Only fill this if you want to change the password
              </p>

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Role
              </label>
              <select
                value={editMemberRole}
                onChange={(e) => setEditMemberRole(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              >
                {roles.map(role => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Position Level
              </label>
              <select
                value={editMemberPosition}
                onChange={(e) => setEditMemberPosition(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              >
                <option value="">-- No Position Level --</option>
                <option value="Lead">Lead</option>
                <option value="Manager">Manager</option>
                <option value="Head of Department">Head of Department</option>
              </select>

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Line Manager
              </label>
              <select
                value={editMemberLineManager}
                onChange={(e) => setEditMemberLineManager(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              >
                <option value="">-- No Line Manager --</option>
                {members
                  .filter(m => m.id !== editingMember?.id) // Don't allow selecting self
                  .map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.position || member.role})
                    </option>
                  ))}
              </select>

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Status
              </label>
              <select
                value={editMemberStatus}
                onChange={(e) => setEditMemberStatus(e.target.value as 'active' | 'inactive')}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Start Date (วันเริ่มงาน)
              </label>
              <input
                type="date"
                value={editMemberStartDate}
                onChange={(e) => setEditMemberStartDate(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              {editMemberStatus === 'inactive' && (
                <>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    End Date (วันทำงานวันสุดท้าย)
                  </label>
                  <input
                    type="date"
                    value={editMemberEndDate}
                    onChange={(e) => setEditMemberEndDate(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
                  />
                </>
              )}

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Computer (คอมพิวเตอร์)
              </label>
              <input
                type="text"
                value={editMemberComputer}
                onChange={(e) => setEditMemberComputer(e.target.value)}
                placeholder="Enter computer/device info"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Mobile (มือถือ)
              </label>
              <input
                type="text"
                value={editMemberMobile}
                onChange={(e) => setEditMemberMobile(e.target.value)}
                placeholder="Enter mobile number"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Phone (เบอร์โทร)
              </label>
              <input
                type="text"
                value={editMemberPhone}
                onChange={(e) => setEditMemberPhone(e.target.value)}
                placeholder="Enter phone number"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Birthday (วันเกิด)
              </label>
              <input
                type="date"
                value={editMemberBirthday}
                onChange={(e) => setEditMemberBirthday(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                DISC Type
              </label>
              <input
                type="text"
                value={editMemberDiscType}
                onChange={(e) => setEditMemberDiscType(e.target.value)}
                placeholder="e.g., D, I, S, C, Di, Sc"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                16 Personalities Type
              </label>
              <input
                type="text"
                value={editMemberPersonalityType}
                onChange={(e) => setEditMemberPersonalityType(e.target.value)}
                placeholder="e.g., INTJ, ENFP, ISTJ"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '20px' }}
              />
            </div>

            <div className="confirm-buttons">
              <button className="btn-secondary" onClick={() => setShowEditMemberModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleUpdateMember}>
                Update Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Detail Modal */}
      {showMemberDetailModal && selectedMemberDetail && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content small">
            <span className="close-assignee" onClick={() => setShowMemberDetailModal(false)}>&times;</span>
            <h3>👤 Member Details</h3>

            <div style={{ marginTop: '20px' }}>
              {/* Member Name & Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '16px', background: '#f9fafb', borderRadius: '12px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: selectedMemberDetail.color || '#667eea',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '24px'
                }}>
                  {selectedMemberDetail.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>{selectedMemberDetail.name}</h4>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <span style={{
                      padding: '3px 10px',
                      background: '#ede9fe',
                      color: '#7c3aed',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 500
                    }}>
                      {selectedMemberDetail.role}
                    </span>
                    <span style={{
                      padding: '3px 10px',
                      background: selectedMemberDetail.status === 'active' ? '#d1fae5' : '#fee2e2',
                      color: selectedMemberDetail.status === 'active' ? '#065f46' : '#991b1b',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 500
                    }}>
                      {selectedMemberDetail.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📧 Contact Information
                </h5>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', padding: '8px', borderRadius: '6px', background: '#f9fafb' }}>
                    <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '100px' }}>Email:</span>
                    <span style={{ color: '#111827' }}>{selectedMemberDetail.email}</span>
                  </div>
                  {selectedMemberDetail.mobile && (
                    <div style={{ display: 'flex', padding: '8px', borderRadius: '6px', background: '#f9fafb' }}>
                      <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '100px' }}>Mobile:</span>
                      <span style={{ color: '#111827' }}>{selectedMemberDetail.mobile}</span>
                    </div>
                  )}
                  {selectedMemberDetail.phone && (
                    <div style={{ display: 'flex', padding: '8px', borderRadius: '6px', background: '#f9fafb' }}>
                      <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '100px' }}>Phone:</span>
                      <span style={{ color: '#111827' }}>{selectedMemberDetail.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Work Information */}
              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  💼 Work Information
                </h5>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {selectedMemberDetail.position && (
                    <div style={{ display: 'flex', padding: '8px', borderRadius: '6px', background: '#f9fafb' }}>
                      <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '100px' }}>Position:</span>
                      <span style={{ color: '#111827' }}>{selectedMemberDetail.position}</span>
                    </div>
                  )}
                  {selectedMemberDetail.line_manager && (
                    <div style={{ display: 'flex', padding: '8px', borderRadius: '6px', background: '#f9fafb' }}>
                      <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '100px' }}>Line Manager:</span>
                      <span style={{ color: '#111827' }}>
                        {members.find(m => m.id === selectedMemberDetail.line_manager)?.name || '—'}
                      </span>
                    </div>
                  )}
                  {selectedMemberDetail.computer && (
                    <div style={{ display: 'flex', padding: '8px', borderRadius: '6px', background: '#f9fafb' }}>
                      <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '100px' }}>Computer:</span>
                      <span style={{ color: '#111827' }}>{selectedMemberDetail.computer}</span>
                    </div>
                  )}
                  {selectedMemberDetail.start_date && (
                    <div style={{ display: 'flex', padding: '8px', borderRadius: '6px', background: '#f9fafb' }}>
                      <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '100px' }}>Start Date:</span>
                      <span style={{ color: '#111827' }}>{new Date(selectedMemberDetail.start_date).toLocaleDateString('th-TH')}</span>
                    </div>
                  )}
                  {selectedMemberDetail.end_date && (
                    <div style={{ display: 'flex', padding: '8px', borderRadius: '6px', background: '#f9fafb' }}>
                      <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '100px' }}>End Date:</span>
                      <span style={{ color: '#ef4444' }}>{new Date(selectedMemberDetail.end_date).toLocaleDateString('th-TH')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Information */}
              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🎂 Personal Information
                </h5>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {selectedMemberDetail.birthday && (
                    <div style={{ display: 'flex', padding: '8px', borderRadius: '6px', background: '#f9fafb' }}>
                      <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '100px' }}>Birthday:</span>
                      <span style={{ color: '#111827' }}>{new Date(selectedMemberDetail.birthday).toLocaleDateString('th-TH')}</span>
                    </div>
                  )}
                  {selectedMemberDetail.disc_type && (
                    <div style={{ display: 'flex', padding: '8px', borderRadius: '6px', background: '#f9fafb' }}>
                      <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '100px' }}>DISC Type:</span>
                      <span style={{ color: '#111827', fontWeight: 600, fontSize: '16px' }}>{selectedMemberDetail.disc_type}</span>
                    </div>
                  )}
                  {selectedMemberDetail.personality_type && (
                    <div style={{ display: 'flex', padding: '8px', borderRadius: '6px', background: '#f9fafb' }}>
                      <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '100px' }}>16 Personalities:</span>
                      <span style={{ color: '#111827', fontWeight: 600, fontSize: '16px' }}>{selectedMemberDetail.personality_type}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Teams */}
              {selectedMemberDetail.teams && selectedMemberDetail.teams.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    👥 Teams
                  </h5>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedMemberDetail.teams.map((team, idx) => (
                      <span key={idx} style={{
                        padding: '6px 12px',
                        background: '#e0e7ff',
                        color: '#3730a3',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 500
                      }}>
                        {team}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="confirm-buttons">
              <button className="btn-secondary" onClick={() => setShowMemberDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Inactive Modal */}
      {showSetInactiveModal && inactivatingMember && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content small">
            <span className="close-assignee" onClick={() => setShowSetInactiveModal(false)}>&times;</span>
            <h3>⚠️ Set {inactivatingMember.name} to Inactive</h3>

            <div style={{ marginTop: '20px' }}>
              <p style={{ marginBottom: '20px', color: '#6b7280' }}>
                กรุณาเลือกวันทำงานวันสุดท้ายของ {inactivatingMember.name}
              </p>

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                วันทำงานวันสุดท้าย (Last Working Day) *
              </label>
              <input
                type="date"
                value={inactiveEndDate}
                onChange={(e) => setInactiveEndDate(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '20px' }}
              />
            </div>

            <div className="confirm-buttons">
              <button className="btn-secondary" onClick={() => setShowSetInactiveModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSetInactive}>
                Set Inactive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Team Modal */}
      {showAddTeamModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content small">
            <span className="close-assignee" onClick={() => setShowAddTeamModal(false)}>&times;</span>
            <h3>➕ Add New Team</h3>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Team Name *
              </label>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Enter team name"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Description
              </label>
              <textarea
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
                placeholder="Enter team description"
                rows={3}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>
                Team Members
              </label>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: '6px', padding: '10px', marginBottom: '20px' }}>
                {members.map(member => (
                  <label key={member.id} style={{ display: 'block', padding: '8px', cursor: 'pointer', borderRadius: '4px', marginBottom: '4px', background: selectedTeamMembers.includes(member.id) ? '#f3f4f6' : 'transparent' }}>
                    <input
                      type="checkbox"
                      checked={selectedTeamMembers.includes(member.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTeamMembers([...selectedTeamMembers, member.id]);
                        } else {
                          setSelectedTeamMembers(selectedTeamMembers.filter(id => id !== member.id));
                        }
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    {member.name} ({member.email})
                  </label>
                ))}
              </div>
            </div>

            <div className="confirm-buttons">
              <button className="btn-secondary" onClick={() => setShowAddTeamModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddTeam}>
                Create Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content small">
            <span className="close-assignee" onClick={() => setShowAddRoleModal(false)}>&times;</span>
            <h3>➕ Add New Role</h3>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Role Name *
              </label>
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g., Senior QA Engineer"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Description
              </label>
              <textarea
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="Enter role description"
                rows={3}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px' }}
              />

              <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>
                Permissions
              </label>
              <div style={{ marginBottom: '20px' }}>
                {['Read', 'Write', 'Edit', 'Delete', 'Admin'].map(perm => (
                  <label key={perm} style={{ display: 'inline-block', marginRight: '15px', marginBottom: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newRolePermissions.includes(perm)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewRolePermissions([...newRolePermissions, perm]);
                        } else {
                          setNewRolePermissions(newRolePermissions.filter(p => p !== perm));
                        }
                      }}
                      style={{ marginRight: '6px' }}
                    />
                    {perm}
                  </label>
                ))}
              </div>
            </div>

            <div className="confirm-buttons">
              <button className="btn-secondary" onClick={() => setShowAddRoleModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddRole}>
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Lead Modal */}
      {showAssignLeadModal && assigningTeam && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content small">
            <span className="close-assignee" onClick={() => setShowAssignLeadModal(false)}>&times;</span>
            <h3>⭐ Assign Team Lead</h3>

            <div style={{ marginTop: '20px' }}>
              <div style={{
                padding: '12px',
                background: '#f3f4f6',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Team</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                  {assigningTeam.name}
                </div>
              </div>

              <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>
                Select Team Lead
              </label>
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '10px',
                marginBottom: '20px'
              }}>
                {/* Option to clear lead */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    marginBottom: '6px',
                    background: selectedLeadId === '' ? '#fee2e2' : 'transparent',
                    border: selectedLeadId === '' ? '2px solid #ef4444' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="radio"
                    name="teamLead"
                    checked={selectedLeadId === ''}
                    onChange={() => setSelectedLeadId('')}
                    style={{ marginRight: '10px' }}
                  />
                  <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '14px' }}>
                    ❌ Remove Team Lead
                  </span>
                  <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '12px', fontStyle: 'italic' }}>
                    (will use line manager)
                  </span>
                </label>

                {/* All members */}
                {members.map(member => (
                  <label
                    key={member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      marginBottom: '6px',
                      background: selectedLeadId === member.id ? '#e0e7ff' : 'transparent',
                      border: selectedLeadId === member.id ? '2px solid #3b82f6' : '2px solid transparent',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedLeadId !== member.id) {
                        e.currentTarget.style.background = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedLeadId !== member.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name="teamLead"
                      checked={selectedLeadId === member.id}
                      onChange={() => setSelectedLeadId(member.id)}
                      style={{ marginRight: '10px' }}
                    />
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: member.color || '#667eea',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '12px',
                      marginRight: '10px'
                    }}>
                      {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                        {member.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {member.email}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="confirm-buttons">
              <button className="btn-secondary" onClick={() => setShowAssignLeadModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleUpdateTeamLead}
                style={{
                  background: selectedLeadId === '' ? '#ef4444' : '#3b82f6'
                }}
              >
                {selectedLeadId === '' ? '🗑️ Remove Lead' : '⭐ Assign Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditTeamModal && editingTeam && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content small">
            <span className="close-assignee" onClick={() => setShowEditTeamModal(false)}>&times;</span>
            <h3>✏️ แก้ไขทีม</h3>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                ชื่อทีม *
              </label>
              <input
                type="text"
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
                placeholder="กรอกชื่อทีม"
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px', fontSize: '14px' }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                คำอธิบาย
              </label>
              <textarea
                value={editTeamDescription}
                onChange={(e) => setEditTeamDescription(e.target.value)}
                placeholder="กรอกคำอธิบายทีม"
                rows={3}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '15px', fontSize: '14px' }}
              />

              <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600, color: '#374151' }}>
                สมาชิกในทีม ({editTeamMembers.length} คน)
              </label>
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px', marginBottom: '20px', background: '#fafafa' }}>
                {members.map(member => {
                  const isSelected = editTeamMembers.includes(member.id);
                  return (
                    <label
                      key={member.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        marginBottom: '6px',
                        background: isSelected ? '#dbeafe' : 'white',
                        border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                        transition: 'all 0.2s',
                        boxShadow: isSelected ? '0 2px 4px rgba(59, 130, 246, 0.1)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'white';
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditTeamMembers([...editTeamMembers, member.id]);
                          } else {
                            setEditTeamMembers(editTeamMembers.filter(id => id !== member.id));
                          }
                        }}
                        style={{
                          marginRight: '12px',
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#3b82f6'
                        }}
                      />
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: member.color || '#667eea',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 600,
                          marginRight: '12px',
                          flexShrink: 0
                        }}
                      >
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827', marginBottom: '2px' }}>
                          {member.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {member.email}
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{
                          background: '#3b82f6',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          ✓ เลือกแล้ว
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="confirm-buttons">
              <button className="btn-secondary" onClick={() => setShowEditTeamModal(false)}>
                ยกเลิก
              </button>
              <button className="btn-primary" onClick={handleUpdateTeam}>
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Team - Remove Members Modal */}
      {showDeleteTeamMembersModal && deletingTeam && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content small">
            <span className="close-assignee" onClick={() => {
              setShowDeleteTeamMembersModal(false);
              setDeletingTeam(null);
            }}>&times;</span>
            <h3>🗑️ Remove Team Members</h3>

            <div style={{ marginTop: '20px' }}>
              <div style={{
                padding: '12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '14px', color: '#991b1b', fontWeight: 600, marginBottom: '8px' }}>
                  ⚠️ Remove all members before deleting team
                </div>
                <div style={{ fontSize: '13px', color: '#7f1d1d' }}>
                  Team: <strong>{deletingTeam.name}</strong>
                </div>
                <div style={{ fontSize: '13px', color: '#7f1d1d' }}>
                  Remaining members: <strong>{deletingTeam.members.length}</strong>
                </div>
              </div>

              <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>
                Click to remove members from team
              </label>
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '10px',
                marginBottom: '20px'
              }}>
                {deletingTeam.members.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                    All members removed. Close this dialog to delete the team.
                  </div>
                ) : (
                  deletingTeam.members.map(memberId => {
                    const member = members.find(m => m.id === memberId);
                    if (!member) return null;

                    return (
                      <div
                        key={member.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px',
                          borderRadius: '6px',
                          marginBottom: '6px',
                          background: '#f9fafb',
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: member.color || '#667eea',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '12px'
                          }}>
                            {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                              {member.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              {member.email}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMemberFromDeletingTeam(member.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="confirm-buttons">
              <button className="btn-secondary" onClick={() => {
                setShowDeleteTeamMembersModal(false);
                setDeletingTeam(null);
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
