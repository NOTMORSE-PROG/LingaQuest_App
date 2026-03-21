"use client";

import { useState, useEffect, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
interface Challenge {
  id: string;
  audioUrl: string;
  audioScript: string | null;
  question: string;
  sortOrder: number;
}
interface Pin {
  id: string;
  number: number;
  challenges: Challenge[];
}
interface Island {
  id: string;
  number: number;
  name: string;
  skillFocus: string;
  npcDialogueIntro: string | null;
  npcDialogueSuccess: string | null;
  npcDialogueFail: string | null;
  npcAudioIntro: string | null;
  npcAudioSuccess: string | null;
  npcAudioFail: string | null;
  ingayAudioUrl: string | null;
  pins: Pin[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Helpers ────────────────────────────────────────────────────────────────
const IS_REAL_URL = (url: string) =>
  url.startsWith("https://res.cloudinary.com") ||
  (url.startsWith("https://") && !url.includes("assets.linguaquest.app"));

// ── Sub-components ─────────────────────────────────────────────────────────
function UploadButton({
  targetType,
  targetId,
  token,
  onDone,
}: {
  targetType: string;
  targetId: string;
  token: string;
  onDone: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setState("uploading");
    setErrorMsg("");

    const body = new FormData();
    body.append("file", file);
    body.append("targetType", targetType);
    body.append("targetId", targetId);

    try {
      const res = await fetch(`${API}/api/admin/upload-audio`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setState("done");
      onDone(data.url);
    } catch (err: any) {
      setState("error");
      setErrorMsg(err.message);
    }

    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,.mp3"
        style={{ display: "none" }}
        onChange={handleFile}
      />
      <button
        onClick={() => { setState("idle"); inputRef.current?.click(); }}
        disabled={state === "uploading"}
        style={{
          background: state === "done" ? "#16a34a" : state === "error" ? "#dc2626" : "#d97706",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "6px 14px",
          fontSize: 13,
          cursor: state === "uploading" ? "not-allowed" : "pointer",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {state === "uploading" ? "Uploading…" : state === "done" ? "✓ Replaced" : "Upload MP3"}
      </button>
      {state === "error" && (
        <span style={{ color: "#dc2626", fontSize: 12 }}>{errorMsg}</span>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AdminAudioPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [logging, setLogging] = useState(false);

  const [islands, setIslands] = useState<Island[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"challenges" | "npc">("challenges");
  const [showGuide, setShowGuide] = useState(false);

  // Restore token from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("lq_admin_token");
    if (saved) setToken(saved);
  }, []);

  // Fetch islands when token is available
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/api/islands`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setIslands(data);
        else { setToken(null); sessionStorage.removeItem("lq_admin_token"); }
      })
      .catch(() => { setToken(null); sessionStorage.removeItem("lq_admin_token"); })
      .finally(() => setLoading(false));
  }, [token]);

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
      if (data.user?.role === "STUDENT") throw new Error("Student accounts cannot access the admin panel.");
      sessionStorage.setItem("lq_admin_token", data.token);
      setToken(data.token);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLogging(false);
    }
  }

  function updateChallengeAudioUrl(islandId: string, pinId: string, challengeId: string, url: string) {
    setIslands((prev) =>
      prev.map((isl) =>
        isl.id !== islandId ? isl : {
          ...isl,
          pins: isl.pins.map((pin) =>
            pin.id !== pinId ? pin : {
              ...pin,
              challenges: pin.challenges.map((ch) =>
                ch.id !== challengeId ? ch : { ...ch, audioUrl: url }
              ),
            }
          ),
        }
      )
    );
  }

  function updateIslandAudioUrl(islandId: string, field: keyof Island, url: string) {
    setIslands((prev) =>
      prev.map((isl) => isl.id !== islandId ? isl : { ...isl, [field]: url })
    );
  }

  // ── Login screen ──
  if (!token) {
    return (
      <main style={{ minHeight: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <form onSubmit={handleLogin} style={{ background: "#111827", border: "1px solid #1f3a5c", borderRadius: 16, padding: "2.5rem", width: 360 }}>
          <h1 style={{ color: "#f5c518", marginBottom: 4, fontSize: 24 }}>⚓ LinguaQuest</h1>
          <p style={{ color: "#9ca3af", marginBottom: 28, fontSize: 14 }}>Teacher Audio Manager</p>
          {loginError && (
            <div style={{ background: "#7f1d1d", color: "#fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>
              {loginError}
            </div>
          )}
          <label style={{ color: "#d1d5db", fontSize: 13, display: "block", marginBottom: 4 }}>Username</label>
          <input
            type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            required autoFocus
            style={{ width: "100%", background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "10px 12px", color: "white", fontSize: 15, marginBottom: 16, boxSizing: "border-box" }}
          />
          <label style={{ color: "#d1d5db", fontSize: 13, display: "block", marginBottom: 4 }}>Password</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "10px 12px", color: "white", fontSize: 15, marginBottom: 24, boxSizing: "border-box" }}
          />
          <button
            type="submit" disabled={logging}
            style={{ width: "100%", background: "#f5c518", color: "#0a0e1a", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 16, cursor: logging ? "not-allowed" : "pointer" }}
          >
            {logging ? "Logging in…" : "Log In"}
          </button>
        </form>
      </main>
    );
  }

  // ── Loading screen ──
  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#f5c518", fontSize: 18 }}>Loading islands…</p>
      </main>
    );
  }

  // ── Main admin UI ──
  const allChallenges = islands.flatMap((isl) => isl.pins.flatMap((pin) => pin.challenges));
  const withAudio = allChallenges.filter((c) => IS_REAL_URL(c.audioUrl)).length;

  return (
    <main style={{ minHeight: "100vh", background: "#0a0e1a", padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ color: "#f5c518", fontSize: 26, margin: 0 }}>⚓ LinguaQuest Audio Manager</h1>
          <p style={{ color: "#6b7280", fontSize: 13, margin: "4px 0 0" }}>
            Challenge clips: {withAudio}/{allChallenges.length} uploaded
          </p>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem("lq_admin_token"); setToken(null); }}
          style={{ background: "transparent", border: "1px solid #374151", color: "#9ca3af", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13 }}
        >
          Log out
        </button>
      </div>

      {/* How to Use */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={() => setShowGuide((v) => !v)}
          style={{
            background: "transparent", border: "1px solid #374151", color: "#d1d5db",
            borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13,
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <span>📋 How to Use</span>
          <span style={{ fontSize: 11, color: "#6b7280" }}>{showGuide ? "▲ hide" : "▼ show"}</span>
        </button>
        {showGuide && (
          <div style={{
            marginTop: 10,
            background: "#111827",
            border: "1px solid #1f3a5c",
            borderRadius: 12,
            padding: "20px 24px",
            fontSize: 13,
            color: "#d1d5db",
            lineHeight: 1.7,
          }}>
            <p style={{ color: "#f5c518", fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Teacher Guide — Audio Upload</p>
            <ol style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <li>
                <strong style={{ color: "#e2c97e" }}>Challenge Audio tab</strong> — For each challenge you'll see the full script text (what was recorded). Find the matching MP3 file on your computer and click <strong>Upload MP3</strong>. A <span style={{ color: "#22c55e" }}>green border</span> means the audio is already uploaded; grey means it's missing.
              </li>
              <li>
                <strong style={{ color: "#e2c97e" }}>NPC Dialogue Audio tab</strong> — Each island has 4 voice slots: Captain Salita's introduction, success message, and fail message, plus Ingay's warning voice. Upload the matching MP3 for each.
              </li>
              <li>
                <strong style={{ color: "#e2c97e" }}>File format</strong> — MP3 files only (<code style={{ background: "#1f2937", padding: "1px 5px", borderRadius: 4 }}>.mp3</code>). Keep files under 10MB for best performance.
              </li>
              <li>
                <strong style={{ color: "#e2c97e" }}>Goes live immediately</strong> — As soon as you upload, the audio plays in the student app. No app update needed.
              </li>
              <li>
                <strong style={{ color: "#e2c97e" }}>Replace anytime</strong> — To swap out a clip, just upload a new file to the same slot. The old one is replaced automatically.
              </li>
            </ol>
            <p style={{ color: "#6b7280", fontSize: 12, marginTop: 14, marginBottom: 0 }}>
              Tip: You can play back each uploaded clip directly on this page using the audio preview player next to each challenge.
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: "2rem" }}>
        {(["challenges", "npc"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? "#f5c518" : "#111827",
              color: tab === t ? "#0a0e1a" : "#d1d5db",
              border: "1px solid " + (tab === t ? "#f5c518" : "#374151"),
              borderRadius: 8, padding: "8px 20px", fontWeight: 600, cursor: "pointer", fontSize: 14,
            }}
          >
            {t === "challenges" ? "🎧 Challenge Audio" : "🧙 NPC Dialogue Audio"}
          </button>
        ))}
      </div>

      {/* ── Challenge Audio Tab ── */}
      {tab === "challenges" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {islands.map((island) => (
            <div key={island.id}>
              <h2 style={{ color: "#f5c518", fontSize: 18, marginBottom: 12 }}>
                Island {island.number} — {island.name}
                <span style={{ color: "#6b7280", fontSize: 13, fontWeight: 400, marginLeft: 10 }}>{island.skillFocus}</span>
              </h2>
              {island.pins.map((pin) => (
                <div key={pin.id} style={{ marginLeft: 16, marginBottom: 16 }}>
                  <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 8 }}>📍 Pin {pin.number}</p>
                  {pin.challenges.map((ch, idx) => {
                    const hasAudio = IS_REAL_URL(ch.audioUrl);
                    return (
                      <div
                        key={ch.id}
                        style={{
                          background: "#111827",
                          border: `1px solid ${hasAudio ? "#166534" : "#374151"}`,
                          borderRadius: 12,
                          padding: "16px 20px",
                          marginBottom: 10,
                          display: "flex",
                          gap: 16,
                          alignItems: "flex-start",
                        }}
                      >
                        {/* Status dot */}
                        <div style={{ marginTop: 3, flexShrink: 0, width: 10, height: 10, borderRadius: "50%", background: hasAudio ? "#16a34a" : "#6b7280" }} />

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: "#d1d5db", fontWeight: 600, fontSize: 14, margin: "0 0 4px" }}>
                            Challenge {idx + 1}
                          </p>
                          {ch.audioScript && (
                            <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 8px", lineHeight: 1.5 }}>
                              "{ch.audioScript.length > 160 ? ch.audioScript.slice(0, 160) + "…" : ch.audioScript}"
                            </p>
                          )}
                          {hasAudio && (
                            <audio controls src={ch.audioUrl} style={{ height: 28, width: "100%", maxWidth: 320, marginBottom: 6 }} />
                          )}
                        </div>

                        {/* Upload */}
                        <div style={{ flexShrink: 0 }}>
                          <UploadButton
                            targetType="challenge"
                            targetId={ch.id}
                            token={token}
                            onDone={(url) => updateChallengeAudioUrl(island.id, pin.id, ch.id, url)}
                          />
                          <p style={{ color: "#4b5563", fontSize: 11, marginTop: 4, textAlign: "right" }}>
                            {hasAudio ? "Replace audio" : "No audio yet"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── NPC Dialogue Audio Tab ── */}
      {tab === "npc" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <p style={{ color: "#9ca3af", fontSize: 13, margin: "-8px 0 0" }}>
            Upload voice clips for Captain Salita's NPC dialogue and Ingay's warning per island.
          </p>
          {islands.map((island) => (
            <div key={island.id} style={{ background: "#111827", border: "1px solid #1f3a5c", borderRadius: 16, padding: "20px 24px" }}>
              <h2 style={{ color: "#f5c518", fontSize: 17, marginBottom: 16 }}>
                Island {island.number} — {island.name}
              </h2>
              {(
                [
                  { label: "🧙 Captain Intro", text: island.npcDialogueIntro, field: "npcAudioIntro" as keyof Island, targetType: "island-intro", url: island.npcAudioIntro },
                  { label: "✅ Captain Success", text: island.npcDialogueSuccess, field: "npcAudioSuccess" as keyof Island, targetType: "island-success", url: island.npcAudioSuccess },
                  { label: "❌ Captain Fail", text: island.npcDialogueFail, field: "npcAudioFail" as keyof Island, targetType: "island-fail", url: island.npcAudioFail },
                  { label: "⚡ Ingay Warning", text: "Ingay's taunting voice for this island.", field: "ingayAudioUrl" as keyof Island, targetType: "island-ingay", url: island.ingayAudioUrl },
                ] as const
              ).map(({ label, text, field, targetType, url }) => (
                <div
                  key={targetType}
                  style={{
                    display: "flex", gap: 16, alignItems: "flex-start",
                    paddingBottom: 14, marginBottom: 14,
                    borderBottom: "1px solid #1f2937",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ color: "#d1d5db", fontWeight: 600, fontSize: 13, margin: "0 0 4px" }}>{label}</p>
                    {text && (
                      <p style={{ color: "#6b7280", fontSize: 12, margin: "0 0 6px", lineHeight: 1.5, fontStyle: "italic" }}>
                        "{text.length > 120 ? text.slice(0, 120) + "…" : text}"
                      </p>
                    )}
                    {url && IS_REAL_URL(url) && (
                      <audio controls src={url} style={{ height: 26, width: "100%", maxWidth: 280 }} />
                    )}
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <UploadButton
                      targetType={targetType}
                      targetId={island.id}
                      token={token}
                      onDone={(newUrl) => updateIslandAudioUrl(island.id, field, newUrl)}
                    />
                    <p style={{ color: "#4b5563", fontSize: 11, marginTop: 4, textAlign: "right" }}>
                      {url && IS_REAL_URL(url) ? "Replace" : "Not uploaded"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
