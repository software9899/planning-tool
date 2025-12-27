// Members & Teams Management
let members = JSON.parse(localStorage.getItem('members')) || [
    {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Developer',
        status: 'active',
        teams: ['Frontend Team', 'Core Team']
    },
    {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'Designer',
        status: 'active',
        teams: ['Design Team']
    },
    {
        id: 3,
        name: 'Bob Wilson',
        email: 'bob@example.com',
        role: 'QA',
        status: 'active',
        teams: ['QA Team', 'Core Team']
    }
];

let teams = JSON.parse(localStorage.getItem('teams')) || [
    {
        id: 1,
        name: 'Frontend Team',
        description: 'Frontend development team',
        members: [1, 2]
    },
    {
        id: 2,
        name: 'Design Team',
        description: 'UI/UX Design team',
        members: [2]
    },
    {
        id: 3,
        name: 'QA Team',
        description: 'Quality Assurance team',
        members: [3]
    },
    {
        id: 4,
        name: 'Core Team',
        description: 'Core development team',
        members: [1, 3]
    }
];

let roles = JSON.parse(localStorage.getItem('roles')) || [
    { id: 1, name: 'Developer', description: 'Software developer', color: '#667eea' },
    { id: 2, name: 'Designer', description: 'UI/UX Designer', color: '#f093fb' },
    { id: 3, name: 'QA', description: 'Quality Assurance Engineer', color: '#4facfe' },
    { id: 4, name: 'PM', description: 'Project Manager', color: '#43e97b' }
];

// Save to localStorage
function saveMembers() {
    localStorage.setItem('members', JSON.stringify(members));
}

function saveTeams() {
    localStorage.setItem('teams', JSON.stringify(teams));
}

function saveRoles() {
    localStorage.setItem('roles', JSON.stringify(roles));
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('👥 Members & Teams initializing...');

    initializeTabs();
    renderMembers();
    renderTeams();
    renderRoles();

    // Search functionality
    document.getElementById('memberSearch')?.addEventListener('input', (e) => {
        renderMembers(e.target.value);
    });

    document.getElementById('teamSearch')?.addEventListener('input', (e) => {
        renderTeams(e.target.value);
    });

    document.getElementById('roleSearch')?.addEventListener('input', (e) => {
        renderRoles(e.target.value);
    });

    console.log('✅ Members & Teams ready!');
});

// Tab Management
function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            // Update buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
}

// Render Members
function renderMembers(searchQuery = '') {
    const container = document.getElementById('membersGrid');
    if (!container) return;

    container.innerHTML = '';

    let filteredMembers = members;
    if (searchQuery) {
        filteredMembers = members.filter(m =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.role.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    filteredMembers.forEach(member => {
        const card = createMemberCard(member);
        container.appendChild(card);
    });
}

function createMemberCard(member) {
    const card = document.createElement('div');
    card.className = 'member-card';

    const avatar = member.name.charAt(0).toUpperCase();
    const statusClass = member.status === 'active' ? 'active' : 'inactive';
    const statusText = member.status === 'active' ? 'Active' : 'Inactive';

    card.innerHTML = `
        <div class="member-header">
            <div class="member-avatar">${avatar}</div>
            <div class="member-info">
                <div class="member-name">${member.name}</div>
                <div class="member-email">${member.email}</div>
            </div>
        </div>

        <div class="member-meta">
            <div class="member-badge">${member.role}</div>
            <div class="member-status ${statusClass}">${statusText}</div>
        </div>

        <div class="member-teams">
            <div class="member-teams-label">Teams:</div>
            <div class="team-tags">
                ${member.teams.map(team => `<div class="team-tag">${team}</div>`).join('')}
            </div>
        </div>

        <div class="member-actions">
            <button class="action-btn" onclick="editMember(${member.id})">✏️ Edit</button>
            <button class="action-btn" onclick="deleteMember(${member.id})">🗑️ Delete</button>
        </div>
    `;

    return card;
}

// Render Teams
function renderTeams(searchQuery = '') {
    const container = document.getElementById('teamsList');
    if (!container) return;

    container.innerHTML = '';

    let filteredTeams = teams;
    if (searchQuery) {
        filteredTeams = teams.filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    filteredTeams.forEach(team => {
        const card = createTeamCard(team);
        container.appendChild(card);
    });
}

function createTeamCard(team) {
    const card = document.createElement('div');
    card.className = 'team-card';

    const teamMembers = members.filter(m => team.members.includes(m.id));

    card.innerHTML = `
        <div class="team-header">
            <div class="team-name">${team.name}</div>
            <div class="team-members-count">${team.members.length} members</div>
        </div>

        <div class="team-description">${team.description}</div>

        <div class="team-members-list">
            ${teamMembers.map(m => {
                const avatar = m.name.charAt(0).toUpperCase();
                return `<div class="team-member-avatar" title="${m.name}">${avatar}</div>`;
            }).join('')}
        </div>

        <div class="team-actions">
            <button class="action-btn" onclick="editTeam(${team.id})">✏️ Edit</button>
            <button class="action-btn" onclick="deleteTeam(${team.id})">🗑️ Delete</button>
        </div>
    `;

    return card;
}

// Add Member Modal
function openAddMemberModal() {
    document.getElementById('addMemberModal').style.display = 'block';
    document.getElementById('memberName').value = '';
    document.getElementById('memberEmail').value = '';
    document.getElementById('memberStatus').value = 'active';

    // Populate role dropdown
    const roleSelect = document.getElementById('memberRole');
    roleSelect.innerHTML = roles.map(r => `<option value="${r.name}">${r.name}</option>`).join('');

    // Populate team checkboxes
    const container = document.getElementById('memberTeamsSelection');
    if (container) {
        container.innerHTML = teams.map(t => `
            <label style="display: block; padding: 8px; cursor: pointer;">
                <input type="checkbox" value="${t.id}" style="margin-right: 8px;">
                ${t.name}
            </label>
        `).join('');
    }
}

function closeAddMemberModal() {
    document.getElementById('addMemberModal').style.display = 'none';
}

function saveMember() {
    const name = document.getElementById('memberName').value.trim();
    const email = document.getElementById('memberEmail').value.trim();
    const role = document.getElementById('memberRole').value;
    const status = document.getElementById('memberStatus').value;

    if (!name || !email) {
        alert('Please fill in all required fields!');
        return;
    }

    // Get selected teams
    const selectedTeamIds = Array.from(
        document.querySelectorAll('#memberTeamsSelection input:checked')
    ).map(cb => parseInt(cb.value));

    const selectedTeamNames = selectedTeamIds.map(teamId => {
        const team = teams.find(t => t.id === teamId);
        return team ? team.name : null;
    }).filter(name => name !== null);

    const newMember = {
        id: Date.now(),
        name,
        email,
        role,
        status,
        teams: selectedTeamNames
    };

    members.push(newMember);

    // Update teams' members arrays
    selectedTeamIds.forEach(teamId => {
        const team = teams.find(t => t.id === teamId);
        if (team && !team.members.includes(newMember.id)) {
            team.members.push(newMember.id);
        }
    });

    saveMembers();
    saveTeams();
    renderMembers();
    renderTeams();
    closeAddMemberModal();

    console.log('✅ Member added:', name);
}

// Edit Member
function editMember(id) {
    const member = members.find(m => m.id === id);
    if (!member) return;

    document.getElementById('memberName').value = member.name;
    document.getElementById('memberEmail').value = member.email;
    document.getElementById('memberStatus').value = member.status;

    openAddMemberModal();

    // Set role dropdown value
    document.getElementById('memberRole').value = member.role;

    // Pre-select teams the member is in
    setTimeout(() => {
        member.teams.forEach(teamName => {
            const team = teams.find(t => t.name === teamName);
            if (team) {
                const checkbox = document.querySelector(`#memberTeamsSelection input[value="${team.id}"]`);
                if (checkbox) checkbox.checked = true;
            }
        });
    }, 100);

    // Change save button to update
    const saveBtn = document.querySelector('#addMemberModal .btn-primary');
    saveBtn.textContent = 'Update Member';
    saveBtn.onclick = () => {
        const oldTeams = [...member.teams];

        member.name = document.getElementById('memberName').value.trim();
        member.email = document.getElementById('memberEmail').value.trim();
        member.role = document.getElementById('memberRole').value;
        member.status = document.getElementById('memberStatus').value;

        // Get selected teams
        const selectedTeamIds = Array.from(
            document.querySelectorAll('#memberTeamsSelection input:checked')
        ).map(cb => parseInt(cb.value));

        const selectedTeamNames = selectedTeamIds.map(teamId => {
            const team = teams.find(t => t.id === teamId);
            return team ? team.name : null;
        }).filter(name => name !== null);

        member.teams = selectedTeamNames;

        // Update teams' members arrays
        teams.forEach(team => {
            const shouldInclude = selectedTeamIds.includes(team.id);
            const isIncluded = team.members.includes(id);

            if (shouldInclude && !isIncluded) {
                team.members.push(id);
            } else if (!shouldInclude && isIncluded) {
                team.members = team.members.filter(mId => mId !== id);
            }
        });

        saveMembers();
        saveTeams();
        renderMembers();
        renderTeams();
        closeAddMemberModal();

        // Reset button
        saveBtn.textContent = 'Add Member';
        saveBtn.onclick = saveMember;
    };
}

// Delete Member
function deleteMember(id) {
    const member = members.find(m => m.id === id);
    if (!member) return;

    if (confirm(`Are you sure you want to delete ${member.name}?`)) {
        members = members.filter(m => m.id !== id);

        // Remove from teams
        teams.forEach(team => {
            team.members = team.members.filter(mId => mId !== id);
        });

        saveMembers();
        saveTeams();
        renderMembers();
        renderTeams();

        console.log('🗑️ Member deleted:', member.name);
    }
}

// Add Team Modal
function openAddTeamModal() {
    document.getElementById('addTeamModal').style.display = 'block';
    document.getElementById('teamName').value = '';
    document.getElementById('teamDescription').value = '';

    // Render member selection
    const container = document.getElementById('teamMembersSelection');
    container.innerHTML = members.map(m => `
        <label style="display: block; padding: 8px; cursor: pointer;">
            <input type="checkbox" value="${m.id}" style="margin-right: 8px;">
            ${m.name} (${m.email})
        </label>
    `).join('');
}

function closeAddTeamModal() {
    document.getElementById('addTeamModal').style.display = 'none';
}

function saveTeam() {
    const name = document.getElementById('teamName').value.trim();
    const description = document.getElementById('teamDescription').value.trim();

    if (!name) {
        alert('Please enter a team name!');
        return;
    }

    const selectedMembers = Array.from(
        document.querySelectorAll('#teamMembersSelection input:checked')
    ).map(cb => parseInt(cb.value));

    const newTeam = {
        id: Date.now(),
        name,
        description,
        members: selectedMembers
    };

    teams.push(newTeam);

    // Update members' teams
    selectedMembers.forEach(memberId => {
        const member = members.find(m => m.id === memberId);
        if (member && !member.teams.includes(name)) {
            member.teams.push(name);
        }
    });

    saveTeams();
    saveMembers();
    renderTeams();
    renderMembers();
    closeAddTeamModal();

    console.log('✅ Team created:', name);
}

// Edit Team
function editTeam(id) {
    const team = teams.find(t => t.id === id);
    if (!team) return;

    document.getElementById('teamName').value = team.name;
    document.getElementById('teamDescription').value = team.description;

    openAddTeamModal();

    // Pre-select members
    setTimeout(() => {
        team.members.forEach(memberId => {
            const checkbox = document.querySelector(`#teamMembersSelection input[value="${memberId}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }, 100);

    // Change save button to update
    const saveBtn = document.querySelector('#addTeamModal .btn-primary');
    saveBtn.textContent = 'Update Team';
    saveBtn.onclick = () => {
        const oldName = team.name;
        team.name = document.getElementById('teamName').value.trim();
        team.description = document.getElementById('teamDescription').value.trim();

        const selectedMembers = Array.from(
            document.querySelectorAll('#teamMembersSelection input:checked')
        ).map(cb => parseInt(cb.value));

        team.members = selectedMembers;

        // Update members' teams
        members.forEach(member => {
            // Remove old team name
            member.teams = member.teams.filter(t => t !== oldName);
            // Add new team name if member is in team
            if (selectedMembers.includes(member.id) && !member.teams.includes(team.name)) {
                member.teams.push(team.name);
            }
        });

        saveTeams();
        saveMembers();
        renderTeams();
        renderMembers();
        closeAddTeamModal();

        // Reset button
        saveBtn.textContent = 'Create Team';
        saveBtn.onclick = saveTeam;
    };
}

// Delete Team
function deleteTeam(id) {
    const team = teams.find(t => t.id === id);
    if (!team) return;

    if (confirm(`Are you sure you want to delete team "${team.name}"?`)) {
        // Remove team from members
        members.forEach(member => {
            member.teams = member.teams.filter(t => t !== team.name);
        });

        teams = teams.filter(t => t.id !== id);

        saveTeams();
        saveMembers();
        renderTeams();
        renderMembers();

        console.log('🗑️ Team deleted:', team.name);
    }
}

// Render Roles
function renderRoles(searchQuery = '') {
    const container = document.getElementById('rolesGrid');
    if (!container) return;

    container.innerHTML = '';

    let filteredRoles = roles;
    if (searchQuery) {
        filteredRoles = roles.filter(r =>
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    filteredRoles.forEach(role => {
        const card = createRoleCard(role);
        container.appendChild(card);
    });
}

function createRoleCard(role) {
    const card = document.createElement('div');
    card.className = 'member-card'; // Using existing member-card styles

    const membersWithRole = members.filter(m => m.role === role.name).length;

    card.innerHTML = `
        <div class="member-header">
            <div class="member-avatar" style="background: ${role.color};">🎭</div>
            <div class="member-info">
                <div class="member-name">${role.name}</div>
                <div class="member-email">${role.description || 'No description'}</div>
            </div>
        </div>

        <div class="member-meta">
            <div class="member-badge">${membersWithRole} member${membersWithRole !== 1 ? 's' : ''}</div>
        </div>

        <div class="member-actions">
            <button class="action-btn" onclick="editRole(${role.id})">✏️ Edit</button>
            <button class="action-btn" onclick="deleteRole(${role.id})">🗑️ Delete</button>
        </div>
    `;

    return card;
}

// Add Role Modal
function openAddRoleModal() {
    document.getElementById('addRoleModal').style.display = 'block';
    document.getElementById('roleName').value = '';
    document.getElementById('roleDescription').value = '';
}

function closeAddRoleModal() {
    document.getElementById('addRoleModal').style.display = 'none';
}

function saveRole() {
    const name = document.getElementById('roleName').value.trim();
    const description = document.getElementById('roleDescription').value.trim();

    if (!name) {
        alert('Please enter a role name!');
        return;
    }

    // Generate random color
    const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#30cfd0', '#a8edea', '#fed6e3'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const newRole = {
        id: Date.now(),
        name,
        description,
        color
    };

    roles.push(newRole);
    saveRoles();
    renderRoles();
    closeAddRoleModal();

    console.log('✅ Role added:', name);
}

// Edit Role
function editRole(id) {
    const role = roles.find(r => r.id === id);
    if (!role) return;

    document.getElementById('roleName').value = role.name;
    document.getElementById('roleDescription').value = role.description;

    openAddRoleModal();

    // Change save button to update
    const saveBtn = document.querySelector('#addRoleModal .btn-primary');
    saveBtn.textContent = 'Update Role';
    saveBtn.onclick = () => {
        const oldName = role.name;
        role.name = document.getElementById('roleName').value.trim();
        role.description = document.getElementById('roleDescription').value.trim();

        // Update members who have this role
        members.forEach(member => {
            if (member.role === oldName) {
                member.role = role.name;
            }
        });

        saveRoles();
        saveMembers();
        renderRoles();
        renderMembers();
        closeAddRoleModal();

        // Reset button
        saveBtn.textContent = 'Add Role';
        saveBtn.onclick = saveRole;
    };
}

// Delete Role
function deleteRole(id) {
    const role = roles.find(r => r.id === id);
    if (!role) return;

    // Check if any members have this role
    const membersWithRole = members.filter(m => m.role === role.name);
    if (membersWithRole.length > 0) {
        alert(`Cannot delete role "${role.name}" because ${membersWithRole.length} member(s) are assigned to it.`);
        return;
    }

    if (confirm(`Are you sure you want to delete role "${role.name}"?`)) {
        roles = roles.filter(r => r.id !== id);

        saveRoles();
        renderRoles();

        console.log('🗑️ Role deleted:', role.name);
    }
}

// Export for use in other files
window.getMembers = () => members;
window.getTeams = () => teams;
window.getRoles = () => roles;
