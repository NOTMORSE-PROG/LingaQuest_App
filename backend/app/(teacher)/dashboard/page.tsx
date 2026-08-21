"use client";

import { useState, useEffect, useCallback } from "react";
import { useTeacherAuth } from "../layout";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type Tab = "overview" | "mistakes" | "performance" | "badges";

// ── Helper: fetch with auth ──────────────────────────────────────────────
function useFetch<T>(url: string, token: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetch(`${API}${url}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [url, token]);

  return { data, loading, error, load };
}

// ── CSS bar ──────────────────────────────────────────────────────────────
function Bar({ value, max = 100, color = "#f5c518" }: { value: number; max?: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 6, height: 10, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 6, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 13, color: "#475569", fontWeight: 600, minWidth: 36, textAlign: "right" }}>{value}%</span>
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px", flex: 1, minWidth: 140 }}>
      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 800, color: "#1e293b" }}>{value}</p>
    </div>
  );
}

// ── Table helpers ────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = { textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" };
const tdStyle: React.CSSProperties = { padding: "10px 12px", fontSize: 14, color: "#1e293b", borderBottom: "1px solid #f1f5f9" };

// ── Main Dashboard ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const { token } = useTeacherAuth();
  const [tab, setTab] = useState<Tab>("overview");

  const students = useFetch<any>("/api/teacher/students", token);
  const mistakes = useFetch<any>("/api/teacher/mistakes", token);
  const performance = useFetch<any>("/api/teacher/performance", token);
  const badges = useFetch<any>("/api/teacher/badges", token);

  // Load data when tab changes
  useEffect(() => {
    if (tab === "overview" && !students.data && !students.loading) students.load();
    if (tab === "mistakes" && !mistakes.data && !mistakes.loading) mistakes.load();
    if (tab === "performance" && !performance.data && !performance.loading) performance.load();
    if (tab === "badges" && !badges.data && !badges.loading) badges.load();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load overview on mount
  useEffect(() => { students.load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "mistakes", label: "Mistakes" },
    { key: "performance", label: "Performance" },
    { key: "badges", label: "Badges" },
  ];

  return (
    <>
      <h1 style={{ color: "#1e293b", fontSize: 24, margin: "0 0 24px" }}>Dashboard</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 32, borderBottom: "1px solid #e2e8f0", paddingBottom: 0 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="btn-hover-ghost"
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? "#f5c518" : "#64748b",
              background: "transparent",
              border: "none",
              borderBottom: tab === t.key ? "3px solid #f5c518" : "3px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && <OverviewTab data={students.data} loading={students.loading} error={students.error} />}
      {tab === "mistakes" && <MistakesTab data={mistakes.data} loading={mistakes.loading} error={mistakes.error} />}
      {tab === "performance" && <PerformanceTab data={performance.data} loading={performance.loading} error={performance.error} />}
      {tab === "badges" && <BadgesTab data={badges.data} loading={badges.loading} error={badges.error} />}
    </>
  );
}

// ── Loading / Error states ───────────────────────────────────────────────
function LoadingMsg() { return <p style={{ color: "#64748b", fontSize: 15 }}>Loading...</p>; }
function ErrorMsg({ msg }: { msg: string }) { return <p style={{ color: "#dc2626", fontSize: 14 }}>Error: {msg}</p>; }
function EmptyMsg({ msg }: { msg: string }) { return <p style={{ color: "#94a3b8", fontSize: 14 }}>{msg}</p>; }

// ══════════════════════════════════════════════════════════════════════════
// TAB: Overview
// ══════════════════════════════════════════════════════════════════════════
function OverviewTab({ data, loading, error }: { data: any; loading: boolean; error: string }) {
  if (loading) return <LoadingMsg />;
  if (error) return <ErrorMsg msg={error} />;
  if (!data) return null;

  const studentList = data.students ?? [];
  const totalStudents = studentList.length;
  const avgAccuracy = totalStudents > 0
    ? Math.round(studentList.reduce((s: number, st: any) => s + st.averageAccuracy, 0) / totalStudents)
    : 0;
  const totalBadges = studentList.reduce((s: number, st: any) => s + st.badgeCount, 0);

  return (
    <>
      {/* Summary cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <StatCard label="Total Students" value={totalStudents} />
        <StatCard label="Avg Accuracy" value={`${avgAccuracy}%`} />
        <StatCard label="Total Badges Earned" value={totalBadges} />
      </div>

      {/* Student table */}
      {totalStudents === 0 ? (
        <EmptyMsg msg="No students have joined yet." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Student</th>
                <th style={thStyle}>Progress</th>
                <th style={thStyle}>Avg Accuracy</th>
                <th style={thStyle}>Badges</th>
                <th style={thStyle}>Islands</th>
                <th style={thStyle}>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {studentList.map((s: any) => (
                <tr key={s.id}>
                  <td style={tdStyle}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{s.username}</span>
                      <br />
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{s.email}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ minWidth: 120 }}>
                      <Bar value={data.totalPins > 0 ? Math.round((s.completedPins / data.totalPins) * 100) : 0} color="#16a34a" />
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{s.completedPins}/{data.totalPins} pins</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600, color: s.averageAccuracy >= 70 ? "#16a34a" : s.averageAccuracy >= 50 ? "#d97706" : "#dc2626" }}>
                      {s.averageAccuracy}%
                    </span>
                  </td>
                  <td style={tdStyle}>{s.badgeCount}</td>
                  <td style={tdStyle}>{s.islandsReached}</td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 13, color: "#64748b" }}>
                      {s.lastActivity ? new Date(s.lastActivity).toLocaleDateString() : "Never"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB: Mistakes
// ══════════════════════════════════════════════════════════════════════════
function MistakesTab({ data, loading, error }: { data: any; loading: boolean; error: string }) {
  if (loading) return <LoadingMsg />;
  if (error) return <ErrorMsg msg={error} />;
  if (!data) return null;

  return (
    <>
      {/* Islands by difficulty */}
      <h2 style={{ fontSize: 18, color: "#1e293b", margin: "0 0 4px" }}>Islands by Difficulty</h2>
      <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
        Shows how hard each island is based on students&apos; average accuracy. Lower accuracy = harder island.
      </p>
      {data.byIsland?.length === 0 ? (
        <EmptyMsg msg="No progress data yet." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 36 }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 6, borderBottom: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", minWidth: 200 }}>Island</span>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Avg. Student Accuracy</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", minWidth: 80, textAlign: "center" }}>Difficulty</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", minWidth: 70, textAlign: "right" }}>Attempts</span>
          </div>

          {data.byIsland?.map((isl: any) => {
            const difficulty = isl.avgAccuracy >= 70 ? { label: "Easy", color: "#16a34a", bg: "#dcfce7" } : isl.avgAccuracy >= 50 ? { label: "Medium", color: "#d97706", bg: "#fef3c7" } : { label: "Hard", color: "#dc2626", bg: "#fee2e2" };
            return (
              <div key={isl.islandNumber} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
                <div style={{ minWidth: 200 }}>
                  <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 600 }}>
                    Island {isl.islandNumber} — {isl.name}
                  </span>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>{isl.skillFocus}</p>
                </div>
                <div style={{ flex: 1 }}>
                  <Bar
                    value={isl.avgAccuracy}
                    color={difficulty.color}
                  />
                </div>
                <div style={{ minWidth: 80, textAlign: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: difficulty.color, background: difficulty.bg, padding: "2px 10px", borderRadius: 20 }}>
                    {difficulty.label}
                  </span>
                </div>
                <span style={{ fontSize: 13, color: "#64748b", minWidth: 70, textAlign: "right" }}>
                  {isl.attempts} {isl.attempts === 1 ? "attempt" : "attempts"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Hardest pins */}
      {data.worstPins?.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, color: "#1e293b", margin: "0 0 16px" }}>Hardest Pins (below 60%)</h2>
          <div style={{ overflowX: "auto", marginBottom: 36 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Island</th>
                  <th style={thStyle}>Pin</th>
                  <th style={thStyle}>Avg Accuracy</th>
                  <th style={thStyle}>Attempts</th>
                </tr>
              </thead>
              <tbody>
                {data.worstPins.map((p: any, i: number) => (
                  <tr key={i}>
                    <td style={tdStyle}>Island {p.islandNumber} — {p.islandName}</td>
                    <td style={tdStyle}>Pin {p.pinNumber}</td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: "#dc2626" }}>{p.avgAccuracy}%</span>
                    </td>
                    <td style={tdStyle}>{p.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Struggling students */}
      {data.studentsStruggling?.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, color: "#1e293b", margin: "0 0 16px" }}>Students Struggling (below 60%)</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Student</th>
                  <th style={thStyle}>Avg Accuracy</th>
                  <th style={thStyle}>Pins Completed</th>
                </tr>
              </thead>
              <tbody>
                {data.studentsStruggling.map((s: any) => (
                  <tr key={s.id}>
                    <td style={tdStyle}>{s.username}</td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: "#dc2626" }}>{s.avgAccuracy}%</span>
                    </td>
                    <td style={tdStyle}>{s.completedPins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB: Performance
// ══════════════════════════════════════════════════════════════════════════
function PerformanceTab({ data, loading, error }: { data: any; loading: boolean; error: string }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (loading) return <LoadingMsg />;
  if (error) return <ErrorMsg msg={error} />;
  if (!data) return null;

  return (
    <>
      {/* Best performing pins */}
      {data.bestPins?.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, color: "#1e293b", margin: "0 0 16px" }}>Best Performing (Where Students Get Most Right)</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 36 }}>
            {data.bestPins.map((p: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "#475569", fontWeight: 600, minWidth: 220 }}>
                  Island {p.islandNumber} — Pin {p.pinNumber}
                </span>
                <div style={{ flex: 1 }}>
                  <Bar value={p.avgAccuracy} color="#16a34a" />
                </div>
                <span style={{ fontSize: 12, color: "#94a3b8", minWidth: 70 }}>{p.completionCount} done</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Per-island breakdown */}
      <h2 style={{ fontSize: 18, color: "#1e293b", margin: "0 0 16px" }}>Island Breakdown</h2>
      {data.islands?.length === 0 ? (
        <EmptyMsg msg="No islands found." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.islands?.map((isl: any) => (
            <div key={isl.islandNumber} style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              <button
                onClick={() => setExpanded(expanded === isl.islandNumber ? null : isl.islandNumber)}
                className="btn-hover-ghost"
                style={{
                  width: "100%", background: expanded === isl.islandNumber ? "#fefce8" : "#ffffff",
                  border: "none", padding: "14px 20px", cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 16,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", minWidth: 200 }}>
                  Island {isl.islandNumber} — {isl.name}
                </span>
                <span style={{ fontSize: 12, color: "#64748b", minWidth: 100 }}>{isl.skillFocus}</span>
                <div style={{ flex: 1 }}>
                  {isl.avgAccuracy !== null ? (
                    <Bar value={isl.avgAccuracy} color={isl.avgAccuracy >= 70 ? "#16a34a" : isl.avgAccuracy >= 50 ? "#d97706" : "#dc2626"} />
                  ) : (
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>No data</span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: "#94a3b8", minWidth: 80 }}>{isl.completionRate}% reached</span>
                <span style={{ fontSize: 14, color: "#94a3b8" }}>{expanded === isl.islandNumber ? "▲" : "▼"}</span>
              </button>

              {expanded === isl.islandNumber && (
                <div style={{ padding: "12px 20px 16px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Pin</th>
                        <th style={thStyle}>Avg Accuracy</th>
                        <th style={thStyle}>Completed By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isl.pins.map((pin: any) => (
                        <tr key={pin.pinNumber}>
                          <td style={tdStyle}>Pin {pin.pinNumber}</td>
                          <td style={tdStyle}>
                            {pin.avgAccuracy !== null ? (
                              <span style={{ fontWeight: 600, color: pin.avgAccuracy >= 70 ? "#16a34a" : pin.avgAccuracy >= 50 ? "#d97706" : "#dc2626" }}>
                                {pin.avgAccuracy}%
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>—</span>
                            )}
                          </td>
                          <td style={tdStyle}>{pin.completionCount} ({pin.completionRate}%)</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB: Badges
// ══════════════════════════════════════════════════════════════════════════

const BADGE_LABELS: Record<string, string> = {
  first_steps: "First Steps",
  sharp_ear: "Sharp Ear",
  never_lost: "Never Lost",
  ship_saver: "Ship Saver",
  the_captain: "The Captain",
  island_1: "Island 1",
  island_2: "Island 2",
  island_3: "Island 3",
  island_4: "Island 4",
  island_5: "Island 5",
  island_6: "Island 6",
  island_7: "Island 7",
  island_conqueror: "Island Conqueror",
  unsinkable: "Unsinkable",
  unanimous: "Unanimous",
  true_crew: "True Crew",
  comeback: "Comeback",
};

function BadgesTab({ data, loading, error }: { data: any; loading: boolean; error: string }) {
  if (loading) return <LoadingMsg />;
  if (error) return <ErrorMsg msg={error} />;
  if (!data) return null;

  return (
    <>
      {/* Distribution */}
      <h2 style={{ fontSize: 18, color: "#1e293b", margin: "0 0 4px" }}>Badge Distribution</h2>
      <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 20px" }}>
        {data.totalStudents} total students
      </p>

      {data.distribution?.length === 0 ? (
        <EmptyMsg msg="No badges earned yet." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 40 }}>
          {data.distribution?.map((b: any) => (
            <div key={b.badgeType} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, color: "#475569", fontWeight: 600, minWidth: 160 }}>
                {BADGE_LABELS[b.badgeType] ?? b.badgeType}
              </span>
              <div style={{ flex: 1 }}>
                <Bar value={b.percentage} color="#f5c518" />
              </div>
              <span style={{ fontSize: 12, color: "#94a3b8", minWidth: 60 }}>{b.count} earned</span>
            </div>
          ))}
        </div>
      )}

      {/* Badge leaderboard */}
      {data.topCollectors?.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, color: "#1e293b", margin: "0 0 16px" }}>Badge Leaderboard</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", maxWidth: 500 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Rank</th>
                  <th style={thStyle}>Student</th>
                  <th style={thStyle}>Badges</th>
                </tr>
              </thead>
              <tbody>
                {data.topCollectors.map((s: any, i: number) => (
                  <tr key={s.id}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 700, color: i < 3 ? "#f5c518" : "#64748b" }}>
                        #{i + 1}
                      </span>
                    </td>
                    <td style={tdStyle}>{s.username}</td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>{s.count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
