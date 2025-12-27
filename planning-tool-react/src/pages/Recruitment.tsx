import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface VacantPosition {
  id: number;
  position_title: string;
  department: string;
  line_manager: number | null;
  line_manager_name?: string;
  required_skills: string;
  description: string;
  status: string;
  created_at: string;
  recruiting_status?: 'open' | 'recruiting' | 'closed';
}

export default function Recruitment() {
  const navigate = useNavigate();
  const [positions, setPositions] = useState<VacantPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<VacantPosition | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadVacantPositions();
  }, []);

  const loadVacantPositions = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8002/api/draft-headcount');
      if (response.ok) {
        const data = await response.json();

        // Get line manager names
        const usersResponse = await fetch('http://localhost:8002/api/users');
        const users = usersResponse.ok ? await usersResponse.json() : [];

        // Filter to show only truly vacant positions (status = 'open' AND not yet named)
        const vacantOnly = data.filter((pos: any) => {
          const title = pos.position_title || '';

          // Show positions that are clearly vacant/unnamed
          const isVacant = title.toLowerCase().includes('vacancy') ||
                          title.toLowerCase().includes('unnamed') ||
                          title.toLowerCase().includes('ไม่มีชื่อ') ||
                          title.toLowerCase().includes('ว่าง') ||
                          title.toLowerCase().includes('position');

          // Also show if it's a job title (contains position keywords)
          const jobKeywords = ['engineer', 'developer', 'manager', 'lead', 'senior', 'junior',
                               'designer', 'analyst', 'specialist', 'coordinator', 'director',
                               'architect', 'admin', 'officer', 'executive', 'assistant',
                               'วิศวกร', 'ผู้จัดการ', 'หัวหน้า', 'ผู้เชี่ยวชาญ', 'ผู้ช่วย'];
          const isJobTitle = jobKeywords.some(keyword => title.toLowerCase().includes(keyword));

          // Include if it's vacant or a job title (not a person's name)
          return isVacant || isJobTitle;
        });

        const positionsWithManagers = vacantOnly.map((pos: any) => ({
          ...pos,
          line_manager_name: pos.line_manager
            ? users.find((u: any) => u.id === pos.line_manager)?.name || 'Unknown'
            : 'Not assigned',
          recruiting_status: pos.recruiting_status || 'open'
        }));

        setPositions(positionsWithManagers);
      }
    } catch (error) {
      console.error('Failed to load vacant positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (position: VacantPosition) => {
    setSelectedPosition(position);
    setShowDetailModal(true);
  };

  const handleMarkAsRecruiting = async (position: VacantPosition) => {
    try {
      const response = await fetch(`http://localhost:8002/api/draft-headcount/${position.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...position,
          recruiting_status: 'recruiting'
        })
      });

      if (response.ok) {
        await loadVacantPositions();
        alert(`✅ ตำแหน่ง "${position.position_title}" ถูกทำเครื่องหมายว่ากำลังสรรหา`);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('❌ ไม่สามารถอัพเดทสถานะได้');
    }
  };

  const handleClosePosition = async (position: VacantPosition) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการปิดตำแหน่ง "${position.position_title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8002/api/draft-headcount/${position.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadVacantPositions();
        alert(`✅ ปิดตำแหน่ง "${position.position_title}" เรียบร้อยแล้ว`);
      }
    } catch (error) {
      console.error('Failed to close position:', error);
      alert('❌ ไม่สามารถปิดตำแหน่งได้');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { label: 'เปิดรับ', color: '#10b981', bg: '#d1fae5' },
      recruiting: { label: 'กำลังสรรหา', color: '#f59e0b', bg: '#fef3c7' },
      closed: { label: 'ปิดแล้ว', color: '#6b7280', bg: '#f3f4f6' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;

    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.color
      }}>
        {config.label}
      </span>
    );
  };

  const filteredPositions = filterStatus === 'all'
    ? positions
    : positions.filter(p => p.recruiting_status === filterStatus);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#6b7280' }}>กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          🎯 Recruitment Management
        </h1>
        <p style={{ fontSize: '16px', color: '#6b7280' }}>
          จัดการตำแหน่งว่างและการสรรหาบุคลากร
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '0'
      }}>
        {[
          { value: 'all', label: 'ทั้งหมด', count: positions.length },
          { value: 'open', label: 'เปิดรับ', count: positions.filter(p => p.recruiting_status === 'open').length },
          { value: 'recruiting', label: 'กำลังสรรหา', count: positions.filter(p => p.recruiting_status === 'recruiting').length }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilterStatus(tab.value)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              fontSize: '15px',
              fontWeight: 600,
              color: filterStatus === tab.value ? '#667eea' : '#6b7280',
              borderBottom: filterStatus === tab.value ? '3px solid #667eea' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Positions Table */}
      {filteredPositions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#f9fafb',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <div style={{ fontSize: '18px', color: '#6b7280', marginBottom: '8px' }}>
            ไม่พบตำแหน่งว่าง
          </div>
          <div style={{ fontSize: '14px', color: '#9ca3af' }}>
            สามารถเพิ่มตำแหน่งว่างใหม่ได้จากหน้า Org Chart
          </div>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#f9fafb',
                borderBottom: '2px solid #e5e7eb'
              }}>
                <th style={{
                  padding: '16px 20px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#374151',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  ตำแหน่ง
                </th>
                <th style={{
                  padding: '16px 20px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#374151',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  แผนก
                </th>
                <th style={{
                  padding: '16px 20px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#374151',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  ผู้จัดการ
                </th>
                <th style={{
                  padding: '16px 20px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#374151',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  minWidth: '250px'
                }}>
                  ทักษะที่ต้องการ
                </th>
                <th style={{
                  padding: '16px 20px',
                  textAlign: 'center',
                  fontWeight: 600,
                  color: '#374151',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  สถานะ
                </th>
                <th style={{
                  padding: '16px 20px',
                  textAlign: 'right',
                  fontWeight: 600,
                  color: '#374151',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '280px'
                }}>
                  การดำเนินการ
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPositions.map((position, index) => (
                <tr
                  key={position.id}
                  style={{
                    borderBottom: index < filteredPositions.length - 1 ? '1px solid #e5e7eb' : 'none',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <td style={{
                    padding: '20px',
                    color: '#111827',
                    fontWeight: 600
                  }}>
                    {position.position_title}
                  </td>
                  <td style={{
                    padding: '20px',
                    color: '#6b7280'
                  }}>
                    {position.department || 'ไม่ระบุ'}
                  </td>
                  <td style={{
                    padding: '20px',
                    color: '#374151'
                  }}>
                    {position.line_manager_name}
                  </td>
                  <td style={{
                    padding: '20px',
                    color: '#6b7280',
                    lineHeight: '1.5'
                  }}>
                    {position.required_skills || '-'}
                  </td>
                  <td style={{
                    padding: '20px',
                    textAlign: 'center'
                  }}>
                    {getStatusBadge(position.recruiting_status || 'open')}
                  </td>
                  <td style={{
                    padding: '20px',
                    textAlign: 'right'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleViewDetails(position)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                      >
                        📄 ดู
                      </button>

                      {position.recruiting_status !== 'recruiting' && (
                        <button
                          onClick={() => handleMarkAsRecruiting(position)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fde68a'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fef3c7'}
                        >
                          🔄 สรรหา
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPosition && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowDetailModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>
                  {selectedPosition.position_title}
                </h2>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {selectedPosition.department || 'ไม่ระบุแผนก'}
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                  สถานะ
                </div>
                {getStatusBadge(selectedPosition.recruiting_status || 'open')}
              </div>

              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                  ผู้จัดการ
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {selectedPosition.line_manager_name}
                </div>
              </div>

              {selectedPosition.required_skills && (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                    ทักษะที่ต้องการ
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedPosition.required_skills}
                  </div>
                </div>
              )}

              {selectedPosition.description && (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                    คำอธิบาย
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedPosition.description}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                  วันที่สร้าง
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {new Date(selectedPosition.created_at).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#5568d3'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#667eea'}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
