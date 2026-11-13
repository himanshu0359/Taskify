import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata = {
  title: "Planora | Modern Task Workspace",
  description: "Organize, prioritize, and manage tasks with ease.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Sidebar />
          <div className="route-content">{children}</div>
        </div>
      </body>
    </html>
  );
}