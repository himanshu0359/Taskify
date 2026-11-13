"use client";

import { useState } from "react";
import { API_URL } from "../lib/api";

export default function AdminDashboard() {
  const [key, setKey] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Users");

  const loadDashboard = async (event) => {
    event?.preventDefault();
    setError("");
    setLoading(true);

    try {
      const headers = { "x-admin-key": key };
      const [userResponse, taskResponse, statsResponse] = await Promise.all([
        fetch(`${API_URL}/admin/users`, { headers }),
        fetch(`${API_URL}/admin/tasks`, { headers }),
        fetch(`${API_URL}/admin/stats`, { headers }),
      ]);

      if ([userResponse, taskResponse, statsResponse].some((response) => !response.ok)) {
        if ([userResponse, taskResponse, statsResponse].some((response) => response.status === 403)) {
          throw new Error("Admin key was not accepted.");
        }
        throw new Error("Could not load the database dashboard.");
      }

      const [nextUsers, nextTasks, nextStats] = await Promise.all([
        userResponse.json(),
        taskResponse.json(),
        statsResponse.json(),
      ]);
      setUsers(nextUsers);
      setTasks(nextTasks);
      setStats(nextStats);
      setAuthorized(true);
    } catch (requestError) {
      setAuthorized(false);
      setError(
        requestError.message ||
          "Unable to reach the backend. Check that it is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const lockDashboard = () => {
    setAuthorized(false);
    setKey("");
    setStats(null);
    setUsers([]);
    setTasks([]);
    setError("");
  };

  if (!authorized) {
    return (
      <main className="admin-page admin-login-page">
        <form className="admin-login-card" onSubmit={loadDashboard}>
          <a className="admin-brand" href="/">Taskify<span>.</span></a>
          <p className="admin-eyebrow">DEVELOPER CONSOLE</p>
          <h1>Database access</h1>
          <p className="admin-muted">
            Enter the private admin key configured by the backend.
          </p>
          <label className="admin-key-label" htmlFor="admin-key">Admin key</label>
          <input
            id="admin-key"
            className="admin-input"
            type="password"
            autoComplete="current-password"
            placeholder="Enter admin key"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            required
          />
          {error && <p className="admin-error" role="alert">{error}</p>}
          <button className="admin-primary-button" disabled={loading} type="submit">
            {loading ? "Connecting…" : "Open database"}
          </button>
          <a className="admin-back-link" href="/">Back to Taskify</a>
        </form>
      </main>
    );
  }

  const metrics = [
    ["Registered users", stats.total_users, "Across all accounts"],
    ["All tasks", stats.total_tasks, "Stored in SQLite"],
    ["Completed", stats.completed_tasks, "Marked complete"],
    ["Remaining", stats.pending_tasks, "Still in progress"],
  ];

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a className="admin-brand" href="/">Taskify<span>.</span></a>
        <div className="admin-header-actions">
          <span className="admin-live-indicator">DATABASE CONNECTED</span>
          <button className="admin-secondary-button" onClick={loadDashboard} disabled={loading} type="button">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button className="admin-secondary-button" onClick={lockDashboard} type="button">Lock</button>
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-title-row">
          <div>
            <p className="admin-eyebrow">TASKIFY / DEVELOPER TOOLS</p>
            <h1>Database overview</h1>
            <p className="admin-muted">Users, task records, and activity in your local database.</p>
          </div>
          <span className="admin-db-badge">SQLite · taskify.db</span>
        </div>

        <section className="admin-metrics" aria-label="Database statistics">
          {metrics.map(([label, value, caption]) => (
            <article className="admin-metric-card" key={label}>
              <p>{label}</p>
              <strong>{value}</strong>
              <span>{caption}</span>
            </article>
          ))}
        </section>

        <section className="admin-records-card">
          <div className="admin-records-heading">
            <div>
              <h2>Database records</h2>
              <p>Inspect registered accounts and their task activity.</p>
            </div>
            <div className="admin-tabs" role="tablist" aria-label="Database tables">
              {["Users", "Tasks"].map((tab) => (
                <button
                  aria-selected={activeTab === tab}
                  className={activeTab === tab ? "admin-tab active" : "admin-tab"}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  role="tab"
                  type="button"
                >
                  {tab}<span>{tab === "Users" ? users.length : tasks.length}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="admin-table-wrap">
            {activeTab === "Users" ? (
              <table className="admin-table">
                <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Tasks</th></tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="admin-id">#{user.id}</td>
                      <td><strong>{user.name}</strong></td>
                      <td>{user.email}</td>
                      <td><span className="admin-count-pill">{user.total_tasks}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="admin-table">
                <thead><tr><th>Task</th><th>Owner</th><th>Status</th><th>Priority</th><th>Created</th></tr></thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td><strong>{task.title}</strong><span className="admin-table-subtext">#{task.id}</span></td>
                      <td>{task.user_name}<span className="admin-table-subtext">{task.user_email}</span></td>
                      <td><span className={`admin-status status-${task.status.toLowerCase().replaceAll(" ", "-")}`}>{task.status}</span></td>
                      <td><span className={`admin-priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span></td>
                      <td>{task.created_at ? new Date(task.created_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {((activeTab === "Users" && users.length === 0) || (activeTab === "Tasks" && tasks.length === 0)) && (
              <div className="admin-empty-state">No {activeTab.toLowerCase()} in the database yet.</div>
            )}
          </div>
          <footer className="admin-records-footer">Showing {activeTab === "Users" ? users.length : tasks.length} {activeTab.toLowerCase()}</footer>
        </section>
        <p className="admin-security-note">Admin access is checked by the Python API. Your key is kept only in this page’s memory.</p>
      </div>
    </main>
  );
}
