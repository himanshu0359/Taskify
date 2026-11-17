"use client";

import { useState } from "react";
import Link from "next/link";
import { API_URL } from "../lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Invalid email or password."
        );
        return;
      }

      // Support either { user: {...} } or a direct user response.
      const loggedInUser = data.user || data;

      if (!loggedInUser.email) {
        setError("Login succeeded, but user information was not returned.");
        return;
      }

      sessionStorage.setItem(
        "taskifyLoggedIn",
        JSON.stringify({
          id: loggedInUser.id,
          name: loggedInUser.name || "User",
          email: loggedInUser.email,
          token: data.token,
        })
      );

      // Reload the dashboard after saving the session.
      window.location.assign("/");
    } catch {
      setError(
        "Cannot connect to Python backend. Please check that it is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleLogin}>
        <h1 className="auth-logo">Taskify.</h1>

        <h2>Welcome Back!</h2>
        <p>Login to manage your tasks.</p>

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p>
          Don't have an account? <Link href="/register">Create Account</Link>
        </p>
      </form>
    </div>
  );
}
