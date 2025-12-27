import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SkillMatrixDashboard from '../components/SkillMatrixDashboard';
import { getUsers } from '../services/api';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  color: string;
}

interface Skill {
  name: string;
  category: string;
}

interface SkillLevel {
  member: string;
  skill: string;
  level: number; // 0 = None, 1 = Beginner, 2 = Intermediate, 3 = Advanced, 4 = Expert
}

const skillCategories = [
  { id: 'frontend', name: 'Frontend', color: '#667eea' },
  { id: 'backend', name: 'Backend', color: '#10b981' },
  { id: 'mobile', name: 'Mobile', color: '#f59e0b' },
  { id: 'devops', name: 'DevOps', color: '#ef4444' },
  { id: 'design', name: 'Design', color: '#8b5cf6' },
  { id: 'other', name: 'Other', color: '#6b7280' }
];

// No default skills - load from localStorage or start empty
const levelLabels = ['None', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];
const levelColors = ['#f3f4f6', '#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6'];

export default function SkillMatrix() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillLevels, setSkillLevels] = useState<SkillLevel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('frontend');
  const [editingCell, setEditingCell] = useState<{member: string, skill: string} | null>(null);
  const [visibleSkillCount, setVisibleSkillCount] = useState(10);

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
  }, [navigate]);

  const loadData = async () => {
    // Load members from API
    try {
      const users = await getUsers();
      const formattedMembers = users.map((user: any) => ({
        id: String(user.id),
        name: user.name,
        email: user.email,
        role: user.role,
        status: 'active' as const,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      }));
      setMembers(formattedMembers);
    } catch (error) {
      console.error('Failed to load members:', error);
    }

    // Load skills
    const skillsData = localStorage.getItem('skillMatrixSkills');
    if (skillsData) {
      setSkills(JSON.parse(skillsData));
    }

    // Load skill levels
    const levelsData = localStorage.getItem('skillMatrixLevels');
    if (levelsData) {
      setSkillLevels(JSON.parse(levelsData));
    }
  };

  const saveSkills = (newSkills: Skill[]) => {
    localStorage.setItem('skillMatrixSkills', JSON.stringify(newSkills));
    setSkills(newSkills);
  };

  const saveSkillLevels = (newLevels: SkillLevel[]) => {
    localStorage.setItem('skillMatrixLevels', JSON.stringify(newLevels));
    setSkillLevels(newLevels);
  };

  const getSkillLevel = (member: string, skill: string): number => {
    const found = skillLevels.find(sl => sl.member === member && sl.skill === skill);
    return found ? found.level : 0;
  };

  const setSkillLevel = (member: string, skill: string, level: number) => {
    const newLevels = skillLevels.filter(sl => !(sl.member === member && sl.skill === skill));
    if (level > 0) {
      newLevels.push({ member, skill, level });
    }
    saveSkillLevels(newLevels);
  };

  const addSkill = () => {
    if (!newSkillName.trim()) return;

    const newSkills = [...skills, { name: newSkillName.trim(), category: newSkillCategory }];
    saveSkills(newSkills);
    setNewSkillName('');
    setShowAddSkill(false);
  };

  const deleteSkill = (skillName: string) => {
    if (!confirm(`Delete skill "${skillName}"?`)) return;

    const newSkills = skills.filter(s => s.name !== skillName);
    saveSkills(newSkills);

    const newLevels = skillLevels.filter(sl => sl.skill !== skillName);
    saveSkillLevels(newLevels);
  };

  const filteredSkills = selectedCategory === 'all'
    ? skills
    : skills.filter(s => s.category === selectedCategory);

  const displayedSkills = filteredSkills.slice(0, visibleSkillCount);

  const loadMoreSkills = () => {
    setVisibleSkillCount(prev => prev + 10);
  };

  const showAllSkills = () => {
    setVisibleSkillCount(filteredSkills.length);
  };

  // Reset visible count when category changes
  useEffect(() => {
    setVisibleSkillCount(10);
  }, [selectedCategory]);

  const getCategoryColor = (category: string) => {
    return skillCategories.find(c => c.id === category)?.color || '#6b7280';
  };

  const getMemberSkillCount = (memberName: string, category?: string) => {
    const memberSkills = skillLevels.filter(sl => sl.member === memberName && sl.level > 0);
    if (category) {
      return memberSkills.filter(sl => {
        const skill = skills.find(s => s.name === sl.skill);
        return skill?.category === category;
      }).length;
    }
    return memberSkills.length;
  };

  return (
    <div style={{ padding: '30px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '10px' }}>
          🎯 Skill Matrix
        </h1>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Track team members' skills and proficiency levels
        </p>
      </div>

      {/* Performance Dashboard */}
      <SkillMatrixDashboard
        members={members}
        skills={skills}
        skillLevels={skillLevels}
        skillCategories={skillCategories}
      />

      {/* Category Filter */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '10px 20px',
              border: selectedCategory === 'all' ? '2px solid #667eea' : '2px solid #e5e7eb',
              background: selectedCategory === 'all' ? '#ede9fe' : 'white',
              color: selectedCategory === 'all' ? '#667eea' : '#6b7280',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            All Skills
          </button>
          {skillCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '10px 20px',
                border: selectedCategory === cat.id ? `2px solid ${cat.color}` : '2px solid #e5e7eb',
                background: selectedCategory === cat.id ? `${cat.color}20` : 'white',
                color: selectedCategory === cat.id ? cat.color : '#6b7280',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px'
              }}
            >
              {cat.name}
            </button>
          ))}
          <button
            onClick={() => setShowAddSkill(!showAddSkill)}
            className="btn-primary"
            style={{ marginLeft: 'auto', padding: '10px 20px', borderRadius: '8px', fontWeight: 600 }}
          >
            ➕ Add Skill
          </button>
        </div>

        {showAddSkill && (
          <div style={{ marginTop: '15px', padding: '15px', background: '#f9fafb', borderRadius: '8px', border: '2px solid #e5e7eb' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Skill name..."
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                style={{ flex: 1, padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px', fontSize: '14px' }}
              />
              <select
                value={newSkillCategory}
                onChange={(e) => setNewSkillCategory(e.target.value)}
                style={{ padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px', fontSize: '14px' }}
              >
                {skillCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <button onClick={addSkill} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '6px' }}>Add</button>
              <button onClick={() => setShowAddSkill(false)} className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '6px' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Skills Count Info */}
      {filteredSkills.length > 0 && (
        <div style={{ marginBottom: '15px', padding: '12px 20px', background: '#f9fafb', borderRadius: '8px', border: '2px solid #e5e7eb', textAlign: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
            Showing {Math.min(visibleSkillCount, filteredSkills.length)} of {filteredSkills.length} skills
          </span>
        </div>
      )}

      {/* Skill Matrix Table */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', overflow: 'auto', maxHeight: '600px', width: '100%' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '800px', width: '100%' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <th style={{ padding: '15px', textAlign: 'left', fontWeight: 600, position: 'sticky', left: 0, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', zIndex: 10 }}>
                Team Member
              </th>
              {displayedSkills.map(skill => (
                <th key={skill.name} style={{ padding: '15px', textAlign: 'center', fontWeight: 600, minWidth: '120px', position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                    <span>{skill.name}</span>
                    <span style={{ fontSize: '10px', opacity: 0.8, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px' }}>
                      {skillCategories.find(c => c.id === skill.category)?.name}
                    </span>
                    <button
                      onClick={() => deleteSkill(skill.name)}
                      style={{ fontSize: '12px', background: 'rgba(239,68,68,0.2)', color: 'white', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', marginTop: '3px' }}
                      title="Delete skill"
                    >
                      🗑️
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member, idx) => (
              <tr key={member.name} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '15px', fontWeight: 600, position: 'sticky', left: 0, background: 'white', zIndex: 5, borderRight: '2px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '14px' }}>
                      {member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{member.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {getMemberSkillCount(member.name)} skills
                      </div>
                    </div>
                  </div>
                </td>
                {displayedSkills.map(skill => {
                  const level = getSkillLevel(member.name, skill.name);
                  const isEditing = editingCell?.member === member.name && editingCell?.skill === skill.name;

                  return (
                    <td
                      key={skill.name}
                      style={{
                        padding: '10px',
                        textAlign: 'center',
                        background: levelColors[level],
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => setEditingCell({ member: member.name, skill: skill.name })}
                    >
                      {isEditing ? (
                        <select
                          value={level}
                          onChange={(e) => {
                            setSkillLevel(member.name, skill.name, parseInt(e.target.value));
                            setEditingCell(null);
                          }}
                          onBlur={() => setEditingCell(null)}
                          autoFocus
                          style={{ width: '100%', padding: '5px', border: '2px solid #667eea', borderRadius: '4px', fontSize: '12px' }}
                        >
                          {levelLabels.map((label, idx) => (
                            <option key={idx} value={idx}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ fontSize: '12px', fontWeight: 600, color: level === 0 ? '#9ca3af' : '#1f2937' }}>
                          {levelLabels[level]}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {members.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>👥</div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px', color: '#374151' }}>No Team Members</h3>
            <p>Add team members in the Members & Teams page first.</p>
          </div>
        )}
      </div>

      {/* Load More Buttons */}
      {filteredSkills.length > visibleSkillCount && (
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={loadMoreSkills}
            className="btn-primary"
            style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}
          >
            ➕ Load More ({filteredSkills.length - visibleSkillCount} more skills)
          </button>
          <button
            onClick={showAllSkills}
            className="btn-secondary"
            style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}
          >
            📋 Show All ({filteredSkills.length} skills)
          </button>
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: '20px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>📊 Proficiency Levels</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          {levelLabels.map((label, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '30px', height: '30px', background: levelColors[idx], border: '1px solid #e5e7eb', borderRadius: '6px' }}></div>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
