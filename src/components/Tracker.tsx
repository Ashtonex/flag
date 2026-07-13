import React, { useState, useMemo } from 'react';
import { Database, Member, Session, AttendanceRecord } from '../app/page';
import { Search, CheckCircle2, XCircle, Calendar as CalendarIcon, User, Save, X, UserPlus } from 'lucide-react';

interface TrackerProps {
  db: Database;
  saveToDb: (db: Database) => void;
}

export default function Tracker({ db, saveToDb }: TrackerProps) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [absentMemberId, setAbsentMemberId] = useState<string | null>(null);
  const [absentReason, setAbsentReason] = useState('');

  // Add Member state
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberDept, setNewMemberDept] = useState('Choir');
  // Find or create session for the selected date
  const currentSession = useMemo(() => {
    return db.attendance.find(s => s.date === selectedDate) || {
      id: `session-${Date.now()}`,
      date: selectedDate,
      type: 'Practice',
      records: []
    };
  }, [db, selectedDate]);

  // Handle marking present
  const handleMarkPresent = (memberId: string) => {
    updateAttendance(memberId, 'Present', '');
  };

  // Handle marking absent (opens modal)
  const handleMarkAbsentClick = (memberId: string) => {
    const existingRecord = currentSession.records.find(r => r.memberId === memberId);
    setAbsentMemberId(memberId);
    setAbsentReason(existingRecord?.reason || '');
    setModalOpen(true);
  };

  // Save absent reason from modal
  const saveAbsentReason = () => {
    if (absentMemberId) {
      updateAttendance(absentMemberId, 'Absent', absentReason);
      setModalOpen(false);
      setAbsentMemberId(null);
      setAbsentReason('');
    }
  };

  // Save new member
  const saveNewMember = () => {
    if (newMemberName.trim()) {
      const newMember: Member = {
        id: `member-${Date.now()}`,
        name: newMemberName.trim(),
        department: newMemberDept
      };
      
      saveToDb({
        ...db,
        members: [...db.members, newMember]
      });
      
      setAddMemberModalOpen(false);
      setNewMemberName('');
      setNewMemberDept('Choir');
    }
  };

  // Core update function
  const updateAttendance = (memberId: string, status: 'Present' | 'Absent', reason?: string) => {
    const newRecords = [...currentSession.records];
    const existingIndex = newRecords.findIndex(r => r.memberId === memberId);
    
    if (existingIndex >= 0) {
      newRecords[existingIndex] = { memberId, status, reason };
    } else {
      newRecords.push({ memberId, status, reason });
    }

    const updatedSession = { ...currentSession, records: newRecords };
    
    let newAttendanceList = [...db.attendance];
    const sessionIndex = newAttendanceList.findIndex(s => s.date === selectedDate);
    
    if (sessionIndex >= 0) {
      newAttendanceList[sessionIndex] = updatedSession;
    } else {
      newAttendanceList.push(updatedSession);
    }

    saveToDb({ ...db, attendance: newAttendanceList });
  };

  const filteredMembers = db.members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRecord = (memberId: string) => {
    return currentSession.records.find(r => r.memberId === memberId);
  };

  return (
    <div className="tracker-container animate-fade-in">
      
      {/* Controls Bar */}
      <div className="controls-bar glass-panel">
        <div className="control-group">
          <label><CalendarIcon size={16}/> Practice Date</label>
          <input 
            type="date" 
            className="input-field" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        
        <div className="control-group flex-1">
          <label><Search size={16}/> Search Members</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button 
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '44px' }}
          onClick={() => setAddMemberModalOpen(true)}
        >
          <UserPlus size={18} /> Add Member
        </button>
        
        <div className="stats-mini">
          <div>Present: <span>{currentSession.records.filter(r => r.status === 'Present').length}</span></div>
          <div>Absent: <span>{currentSession.records.filter(r => r.status === 'Absent').length}</span></div>
        </div>
      </div>

      {/* Members List */}
      <div className="members-grid">
        {filteredMembers.map(member => {
          const record = getRecord(member.id);
          const isPresent = record?.status === 'Present';
          const isAbsent = record?.status === 'Absent';

          return (
            <div key={member.id} className={`member-card glass-panel ${isPresent ? 'is-present' : ''} ${isAbsent ? 'is-absent' : ''}`}>
              <div className="member-info">
                <div className="avatar">
                  <User size={24} />
                </div>
                <div>
                  <h3>{member.name}</h3>
                  <p>{member.department}</p>
                </div>
              </div>
              
              <div className="action-buttons">
                <button 
                  className={`btn-icon present-btn ${isPresent ? 'active' : ''}`}
                  onClick={() => handleMarkPresent(member.id)}
                  title="Mark Present"
                >
                  <CheckCircle2 size={24} />
                </button>
                <button 
                  className={`btn-icon absent-btn ${isAbsent ? 'active' : ''}`}
                  onClick={() => handleMarkAbsentClick(member.id)}
                  title="Mark Absent"
                >
                  <XCircle size={24} />
                </button>
              </div>
              
              {isAbsent && record?.reason && (
                <div className="reason-badge">
                  Reason: {record.reason}
                </div>
              )}
            </div>
          );
        })}
        {filteredMembers.length === 0 && (
          <div className="no-results">No members found matching your search.</div>
        )}
      </div>

      {/* Absentee Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in glass-panel">
            <div className="modal-header">
              <h2>Record Absence Reason</h2>
              <button className="close-btn" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <p>Please provide a reason why <strong>{db.members.find(m => m.id === absentMemberId)?.name}</strong> is absent today (optional):</p>
              <textarea 
                className="input-field textarea"
                value={absentReason}
                onChange={(e) => setAbsentReason(e.target.value)}
                placeholder="E.g., Sick, At work, Traveling..."
                rows={4}
                autoFocus
              ></textarea>
            </div>
            
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveAbsentReason}>
                <Save size={16} /> Save Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {addMemberModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in glass-panel">
            <div className="modal-header">
              <h2>Add New Member</h2>
              <button className="close-btn" onClick={() => setAddMemberModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="control-group" style={{ marginBottom: '16px' }}>
                <label>Full Name</label>
                <input 
                  type="text"
                  className="input-field"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="e.g. John Doe"
                  autoFocus
                />
              </div>
              <div className="control-group">
                <label>Department</label>
                <input 
                  type="text"
                  className="input-field"
                  value={newMemberDept}
                  onChange={(e) => setNewMemberDept(e.target.value)}
                  placeholder="e.g. Choir"
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setAddMemberModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveNewMember} disabled={!newMemberName.trim()}>
                <UserPlus size={16} /> Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .tracker-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .controls-bar {
          display: flex;
          gap: 24px;
          padding: 20px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .control-group.flex-1 {
          flex: 1;
          min-width: 250px;
        }

        .control-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .stats-mini {
          display: flex;
          gap: 16px;
          background: rgba(0,0,0,0.3);
          padding: 12px 24px;
          border-radius: var(--radius-sm);
          height: 44px;
          align-items: center;
          border: 1px solid var(--color-border);
        }
        
        .stats-mini span {
          font-weight: bold;
          color: white;
          margin-left: 6px;
        }

        .members-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .member-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: all 0.2s ease;
          border-left: 4px solid transparent;
        }
        
        .member-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .member-card.is-present {
          border-left-color: var(--color-success);
          background: linear-gradient(90deg, rgba(76, 175, 80, 0.05) 0%, transparent 100%);
        }

        .member-card.is-absent {
          border-left-color: var(--color-error);
          background: linear-gradient(90deg, rgba(244, 67, 54, 0.05) 0%, transparent 100%);
        }

        .member-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .avatar {
          width: 48px;
          height: 48px;
          background: var(--color-bg-elevated);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          border: 1px solid var(--color-border);
        }

        .member-info h3 {
          font-size: 1.1rem;
          margin: 0 0 4px 0;
        }

        .member-info p {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid var(--color-border);
        }

        .btn-icon {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
          transition: all 0.2s ease;
          border: 1px solid var(--color-border);
        }

        .btn-icon:hover {
          background: rgba(255,255,255,0.05);
          color: white;
        }

        .present-btn.active {
          background: rgba(76, 175, 80, 0.15);
          color: var(--color-success);
          border-color: rgba(76, 175, 80, 0.3);
        }
        
        .absent-btn.active {
          background: rgba(244, 67, 54, 0.15);
          color: var(--color-error);
          border-color: rgba(244, 67, 54, 0.3);
        }

        .reason-badge {
          font-size: 0.85rem;
          color: var(--color-error);
          background: rgba(244, 67, 54, 0.1);
          padding: 8px 12px;
          border-radius: 6px;
          font-style: italic;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }

        .modal-content {
          width: 100%;
          max-width: 500px;
          background: var(--color-bg-elevated);
          border-radius: var(--radius-md);
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          border: 1px solid var(--color-border);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--color-border);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
        }

        .close-btn {
          color: var(--color-text-muted);
          transition: color 0.2s;
        }
        
        .close-btn:hover {
          color: white;
        }

        .modal-body {
          padding: 24px;
        }

        .modal-body p {
          margin-bottom: 16px;
          color: var(--color-text-muted);
          line-height: 1.5;
        }

        .textarea {
          resize: vertical;
          min-height: 100px;
        }

        .modal-footer {
          padding: 16px 24px;
          background: rgba(0,0,0,0.2);
          border-top: 1px solid var(--color-border);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        
        .modal-footer .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @media (max-width: 768px) {
          .controls-bar {
            flex-direction: column;
            align-items: stretch;
            padding: 16px;
            gap: 16px;
          }
          .stats-mini {
            justify-content: space-between;
          }
          .btn-primary {
            justify-content: center;
          }
          .members-grid {
            grid-template-columns: 1fr;
          }
          .modal-content {
            margin: 16px;
            max-height: 90vh;
            overflow-y: auto;
          }
          .modal-footer {
            flex-direction: column;
          }
          .modal-footer button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
