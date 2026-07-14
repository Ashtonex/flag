import React, { useState, useMemo, useRef } from 'react';
import { Database } from '../app/page';
import { Download, ChevronDown, Calendar, Search } from 'lucide-react';

interface ReportsProps {
  db: Database;
}

export default function Reports({ db }: ReportsProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  
  // Hidden ref for PDF generation
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  type ReportMember = Member & { presentCount: number, absentCount: number, totalSessions: number, attendanceRate: number, records: { date: string, status: string, reason?: string }[] };
  const [pdfData, setPdfData] = useState<ReportMember | null>(null);

  // Filter sessions by selected month
  const monthSessions = useMemo(() => {
    return db.attendance.filter(s => s.date.startsWith(selectedMonth));
  }, [db.attendance, selectedMonth]);

  const totalSessions = monthSessions.length;

  const memberStats = useMemo(() => {
    return db.members.map(member => {
      let presentCount = 0;
      let absentCount = 0;
      const records: { date: string, status: string, reason?: string }[] = [];

      monthSessions.forEach(session => {
        const record = session.records.find(r => r.memberId === member.id);
        if (record) {
          if (record.status === 'Present') presentCount++;
          if (record.status === 'Absent') absentCount++;
          records.push({ date: session.date, status: record.status, reason: record.reason });
        } else {
          // If no record exists for this session, they weren't marked. We'll count it as unknown/absent.
          records.push({ date: session.date, status: 'Not Recorded', reason: '' });
        }
      });

      return {
        ...member,
        presentCount,
        absentCount,
        totalSessions,
        attendanceRate: totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0,
        records
      };
    }).filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [db.members, monthSessions, totalSessions, searchTerm]);

  const toggleExpand = (id: string) => {
    setExpandedMember(expandedMember === id ? null : id);
  };

  const handleDownloadPDF = async (member: ReportMember) => {
    setPdfData(member);
    
    // Dynamically import html2pdf to prevent SSR 'self is not defined' errors
    // @ts-expect-error html2pdf lacks precise types
    const html2pdf = (await import('html2pdf.js')).default;
    
    // We need a small timeout to allow React to render the hidden PDF template
    setTimeout(() => {
      if (pdfContainerRef.current) {
        const opt = {
          margin: 1,
          filename: `${member.name.replace(/\s+/g, '_')}_Attendance_${selectedMonth}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
        };
        
        html2pdf().set(opt).from(pdfContainerRef.current).save().then(() => {
          setPdfData(null); // Cleanup
        });
      }
    }, 100);
  };

  return (
    <div className="reports-container animate-fade-in">
      {/* Controls Bar */}
      <div className="controls-bar glass-panel">
        <div className="control-group">
          <label><Calendar size={16}/> Select Month</label>
          <input 
            type="month" 
            className="input-field" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
        
        <div className="control-group flex-1">
          <label><Search size={16}/> Filter Members</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="stats-mini">
          <div>Total Practices: <span>{totalSessions}</span></div>
        </div>
      </div>

      <div className="reports-list">
        {memberStats.length === 0 ? (
          <div className="no-results glass-panel">No data available for this month or search criteria.</div>
        ) : (
          memberStats.map(member => (
            <div key={member.id} className={`report-card glass-panel ${expandedMember === member.id ? 'expanded' : ''}`}>
              <div className="report-header" onClick={() => toggleExpand(member.id)}>
                <div className="member-basic">
                  <h3>{member.name}</h3>
                  <span className="dept-badge">{member.department}</span>
                </div>
                
                <div className="member-stats">
                  <div className="stat-pill">
                    <span className="label">Present</span>
                    <span className="value success">{member.presentCount} / {totalSessions}</span>
                  </div>
                  <div className="stat-pill">
                    <span className="label">Absent</span>
                    <span className="value error">{member.absentCount}</span>
                  </div>
                  <div className="stat-pill highlight">
                    <span className="label">Rate</span>
                    <span className="value">{member.attendanceRate}%</span>
                  </div>
                  <ChevronDown className="expand-icon" size={20} />
                </div>
              </div>
              
              {expandedMember === member.id && (
                <div className="report-details animate-fade-in">
                  <div className="details-header">
                    <h4>Session Breakdown</h4>
                    <button className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); handleDownloadPDF(member); }}>
                      <Download size={16} /> Download PDF
                    </button>
                  </div>
                  
                  {member.records.length > 0 ? (
                  <div className="table-responsive">
                    <table className="records-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Reason (If Absent)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {member.records.map((r, i) => (
                          <tr key={i}>
                            <td>{new Date(r.date).toLocaleDateString()}</td>
                            <td>
                              <span className={`status-badge ${r.status.toLowerCase()}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="reason-cell">{r.reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  ) : (
                    <p className="no-records">No practice sessions found for this month.</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Hidden PDF Template */}
      {pdfData && (
        <div style={{ display: 'none' }}>
          <div ref={pdfContainerRef} className="pdf-template">
            <div className="pdf-header">
              <h1>Celebration Church</h1>
              <h2>Attendance Report - {selectedMonth}</h2>
            </div>
            
            <div className="pdf-member-info">
              <h3>Name: {pdfData.name}</h3>
              <p>Department: {pdfData.department}</p>
              <div className="pdf-summary">
                <p><strong>Total Sessions:</strong> {pdfData.totalSessions}</p>
                <p><strong>Present:</strong> {pdfData.presentCount}</p>
                <p><strong>Absent:</strong> {pdfData.absentCount}</p>
                <p><strong>Attendance Rate:</strong> {pdfData.attendanceRate}%</p>
              </div>
            </div>

            <table className="pdf-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Reason (If Absent)</th>
                </tr>
              </thead>
              <tbody>
                {pdfData.records.map((r, i) => (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td>{r.status}</td>
                    <td>{r.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="pdf-footer">
              <p>Generated on {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .reports-container {
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

        .reports-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .report-card {
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .report-header {
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }

        .report-header:hover {
          background: rgba(255,255,255,0.02);
        }

        .member-basic {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .member-basic h3 {
          margin: 0;
          font-size: 1.2rem;
        }

        .dept-badge {
          font-size: 0.8rem;
          background: rgba(255,255,255,0.1);
          padding: 2px 8px;
          border-radius: 12px;
          width: fit-content;
        }

        .member-stats {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .stat-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .stat-pill .label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }

        .stat-pill .value {
          font-size: 1.1rem;
          font-weight: bold;
        }

        .stat-pill .value.success { color: var(--color-success); }
        .stat-pill .value.error { color: var(--color-error); }

        .stat-pill.highlight {
          background: rgba(138, 43, 226, 0.1);
          padding: 4px 16px;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(138, 43, 226, 0.3);
        }
        .stat-pill.highlight .value {
          color: var(--color-primary-light);
        }

        .expand-icon {
          color: var(--color-text-muted);
          transition: transform 0.3s ease;
        }

        .report-card.expanded .expand-icon {
          transform: rotate(180deg);
        }

        .report-details {
          padding: 0 24px 24px;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin-top: 8px;
          padding-top: 24px;
        }

        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .details-header h4 {
          margin: 0;
          color: var(--color-text-muted);
        }

        .btn-sm {
          padding: 8px 16px;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .records-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.95rem;
        }

        .records-table th, .records-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .records-table th {
          color: var(--color-text-muted);
          font-weight: 500;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.85rem;
        }

        .status-badge.present { background: rgba(76, 175, 80, 0.2); color: #81c784; }
        .status-badge.absent { background: rgba(244, 67, 54, 0.2); color: #e57373; }
        .status-badge.not { background: rgba(255, 255, 255, 0.1); color: var(--color-text-muted); }

        .reason-cell {
          color: var(--color-text-muted);
          font-style: italic;
        }

        .no-records, .no-results {
          padding: 24px;
          text-align: center;
          color: var(--color-text-muted);
        }

        /* PDF Styles - Used only when generating PDF */
        .pdf-template {
          padding: 40px;
          color: #000;
          background: #fff;
          font-family: sans-serif;
        }
        .pdf-header {
          text-align: center;
          border-bottom: 2px solid #6a1b9a;
          padding-bottom: 20px;
          margin-bottom: 20px;
        }
        .pdf-header h1 { margin: 0; color: #6a1b9a; }
        .pdf-header h2 { margin: 10px 0 0 0; color: #333; font-weight: normal; }
        .pdf-member-info { margin-bottom: 30px; }
        .pdf-summary {
          display: flex;
          gap: 20px;
          background: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
          margin-top: 15px;
        }
        .pdf-summary p { margin: 0; }
        .pdf-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .pdf-table th, .pdf-table td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
        .pdf-table th { background: #6a1b9a; color: white; }
        .pdf-footer {
          text-align: center;
          font-size: 12px;
          color: #777;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        @media (max-width: 768px) {
          .controls-bar {
            flex-direction: column;
            align-items: stretch;
            padding: 16px;
            gap: 16px;
          }
          
          .report-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .member-stats {
            width: 100%;
            justify-content: space-between;
          }

          .details-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .details-header button {
            width: 100%;
            justify-content: center;
          }

          .records-table {
            min-width: 500px; /* Force table to be wider than screen on mobile to allow scroll */
          }
        }
      `}</style>
    </div>
  );
}
