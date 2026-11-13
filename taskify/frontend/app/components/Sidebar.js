"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { name: "Dashboard", icon: "▦", path: "/" },
  { name: "Tasks", icon: "☑", path: "/tasks" },
  { name: "Schedule", icon: "▢", path: "/schedule" },
  { name: "Projects", icon: "▱", path: "/projects" },
  { name: "Reports", icon: "▥", path: "/reports" },
  { name: "Documents", icon: "▤", path: "/documents" },
  { name: "Teams", icon: "♧", path: "/teams" },
];

const preferenceItems = [
  { name: "My Profile", icon: "♙", path: "/profile" },
  { name: "Settings", icon: "⚙", path: "/settings" },
];

const routesWithOwnNavigation = ["/", "/login", "/register", "/admin"];

export default function Sidebar() {
  const pathname = usePathname();

  if (routesWithOwnNavigation.includes(pathname)) {
    return null;
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>✦</span>
        <div>
          <h2>Planora</h2>
          <small>TASKIFY WORKSPACE</small>
        </div>
      </div>

      <nav className="sidebar-menu" aria-label="Main navigation">
        <p className="menu-heading">MAIN MENU</p>

        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`sidebar-link ${pathname === item.path ? "active" : ""}`}
            aria-current={pathname === item.path ? "page" : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.name}
          </Link>
        ))}

        <p className="menu-heading preferences-heading">PREFERENCES</p>

        {preferenceItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`sidebar-link ${pathname === item.path ? "active" : ""}`}
            aria-current={pathname === item.path ? "page" : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="user-avatar">H</div>
        <div>
          <strong>My Account</strong>
          <small>Taskify User</small>
        </div>
      </div>
    </aside>
  );
}
