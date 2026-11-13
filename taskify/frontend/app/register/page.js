"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "../lib/api";

export default function Register() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to create your account."
        );
        return;
      }

      router.push("/login");
    } catch {
      setError("Cannot connect to Python backend. Please check that it is running.");
    } finally {
      setLoading(false);
    }

  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo">Taskify</h1>
        <h2>Create Account</h2>
        <p>Start managing your daily tasks.</p>

        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Create Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p>
          Already have an account?{" "}
          <Link href="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
