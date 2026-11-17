"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { API_URL as API, authHeaders } from "./lib/api";

const STATUSES = ["To Do", "In Progress", "Completed"];
const PRIORITIES = ["High", "Medium", "Low"];

// Planora signature pastel palette for task cards
const PASTEL_THEMES = [
  {
    name: "lavender",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    accent: "#7C3AED",
    badgeBg: "#EDE9FE",
    badgeText: "#6D28D9",
    progressBg: "#7C3AED",
  },
  {
    name: "mint",
    bg: "#F0FDF4",
    border: "#BBF7D0",
    accent: "#16A34A",
    badgeBg: "#DCFCE7",
    badgeText: "#15803D",
    progressBg: "#16A34A",
  },
  {
    name: "peach",
    bg: "#FFF7ED",
    border: "#FED7AA",
    accent: "#EA580C",
    badgeBg: "#FFEDD5",
    badgeText: "#C2410C",
    progressBg: "#EA580C",
  },
  {
    name: "sky",
    bg: "#F0F9FF",
    border: "#BAE6FD",
    accent: "#0284C7",
    badgeBg: "#E0F2FE",
    badgeText: "#0369A1",
    progressBg: "#0284C7",
  },
  {
    name: "rose",
    bg: "#FDF2F8",
    border: "#FBCFE8",
    accent: "#DB2777",
    badgeBg: "#FCE7F3",
    badgeText: "#BE185D",
    progressBg: "#DB2777",
  },
  {
    name: "amber",
    bg: "#FEFCE8",
    border: "#FEF08A",
    accent: "#CA8A04",
    badgeBg: "#FEF9C3",
    badgeText: "#A16207",
    progressBg: "#CA8A04",
  },
];

function getPastelTheme(id) {
  const index = Math.abs(Number(id) || 0) % PASTEL_THEMES.length;
  return PASTEL_THEMES[index];
}

function formatTaskDate(isoString) {
  if (!isoString) return "Due Today";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Due Today";
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    if (isToday) return "Today";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Due Today";
  }
}

function getProgressPercent(status) {
  switch (status) {
    case "Completed":
      return 100;
    case "In Progress":
      return 60;
    case "To Do":
    default:
      return 20;
  }
}

export default function Home() {
  const router = useRouter();

  // Authentication & Core State
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Navigation & View state
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");

  // Modal State (Add & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" or "edit"
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskStatus, setTaskStatus] = useState("To Do");
  const [taskDueDate, setTaskDueDate] = useState("Today");

  // Notifications & Messages Popover State
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Recent Activity Feed
  const [activities, setActivities] = useState([
    {
      id: 1,
      type: "created",
      text: "Created 'Design Planora Dashboard UI'",
      time: "10 mins ago",
    },
    {
      id: 2,
      type: "completed",
      text: "Completed 'Database schema migration'",
      time: "45 mins ago",
    },
    {
      id: 3,
      type: "started",
      text: "Moved 'API Integration' to In Progress",
      time: "2 hours ago",
    },
  ]);

  const addActivity = (type, text) => {
    setActivities((prev) => [
      { id: Date.now(), type, text, time: "Just now" },
      ...prev.slice(0, 5),
    ]);
  };

  // Auth Validation on Mount
  useEffect(() => {
    const savedUser = sessionStorage.getItem("taskifyLoggedIn");

    if (!savedUser) {
      router.replace("/login");
      return;
    }

    try {
      const loggedInUser = JSON.parse(savedUser);

      if (!loggedInUser?.id || !loggedInUser?.token) {
        sessionStorage.removeItem("taskifyLoggedIn");
        router.replace("/login");
        return;
      }

      setUser(loggedInUser);
      loadTasks(loggedInUser.id);
    } catch {
      sessionStorage.removeItem("taskifyLoggedIn");
      router.replace("/login");
    }
  }, [router]);

  // Load Tasks from Python Backend
  async function loadTasks(userId) {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${API}/tasks/${userId}`, { headers: authHeaders() });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load tasks.");
      }

      setTasks(Array.isArray(data) ? data : data.tasks || []);
    } catch (error) {
      setMessage(error.message || "Cannot connect to Python backend.");
    } finally {
      setLoading(false);
    }
  }

  // Create or Update Task
  async function handleSubmitTask(e) {
    e.preventDefault();
    if (!taskTitle.trim() || !user) return;

    try {
      setMessage("");

      if (modalMode === "create") {
        const response = await fetch(`${API}/tasks`, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            user_id: user.id,
            title: taskTitle.trim(),
            priority: taskPriority,
            status: taskStatus,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Could not add task.");
        }

        addActivity("created", `Added task "${taskTitle.trim()}"`);
      } else {
        // Edit mode
        const response = await fetch(`${API}/tasks/${currentTaskId}`, {
          method: "PATCH",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            title: taskTitle.trim(),
            priority: taskPriority,
            status: taskStatus,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Could not update task.");
        }

        addActivity("updated", `Updated task "${taskTitle.trim()}"`);
      }

      closeModal();
      await loadTasks(user.id);
    } catch (error) {
      setMessage(error.message || "Operation failed.");
    }
  }

  // Delete Task
  async function deleteTask(taskId, taskName) {
    if (!window.confirm(`Are you sure you want to delete "${taskName || 'this task'}"?`)) {
      return;
    }

    try {
      setMessage("");

      const response = await fetch(`${API}/tasks/${taskId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Could not delete task.");
      }

      addActivity("deleted", `Deleted task "${taskName || taskId}"`);
      await loadTasks(user.id);
    } catch (error) {
      setMessage(error.message || "Could not delete task.");
    }
  }

  // Quick Change Status
  async function changeStatus(task, newStatus) {
    try {
      setMessage("");

      const response = await fetch(`${API}/tasks/${task.id}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not change status.");
      }

      addActivity("moved", `Moved "${task.title}" to ${newStatus}`);
      await loadTasks(user.id);
    } catch (error) {
      setMessage(error.message || "Could not change status.");
    }
  }

  // Open Modal Helpers
  function openCreateModal(defaultStatus = "To Do") {
    setModalMode("create");
    setCurrentTaskId(null);
    setTaskTitle("");
    setTaskPriority("Medium");
    setTaskStatus(defaultStatus);
    setTaskDueDate("Today");
    setIsModalOpen(true);
  }

  function openEditModal(task) {
    setModalMode("edit");
    setCurrentTaskId(task.id);
    setTaskTitle(task.title || "");
    setTaskPriority(task.priority || "Medium");
    setTaskStatus(task.status || "To Do");
    setTaskDueDate(formatTaskDate(task.created_at));
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setTaskTitle("");
    setCurrentTaskId(null);
  }

  function logout() {
    sessionStorage.removeItem("taskifyLoggedIn");
    router.replace("/login");
  }

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = (task.title || "")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [tasks, search, priorityFilter]);

  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const inProgressCount = tasks.filter((t) => t.status === "In Progress").length;
  const todoCount = tasks.filter((t) => t.status === "To Do").length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const highPriorityCount = tasks.filter((t) => t.priority === "High").length;
  const medPriorityCount = tasks.filter((t) => t.priority === "Medium").length;
  const lowPriorityCount = tasks.filter((t) => t.priority === "Low").length;

  const getTasksByStatus = (statusName) =>
    filteredTasks.filter((t) => t.status === statusName);

  if (!user && loading) {
    return (
      <div className="planora-loading-screen">
        <div className="planora-spinner"></div>
        <p>Loading Planora Workspace...</p>
      </div>
    );
  }

  return (
    <div className="planora-app">
      {/* 1. LEFT SIDEBAR */}
      <aside className="planora-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="brand-text">
            <h2>Planora</h2>
            <span>Taskify Workspace</span>
          </div>
        </div>

        <div className="sidebar-nav-section">
          <div className="nav-group-title">MAIN MENU</div>
          <nav className="nav-links">
            <button
              className={`nav-item ${activeMenu === "Dashboard" ? "active" : ""}`}
              onClick={() => { setActiveMenu("Dashboard"); router.push("/"); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Dashboard</span>
              <span className="nav-badge">{tasks.length}</span>
            </button>

            <button
              className={`nav-item ${activeMenu === "Tasks" ? "active" : ""}`}
              onClick={() => { setActiveMenu("Tasks"); router.push("/tasks"); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <span>Tasks</span>
            </button>

            <button
              className={`nav-item ${activeMenu === "Schedule" ? "active" : ""}`}
              onClick={() => { setActiveMenu("Schedule"); router.push("/schedule"); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>Schedule</span>
            </button>

            <button
              className={`nav-item ${activeMenu === "Projects" ? "active" : ""}`}
              onClick={() => { setActiveMenu("Projects"); router.push("/projects"); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>Projects</span>
            </button>

            <button
              className={`nav-item ${activeMenu === "Reports" ? "active" : ""}`}
              onClick={() => { setActiveMenu("Reports"); router.push("/reports"); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              <span>Reports</span>
            </button>

            <button
              className={`nav-item ${activeMenu === "Documents" ? "active" : ""}`}
              onClick={() => { setActiveMenu("Documents"); router.push("/documents"); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>Documents</span>
            </button>

            <button
              className={`nav-item ${activeMenu === "Teams" ? "active" : ""}`}
              onClick={() => { setActiveMenu("Teams"); router.push("/teams"); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>Teams</span>
            </button>
          </nav>

          <div className="nav-group-title" style={{ marginTop: "24px" }}>PREFERENCES</div>
          <nav className="nav-links">
            <button
              className={`nav-item ${activeMenu === "My Profile" ? "active" : ""}`}
              onClick={() => { setActiveMenu("My Profile"); router.push("/profile"); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>My Profile</span>
            </button>

            <button
              className={`nav-item ${activeMenu === "Settings" ? "active" : ""}`}
              onClick={() => { setActiveMenu("Settings"); router.push("/settings"); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* User Quick Info & Logout at bottom */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">
              {(user?.name || "U").charAt(0).toUpperCase()}
              <span className="online-indicator"></span>
            </div>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">{user?.name || "User"}</span>
              <span className="sidebar-user-email">{user?.email || "user@planora.app"}</span>
            </div>
            <button className="sidebar-logout-btn" onClick={logout} title="Log out">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* CENTER & RIGHT CONTENT WRAPPER */}
      <div className="planora-body">
        {/* 2. TOP NAVIGATION */}
        <header className="planora-topbar">
          <div className="topbar-welcome">
            <h1>
              Welcome back, <span>{user?.name || "User"}</span>! 👋
            </h1>
            <p>Organize, prioritize and accomplish your daily tasks with Planora.</p>
          </div>

          <div className="topbar-actions">
            {/* Search Bar */}
            <div className="topbar-search">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search tasks, priorities... (Ctrl + K)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="search-clear-btn" onClick={() => setSearch("")}>×</button>
              )}
            </div>

            {/* Notification Bell */}
            <div className="action-popover-wrapper">
              <button
                className={`topbar-icon-btn ${showNotifications ? "active" : ""}`}
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowMessages(false);
                }}
                title="Notifications"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span className="icon-badge">3</span>
              </button>

              {showNotifications && (
                <div className="popover-dropdown">
                  <div className="popover-header">
                    <h4>Notifications</h4>
                    <span className="popover-count">3 New</span>
                  </div>
                  <div className="popover-list">
                    <div className="popover-item unread">
                      <div className="popover-dot"></div>
                      <div>
                        <p><strong>{todoCount} tasks</strong> pending in your To Do column.</p>
                        <small>Just now</small>
                      </div>
                    </div>
                    <div className="popover-item">
                      <div className="popover-dot read"></div>
                      <div>
                        <p>Weekly progress report is ready to review.</p>
                        <small>2 hours ago</small>
                      </div>
                    </div>
                    <div className="popover-item">
                      <div className="popover-dot read"></div>
                      <div>
                        <p>Backend synchronized successfully.</p>
                        <small>Yesterday</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="action-popover-wrapper">
              <button
                className={`topbar-icon-btn ${showMessages ? "active" : ""}`}
                onClick={() => {
                  setShowMessages(!showMessages);
                  setShowNotifications(false);
                }}
                title="Messages"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span className="icon-badge alt">2</span>
              </button>

              {showMessages && (
                <div className="popover-dropdown">
                  <div className="popover-header">
                    <h4>Workspace Messages</h4>
                    <span className="popover-count">2 New</span>
                  </div>
                  <div className="popover-list">
                    <div className="popover-item unread">
                      <div className="popover-avatar">P</div>
                      <div>
                        <p><strong>Planora Assistant:</strong> Your productivity is up 18% this week!</p>
                        <small>30 mins ago</small>
                      </div>
                    </div>
                    <div className="popover-item">
                      <div className="popover-avatar alt">T</div>
                      <div>
                        <p><strong>Team Lead:</strong> Sprint review scheduled for 3:00 PM.</p>
                        <small>Yesterday</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* + Add Task Button */}
            <button className="topbar-add-task-btn" onClick={() => openCreateModal("To Do")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Add Task</span>
            </button>

            {/* Profile Avatar Icon */}
            <div className="action-popover-wrapper">
              <div
                className="topbar-profile-avatar"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                title={user?.name || "Profile"}
              >
                {(user?.name || "U").charAt(0).toUpperCase()}
              </div>

              {showProfileMenu && (
                <div className="popover-dropdown profile-dropdown">
                  <div className="profile-dropdown-header">
                    <p className="profile-name">{user?.name || "User"}</p>
                    <p className="profile-email">{user?.email || "user@planora.app"}</p>
                  </div>
                  <div className="profile-dropdown-actions">
                    <button onClick={() => { setActiveMenu("My Profile"); setShowProfileMenu(false); router.push("/profile"); }}>
                      My Profile
                    </button>
                    <button onClick={() => { setActiveMenu("Settings"); setShowProfileMenu(false); router.push("/settings"); }}>
                      Settings
                    </button>
                    <div className="dropdown-divider"></div>
                    <button className="logout-action" onClick={logout}>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Error notification banner if any */}
        {message && (
          <div className="planora-alert-bar">
            <span>{message}</span>
            <button onClick={() => setMessage("")}>×</button>
          </div>
        )}

        {/* MAIN DASHBOARD CONTENT AREA */}
        <div className="planora-main-container">
          <main className="planora-dashboard-content">
            {/* Quick Metrics Bar */}
            <div className="dashboard-stats-row">
              <div className="stat-card">
                <div className="stat-icon-wrap stat-purple">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <div>
                  <span className="stat-label">Total Tasks</span>
                  <div className="stat-value">{tasks.length}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrap stat-amber">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div>
                  <span className="stat-label">In Progress</span>
                  <div className="stat-value">{inProgressCount}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrap stat-green">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div>
                  <span className="stat-label">Completed</span>
                  <div className="stat-value">{completedCount}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrap stat-blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                    <polyline points="17 6 23 6 23 12"></polyline>
                  </svg>
                </div>
                <div>
                  <span className="stat-label">Productivity</span>
                  <div className="stat-value">{completionRate}%</div>
                </div>
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="dashboard-filter-toolbar">
              <div className="filter-pills">
                <span className="filter-pill-label">Priority:</span>
                {["All", "High", "Medium", "Low"].map((item) => (
                  <button
                    key={item}
                    className={`filter-pill ${priorityFilter === item ? "active" : ""}`}
                    onClick={() => setPriorityFilter(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="board-view-info">
                <span>Showing <strong>{filteredTasks.length}</strong> of {tasks.length} tasks</span>
              </div>
            </div>

            {/* 3. MAIN DASHBOARD: KANBAN COLUMNS */}
            <div className="planora-board">
              {STATUSES.map((statusName) => {
                const columnTasks = getTasksByStatus(statusName);
                const isTodo = statusName === "To Do";
                const isInProgress = statusName === "In Progress";
                const isCompleted = statusName === "Completed";

                return (
                  <section className="board-column" key={statusName}>
                    {/* Column Header */}
                    <div className="column-header">
                      <div className="column-title-group">
                        <span
                          className={`column-status-indicator ${
                            isTodo
                              ? "status-indicator-todo"
                              : isInProgress
                              ? "status-indicator-progress"
                              : "status-indicator-completed"
                          }`}
                        ></span>
                        <h3>{statusName}</h3>
                        <span className="column-count-badge">{columnTasks.length}</span>
                      </div>

                      <button
                        className="column-add-btn"
                        onClick={() => openCreateModal(statusName)}
                        title={`Add task to ${statusName}`}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </button>
                    </div>

                    {/* Column Task Cards */}
                    <div className="column-card-list">
                      {columnTasks.length === 0 ? (
                        <div className="empty-column-state">
                          <div className="empty-icon">☕</div>
                          <p>No {statusName.toLowerCase()} tasks</p>
                          <button
                            className="empty-add-btn"
                            onClick={() => openCreateModal(statusName)}
                          >
                            + Add a task
                          </button>
                        </div>
                      ) : (
                        columnTasks.map((task) => {
                          const pastel = getPastelTheme(task.id);
                          const progress = getProgressPercent(task.status);
                          const formattedDate = formatTaskDate(task.created_at);

                          return (
                            <article
                              className="pastel-task-card"
                              key={task.id}
                              style={{
                                backgroundColor: pastel.bg,
                                borderColor: pastel.border,
                              }}
                            >
                              {/* Card Header: Priority & Actions */}
                              <div className="card-top-row">
                                <span
                                  className={`task-priority-badge priority-${task.priority.toLowerCase()}`}
                                >
                                  {task.priority}
                                </span>

                                <div className="card-actions-menu">
                                  {/* Edit Button */}
                                  <button
                                    className="card-tool-btn edit"
                                    onClick={() => openEditModal(task)}
                                    title="Edit task"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    className="card-tool-btn delete"
                                    onClick={() => deleteTask(task.id, task.title)}
                                    title="Delete task"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                  </button>
                                </div>
                              </div>

                              {/* Task Title */}
                              <h4
                                className={`task-card-title ${
                                  task.status === "Completed" ? "completed-title" : ""
                                }`}
                              >
                                {task.title}
                              </h4>

                              {/* Due Date & Meta */}
                              <div className="card-meta-row">
                                <span className="card-date-badge">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                  </svg>
                                  {formattedDate}
                                </span>

                                <span className="card-assignee-avatar" title={`Assigned to ${user?.name || 'You'}`}>
                                  {(user?.name || "U").charAt(0).toUpperCase()}
                                </span>
                              </div>

                              {/* Task Progress Indicator */}
                              <div className="card-progress-wrapper">
                                <div className="progress-labels">
                                  <span>Progress</span>
                                  <span>{progress}%</span>
                                </div>
                                <div className="progress-track">
                                  <div
                                    className="progress-fill"
                                    style={{
                                      width: `${progress}%`,
                                      backgroundColor: pastel.progressBg,
                                    }}
                                  ></div>
                                </div>
                              </div>

                              {/* Quick Move / Status Transition Buttons */}
                              <div className="card-status-actions">
                                {task.status === "To Do" && (
                                  <button
                                    className="status-move-btn start"
                                    onClick={() => changeStatus(task, "In Progress")}
                                  >
                                    Start Task →
                                  </button>
                                )}

                                {task.status === "In Progress" && (
                                  <>
                                    <button
                                      className="status-move-btn back"
                                      onClick={() => changeStatus(task, "To Do")}
                                    >
                                      ← Back
                                    </button>
                                    <button
                                      className="status-move-btn complete"
                                      onClick={() => changeStatus(task, "Completed")}
                                    >
                                      Complete ✓
                                    </button>
                                  </>
                                )}

                                {task.status === "Completed" && (
                                  <button
                                    className="status-move-btn undo"
                                    onClick={() => changeStatus(task, "To Do")}
                                  >
                                    ↺ Reopen Task
                                  </button>
                                )}
                              </div>
                            </article>
                          );
                        })
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </main>

          {/* 4. RIGHT SIDEBAR */}
          <aside className="planora-right-sidebar">
            {/* Task Statistics Widget */}
            <div className="right-widget-card stats-widget">
              <div className="widget-header">
                <h3>Task Statistics</h3>
                <span className="widget-badge">Realtime</span>
              </div>

              {/* Radial / Donut Visual */}
              <div className="donut-chart-container">
                <svg className="donut-svg" width="130" height="130" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <path
                    className="donut-bg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Progress Circle */}
                  <path
                    className="donut-fill"
                    strokeDasharray={`${completionRate}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="donut-text">
                  <span className="donut-percent">{completionRate}%</span>
                  <span className="donut-sub">Done</span>
                </div>
              </div>

              {/* Mini Legend Stats */}
              <div className="stats-legend">
                <div className="legend-row">
                  <div className="legend-label">
                    <span className="legend-dot dot-completed"></span>
                    <span>Completed</span>
                  </div>
                  <strong>{completedCount}</strong>
                </div>
                <div className="legend-row">
                  <div className="legend-label">
                    <span className="legend-dot dot-progress"></span>
                    <span>In Progress</span>
                  </div>
                  <strong>{inProgressCount}</strong>
                </div>
                <div className="legend-row">
                  <div className="legend-label">
                    <span className="legend-dot dot-todo"></span>
                    <span>To Do</span>
                  </div>
                  <strong>{todoCount}</strong>
                </div>
              </div>
            </div>

            {/* Recent Activity Widget */}
            <div className="right-widget-card activity-widget">
              <div className="widget-header">
                <h3>Recent Activity</h3>
                <span className="activity-live-indicator">● LIVE</span>
              </div>

              <div className="activity-timeline">
                {activities.map((item) => (
                  <div className="timeline-item" key={item.id}>
                    <div className={`timeline-marker marker-${item.type}`}>
                      {item.type === "created" && "+"}
                      {item.type === "completed" && "✓"}
                      {item.type === "moved" && "→"}
                      {item.type === "updated" && "✎"}
                      {item.type === "deleted" && "✕"}
                    </div>
                    <div className="timeline-details">
                      <p>{item.text}</p>
                      <small>{item.time}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reports & Insights Widget */}
            <div className="right-widget-card reports-widget">
              <div className="widget-header">
                <h3>Reports & Insights</h3>
              </div>

              <div className="priority-bars-container">
                <div className="priority-bar-item">
                  <div className="bar-labels">
                    <span>High Priority</span>
                    <span>{highPriorityCount}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill bar-fill-high"
                      style={{
                        width: tasks.length ? `${(highPriorityCount / tasks.length) * 100}%` : "0%",
                      }}
                    ></div>
                  </div>
                </div>

                <div className="priority-bar-item">
                  <div className="bar-labels">
                    <span>Medium Priority</span>
                    <span>{medPriorityCount}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill bar-fill-medium"
                      style={{
                        width: tasks.length ? `${(medPriorityCount / tasks.length) * 100}%` : "0%",
                      }}
                    ></div>
                  </div>
                </div>

                <div className="priority-bar-item">
                  <div className="bar-labels">
                    <span>Low Priority</span>
                    <span>{lowPriorityCount}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill bar-fill-low"
                      style={{
                        width: tasks.length ? `${(lowPriorityCount / tasks.length) * 100}%` : "0%",
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="planora-tip-box">
                <span className="tip-sparkle">💡</span>
                <p>
                  <strong>Pro Tip:</strong> Tackle High-priority tasks during your peak energy hours to maximize focus!
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* MODAL: ADD / EDIT TASK (PLANORA MODAL DESIGN) */}
      {isModalOpen && (
        <div className="planora-modal-backdrop" onClick={closeModal}>
          <div
            className="planora-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div>
                  <h3>{modalMode === "create" ? "Add New Task" : "Edit Task"}</h3>
                  <p>{modalMode === "create" ? "Create a new item for your workspace." : "Update task details."}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmitTask} className="modal-form">
              <div className="form-group">
                <label>Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Redesign mobile wireframes"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Priority</label>
                  <div className="priority-pill-picker">
                    {PRIORITIES.map((p) => (
                      <button
                        type="button"
                        key={p}
                        className={`picker-pill pill-${p.toLowerCase()} ${
                          taskPriority === p ? "selected" : ""
                        }`}
                        onClick={() => setTaskPriority(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Status Column</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value)}
                    className="modal-select"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Due Date Preset</label>
                <div className="date-preset-row">
                  {["Today", "Tomorrow", "Next Week"].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      className={`date-preset-btn ${taskDueDate === preset ? "active" : ""}`}
                      onClick={() => setTaskDueDate(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-submit-btn">
                  {modalMode === "create" ? "Create Task" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
