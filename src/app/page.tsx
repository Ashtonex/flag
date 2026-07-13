"use client";

import { useState, useEffect } from "react";
import { Users, CalendarCheck, BarChart3, Church, Plus } from "lucide-react";
import Tracker from "../components/Tracker";
import Reports from "../components/Reports";

export type Member = {
  id: string;
  name: string;
  department: string;
};

export type AttendanceRecord = {
  memberId: string;
  status: "Present" | "Absent";
  reason?: string;
};

export type Session = {
  id: string;
  date: string;
  type: string; // e.g., "Practice", "Service"
  records: AttendanceRecord[];
};

export type Database = {
  members: Member[];
  attendance: Session[];
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<"tracker" | "reports">("tracker");
  const [db, setDb] = useState<Database | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const res = await fetch("/api/data");
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = await res.json();
      setDb(data);
      setIsError(false);
    } catch (err) {
      console.error(err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveToDb = async (newData: Database) => {
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData),
      });
      if (res.ok) {
        setDb(newData);
      } else {
        alert("Failed to save changes to database.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving data.");
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading Celebration Church Data...</p>
      </div>
    );
  }

  if (isError || !db) {
    return (
      <div className="error-container">
        <h2>Error Loading Data</h2>
        <p>Could not connect to the database. If you are on Vercel, the local API route may not be fully supported for persistent writes.</p>
        <button className="btn-primary" onClick={fetchData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Church className="sidebar-logo" size={32} />
          <h2>Celebration</h2>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === "tracker" ? "active" : ""}`}
            onClick={() => setActiveTab("tracker")}
          >
            <CalendarCheck size={20} />
            <span>Attendance Tracker</span>
          </button>
          <button 
            className={`nav-item ${activeTab === "reports" ? "active" : ""}`}
            onClick={() => setActiveTab("reports")}
          >
            <BarChart3 size={20} />
            <span>Reports</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <p>Choir Department</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-header">
          <h1>{activeTab === "tracker" ? "Practice Attendance" : "Monthly Reports"}</h1>
          <div className="header-stats">
            <div className="stat-badge">
              <Users size={16} />
              <span>{db.members.length} Members</span>
            </div>
          </div>
        </header>

        <div className="content-scroll">
          {activeTab === "tracker" && <Tracker db={db} saveToDb={saveToDb} />}
          {activeTab === "reports" && <Reports db={db} />}
        </div>
      </main>

      <style jsx>{`
        .loading-container, .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 20px;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--color-border);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .app-container {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }

        .sidebar {
          width: 260px;
          background: var(--color-bg-elevated);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          padding: 24px 0;
          flex-shrink: 0;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 24px 32px;
          border-bottom: 1px solid var(--color-border);
          margin-bottom: 24px;
        }

        .sidebar-logo {
          color: var(--color-primary);
        }

        .sidebar-header h2 {
          font-size: 1.25rem;
          margin: 0;
          background: linear-gradient(90deg, #fff, #b3b3b3);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 0 16px;
          flex: 1;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
          transition: all var(--transition-fast);
          font-size: 1rem;
          text-align: left;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .nav-item.active {
          background: var(--color-primary-dark);
          color: white;
        }

        .sidebar-footer {
          padding: 16px 24px;
          font-size: 0.85rem;
          color: var(--color-text-muted);
          border-top: 1px solid var(--color-border);
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--color-bg-base);
          overflow: hidden;
        }

        .top-header {
          padding: 32px 48px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-bg-base);
          z-index: 10;
        }
        
        .top-header h1 {
          font-size: 1.75rem;
          margin: 0;
        }

        .header-stats {
          display: flex;
          gap: 16px;
        }

        .stat-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-bg-elevated);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.9rem;
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
        }

        .content-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 32px 48px;
        }

        @media (max-width: 768px) {
          .app-container {
            flex-direction: column;
          }
          .sidebar {
            width: 100%;
            padding: 12px 20px;
            flex-direction: row;
            align-items: center;
            border-right: none;
            border-bottom: 1px solid var(--color-border);
            z-index: 20;
          }
          .sidebar-header {
            padding: 0;
            margin: 0;
            border-bottom: none;
            margin-right: auto;
          }
          .sidebar-header h2 {
            display: none;
          }
          .sidebar-nav {
            flex-direction: row;
            padding: 0;
            gap: 8px;
            flex: 0;
          }
          .nav-item {
            padding: 10px;
          }
          .nav-item span {
            display: none; /* Hide text on mobile, just show icons */
          }
          .sidebar-footer {
            display: none;
          }
          .top-header {
            padding: 20px;
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .top-header h1 {
            font-size: 1.5rem;
          }
          .content-scroll {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}
