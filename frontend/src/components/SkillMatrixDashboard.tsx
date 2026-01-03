import { useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

interface Member {
  name: string;
  role: string;
  color: string;
}

interface Skill {
  name: string;
  category: string;
}

interface SkillLevel {
  member: string;
  skill: string;
  level: number;
}

interface SkillMatrixDashboardProps {
  members: Member[];
  skills: Skill[];
  skillLevels: SkillLevel[];
  skillCategories: Array<{ id: string; name: string; color: string }>;
}

const COLORS = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SkillMatrixDashboard({
  members,
  skills,
  skillLevels,
  skillCategories
}: SkillMatrixDashboardProps) {
  const metrics = useMemo(() => {
    // Skills per member
    const skillsPerMember: Record<string, number> = {};
    members.forEach(member => {
      skillsPerMember[member.name] = skillLevels.filter(
        sl => sl.member === member.name && sl.level > 0
      ).length;
    });
    const memberSkillsData = Object.entries(skillsPerMember)
      .map(([name, count]) => ({ name, skills: count }))
      .sort((a, b) => b.skills - a.skills);

    // Average skill count
    const avgSkillsPerMember = memberSkillsData.length > 0
      ? memberSkillsData.reduce((sum, m) => sum + m.skills, 0) / memberSkillsData.length
      : 0;

    // Skill level distribution
    const levelCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    const levelLabels = ['None', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];

    skillLevels.forEach(sl => {
      levelCounts[sl.level] = (levelCounts[sl.level] || 0) + 1;
    });

    const levelDistribution = Object.entries(levelCounts)
      .filter(([level]) => parseInt(level) > 0)
      .map(([level, count]) => ({
        name: levelLabels[parseInt(level)],
        value: count,
        level: parseInt(level)
      }));

    // Skills coverage (how many people have each skill)
    const skillCoverage: Record<string, { total: number; expert: number; advanced: number }> = {};
    skills.forEach(skill => {
      const peopleWithSkill = skillLevels.filter(sl => sl.skill === skill.name && sl.level > 0);
      skillCoverage[skill.name] = {
        total: peopleWithSkill.length,
        expert: peopleWithSkill.filter(sl => sl.level === 4).length,
        advanced: peopleWithSkill.filter(sl => sl.level >= 3).length
      };
    });

    const coverageData = Object.entries(skillCoverage)
      .map(([skill, data]) => ({ skill, people: data.total, experts: data.expert }))
      .sort((a, b) => b.people - a.people)
      .slice(0, 10);

    // Category proficiency (average level per category)
    const categoryProficiency: Record<string, { total: number; count: number }> = {};
    skillLevels.forEach(sl => {
      const skill = skills.find(s => s.name === sl.skill);
      if (skill && sl.level > 0) {
        if (!categoryProficiency[skill.category]) {
          categoryProficiency[skill.category] = { total: 0, count: 0 };
        }
        categoryProficiency[skill.category].total += sl.level;
        categoryProficiency[skill.category].count += 1;
      }
    });

    const categoryData = skillCategories.map(cat => {
      const data = categoryProficiency[cat.id];
      const avgLevel = data ? data.total / data.count : 0;
      return {
        category: cat.name,
        avgLevel: parseFloat(avgLevel.toFixed(2)),
        fullMark: 4
      };
    }).filter(d => d.avgLevel > 0);

    // Skill gaps (skills with low coverage)
    const gapData = Object.entries(skillCoverage)
      .filter(([_, data]) => data.total < 2)
      .map(([skill, data]) => ({ skill, people: data.total }))
      .sort((a, b) => a.people - b.people)
      .slice(0, 10);

    // Top skills (most people have them)
    const topSkillsData = coverageData.slice(0, 5);

    // Members by skill count
    const topMembers = memberSkillsData.slice(0, 8);

    // Total stats
    const totalSkillEntries = skillLevels.filter(sl => sl.level > 0).length;
    const totalExperts = skillLevels.filter(sl => sl.level === 4).length;
    const expertiseRate = totalSkillEntries > 0
      ? Math.round((totalExperts / totalSkillEntries) * 100)
      : 0;

    return {
      memberSkillsData,
      avgSkillsPerMember,
      levelDistribution,
      coverageData,
      categoryData,
      gapData,
      topSkillsData,
      topMembers,
      totalSkillEntries,
      totalExperts,
      expertiseRate
    };
  }, [members, skills, skillLevels, skillCategories]);

  return (
    <div style={{ marginBottom: '30px' }}>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>Team Members</div>
          <div style={{ fontSize: '36px', fontWeight: 700 }}>{members.length}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>Total Skills</div>
          <div style={{ fontSize: '36px', fontWeight: 700 }}>{skills.length}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>Skill Entries</div>
          <div style={{ fontSize: '36px', fontWeight: 700 }}>{metrics.totalSkillEntries}</div>
          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '5px' }}>Avg {metrics.avgSkillsPerMember.toFixed(1)} per member</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>Expert Level</div>
          <div style={{ fontSize: '36px', fontWeight: 700 }}>{metrics.totalExperts}</div>
          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '5px' }}>{metrics.expertiseRate}% expertise rate</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
        {/* Skills per Member */}
        {metrics.topMembers.length > 0 && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '15px', color: '#374151' }}>👥 Skills per Team Member</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metrics.topMembers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Bar dataKey="skills" fill="#667eea" radius={[8, 8, 0, 0]}>
                  {metrics.topMembers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Skill Level Distribution */}
        {metrics.levelDistribution.length > 0 && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '15px', color: '#374151' }}>📊 Proficiency Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={metrics.levelDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {metrics.levelDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Skills Coverage */}
        {metrics.topSkillsData.length > 0 && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '15px', color: '#374151' }}>🏆 Most Common Skills</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metrics.topSkillsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" style={{ fontSize: '11px' }} />
                <YAxis type="category" dataKey="skill" stroke="#6b7280" style={{ fontSize: '11px' }} width={100} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Bar dataKey="people" fill="#10b981" radius={[0, 8, 8, 0]} />
                <Bar dataKey="experts" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category Proficiency Radar */}
        {metrics.categoryData.length > 0 && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '15px', color: '#374151' }}>🎯 Category Proficiency</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={metrics.categoryData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="category" stroke="#6b7280" style={{ fontSize: '11px' }} />
                <PolarRadiusAxis angle={90} domain={[0, 4]} stroke="#6b7280" style={{ fontSize: '11px' }} />
                <Radar name="Avg Level" dataKey="avgLevel" stroke="#667eea" fill="#667eea" fillOpacity={0.6} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Skill Gaps */}
        {metrics.gapData.length > 0 && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '15px', color: '#374151' }}>⚠️ Skill Gaps (Low Coverage)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metrics.gapData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="skill" stroke="#6b7280" style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Bar dataKey="people" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* All Skills Coverage */}
        {metrics.coverageData.length > 0 && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '15px', color: '#374151' }}>📈 Skills Coverage (Top 10)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metrics.coverageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="skill" stroke="#6b7280" style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Legend />
                <Bar dataKey="people" name="Total People" fill="#667eea" radius={[8, 8, 0, 0]} />
                <Bar dataKey="experts" name="Experts" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
