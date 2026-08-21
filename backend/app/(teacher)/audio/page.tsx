"use client";

import { useState, useEffect, useRef } from "react";
import { useTeacherAuth } from "../layout";

// ── Types ──────────────────────────────────────────────────────────────────
interface Challenge {
  id: string;
  audioUrl: string;
  audioScript: string | null;
  question: string;
  explanation: string;
  sortOrder: number;
  explanationAudioUrl: string | null;
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
  ingayDialogue: string | null;
  bgMusicUrl: string | null;
  pins: Pin[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

const IS_REAL_URL = (url: string) =>
  url.startsWith("https://res.cloudinary.com") ||
  (url.startsWith("https://") && !url.includes("assets.linguaquest.app"));

// ── Sub-components ─────────────────────────────────────────────────────────
function UploadButton({
  targetType,
  targetId,
  token,
  onDone,
  hasAudio,
}: {
  targetType: string;
  targetId: string;
  token: string;
  onDone: (url: string) => void;
  hasAudio: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isDisabled = state === "uploading" || hasAudio;

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
      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status}). Try a smaller file.`);
      }
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setState("done");
      onDone(data.url);
    } catch (err: any) {
      setState("error");
      setErrorMsg(err.message);
    }

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
        disabled={isDisabled}
        className="btn-hover"
        style={{
          background: isDisabled
            ? "#94a3b8"
            : state === "done" ? "#16a34a" : state === "error" ? "#dc2626" : "#d97706",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "6px 14px",
          fontSize: 13,
          cursor: isDisabled ? "not-allowed" : "pointer",
          fontWeight: 600,
          whiteSpace: "nowrap",
          opacity: isDisabled ? 0.7 : 1,
        }}
      >
        {state === "uploading" ? "Uploading..." : state === "done" ? "Replaced" : hasAudio ? "Uploaded" : "Upload MP3"}
      </button>
      {state === "error" && (
        <span style={{ color: "#dc2626", fontSize: 12 }}>{errorMsg}</span>
      )}
    </div>
  );
}

function DeleteButton({
  targetType,
  targetId,
  token,
  onDeleted,
}: {
  targetType: string;
  targetId: string;
  token: string;
  onDeleted: () => void;
}) {
  const [state, setState] = useState<"idle" | "confirm" | "deleting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleConfirm() {
    setState("deleting");
    setErrorMsg("");

    try {
      const res = await fetch(`${API}/api/admin/delete-audio`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetType, targetId }),
      });
      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status})`);
      }
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      onDeleted();
    } catch (err: any) {
      setState("error");
      setErrorMsg(err.message);
    }
  }

  if (state === "confirm") {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>Sure?</span>
        <button
          onClick={handleConfirm}
          className="btn-hover"
          style={{
            background: "#dc2626", color: "white", border: "none",
            borderRadius: 8, padding: "6px 12px", fontSize: 13,
            cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
          }}
        >
          Yes
        </button>
        <button
          onClick={() => setState("idle")}
          className="btn-hover-ghost"
          style={{
            background: "transparent", color: "#64748b", border: "1px solid #d1d5db",
            borderRadius: 8, padding: "6px 12px", fontSize: 13,
            cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
          }}
        >
          No
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <button
        onClick={() => setState("confirm")}
        disabled={state === "deleting"}
        className="btn-hover-danger"
        style={{
          background: "transparent",
          color: "#dc2626",
          border: "1px solid #dc2626",
          borderRadius: 8,
          padding: "6px 14px",
          fontSize: 13,
          cursor: state === "deleting" ? "not-allowed" : "pointer",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {state === "deleting" ? "Deleting..." : "Delete"}
      </button>
      {state === "error" && (
        <span style={{ color: "#dc2626", fontSize: 12 }}>{errorMsg}</span>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AudioManagerPage() {
  const { token } = useTeacherAuth();

  const [islands, setIslands] = useState<Island[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [filterIsland, setFilterIsland] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API}/api/islands`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setIslands(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

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

  function updateChallengeExplanationAudioUrl(islandId: string, pinId: string, challengeId: string, url: string) {
    setIslands((prev) =>
      prev.map((isl) =>
        isl.id !== islandId ? isl : {
          ...isl,
          pins: isl.pins.map((pin) =>
            pin.id !== pinId ? pin : {
              ...pin,
              challenges: pin.challenges.map((ch) =>
                ch.id !== challengeId ? ch : { ...ch, explanationAudioUrl: url }
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

  if (loading) {
    return <p style={{ color: "#64748b", fontSize: 18, textAlign: "center", marginTop: 80 }}>Loading islands...</p>;
  }

  const allChallenges = islands.flatMap((isl) => isl.pins.flatMap((pin) => pin.challenges));
  const withAudio = allChallenges.filter((c) => IS_REAL_URL(c.audioUrl)).length;

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ color: "#1e293b", fontSize: 24, margin: 0 }}>Audio Manager</h1>
          <p style={{ color: "#94a3b8", fontSize: 13, margin: "4px 0 0" }}>
            Challenge clips: {withAudio}/{allChallenges.length} uploaded
          </p>
        </div>
      </div>

      {/* How to Use */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={() => setShowGuide((v) => !v)}
          className="btn-hover-ghost"
          style={{
            background: "transparent", border: "1px solid #e2e8f0", color: "#1e293b",
            borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13,
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <span>How to Use</span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>{showGuide ? "hide" : "show"}</span>
        </button>
        {showGuide && (
          <div style={{
            marginTop: 10,
            background: "#f8fafc",
            border: "1px solid #bfdbfe",
            borderRadius: 12,
            padding: "20px 24px",
            fontSize: 13,
            color: "#1e293b",
            lineHeight: 1.7,
          }}>
            <p style={{ color: "#f5c518", fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Teacher Guide — Audio Upload</p>
            <ol style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <li>
                <strong style={{ color: "#1e293b" }}>NPC Voice Clips</strong> — At the top of each island you&apos;ll find 4 voice slots: Captain Salita&apos;s introduction, success message, and fail message, plus Ingay&apos;s warning. Each shows the script to read. Upload the matching MP3 for each slot.
              </li>
              <li>
                <strong style={{ color: "#1e293b" }}>Challenge Audio</strong> — Below the NPC section, each pin&apos;s challenges show the full script (what to read aloud). Record it, export as MP3, then click <strong>Upload MP3</strong>. A <span style={{ color: "#16a34a" }}>green border</span> means audio is already uploaded; grey means it&apos;s missing.
              </li>
              <li>
                <strong style={{ color: "#1e293b" }}>File format</strong> — MP3 files only (<code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 4, color: "#475569" }}>.mp3</code>). Keep files under 10MB for best performance.
              </li>
              <li>
                <strong style={{ color: "#1e293b" }}>Goes live immediately</strong> — As soon as you upload, the audio plays in the student app. No app update needed.
              </li>
              <li>
                <strong style={{ color: "#1e293b" }}>Replace anytime</strong> — To swap out a clip, just upload a new file to the same slot. The old one is replaced automatically.
              </li>
            </ol>
            <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 14, marginBottom: 0 }}>
              Tip: You can play back each uploaded clip directly on this page using the audio preview player next to each entry.
            </p>
          </div>
        )}
      </div>

      {/* Island Filter */}
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Filter by island
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setFilterIsland(null)}
            className="btn-hover"
            style={{
              background: filterIsland === null ? "#f5c518" : "#f1f5f9",
              color: filterIsland === null ? "#0a0e1a" : "#475569",
              border: "1px solid " + (filterIsland === null ? "#f5c518" : "#e2e8f0"),
              borderRadius: 8, padding: "6px 16px", fontWeight: 600, cursor: "pointer", fontSize: 13,
            }}
          >
            All
          </button>
          {islands.map((isl) => (
            <button
              key={isl.id}
              onClick={() => setFilterIsland(isl.number)}
              className="btn-hover"
              style={{
                background: filterIsland === isl.number ? "#f5c518" : "#f1f5f9",
                color: filterIsland === isl.number ? "#0a0e1a" : "#475569",
                border: "1px solid " + (filterIsland === isl.number ? "#f5c518" : "#e2e8f0"),
                borderRadius: 8, padding: "6px 16px", fontWeight: 600, cursor: "pointer", fontSize: 13,
              }}
            >
              Island {isl.number}
            </button>
          ))}
        </div>
      </div>

      {/* Audio Manager */}
      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
        <div style={{ background: "#f8fafc", border: "1px solid #bfdbfe", borderRadius: 12, padding: "14px 20px" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#1e293b", lineHeight: 1.6 }}>
            <strong>Recording Guide</strong> — Read each script aloud into your recording app, export as MP3, then upload below.
            Speak clearly at a natural pace — students will hear each clip once with no replay.
          </p>
        </div>

        {islands.filter((isl) => filterIsland === null || isl.number === filterIsland).map((island) => (
          <div key={island.id} style={{ borderLeft: "4px solid #f5c518", paddingLeft: 20 }}>
            <h2 style={{ color: "#1e293b", fontSize: 20, margin: "0 0 4px" }}>
              Island {island.number} — {island.name}
            </h2>
            <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px" }}>
              Skill focus: <em>{island.skillFocus}</em>
            </p>

            {/* NPC Voice Clips */}
            <div style={{ background: "#f8fafc", border: "1px solid #bfdbfe", borderRadius: 12, padding: "16px 20px", marginBottom: 28 }}>
              <p style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
                Captain Salita &amp; Ingay — Voice Clips
              </p>
              {/* Background Music */}
              <div className="audio-row" style={{ paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: "#1e293b", fontWeight: 600, fontSize: 13, margin: "0 0 4px" }}>Background Music</p>
                  <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 6px", lineHeight: 1.5 }}>
                    Custom MP3 to loop while students are on this island. If not uploaded, a default track plays.
                  </p>
                  {island.bgMusicUrl && IS_REAL_URL(island.bgMusicUrl) && (
                    <audio controls src={island.bgMusicUrl} style={{ height: 26, width: "100%", maxWidth: 320 }} />
                  )}
                </div>
                <div className="audio-row-actions" style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <UploadButton
                      targetType="island-bgmusic"
                      targetId={island.id}
                      token={token}
                      onDone={(url) => updateIslandAudioUrl(island.id, "bgMusicUrl", url)}
                      hasAudio={!!(island.bgMusicUrl && IS_REAL_URL(island.bgMusicUrl))}
                    />
                    {island.bgMusicUrl && IS_REAL_URL(island.bgMusicUrl) && (
                      <DeleteButton
                        targetType="island-bgmusic"
                        targetId={island.id}
                        token={token}
                        onDeleted={() => updateIslandAudioUrl(island.id, "bgMusicUrl", "")}
                      />
                    )}
                  </div>
                  <p style={{ color: "#94a3b8", fontSize: 11, marginTop: 0, textAlign: "right" }}>
                    {island.bgMusicUrl && IS_REAL_URL(island.bgMusicUrl) ? "Uploaded" : "Using default"}
                  </p>
                </div>
              </div>

              {(
                [
                  { label: "Captain Intro", text: island.npcDialogueIntro, field: "npcAudioIntro" as keyof Island, targetType: "island-intro", url: island.npcAudioIntro },
                  { label: "Captain Success", text: island.npcDialogueSuccess, field: "npcAudioSuccess" as keyof Island, targetType: "island-success", url: island.npcAudioSuccess },
                  { label: "Captain Fail", text: island.npcDialogueFail, field: "npcAudioFail" as keyof Island, targetType: "island-fail", url: island.npcAudioFail },
                  { label: "Ingay Warning", text: island.ingayDialogue, field: "ingayAudioUrl" as keyof Island, targetType: "island-ingay", url: island.ingayAudioUrl },
                ] as const
              ).map(({ label, text, field, targetType, url }) => (
                <div
                  key={targetType}
                  className="audio-row"
                  style={{ paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid #f1f5f9" }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ color: "#1e293b", fontWeight: 600, fontSize: 13, margin: "0 0 4px" }}>{label}</p>
                    {text && (
                      <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 6px", lineHeight: 1.5, fontStyle: "italic" }}>
                        &ldquo;{text}&rdquo;
                      </p>
                    )}
                    {url && IS_REAL_URL(url) && (
                      <audio controls src={url} style={{ height: 26, width: "100%", maxWidth: 320 }} />
                    )}
                  </div>
                  <div className="audio-row-actions" style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <UploadButton
                        targetType={targetType}
                        targetId={island.id}
                        token={token}
                        onDone={(newUrl) => updateIslandAudioUrl(island.id, field, newUrl)}
                        hasAudio={!!(url && IS_REAL_URL(url))}
                      />
                      {url && IS_REAL_URL(url) && (
                        <DeleteButton
                          targetType={targetType}
                          targetId={island.id}
                          token={token}
                          onDeleted={() => updateIslandAudioUrl(island.id, field, "")}
                        />
                      )}
                    </div>
                    <p style={{ color: "#94a3b8", fontSize: 11, marginTop: 0, textAlign: "right" }}>
                      {url && IS_REAL_URL(url) ? "Uploaded" : "Not uploaded"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Challenge Audio per Pin */}
            {island.pins.map((pin) => (
              <div key={pin.id} style={{ marginBottom: 24 }}>
                <p style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
                  Pin {pin.number}
                </p>
                {pin.challenges.map((ch, idx) => {
                  const hasAudio = IS_REAL_URL(ch.audioUrl);
                  return (
                    <div
                      key={ch.id}
                      style={{
                        background: "#ffffff",
                        border: `1px solid ${hasAudio ? "#86efac" : "#e2e8f0"}`,
                        borderRadius: 12,
                        padding: "16px 20px",
                        marginBottom: 12,
                      }}
                    >
                      <div className="challenge-header-row">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: hasAudio ? "#16a34a" : "#cbd5e1", flexShrink: 0 }} />
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#475569" }}>Challenge {idx + 1}</p>
                          </div>

                          {ch.audioScript && (
                            <div style={{ background: "#f8fafc", borderLeft: "3px solid #f5c518", borderRadius: "0 8px 8px 0", padding: "12px 16px", marginBottom: 12 }}>
                              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                Script to read aloud
                              </p>
                              <p style={{ margin: 0, fontSize: 14, color: "#1e293b", lineHeight: 1.7 }}>
                                {ch.audioScript}
                              </p>
                            </div>
                          )}

                          <p style={{ margin: "0 0 10px", fontSize: 13, color: "#64748b" }}>
                            <span style={{ fontWeight: 600, color: "#475569" }}>Q: </span>{ch.question}
                          </p>

                          {hasAudio && (
                            <audio controls src={ch.audioUrl} style={{ height: 28, width: "100%", maxWidth: 320 }} />
                          )}
                        </div>

                        <div className="audio-row-actions" style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <UploadButton
                              targetType="challenge"
                              targetId={ch.id}
                              token={token}
                              onDone={(url) => updateChallengeAudioUrl(island.id, pin.id, ch.id, url)}
                              hasAudio={hasAudio}
                            />
                            {hasAudio && (
                              <DeleteButton
                                targetType="challenge"
                                targetId={ch.id}
                                token={token}
                                onDeleted={() => updateChallengeAudioUrl(island.id, pin.id, ch.id, "")}
                              />
                            )}
                          </div>
                          <p style={{ color: "#94a3b8", fontSize: 11, marginTop: 0 }}>
                            {hasAudio ? "Uploaded" : "No audio yet"}
                          </p>
                        </div>
                      </div>

                      {/* Explanation audio */}
                      <div className="challenge-header-row" style={{ borderTop: "1px solid #f1f5f9", marginTop: 12, paddingTop: 12 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#475569" }}>Explanation Audio</p>
                          <div style={{ background: "#f0fdf4", borderLeft: "3px solid #16a34a", borderRadius: "0 8px 8px 0", padding: "10px 14px", marginBottom: 8 }}>
                            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                              Script to read aloud
                            </p>
                            <p style={{ margin: 0, fontSize: 13, color: "#1e293b", lineHeight: 1.6 }}>
                              {ch.explanation}
                            </p>
                          </div>
                          {ch.explanationAudioUrl && IS_REAL_URL(ch.explanationAudioUrl) && (
                            <audio controls src={ch.explanationAudioUrl} style={{ height: 26, width: "100%", maxWidth: 300 }} />
                          )}
                        </div>
                        <div className="audio-row-actions" style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <UploadButton
                              targetType="challenge-explanation"
                              targetId={ch.id}
                              token={token}
                              onDone={(url) => updateChallengeExplanationAudioUrl(island.id, pin.id, ch.id, url)}
                              hasAudio={!!(ch.explanationAudioUrl && IS_REAL_URL(ch.explanationAudioUrl))}
                            />
                            {ch.explanationAudioUrl && IS_REAL_URL(ch.explanationAudioUrl) && (
                              <DeleteButton
                                targetType="challenge-explanation"
                                targetId={ch.id}
                                token={token}
                                onDeleted={() => updateChallengeExplanationAudioUrl(island.id, pin.id, ch.id, "")}
                              />
                            )}
                          </div>
                          <p style={{ color: "#94a3b8", fontSize: 11, marginTop: 0 }}>
                            {ch.explanationAudioUrl && IS_REAL_URL(ch.explanationAudioUrl) ? "Uploaded" : "Not uploaded"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
