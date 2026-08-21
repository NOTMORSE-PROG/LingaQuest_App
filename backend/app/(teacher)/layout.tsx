"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { usePathname } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Auth context shared between layout and child pages ───────────────────
interface AuthCtx { token: string; logout: () => void }
const AuthContext = createContext<AuthCtx | null>(null);
export function useTeacherAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useTeacherAuth must be used inside (teacher) layout");
  return ctx;
}

// ── Layout ───────────────────────────────────────────────────────────────
export default function TeacherLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [logging, setLogging] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("lq_admin_token");
    if (saved) setToken(saved);
    setReady(true);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLogging(true);
    setLoginError("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      if (data.user?.role === "STUDENT")
        throw new Error("Student accounts cannot access the teacher portal.");
      sessionStorage.setItem("lq_admin_token", data.token);
      setToken(data.token);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLogging(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("lq_admin_token");
    setToken(null);
  }

  // Don't render until we've checked sessionStorage
  if (!ready) return null;

  // ── Login screen ──
  if (!token) {
    return (
      <main style={{ minHeight: "100vh", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <form onSubmit={handleLogin} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "2.5rem", width: 360, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
          <h1 style={{ color: "#f5c518", marginBottom: 4, fontSize: 24 }}>LinguaQuest</h1>
          <p style={{ color: "#64748b", marginBottom: 28, fontSize: 14 }}>Teacher Portal</p>
          {loginError && (
            <div style={{ background: "#fef2f2", color: "#dc2626", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 14, border: "1px solid #fecaca" }}>
              {loginError}
            </div>
          )}
          <label style={{ color: "#1e293b", fontSize: 13, display: "block", marginBottom: 4 }}>Username</label>
          <input
            type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            required autoFocus
            style={{ width: "100%", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 12px", color: "#1e293b", fontSize: 15, marginBottom: 16, boxSizing: "border-box" }}
          />
          <label style={{ color: "#1e293b", fontSize: 13, display: "block", marginBottom: 4 }}>Password</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 12px", color: "#1e293b", fontSize: 15, marginBottom: 24, boxSizing: "border-box" }}
          />
          <button
            type="submit" disabled={logging}
            className="btn-hover"
            style={{ width: "100%", background: "#f5c518", color: "#0a0e1a", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 16, cursor: logging ? "not-allowed" : "pointer" }}
          >
            {logging ? "Logging in..." : "Log In"}
          </button>
        </form>
      </main>
    );
  }

  // ── Authenticated layout with navbar ──
  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/audio", label: "Audio Manager" },
  ];

  return (
    <AuthContext.Provider value={{ token, logout }}>
      <div style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "system-ui, sans-serif" }}>
        {/* Navbar */}
        <nav className="nav-inner" style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <span style={{ color: "#f5c518", fontWeight: 800, fontSize: 18 }}>LinguaQuest</span>
            <div className="nav-links">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: active ? 700 : 500,
                      color: active ? "#0a0e1a" : "#64748b",
                      background: active ? "#fef9c3" : "transparent",
                      textDecoration: "none",
                      transition: "background 0.15s",
                    }}
                  >
                    {link.label}
                  </a>
                );
              })}
            </div>
          </div>
          <button
            onClick={logout}
            className="btn-hover-ghost"
            style={{ background: "transparent", border: "1px solid #d1d5db", color: "#64748b", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}
          >
            Log out
          </button>
        </nav>

        {/* Page content */}
        <div className="page-content">
          {children}
        </div>
      </div>
    </AuthContext.Provider>
  );
}
