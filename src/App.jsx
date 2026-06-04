import { useState, useCallback, useEffect, useRef } from "react";
import "./styles.css";
import {
  DOMAINS, RESPONSE_TYPES, SCRIPTURES, CORE_QUESTIONS, DREAM_ELEMENTS, DOMAIN_WEIGHTS,
  computeAnalytics, generateLocalPlan, buildSnapshot, computeTrends, buildConversationGuide,
  compareDreamMarks, mergeComparisons,
} from "./engine.js";
import {
  getLLMConfig, setLLMConfig, testConnection, listModels,
  extractLetter, compareLetters, individualVisionMission, jointVisionMission, personalizeGoals, conversationGuide,
  ollamaRunning, installedModels, pullModel,
} from "./llm.js";
import { TREE_PATH } from "./logo.js";
import { INTRO_SECTIONS, PREPARE, SCORE_INFO, MODEL_CHOICES, SETUP } from "./content.js";
import { APP_VERSION, checkForUpdate } from "./update.js";
import { createProfile, signIn, listProfiles } from "./auth.js";
import { METRIC_INFO, scaleText, SCORE_BANDS, bandFor } from "./metrics.js";
import { QUESTION_HELP } from "./questionHelp.js";

// Base storage key names. Data is namespaced per profile (see keyFor) so
// multiple couples on one device keep separate data.
const LS_KEY_BASE = "covenant_life_plan_v3";
const LS_SESSIONS_BASE = "covenant_sessions_v1";
const LS_RESULTS_BASE = "covenant_results_v1";
const LS_BACKUP_BASE = "covenant_backup_v1"; // automatic in-app safety copy (last few snapshots)
// Returns the storage key for a base name scoped to a profile id.
const keyFor = (base, pid) => (pid ? `${base}__${pid}` : base);

/* ── Brand mark ───────────────────────────────────────────────────────── */
/* The CANA app icon — the traced oak with two readers, on a parchment
   squircle. Scales to any size; used in the title bar and welcome hero. */
function Logo({ size = 28, radius }) {
  const r = radius != null ? radius : size * 0.22;
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" style={{ display: "block", flexShrink: 0 }} aria-label="CANA">
      <defs>
        <linearGradient id={`lg-bg-${size}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBF6EC" /><stop offset="0.5" stopColor="#F3E7CE" /><stop offset="1" stopColor="#E8D3A8" />
        </linearGradient>
        <linearGradient id={`lg-ink-${size}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2B2A26" /><stop offset="1" stopColor="#15140F" />
        </linearGradient>
        <clipPath id={`lg-sq-${size}`}>
          <path d="M512 40C200 40 40 200 40 512C40 824 200 984 512 984C824 984 984 824 984 512C984 200 824 40 512 40Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#lg-sq-${size})`}>
        <rect width="1024" height="1024" fill={`url(#lg-bg-${size})`} />
        <path d={TREE_PATH} fill={`url(#lg-ink-${size})`} fillRule="evenodd" />
      </g>
      <path d="M512 40C200 40 40 200 40 512C40 824 200 984 512 984C824 984 984 824 984 512C984 200 824 40 512 40Z" fill="none" stroke="#000" strokeOpacity="0.1" strokeWidth="2" />
    </svg>
  );
}

/* ── Apple-style primitive components ─────────────────────────────────── */
function Btn({ children, onClick, kind = "primary", disabled, style, className }) {
  const base = {
    border: "none", borderRadius: 10, padding: "11px 22px", fontSize: 15,
    fontWeight: 500, letterSpacing: "-0.01em", transition: "transform .12s cubic-bezier(.22,.61,.36,1), box-shadow .2s, background .15s, opacity .2s",
    opacity: disabled ? 0.45 : 1, cursor: disabled ? "default" : "pointer",
  };
  const kinds = {
    primary:   { background: "var(--accent)", color: "#fff", boxShadow: "0 1px 2px rgba(10,132,255,.35)" },
    secondary: { background: "rgba(120,120,128,0.12)", color: "var(--ink)" },
    ghost:     { background: "transparent", color: "var(--accent)", padding: "8px 12px" },
    subtle:    { background: "transparent", color: "var(--ink2)", padding: "8px 14px", border: "1px solid var(--hair)" },
  };
  return (
    <button className={className} disabled={disabled}
      onClick={onClick}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      style={{ ...base, ...kinds[kind], ...style }}>
      {children}
    </button>
  );
}

function Card({ children, style, className }) {
  return <div className={className} style={{
    background: "var(--panel)", backdropFilter: "saturate(180%) blur(20px)",
    WebkitBackdropFilter: "saturate(180%) blur(20px)",
    border: "1px solid var(--hair2)", borderRadius: "var(--r-lg)",
    boxShadow: "var(--shadow)", padding: 24, ...style,
  }}>{children}</div>;
}

function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: "inline-flex", background: "rgba(120,120,128,0.12)", borderRadius: 10, padding: 2, gap: 2 }}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          style={{
            border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 14, fontWeight: 500,
            background: value === o.value ? "var(--panel-solid)" : "transparent",
            color: value === o.value ? "var(--ink)" : "var(--ink2)",
            boxShadow: value === o.value ? "var(--shadow-sm)" : "none",
            transition: "all .2s cubic-bezier(.22,.61,.36,1)",
          }}>{o.label}</button>
      ))}
    </div>
  );
}

/* Transient confirmation pill (e.g. "Progress saved") */
function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="no-print" style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 100,
      display: "flex", alignItems: "center", gap: 9, padding: "11px 18px", borderRadius: 12,
      background: "rgba(30,30,32,0.92)", color: "#fff", fontSize: 14, fontWeight: 500,
      boxShadow: "0 8px 28px rgba(0,0,0,0.28)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      animation: "rise .35s cubic-bezier(.22,.61,.36,1) both",
    }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--green)", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>
      {message}
    </div>
  );
}

/* Scale chip — segmented pill that fits the response type */
function ScaleChip({ value, opt, onClick }) {
  const on = value === opt.v;
  return (
    <button onClick={() => onClick(opt.v)} aria-pressed={on} title={opt.d}
      style={{
        flex: "1 1 0", minWidth: 52, padding: "10px 6px", borderRadius: 10,
        border: `1px solid ${on ? "var(--accent)" : "var(--hair)"}`,
        background: on ? "var(--accent)" : "var(--panel-solid)", color: on ? "#fff" : "var(--ink)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        transition: "all .15s cubic-bezier(.22,.61,.36,1)",
        boxShadow: on ? "0 2px 10px rgba(10,132,255,.35)" : "var(--shadow-sm)",
        transform: on ? "translateY(-1px)" : "none",
      }}>
      <span style={{ fontSize: 17, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{opt.l}</span>
      <span style={{ fontSize: 9.5, opacity: on ? 0.92 : 0.5, fontWeight: 500, textAlign: "center", lineHeight: 1.15, letterSpacing: ".01em" }}>{opt.d}</span>
    </button>
  );
}

function ScaleInput({ question, value, onChange }) {
  const type = question.type || RESPONSE_TYPES.AGREEMENT;
  const answered = value !== undefined;
  return (
    <div>
      {!answered ? (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", margin: "0 0 8px" }}>
          <span style={{ fontSize: 11, color: "var(--ink3)" }}>tap to answer</span>
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
        <div style={{ display: "flex", gap: 5, flex: 1 }}>{type.low.map((o) => <ScaleChip key={o.v} value={value} opt={o} onClick={onChange} />)}</div>
        <div style={{ width: 1, background: "var(--hair)", margin: "2px 2px" }} aria-hidden="true" />
        <div style={{ display: "flex", gap: 5, flex: 1 }}>{type.high.map((o) => <ScaleChip key={o.v} value={value} opt={o} onClick={onChange} />)}</div>
      </div>
    </div>
  );
}

/* Window chrome — macOS title bar look */
function Chrome({ title, right }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center",
      justifyContent: "space-between", padding: "10px 20px",
      background: "rgba(245,245,247,0.8)", backdropFilter: "saturate(180%) blur(20px)",
      WebkitBackdropFilter: "saturate(180%) blur(20px)", borderBottom: "1px solid var(--hair2)",
    }} className="no-print">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink2)", letterSpacing: "-.01em", display: "flex", alignItems: "center", gap: 8 }}>
          <Logo size={20} /> {title}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{right}</div>
    </div>
  );
}

function StatusDot({ state }) {
  const c = state === "ok" ? "var(--green)" : state === "bad" ? "var(--red)" : "var(--amber)";
  return <span style={{ width: 9, height: 9, borderRadius: "50%", background: c, display: "inline-block",
    boxShadow: `0 0 0 3px ${c}22`, animation: state === "checking" ? "pulse 1s infinite" : "none" }} />;
}

const Wrap = ({ children, narrow }) => (
  <div style={{ width: "100%", maxWidth: narrow ? 820 : 1100, margin: "0 auto", padding: "0 max(28px, 4vw)", boxSizing: "border-box" }}>{children}</div>
);

// Reusable info button for any metric. Shows what it means, how it's computed,
// and an interpretive scale for the given value. Self-contained open state.
function MetricInfo({ metricKey, value, accent = "var(--accent)" }) {
  const [open, setOpen] = useState(false);
  const info = METRIC_INFO[metricKey];
  if (!info) return null;
  const sc = scaleText(metricKey, value);
  return (
    <span style={{ position: "relative", display: "inline-flex" }} className="no-print">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={`Explain ${info.title}`}
        style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", border: `1px solid ${open ? accent : "var(--hair)"}`, background: open ? accent : "transparent", color: open ? "#fff" : "var(--ink3)", fontSize: 11, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>ⓘ</button>
      {open ? (
        <div className="rise" style={{ position: "absolute", top: 26, left: 0, zIndex: 50, width: 320, maxWidth: "80vw", padding: "14px 16px", borderRadius: 12, background: "var(--panel-solid)", boxShadow: "0 8px 30px rgba(0,0,0,0.18)", border: "1px solid var(--hair2)", textAlign: "left" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", margin: "0 0 6px" }}>{info.title}</p>
          <p style={{ fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.5, margin: "0 0 8px" }}><strong>What:</strong> {info.what}</p>
          <p style={{ fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.5, margin: "0 0 8px" }}><strong>How it's measured:</strong> {info.how}</p>
          {sc ? (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--hair2)" }}>
              {value != null && !isNaN(value) ? <p style={{ fontSize: 12.5, color: "var(--ink)", margin: "0 0 4px" }}><strong>Yours ({Number(value).toFixed(1)}): {sc.band}.</strong></p> : null}
              <p style={{ fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.5, margin: 0 }}>{sc.blurb}</p>
            </div>
          ) : null}
          <p style={{ fontSize: 11, color: "var(--ink3)", lineHeight: 1.45, margin: "10px 0 0", paddingTop: 8, borderTop: "1px solid var(--hair2)" }}>These are self-rated reflections, not a clinical measurement, and aren't compared against other couples.</p>
        </div>
      ) : null}
    </span>
  );
}
// Persistent quick-overview strip for the bottom of the window (#6). Shows the
// three headline metrics compactly; tapping opens the full dashboard.
/* Rich home-screen preview of the trend dashboard — ring + radar + sparkline tiles */
function DashboardPreview({ trends, onOpen }) {
  if (!trends) return null;
  const HD = trends.headline;
  const ov = trends.latest.overall;
  const ringColor = ov >= 8 ? "var(--green)" : ov >= 6.5 ? "var(--accent)" : ov >= 5 ? "var(--gold)" : ov >= 3.5 ? "var(--amber)" : "var(--red)";
  const radarAxes = trends.domainTrends.map((d) => ({ icon: d.icon, label: d.label, value: d.last }));
  const tiles = [
    { label: "Overall", value: ov, color: ringColor, spark: trends.overallSeries, delta: HD.overallDelta, invert: false },
    { label: "Alignment", value: HD.alignmentNow, color: "var(--accent)", spark: (trends.alignmentSeries || []).map((p) => ({ ts: p.ts, value: p.score })), delta: HD.alignmentDelta, invert: false },
    { label: "Drift", value: HD.driftNow, color: "#FF9F0A", spark: trends.driftSeries, delta: null, invert: true },
  ];
  const dchip = (delta, invert) => {
    if (delta === 0 || delta == null) return <span style={{ fontSize: 11.5, color: "var(--ink3)", fontWeight: 600 }}>→ steady</span>;
    const good = invert ? delta < 0 : delta > 0;
    return <span style={{ fontSize: 11.5, color: good ? "var(--green)" : "var(--red)", fontWeight: 700 }}>{delta > 0 ? "↑ +" : "↓ "}{delta}</span>;
  };
  return (
    <Card className="rise" style={{ marginTop: 40, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <p style={{ ...eyebrow, margin: 0 }}>Your journey · {HD.sessions} session{HD.sessions > 1 ? "s" : ""}{HD.spanDays > 0 ? ` · ${HD.spanDays} days` : ""}</p>
        <button onClick={onOpen} style={{ border: "none", background: "none", color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>Open full dashboard →</button>
      </div>
      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <RingGauge value={ov} color={ringColor} size={150} stroke={13} label="Overall" />
          <span style={{ fontSize: 12, color: HD.overallDelta > 0 ? "var(--green)" : HD.overallDelta < 0 ? "var(--red)" : "var(--ink3)", fontWeight: 600 }}>
            {HD.overallDelta === 0 ? "Steady" : `${HD.overallDelta > 0 ? "↑ +" : "↓ "}${HD.overallDelta} since baseline`}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 240, maxWidth: 340 }}>
          <RadarChart axes={radarAxes} color={ringColor} size={280} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
        {tiles.map((it) => (
          <div key={it.label} style={{ flex: 1, minWidth: 150, padding: "12px 14px", border: "1px solid var(--hair)", borderRadius: 12, background: "var(--panel-solid)" }}>
            <div style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 4 }}>{it.label}</div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 6 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: it.color, letterSpacing: "-.02em", lineHeight: 1 }}>{it.value}<span style={{ fontSize: 12, color: "var(--ink3)" }}>/10</span></span>
              {it.spark && it.spark.length > 1 ? <Sparkline series={it.spark} color={it.color} w={70} h={24} /> : null}
            </div>
            <div style={{ marginTop: 6 }}>{dchip(it.delta, it.invert)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BottomStrip({ trends, onOpen }) {
  if (!trends) return null;
  const HD = trends.headline;
  const items = [
    { label: "Overall", value: trends.latest.overall, key: "overall" },
    { label: "Alignment", value: HD.alignmentNow, key: "alignment" },
    { label: "Drift", value: HD.driftNow, key: "drift" },
  ];
  return (
    <div className="no-print" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", gap: 22, padding: "10px 18px", background: "rgba(245,245,247,0.92)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)", borderTop: "1px solid var(--hair2)" }}>
      {items.map((it) => (
        <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{it.label}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{it.value}</span>
          <MetricInfo metricKey={it.key} value={it.value} />
        </div>
      ))}
      <button onClick={onOpen} style={{ border: "1px solid var(--hair)", background: "transparent", color: "var(--accent)", borderRadius: 8, padding: "5px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Open dashboard →</button>
    </div>
  );
}

const eyebrow = { fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 10px" };
const h1 = { fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.08, margin: "0 0 16px", color: "var(--ink)" };
const h2 = { fontSize: 27, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 12px", color: "var(--ink)" };
const lead = { fontSize: 17, lineHeight: 1.5, color: "var(--ink2)", margin: "0 0 16px", letterSpacing: "-.01em" };
const body = { fontSize: 15, lineHeight: 1.55, color: "var(--ink2)", margin: "0 0 14px" };
const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/* Render text with *italic* spans (used for book titles in About sections) */
function RichText({ text, style }) {
  const parts = String(text).split(/(\*[^*]+\*)/g);
  return <span style={style}>{parts.map((p, i) =>
    p.startsWith("*") && p.endsWith("*") && p.length > 2
      ? <em key={i}>{p.slice(1, -1)}</em>
      : <span key={i}>{p}</span>
  )}</span>;
}

/* SVG line chart */
/* Circular gauge — the dashboard hero (Apple-rings / Oura-score style) */
function RingGauge({ value, max = 10, size = 184, stroke = 16, color = "var(--accent)", label, sub }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const dash = c * pct;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hair2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`} style={{ transition: "stroke-dasharray 1s cubic-bezier(.22,.61,.36,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.3, fontWeight: 700, color: "var(--ink)", letterSpacing: "-.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {label ? <span style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 600, marginTop: 6 }}>{label}</span> : null}
        {sub ? <span style={{ fontSize: 11.5, color, fontWeight: 600, marginTop: 2 }}>{sub}</span> : null}
      </div>
    </div>
  );
}

/* Tiny inline sparkline for stat tiles */
function Sparkline({ series, color, w = 96, h = 30, yMax = 10 }) {
  const pts = (series || []).filter((p) => (p.value ?? p) != null).map((p) => (typeof p === "number" ? p : p.value));
  if (pts.length < 2) return <div style={{ width: w, height: h }} />;
  const n = pts.length;
  const x = (i) => (i * w) / (n - 1);
  const y = (v) => h - 3 - (v / yMax) * (h - 6);
  const line = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const gid = "sp" + color.replace(/[^a-z0-9]/gi, "");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(n - 1)} cy={y(pts[n - 1])} r="2.6" fill={color} />
    </svg>
  );
}

/* Radar / spider chart — at-a-glance "shape" of all domains */
function RadarChart({ axes, size = 320, color = "var(--accent)" }) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 46;
  const n = axes.length;
  if (n < 3) return null;
  const ang = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i, frac) => [cx + Math.cos(ang(i)) * R * frac, cy + Math.sin(ang(i)) * R * frac];
  const poly = axes.map((a, i) => pt(i, Math.max(0, Math.min(1, (a.value || 0) / 10))).join(",")).join(" ");
  const rings = [0.25, 0.5, 0.75, 1];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: size, height: "auto", display: "block", margin: "0 auto" }}>
      {rings.map((f, ri) => (
        <polygon key={ri} points={axes.map((a, i) => pt(i, f).join(",")).join(" ")} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      ))}
      {axes.map((a, i) => { const [ex, ey] = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />; })}
      <polygon points={poly} fill={color} fillOpacity="0.16" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {axes.map((a, i) => { const [px, py] = pt(i, Math.max(0, Math.min(1, (a.value || 0) / 10))); return <circle key={i} cx={px} cy={py} r="3" fill={color} />; })}
      {axes.map((a, i) => {
        const [lx, ly] = pt(i, 1.16);
        const anchor = Math.abs(Math.cos(ang(i))) < 0.3 ? "middle" : Math.cos(ang(i)) > 0 ? "start" : "end";
        return <text key={i} x={lx} y={ly} fill="#8E8E93" fontSize="10.5" textAnchor={anchor} dominantBaseline="middle">{a.icon}</text>;
      })}
    </svg>
  );
}

function LineChart({ series, color, yMax = 10 }) {
  const W = 700, H = 130, padL = 28, padR = 12, padT = 14, padB = 24;
  const pts = series.filter((p) => p.value != null);
  if (!pts.length) return null;
  const n = pts.length;
  const x = (i) => padL + (n === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1));
  const y = (v) => padT + (1 - v / yMax) * (H - padT - padB);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`;
  const gid = "g" + color.replace(/[^a-z0-9]/gi, "");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.18" /><stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      {[0, yMax / 2, yMax].map((g, i) => (
        <g key={i}><line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="rgba(0,0,0,0.07)" strokeWidth="1" />
          <text x={2} y={y(g) + 3} fill="#8E8E93" fontSize="10">{g}</text></g>
      ))}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r={p.kind === "full" ? 4.5 : 3.5}
        fill="#fff" stroke={color} strokeWidth="2.5" />)}
    </svg>
  );
}

export default function App() {
  const [screen, setScreen] = useState("login");
  const [profile, setProfile] = useState(null); // active couple profile (null = logged out)
  const pid = profile ? profile.id : null;
  const [mode, setMode] = useState("full");
  const [names, setNames] = useState({ A: "", B: "" });
  const [person, setPerson] = useState("A");
  const [dIdx, setDIdx] = useState(0);
  const [qPage, setQPage] = useState(0); // pagination within a chapter (batches of questions)
  const [answers, setAnswers] = useState({ A: {}, B: {} });
  const [done, setDone] = useState({ A: [], B: [] });
  const [results, setResults] = useState(null);
  const [goalsTab, setGoalsTab] = useState("1yr");
  const [sessions, setSessions] = useState([]);
  const [letters, setLetters] = useState({ A: "", B: "" });
  const [dreamMarks, setDreamMarks] = useState({ A: {}, B: {} });
  const [llmCfg, setLlmCfg] = useState(getLLMConfig());
  const [llmState, setLlmState] = useState("checking"); // ok | bad | checking
  const [llmModels, setLlmModels] = useState([]);
  const [llmSample, setLlmSample] = useState("");
  const [genMsg, setGenMsg] = useState("");
  const [generating, setGenerating] = useState(false);
  const [editStmts, setEditStmts] = useState(null);
  const [openInfo, setOpenInfo] = useState(null);   // which question's info is expanded
  const [showAbout, setShowAbout] = useState(false); // "About this Chapter" panel toggle
  const [weights, setWeights] = useState(null);     // custom domain weights override (null = defaults)
  const [showWeights, setShowWeights] = useState(false);
  const [toast, setToast] = useState("");          // transient "saved" confirmation
  const [showScoreInfo, setShowScoreInfo] = useState(false); // results: "what these numbers are"
  const [openDomainInfo, setOpenDomainInfo] = useState(null); // results: which domain's per-chapter detail is open
  const [archiveReport, setArchiveReport] = useState(null); // a past session's report being reviewed (null = live results)
  const [convo, setConvo] = useState({ open: false, loading: false, guide: null, usedAI: false }); // Start the Conversation
  // Login/profile state
  const [authMode, setAuthMode] = useState("signin"); // "signin" | "signup"
  const [authForm, setAuthForm] = useState({ nameA: "", nameB: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  // First-launch setup wizard state
  const [setupState, setSetupState] = useState({ node: null, ollama: null, ollamaUp: null, models: [] });
  const [setupChecking, setSetupChecking] = useState(false);
  const [chosenModel, setChosenModel] = useState("llama3.1:8b");
  const [pull, setPull] = useState({ active: false, percent: 0, status: "", done: false, error: "" });
  const pullAbort = useRef(null);
  const [update, setUpdate] = useState({ checking: false, result: null });
  const topRef = useRef(null);

  const activeDomains = mode === "full" ? DOMAINS
    : DOMAINS.map((d) => ({ ...d, questions: d.questions.filter((q) => q.core) }));

  useEffect(() => { setQPage(0); }, [dIdx, person]);

  useEffect(() => { probeOllama(); }, []);

  // Restore the active profile for THIS browser session, so an in-app recovery
  // reload (e.g. after a render error) returns home without logging the user
  // out. sessionStorage is cleared when the tab/app closes, so a fresh launch
  // still requires sign-in (the intended behavior).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("covenant_active_profile_v1");
      if (raw) { const prof = JSON.parse(raw); if (prof && prof.id) { setProfile(prof); setScreen("welcome"); } }
    } catch (e) {}
  }, []);

  // Load this profile's data when a couple logs in. Clears when logged out.
  useEffect(() => {
    if (!pid) return;
    try {
      const raw = localStorage.getItem(keyFor(LS_KEY_BASE, pid));
      if (raw) { const d = JSON.parse(raw);
        if (d.names) setNames(d.names); if (d.answers) setAnswers(d.answers);
        if (d.done) setDone(d.done); if (d.mode) setMode(d.mode);
        if (d.letters) setLetters(d.letters); if (d.dreamMarks) setDreamMarks(d.dreamMarks);
      } else {
        // Seed names from the profile for a fresh couple.
        setNames({ A: profile.nameA, B: profile.nameB });
      }
      const sraw = localStorage.getItem(keyFor(LS_SESSIONS_BASE, pid)); setSessions(sraw ? JSON.parse(sraw) : []);
      const rraw = localStorage.getItem(keyFor(LS_RESULTS_BASE, pid)); setResults(rraw ? JSON.parse(rraw) : null);
    } catch (e) {}
  }, [pid]);

  useEffect(() => {
    if (!pid) return;
    try { localStorage.setItem(keyFor(LS_KEY_BASE, pid), JSON.stringify({ names, answers, done, mode, letters, dreamMarks })); } catch (e) {}
  }, [names, answers, done, mode, letters, dreamMarks, pid]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const probeOllama = async () => {
    setLlmState("checking");
    const r = await listModels();
    if (r.ok) { setLlmModels(r.models); setLlmState("ok"); }
    else { setLlmState("bad"); setLlmModels([]); }
  };

  const N = activeDomains.length;
  const doneSet = (p) => new Set(done[p]);
  const dA = done.A.length, dB = done.B.length;
  const domain = activeDomains[dIdx] || activeDomains[0];
  const ans = answers[person];
  const allDone = domain.questions.every((q) => ans[q.id] !== undefined);
  const hasHistory = sessions.length > 0;
  // Lightweight trends for the persistent bottom overview strip (#6).
  const liveTrends = (() => { try { return computeTrends(sessions); } catch (e) { return null; } })();

  // Automatic in-app safety copy. Keeps the last few good snapshots of the
  // sessions + latest report under a separate key, so a bug or accidental reset
  // can be undone with one click. NOTE: this protects against in-app loss only —
  // it lives in the same browser/app storage, so it does NOT survive clearing
  // browser data or moving to another machine (use Save as PDF / export for that).
  const writeBackup = (sessionsSnapshot, resultsSnapshot) => {
    try {
      const onlyReports = (sessionsSnapshot || []).filter((s) => s.report);
      if (!onlyReports.length && !resultsSnapshot) return; // nothing worth backing up
      const raw = localStorage.getItem(keyFor(LS_BACKUP_BASE, pid));
      const prior = raw ? JSON.parse(raw) : [];
      const entry = { ts: new Date().toISOString(), names, sessions: sessionsSnapshot || [], results: resultsSnapshot ?? null };
      const next = [entry, ...prior].slice(0, 3); // keep last 3
      localStorage.setItem(keyFor(LS_BACKUP_BASE, pid), JSON.stringify(next));
    } catch (e) {}
  };

  const persistSessions = (next, resultsForBackup) => {
    setSessions(next);
    try { localStorage.setItem(keyFor(LS_SESSIONS_BASE, pid), JSON.stringify(next)); } catch (e) {}
    // Auto-backup at this known-good moment (a report was just completed/archived).
    writeBackup(next, resultsForBackup !== undefined ? resultsForBackup : results);
  };
  // Persist the generated report to disk so it survives quitting/reopening and
  // app upgrades — accepts either a plan object or an updater function.
  const saveResults = (planOrFn) => {
    setResults((prev) => {
      const next = typeof planOrFn === "function" ? planOrFn(prev) : planOrFn;
      try {
        if (next) localStorage.setItem(keyFor(LS_RESULTS_BASE, pid), JSON.stringify(next));
        else localStorage.removeItem(keyFor(LS_RESULTS_BASE, pid));
      } catch (e) {}
      return next;
    });
  };
  const handleAnswer = useCallback((qid, v) => setAnswers((p) => ({ ...p, [person]: { ...p[person], [qid]: v } })), [person]);
  const finishDomain = useCallback(() => {
    setDone((p) => ({ ...p, [person]: Array.from(new Set([...p[person], domain.id])) }));
    if (dIdx < N - 1) {
      setDIdx(dIdx + 1);
    } else if (mode === "full") {
      // This partner has finished all their questions. In a full assessment each
      // partner does their OWN questionnaire AND letter as one independent unit,
      // so go straight to this same partner's letter rather than a shared review
      // that waits for both. The other partner can do their track any time.
      setScreen("letter");
    } else {
      setScreen("review");
    }
    setShowAbout(false); setOpenInfo(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [dIdx, domain.id, person, N, mode]);
  // Clears only the in-progress draft answers — NEVER the saved results report
  // or the session archive. Starting or finishing an assessment must not erase
  // a previously completed report.
  const resetDraft = () => { setAnswers({ A: {}, B: {} }); setDone({ A: [], B: [] }); setEditStmts(null); };
  const startAssessment = (m) => {
    // If a draft is in progress, don't silently discard it.
    const draftInProgress = (done.A.length > 0 || done.B.length > 0 ||
      Object.keys(answers.A).length > 0 || Object.keys(answers.B).length > 0) && !results;
    if (draftInProgress && !confirm("Start a new assessment? This will erase the assessment currently in progress on this device. (To keep it, choose Cancel, then use Continue.)")) return;
    // Clear only the working draft. The previously completed report and the
    // session archive are left untouched — a new report replaces the "latest"
    // only once this assessment is actually completed (in generate()).
    setMode(m); resetDraft();
    if (m === "full") { setLetters({ A: "", B: "" }); setDreamMarks({ A: {}, B: {} }); }
    setPerson("A"); setDIdx(0); setScreen("setup"); window.scrollTo({ top: 0 }); };

  // Save the current draft to the device immediately and return to the welcome
  // screen. Persistence already happens on every change via the effect below;
  // this writes synchronously too so the confirmation is honest, then exits.
  const saveAndExit = () => {
    try { localStorage.setItem(keyFor(LS_KEY_BASE, pid), JSON.stringify({ names, answers, done, mode, letters, dreamMarks })); } catch (e) {}
    setShowAbout(false); setOpenInfo(null);
    setScreen("welcome");
    setToast("Progress saved on this device");
    window.scrollTo({ top: 0 });
  };

  // Resume a saved draft: jump the given partner back to their first unanswered
  // domain (or the first incomplete one), rather than restarting setup.
  const resumeAssessment = (p) => {
    const firstIncomplete = activeDomains.findIndex((d) => !new Set(done[p]).has(d.id));
    setPerson(p);
    setShowAbout(false); setOpenInfo(null);
    if (firstIncomplete === -1) {
      // Questions are done. In a full assessment, send them to their letter if
      // it isn't written yet; otherwise to the review hub.
      if (mode === "full" && letters[p].trim().length <= 20) setScreen("letter");
      else setScreen("review");
    } else {
      setDIdx(firstIncomplete);
      setScreen("assessment");
    }
    window.scrollTo({ top: 0 });
  };

  // ── First-launch setup wizard ────────────────────────────────────────────
  const isDesktop = typeof window !== "undefined" && window.cana && window.cana.isDesktop;

  const refreshSetup = useCallback(async () => {
    setSetupChecking(true);
    const up = await ollamaRunning();
    const models = up ? await installedModels() : [];
    let node = null, ollama = null;
    if (isDesktop && window.cana.whichBinary) {
      try { node = (await window.cana.whichBinary("node")).found; } catch { node = null; }
      try { ollama = (await window.cana.whichBinary("ollama")).found; } catch { ollama = null; }
    }
    // If the server answers, Ollama is certainly installed.
    if (up) ollama = true;
    setSetupState({ node, ollama, ollamaUp: up, models });
    setSetupChecking(false);
    return { up, models };
  }, [isDesktop]);

  const openSetup = async () => { setScreen("setup-wizard"); window.scrollTo({ top: 0 }); refreshSetup(); };

  const openDownload = (url) => {
    if (isDesktop && window.cana.openExternal) window.cana.openExternal(url);
    else window.open(url, "_blank", "noopener");
  };

  const startPull = async () => {
    setPull({ active: true, percent: 0, status: "starting…", done: false, error: "" });
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    pullAbort.current = ctrl;
    const ok = await pullModel(chosenModel, (p) => {
      setPull((prev) => ({ ...prev, active: true, percent: p.percent, status: p.error ? p.status : (p.status || prev.status), error: p.error ? p.status : "" }));
    }, ctrl ? ctrl.signal : undefined);
    if (ok) {
      // Point the app's LLM config at the freshly-pulled model.
      const cfg = getLLMConfig(); setLLMConfig({ ...cfg, model: chosenModel, enabled: true });
      setPull({ active: false, percent: 100, status: "success", done: true, error: "" });
      refreshSetup();
    } else {
      setPull((prev) => ({ ...prev, active: false, done: false, error: prev.error || "Download did not complete." }));
    }
  };

  const cancelPull = () => { try { pullAbort.current && pullAbort.current.abort(); } catch (e) {} setPull({ active: false, percent: 0, status: "", done: false, error: "" }); };

  // ── Login / profile handlers ────────────────────────────────────────────
  const enterApp = (prof) => {
    setProfile(prof);
    try { sessionStorage.setItem("covenant_active_profile_v1", JSON.stringify(prof)); } catch (e) {}
    setAuthForm({ nameA: "", nameB: "", email: "", password: "" });
    setAuthError("");
    setScreen("welcome");
    window.scrollTo({ top: 0 });
  };
  const handleSignIn = async () => {
    setAuthBusy(true); setAuthError("");
    const res = await signIn({ email: authForm.email, password: authForm.password });
    setAuthBusy(false);
    if (!res.ok) { setAuthError(res.error); return; }
    enterApp(res.profile);
  };
  const handleSignUp = async () => {
    setAuthBusy(true); setAuthError("");
    const res = await createProfile(authForm);
    setAuthBusy(false);
    if (!res.ok) { setAuthError(res.error); return; }
    enterApp(res.profile);
  };
  const logout = () => {
    // Clear in-memory data so the next couple starts clean (their data reloads
    // from storage when they log in).
    try { sessionStorage.removeItem("covenant_active_profile_v1"); } catch (e) {}
    setProfile(null);
    setNames({ A: "", B: "" }); setAnswers({ A: {}, B: {} }); setDone({ A: [], B: [] });
    setSessions([]); setResults(null); setArchiveReport(null); setEditStmts(null);
    setAuthMode("signin"); setAuthForm({ nameA: "", nameB: "", email: "", password: "" }); setAuthError("");
    setScreen("login");
    window.scrollTo({ top: 0 });
  };

  // Build a plain-text version of a report and open the user's mail app with it
  // prefilled (mailto:). A local app can't send mail itself; this hands off to
  // the system mail client, which works offline with no setup.
  // "Start the Conversation": generate deeper questions + a framing summary.
  // Uses the local AI when available; always falls back to the deterministic
  // guide so it works offline. Operates on the given report R.
  const startConversation = async (R) => {
    setConvo({ open: true, loading: true, guide: null, usedAI: false, nameA: R.nameA, nameB: R.nameB });
    // Deterministic guide is always available from the report's analytics-shaped data.
    const fallback = buildConversationGuide({
      domainScores: R.domainScores, tensions: R.tensions || [],
      overallScore: R.overallScore, nameA: R.nameA, nameB: R.nameB,
    });
    let guide = fallback, usedAI = false;
    const cfg = getLLMConfig();
    const live = cfg.enabled ? await ollamaRunning() : false;
    if (live) {
      const overallSummary = (R.domainScores || []).map((d) => `${d.label} ${d.avgNorm.toFixed(1)} (gap ${d.domainGap.toFixed(1)})`).join("; ");
      const topGaps = [...(R.tensions || [])].slice(0, 5).map((t) => ({ domain: t.domainLabel || "", question: t.title, scoreA: t.scoreA, scoreB: t.scoreB, gap: t.gap }));
      const ai = await conversationGuide(R.nameA, R.nameB, overallSummary, topGaps, R.comparison);
      if (ai) { guide = ai; usedAI = true; }
    }
    setConvo({ open: true, loading: false, guide, usedAI, nameA: R.nameA, nameB: R.nameB });
    window.scrollTo({ top: 0 });
  };

  const emailReport = (R, toEmail) => {
    const L = (s) => (s == null ? "" : String(s));
    const lines = [];
    lines.push(`CANA — Covenant Life`);
    lines.push(`A Biblical Life Plan for ${L(R.nameA)} & ${L(R.nameB)}`);
    lines.push("");
    lines.push(`JOINT VISION`); lines.push(L(R.vision)); lines.push("");
    lines.push(`JOINT MISSION`); lines.push(L(R.mission)); lines.push("");
    if (R.indivA || R.indivB) {
      lines.push(`INDIVIDUAL VISIONS`);
      if (R.indivA) { lines.push(`${L(R.nameA)} — Vision: ${L(R.indivA.vision)}`); lines.push(`${L(R.nameA)} — Mission: ${L(R.indivA.mission)}`); }
      if (R.indivB) { lines.push(`${L(R.nameB)} — Vision: ${L(R.indivB.vision)}`); lines.push(`${L(R.nameB)} — Mission: ${L(R.indivB.mission)}`); }
      lines.push("");
    }
    lines.push(`DOMAIN HEALTH (0–10 per partner, Δ = gap)`);
    (R.domainScores || []).forEach((d) => lines.push(`- ${d.label}: ${L(R.nameA)} ${d.avgNormA.toFixed(1)}, ${L(R.nameB)} ${d.avgNormB.toFixed(1)} (Δ${Math.abs(d.avgNormA - d.avgNormB).toFixed(1)})`));
    lines.push(`Overall: ${L(R.overallScore && R.overallScore.toFixed ? R.overallScore.toFixed(1) : R.overallScore)}/10`);
    lines.push("");
    const goalBlock = (title, gs) => { if (!gs || !gs.length) return; lines.push(title); gs.forEach((g) => lines.push(`- [${L(g.domain)}] ${L(g.goal)}`)); lines.push(""); };
    goalBlock("GOALS — 1 YEAR", R.goals1yr);
    goalBlock("GOALS — 5 YEAR", R.goals5yr);
    goalBlock("GOALS — 10 YEAR", R.goals10yr);
    if (R.tensions && R.tensions.length) {
      lines.push(`TENSIONS TO DISCUSS`);
      R.tensions.forEach((t) => lines.push(`- ${L(t.title)} — ${L(t.explanation)}`));
      lines.push("");
    }
    lines.push(`— Generated by CANA. These are conversation-starters, not clinical measurements.`);
    const body = lines.join("\n");
    const subject = `CANA — Covenant Life plan for ${L(R.nameA)} & ${L(R.nameB)}`;
    // mailto bodies must be conservatively short; most clients cap ~1800 chars.
    const url = `mailto:${encodeURIComponent(toEmail || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (isDesktop && window.cana && window.cana.openExternal) window.cana.openExternal(url);
    else window.location.href = url;
  };

  const runUpdateCheck = async () => {
    setUpdate({ checking: true, result: null });
    const result = await checkForUpdate();
    setUpdate({ checking: false, result });
    // Auto-dismiss the message after 10 seconds (but keep an available update visible).
    if (result.state !== "update") {
      setTimeout(() => setUpdate((u) => (u.result === result ? { checking: false, result: null } : u)), 10000);
    }
  };

  const generate = async () => {
    setGenerating(true); setGenMsg("Scoring on this device…");
    const analytics = computeAnalytics(answers.A, answers.B, names.A || "Partner A", names.B || "Partner B", weights || undefined);
    const localPlan = generateLocalPlan(analytics);
    const nameA = analytics.nameA, nameB = analytics.nameB;
    let comparison = mode === "full" ? compareDreamMarks(dreamMarks.A, dreamMarks.B, nameA, nameB) : null;
    let indivA = null, indivB = null, jointVM = null, llmUsed = false;
    const cfg = getLLMConfig();
    // Check Ollama liveness directly at generation time (don't rely on the
    // possibly-stale llmState from a prior probe).
    const ollamaLive = (cfg.enabled && mode === "full") ? await ollamaRunning() : false;
    const domSummary = (w) => analytics.domainScores.map((d) => `${d.label}: ${(w === "A" ? d.avgNormA : d.avgNormB).toFixed(1)}`).join(", ");
    const overallSummary = analytics.domainScores.map((d) => `${d.label} ${d.avgNorm.toFixed(1)} (gap ${d.domainGap.toFixed(1)})`).join("; ");
    // Richer synthesis of the actual evaluation, so the joint vision/mission can
    // reflect the couple's real strengths, weak spots, and tensions (#5).
    const sortedDoms = [...analytics.domainScores].sort((a, b) => b.avgNorm - a.avgNorm);
    const evalSynthesis = {
      overall: analytics.overallScore.toFixed(1),
      strongest: sortedDoms.slice(0, 2).map((d) => `${d.label} (${d.avgNorm.toFixed(1)})`),
      weakest: sortedDoms.slice(-2).map((d) => `${d.label} (${d.avgNorm.toFixed(1)})`),
      widestGaps: [...analytics.domainScores].sort((a, b) => b.domainGap - a.domainGap).slice(0, 2).map((d) => `${d.label} (gap ${d.domainGap.toFixed(1)})`),
      topTensions: (localPlan.tensions || []).slice(0, 3).map((t) => t.title),
      flags: (localPlan.flags || []).map((f) => f.title || f.label || "").filter(Boolean),
    };
    let goalsLLM = null;
    // Record WHY the AI did or didn't run, so the report can say so plainly
    // instead of silently falling back.
    let llmSkipReason = "";
    if (mode !== "full") llmSkipReason = "Quick check-ins always use the built-in text (AI writes only for full assessments).";
    else if (!cfg.enabled) llmSkipReason = "The local AI is turned off in settings, so the built-in text was used.";
    else if (!ollamaLive) llmSkipReason = "Ollama wasn't detected as running, so the built-in text was used. Start Ollama and regenerate to use the AI.";
    if (cfg.enabled && mode === "full" && ollamaLive) {
      try {
        setGenMsg("Reading the letters…");
        const exA = letters.A ? await extractLetter(letters.A, nameA) : null;
        const exB = letters.B ? await extractLetter(letters.B, nameB) : null;
        if (exA && exB) { setGenMsg("Comparing your visions…"); comparison = mergeComparisons(comparison, await compareLetters(exA, exB, nameA, nameB)); }
        setGenMsg(`Writing ${nameA}'s vision…`); indivA = await individualVisionMission(nameA, domSummary("A"), exA);
        setGenMsg(`Writing ${nameB}'s vision…`); indivB = await individualVisionMission(nameB, domSummary("B"), exB);
        setGenMsg("Compiling your joint vision…"); jointVM = await jointVisionMission(nameA, nameB, indivA, indivB, comparison, overallSummary, evalSynthesis);
        setGenMsg("Personalizing your goals…"); goalsLLM = await personalizeGoals(nameA, nameB, overallSummary, comparison, { goals1yr: localPlan.goals1yr, goals5yr: localPlan.goals5yr, goals10yr: localPlan.goals10yr });
        llmUsed = !!(indivA || indivB || jointVM);
        if (!llmUsed) llmSkipReason = "The AI was reachable but returned nothing usable, so the built-in text was used.";
      } catch (e) { llmSkipReason = "The AI call failed mid-way, so the built-in text was used."; }
    }
    const plan = {
      ...localPlan,
      vision: jointVM?.vision || localPlan.vision,
      mission: jointVM?.mission || localPlan.mission,
      goals1yr: goalsLLM?.goals1yr || localPlan.goals1yr,
      goals5yr: goalsLLM?.goals5yr || localPlan.goals5yr,
      goals10yr: goalsLLM?.goals10yr || localPlan.goals10yr,
      indivA, indivB, comparison, llmUsed,
      goalsPersonalized: !!goalsLLM,
      llmSkipReason: llmUsed ? "" : llmSkipReason,
    };
    saveResults(plan);
    setEditStmts({ vision: plan.vision, mission: plan.mission });
    const snap = buildSnapshot(analytics, mode, new Date().toISOString());
    if (comparison) snap.letterAlignment = comparison.letterAlignment;
    // Permanently archive the full, reviewable report with this session, so it
    // can always be reopened later — not just the trend metrics. The report is
    // self-contained (names + the rendered plan) so it renders exactly as now.
    snap.id = `s_${Date.now()}`;
    snap.names = { A: names.A || "Partner A", B: names.B || "Partner B" };
    snap.report = plan;
    persistSessions([...sessions, snap], plan);
    setGenerating(false); setGenMsg(""); setScreen("results"); window.scrollTo({ top: 0 });
  };

  // Re-score the existing answers with the current (possibly adjusted) weights.
  // Deterministic only — does not re-call the LLM, so it is instant. Keeps any
  // edited vision/mission and the existing letter comparison intact.
  const rescore = (newWeights) => {
    if (!results) return;
    const analytics = computeAnalytics(answers.A, answers.B, names.A || "Partner A", names.B || "Partner B", newWeights || undefined);
    const localPlan = generateLocalPlan(analytics);
    saveResults((prev) => ({
      ...prev,
      overallScore: analytics.overallScore,
      domainScores: analytics.domainScores,
      tensions: localPlan.tensions,
      flags: localPlan.flags,
      goals1yr: localPlan.goals1yr, goals5yr: localPlan.goals5yr, goals10yr: localPlan.goals10yr,
      // vision/mission/indiv/comparison are preserved from the prior generation
    }));
  };

  // Read the most recent automatic backup (or null).
  const readLatestBackup = () => {
    try {
      const raw = localStorage.getItem(keyFor(LS_BACKUP_BASE, pid));
      const list = raw ? JSON.parse(raw) : [];
      return list.length ? list[0] : null;
    } catch (e) { return null; }
  };

  // Restore sessions + latest report from the most recent automatic backup.
  const restoreFromBackup = () => {
    const b = readLatestBackup();
    if (!b) { setToast("No backup found yet"); return; }
    const reportCount = (b.sessions || []).filter((s) => s.report).length;
    if (!confirm(`Restore your data from the backup saved ${new Date(b.ts).toLocaleString()}? This will bring back ${reportCount} saved report${reportCount === 1 ? "" : "s"} and replace the current in-app data.`)) return;
    try {
      if (b.names) setNames(b.names);
      const sess = b.sessions || [];
      setSessions(sess);
      try { localStorage.setItem(keyFor(LS_SESSIONS_BASE, pid), JSON.stringify(sess)); } catch (e) {}
      setResults(b.results || null);
      try {
        if (b.results) localStorage.setItem(keyFor(LS_RESULTS_BASE, pid), JSON.stringify(b.results));
        else localStorage.removeItem(keyFor(LS_RESULTS_BASE, pid));
      } catch (e) {}
      setArchiveReport(null);
      setToast("Restored from backup");
      setScreen("welcome");
      window.scrollTo({ top: 0 });
    } catch (e) { setToast("Restore failed"); }
  };

  const eraseEverything = () => {
    if (!confirm("Erase ALL data — answers and history — from this device?")) return;
    localStorage.removeItem(keyFor(LS_KEY_BASE, pid)); localStorage.removeItem(keyFor(LS_SESSIONS_BASE, pid)); localStorage.removeItem(keyFor(LS_RESULTS_BASE, pid));
    setNames({ A: "", B: "" }); resetDraft(); setSessions([]); setResults(null); setArchiveReport(null); setScreen("welcome");
  };

  const llmBadge = (
    <button onClick={() => setScreen("settings")} className="no-print" style={{
      display: "flex", alignItems: "center", gap: 7, border: "1px solid var(--hair)",
      background: "var(--panel-solid)", borderRadius: 20, padding: "5px 12px", fontSize: 12.5, color: "var(--ink2)", fontWeight: 500 }}>
      <StatusDot state={llmState} /> {llmState === "ok" ? `Ollama · ${(llmCfg.model || "").split(":")[0]}` : llmState === "bad" ? "Ollama offline" : "Checking…"}
    </button>
  );

  /* ── LOGIN / PROFILE GATE ── */
  if (!profile || screen === "login") {
    const existing = listProfiles();
    const set = (k) => (e) => setAuthForm((f) => ({ ...f, [k]: e.target.value }));
    const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--hair)", background: "var(--panel-solid)", fontSize: 15, color: "var(--ink)", fontFamily: "var(--font)", boxSizing: "border-box", marginBottom: 12 };
    const labelStyle = { fontSize: 12.5, fontWeight: 600, color: "var(--ink2)", margin: "0 0 5px" };
    const onKey = (e) => { if (e.key === "Enter") { authMode === "signin" ? handleSignIn() : handleSignUp(); } };
    return (
      <div>
        <Chrome title="CANA" right={null} />
        <Wrap narrow>
          <div style={{ padding: "56px 0 90px", maxWidth: 440, margin: "0 auto" }} className="rise">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 28 }}>
              <Logo size={64} />
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", color: "var(--ink)", marginTop: 14 }}>CANA</div>
              <div style={{ fontSize: 14, color: "var(--ink3)", marginTop: 2 }}>Covenant Life</div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 22, background: "var(--bg2)", borderRadius: 10, padding: 4 }}>
              <button onClick={() => { setAuthMode("signin"); setAuthError(""); }} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, background: authMode === "signin" ? "var(--panel-solid)" : "transparent", color: authMode === "signin" ? "var(--ink)" : "var(--ink3)", boxShadow: authMode === "signin" ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>Sign in</button>
              <button onClick={() => { setAuthMode("signup"); setAuthError(""); }} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, background: authMode === "signup" ? "var(--panel-solid)" : "transparent", color: authMode === "signup" ? "var(--ink)" : "var(--ink3)", boxShadow: authMode === "signup" ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>Create account</button>
            </div>

            <Card style={{ padding: 24 }}>
              {authMode === "signup" ? (
                <>
                  <p style={labelStyle}>Partner A — first name</p>
                  <input style={inputStyle} value={authForm.nameA} onChange={set("nameA")} placeholder="e.g. David" />
                  <p style={labelStyle}>Partner B — first name</p>
                  <input style={inputStyle} value={authForm.nameB} onChange={set("nameB")} placeholder="e.g. Abby" />
                </>
              ) : null}
              <p style={labelStyle}>Email</p>
              <input style={inputStyle} type="email" autoComplete="username" value={authForm.email} onChange={set("email")} onKeyDown={onKey} placeholder="you@example.com" />
              <p style={labelStyle}>Password</p>
              <input style={inputStyle} type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} value={authForm.password} onChange={set("password")} onKeyDown={onKey} placeholder={authMode === "signup" ? "At least 6 characters" : "Your password"} />

              {authError ? <p style={{ fontSize: 13, color: "var(--red)", margin: "2px 0 12px", lineHeight: 1.4 }}>{authError}</p> : null}

              <Btn onClick={authMode === "signin" ? handleSignIn : handleSignUp} disabled={authBusy} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
                {authBusy ? "Please wait…" : authMode === "signin" ? "Sign in" : "Create account & continue"}
              </Btn>

              {authMode === "signin" && existing.length ? (
                <p style={{ fontSize: 12.5, color: "var(--ink3)", margin: "14px 0 0", textAlign: "center" }}>
                  {existing.length} account{existing.length > 1 ? "s" : ""} on this device.
                </p>
              ) : null}
            </Card>

            <p style={{ fontSize: 11.5, color: "var(--ink3)", lineHeight: 1.6, marginTop: 18, textAlign: "center" }}>
              Accounts are stored only on this device to keep couples' data separate. This is local privacy separation, not a secure server login — your password is saved as a one-way hash, never in plain text, but anyone with full access to this Mac could reach the underlying data. Don't reuse an important password here.
            </p>
          </div>
        </Wrap>
      </div>
    );
  }

  /* ── WELCOME ── */
  if (screen === "welcome") return (
    <div>
      <Toast message={toast} />
      <Chrome title="CANA" right={llmBadge} />
      <Wrap>
        <div style={{ padding: "60px 0 80px" }}>
          <div className="rise" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
            <Logo size={64} />
            <div>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.02em", color: "var(--ink)", lineHeight: 1 }}>CANA</div>
              <div style={{ fontSize: 15, color: "var(--ink3)", marginTop: 3, letterSpacing: ".01em" }}>Covenant Life</div>
            </div>
          </div>
          <p style={eyebrow} className="rise">A Biblical Life Plan for Couples</p>
          <h1 style={h1} className="rise-2">Where are you going,<br />and are you going there together?</h1>
          <p style={{ ...lead, maxWidth: 560 }} className="rise-3">A calm, private space to discover where you are, where God is calling you, and how to get there — as one. Everything runs on your Mac. Nothing leaves it.</p>
          <div className="rise-4" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28, alignItems: "center" }}>
            <Btn onClick={() => { setMode("full"); setScreen("prepare"); window.scrollTo({ top: 0 }); }}>Begin Full Assessment</Btn>
            <Btn kind="secondary" onClick={() => startAssessment("checkin")} disabled={!names.A && !hasHistory}>Quick Check-In</Btn>
            {results ? <Btn kind="subtle" onClick={() => { setScreen("results"); window.scrollTo({ top: 0 }); }}>View latest results</Btn> : null}
            {hasHistory ? <Btn kind="subtle" onClick={() => setScreen("dashboard")}>Dashboard · {sessions.length}</Btn> : null}
          </div>
          <div className="rise-4" style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Btn kind="secondary" onClick={() => { setScreen("intro"); window.scrollTo({ top: 0 }); }}>Introduction</Btn>
            <Btn kind="secondary" onClick={openSetup}>Set up the local AI</Btn>
          </div>
          {!names.A && !hasHistory ? <p style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: 10 }}>The quick check-in unlocks after your first full assessment.</p> : null}

          {(() => {
            const ansA = Object.keys(answers.A).length, ansB = Object.keys(answers.B).length;
            const anyProgress = names.A && (dA > 0 || dB > 0 || ansA > 0 || ansB > 0);
            const bothComplete = dA === N && dB === N && (mode === "full" ? (letters.A.trim().length > 20 && letters.B.trim().length > 20) : true);
            if (!anyProgress || results) return null;
            return (
            <Card className="rise" style={{ marginTop: 24, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                <p style={{ ...eyebrow, margin: 0 }}>Continue where you left off</p>
                <span style={{ fontSize: 12, color: "var(--ink3)" }}>{mode === "checkin" ? "Check-In" : "Full Assessment"} · saved on this device</span>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {["A", "B"].map((p) => {
                  const c = p === "A" ? dA : dB;
                  const qComplete = c === N;
                  const lOK = letters[p].trim().length > 20;
                  const complete = qComplete && (mode === "full" ? lOK : true);
                  const partAns = Object.keys(answers[p]).length;
                  const started = c > 0 || partAns > 0;
                  const nm = (p === "A" ? names.A : names.B) || `Partner ${p}`;
                  const statusText = complete ? "✓ Complete"
                    : qComplete && mode === "full" && !lOK ? "Questions done · letter next"
                    : `${c} / ${N} domains${!c && partAns ? " · in progress" : ""}`;
                  return (
                    <div key={p} style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", border: "1px solid var(--hair)", borderRadius: 12, background: "var(--panel-solid)" }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{nm}</div>
                        <div style={{ fontSize: 12.5, color: complete ? "var(--green)" : "var(--ink3)" }}>{statusText}</div>
                      </div>
                      {!complete ? <Btn kind="secondary" onClick={() => resumeAssessment(p)} style={{ padding: "8px 16px", fontSize: 14 }}>{started ? "Continue" : "Start"}</Btn>
                        : <span style={{ fontSize: 18, color: "var(--green)" }}>✓</span>}
                    </div>
                  );
                })}
              </div>
              {bothComplete ? <p style={{ fontSize: 13, color: "var(--ink2)", margin: "14px 0 0" }}>Both partners are done — <button style={{ border: "none", background: "none", color: "var(--accent)", fontWeight: 600, cursor: "pointer", fontSize: 13 }} onClick={() => setScreen("review")}>go to results →</button></p> : null}
            </Card>
            );
          })()}

          <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
            {DOMAINS.map((d, i) => (
              <Card key={d.id} style={{ padding: 16, animationDelay: `${.2 + i * .03}s` }} className="rise lift">
                <div style={{ fontSize: 22, marginBottom: 6, color: "var(--gold)" }}>{d.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{d.label}</div>
              </Card>
            ))}
          </div>
          {hasHistory && liveTrends ? <DashboardPreview trends={liveTrends} onOpen={() => { setScreen("dashboard"); window.scrollTo({ top: 0 }); }} /> : null}
          <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <p style={{ fontSize: 12.5, color: "var(--ink3)", margin: 0, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} /> Private by design — all data stays on this machine.
            </p>
            <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>·</span>
            <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>CANA {APP_VERSION}</span>
            <button onClick={runUpdateCheck} disabled={update.checking}
              style={{ border: "none", background: "none", color: "var(--accent)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", padding: 0 }}>
              {update.checking ? "Checking…" : "Check for updates"}
            </button>
            <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>·</span>
            <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Signed in as {profile.email}</span>
            <button onClick={logout}
              style={{ border: "none", background: "none", color: "var(--accent)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", padding: 0 }}>
              Sign out
            </button>
          </div>
          {(() => {
            const b = readLatestBackup();
            const reportCount = b ? (b.sessions || []).filter((s) => s.report).length : 0;
            return (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, color: "var(--ink3)", display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: b ? "var(--green)" : "var(--hair)" }} />
                  {b ? `Auto-backup saved ${new Date(b.ts).toLocaleDateString()} · ${reportCount} report${reportCount === 1 ? "" : "s"}` : "No auto-backup yet — complete an assessment to create one."}
                </span>
                {b ? (
                  <button onClick={restoreFromBackup}
                    style={{ border: "none", background: "none", color: "var(--accent)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", padding: 0 }}>
                    Restore from backup
                  </button>
                ) : null}
              </div>
            );
          })()}
          <p style={{ fontSize: 11.5, color: "var(--ink3)", marginTop: 8, lineHeight: 1.5, maxWidth: 560 }}>
            CANA keeps an automatic safety copy of your reports inside the app, so an accidental reset can be undone here. This copy lives on this device only — for a backup that survives clearing your browser or moving computers, use "Save as PDF" on a report.
          </p>
          {update.result ? (
            <div className="rise" style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, maxWidth: 520,
              background: update.result.state === "update" ? "rgba(10,132,255,0.07)" : "var(--bg2)",
              borderLeft: `3px solid ${update.result.state === "update" ? "var(--accent)" : update.result.state === "error" ? "var(--amber)" : "var(--green)"}` }}>
              {update.result.state === "update" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13.5, color: "var(--ink)" }}>CANA {update.result.latest} is available (you have {update.result.current}).</span>
                  <Btn kind="secondary" style={{ padding: "6px 14px", fontSize: 13 }} onClick={() => openDownload(update.result.url)}>Download →</Btn>
                </div>
              ) : update.result.state === "uptodate" ? (
                <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>You're up to date — CANA {update.result.current} is the latest.</span>
              ) : update.result.state === "unconfigured" ? (
                <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>Update checking isn't set up yet. (No release source configured.)</span>
              ) : (
                <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>{update.result.message}</span>
              )}
            </div>
          ) : null}
        </div>
      </Wrap>
    </div>
  );

  /* ── INTRODUCTION / METHODOLOGY ── */
  if (screen === "intro") return (
    <div>
      <Chrome title="CANA — Introduction" right={<div style={{ display: "flex", gap: 8 }}><Btn kind="ghost" onClick={() => { setScreen("welcome"); window.scrollTo({ top: 0 }); }}>Home</Btn></div>} />
      <Wrap narrow>
        <div style={{ padding: "44px 0 90px" }} className="rise">
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <Logo size={48} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", color: "var(--ink)" }}>Introduction</div>
              <div style={{ fontSize: 14, color: "var(--ink3)" }}>The background, methodology &amp; sources</div>
            </div>
          </div>

          {INTRO_SECTIONS.map((sec) => (
            <div key={sec.id} style={{ marginTop: 34 }}>
              <h2 style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-.02em", color: "var(--ink)", margin: "0 0 12px" }}>{sec.title}</h2>
              {(sec.body || []).map((para, i) => (
                <p key={i} style={{ fontSize: 15.5, color: "var(--ink2)", lineHeight: 1.65, margin: "0 0 12px" }}><RichText text={para} /></p>
              ))}

              {/* The domains section also lists each chapter's About content */}
              {sec.domains ? (
                <div style={{ marginTop: 16 }}>
                  {DOMAINS.map((d) => d.about ? (
                    <Card key={d.id} style={{ marginBottom: 12, padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{d.icon} {d.label}</span>
                        <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{d.about.weight}</span>
                      </div>
                      <p style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 4px" }}>Biblical principle</p>
                      <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.6, margin: "0 0 12px" }}><RichText text={d.about.biblical} /></p>
                      {d.about.books ? (<>
                        <p style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 4px" }}>Drawn from</p>
                        <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.6, margin: "0 0 12px" }}><RichText text={d.about.books} /></p>
                      </>) : null}
                      <p style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 4px" }}>Peer-reviewed science</p>
                      <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.6, margin: 0 }}><RichText text={d.about.science} /></p>
                    </Card>
                  ) : null)}
                </div>
              ) : null}

              {/* References list */}
              {sec.refs ? (
                <Card style={{ padding: 18 }}>
                  {sec.refs.map((r, i) => (
                    <p key={i} style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.5, margin: "0 0 8px", paddingLeft: 16, textIndent: -16 }}><RichText text={r} /></p>
                  ))}
                  {sec.footer ? <p style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.5, margin: "10px 0 0", paddingTop: 12, borderTop: "1px solid var(--hair2)" }}>{sec.footer}</p> : null}
                </Card>
              ) : null}
            </div>
          ))}

          <div style={{ marginTop: 40 }}>
            <Btn onClick={() => { setMode("full"); setScreen("prepare"); window.scrollTo({ top: 0 }); }}>Begin Full Assessment</Btn>
          </div>
        </div>
      </Wrap>
    </div>
  );

  /* ── PREPARE (how to approach this) ── */
  if (screen === "prepare") return (
    <div>
      <Chrome title="CANA" right={<div style={{ display: "flex", gap: 8 }}><Btn kind="ghost" onClick={() => setScreen("welcome")}>Back</Btn><Btn kind="ghost" onClick={() => { setScreen("welcome"); window.scrollTo({ top: 0 }); }}>Home</Btn></div>} />
      <Wrap narrow>
        <div style={{ padding: "48px 0 90px" }} className="rise">
          <p style={eyebrow}>{mode === "full" ? "Full Assessment" : "Quick Check-In"}</p>
          <h2 style={h2}>{PREPARE.title}</h2>
          <p style={{ ...lead, maxWidth: 560 }}>{PREPARE.lead}</p>
          <div style={{ marginTop: 26 }}>
            {PREPARE.points.map((pt, i) => (
              <Card key={i} style={{ marginBottom: 12, padding: 18, display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>{pt.h}</div>
                  <p style={{ fontSize: 14.5, color: "var(--ink2)", lineHeight: 1.6, margin: 0 }}>{pt.t}</p>
                </div>
              </Card>
            ))}
          </div>
          <div style={{ marginTop: 28, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Btn onClick={() => { startAssessment(mode); }}>I understand — continue</Btn>
            <Btn kind="subtle" onClick={() => setScreen("intro")}>Read the full background</Btn>
          </div>
        </div>
      </Wrap>
    </div>
  );

  /* ── SETUP WIZARD (first-launch / AI setup) ── */
  if (screen === "setup-wizard") {
    const s = setupState;
    const modelReady = s.models && s.models.some((m) => m === chosenModel || m.startsWith(chosenModel.split(":")[0]));
    const StatusDot = ({ ok, warn }) => (
      <span style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: ok ? "var(--green)" : warn ? "var(--amber)" : "var(--ink3)", display: "inline-block" }} />
    );
    const StepCard = ({ children }) => <Card style={{ marginBottom: 14, padding: 20 }}>{children}</Card>;
    return (
      <div>
        <Chrome title="CANA — Setup" right={<div style={{ display: "flex", gap: 8 }}><Btn kind="ghost" onClick={() => { setScreen("welcome"); window.scrollTo({ top: 0 }); }}>Home</Btn></div>} />
        <Wrap narrow>
          <div style={{ padding: "44px 0 90px" }} className="rise">
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
              <Logo size={48} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", color: "var(--ink)" }}>{SETUP.title}</div>
                <div style={{ fontSize: 14, color: "var(--ink3)" }}>Get the local AI ready — or skip and use CANA without it</div>
              </div>
            </div>
            <p style={{ ...body, maxWidth: 580 }}>{SETUP.lead}</p>

            <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "8px 0 22px" }}>
              <Btn kind="secondary" onClick={refreshSetup} disabled={setupChecking}>{setupChecking ? "Checking…" : "Re-check"}</Btn>
              <Btn kind="subtle" onClick={() => startAssessment("full")}>Skip — use CANA without AI</Btn>
            </div>

            {/* Step 2: Ollama (the one users must install; guided) */}
            <StepCard>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <StatusDot ok={s.ollamaUp} warn={s.ollama && !s.ollamaUp} />
                <span style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{SETUP.steps.ollama.title}</span>
                <span style={{ marginLeft: "auto", fontSize: 12.5, color: s.ollamaUp ? "var(--green)" : "var(--ink3)", fontWeight: 600 }}>
                  {s.ollamaUp ? "Running" : s.ollama ? "Installed, not running" : "Not installed"}
                </span>
              </div>
              {s.ollamaUp ? (
                <p style={{ fontSize: 14, color: "var(--ink2)", margin: 0 }}>{SETUP.steps.ollama.running}</p>
              ) : s.ollama ? (
                <p style={{ fontSize: 14, color: "var(--ink2)", margin: 0 }}>{SETUP.steps.ollama.installedNotRunning}</p>
              ) : (
                <>
                  <p style={{ fontSize: 14, color: "var(--ink2)", margin: "0 0 12px" }}>{SETUP.steps.ollama.missingText}</p>
                  <Btn onClick={() => openDownload(SETUP.steps.ollama.url)}>Download Ollama for Mac →</Btn>
                  <p style={{ fontSize: 12.5, color: "var(--ink3)", margin: "10px 0 0" }}>After installing, open Ollama once, then click <strong>Re-check</strong> above.</p>
                </>
              )}
            </StepCard>

            {/* Step 3: Model — the part CANA automates */}
            <StepCard>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <StatusDot ok={modelReady} />
                <span style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{SETUP.steps.model.title}</span>
                <span style={{ marginLeft: "auto", fontSize: 12.5, color: modelReady ? "var(--green)" : "var(--ink3)", fontWeight: 600 }}>{modelReady ? "Ready" : "Not downloaded"}</span>
              </div>

              {!s.ollamaUp ? (
                <p style={{ fontSize: 13.5, color: "var(--ink3)", margin: 0 }}>Install and open Ollama first; then you can download a model here.</p>
              ) : modelReady ? (
                <p style={{ fontSize: 14, color: "var(--ink2)", margin: 0 }}>{SETUP.steps.model.ready} CANA will use <strong>{chosenModel}</strong>.</p>
              ) : pull.active || pull.done ? (
                <div>
                  <div style={{ height: 8, background: "var(--hair2)", borderRadius: 5, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ height: "100%", width: `${pull.percent}%`, background: "var(--accent)", borderRadius: 5, transition: "width .3s" }} />
                  </div>
                  <p style={{ fontSize: 13, color: "var(--ink2)", margin: 0 }}>
                    {pull.done ? "Downloaded and ready." : `${pull.percent}% · ${pull.status || "working…"}`}
                  </p>
                  {pull.active ? <Btn kind="subtle" onClick={cancelPull} style={{ marginTop: 10 }}>Cancel</Btn> : null}
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 14, color: "var(--ink2)", margin: "0 0 12px" }}>{SETUP.steps.model.missingText}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                    {MODEL_CHOICES.map((m) => (
                      <button key={m.id} onClick={() => setChosenModel(m.id)} style={{
                        textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                        border: `1px solid ${chosenModel === m.id ? "var(--accent)" : "var(--hair)"}`,
                        background: chosenModel === m.id ? "rgba(10,132,255,0.06)" : "var(--panel-solid)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                          <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{m.label}</span>
                          <span style={{ fontSize: 12.5, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{m.size}</span>
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: 3 }}>{m.note}</div>
                      </button>
                    ))}
                  </div>
                  {pull.error ? <p style={{ fontSize: 13, color: "var(--red)", margin: "0 0 10px" }}>{pull.error}</p> : null}
                  <Btn onClick={startPull}>Download {chosenModel.split(":")[0]} ({MODEL_CHOICES.find((m) => m.id === chosenModel)?.size})</Btn>
                  <p style={{ fontSize: 12, color: "var(--ink3)", margin: "10px 0 0" }}>Downloads on your machine via Ollama. You can keep using this window; large models take a while on slow connections.</p>
                </>
              )}
            </StepCard>

            {/* Done state */}
            {s.ollamaUp && modelReady ? (
              <Card style={{ padding: 20, borderLeft: "3px solid var(--green)" }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: "0 0 4px" }}>You're all set.</p>
                <p style={{ fontSize: 14, color: "var(--ink2)", margin: "0 0 14px" }}>CANA will use your local model to write the vision and mission. Everything stays on this Mac.</p>
                <Btn onClick={() => startAssessment("full")}>Begin Full Assessment</Btn>
              </Card>
            ) : null}

            <p style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: 24, lineHeight: 1.6 }}>
              CANA can't install other software for you — macOS requires you to approve installs yourself, which is why the steps above are guided rather than automatic. Once Ollama is running, the model download is handled for you here.
            </p>
          </div>
        </Wrap>
      </div>
    );
  }

  /* ── SETTINGS ── */
  if (screen === "settings") return (
    <div>
      <Chrome title="CANA — Settings" right={<div style={{ display: "flex", gap: 8 }}><Btn kind="ghost" onClick={() => setScreen(results ? "results" : "welcome")}>Back</Btn><Btn kind="ghost" onClick={() => { setScreen("welcome"); window.scrollTo({ top: 0 }); }}>Home</Btn></div>} />
      <Wrap narrow>
        <div style={{ padding: "44px 0 80px" }}>
          <p style={eyebrow}>Settings</p>
          <h2 style={h2}>Local AI (Ollama)</h2>
          <p style={body}>Vision, mission, and letter analysis are written by a model running on this Mac via Ollama. Everything is optional — scoring works without it — and nothing ever leaves your machine.</p>

          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <StatusDot state={llmState} />
                <span style={{ fontSize: 15, fontWeight: 600 }}>{llmState === "ok" ? "Connected" : llmState === "bad" ? "Not reachable" : "Checking…"}</span>
              </div>
              <Btn kind="subtle" onClick={probeOllama}>Refresh</Btn>
            </div>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--hair2)" }}>
              <span style={{ fontSize: 15 }}>Use local AI enhancement</span>
              <button onClick={() => setLlmCfg((c) => ({ ...c, enabled: !c.enabled }))}
                style={{ width: 51, height: 31, borderRadius: 31, border: "none", position: "relative",
                  background: llmCfg.enabled ? "var(--green)" : "rgba(120,120,128,0.32)", transition: "background .25s" }}>
                <span style={{ position: "absolute", top: 2, left: llmCfg.enabled ? 22 : 2, width: 27, height: 27, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,.25)", transition: "left .25s cubic-bezier(.22,.61,.36,1)" }} />
              </button>
            </label>
            <div style={{ padding: "14px 0 4px", borderTop: "1px solid var(--hair2)" }}>
              <p style={{ fontSize: 13, color: "var(--ink3)", margin: "0 0 6px", fontWeight: 600 }}>Endpoint</p>
              <input value={llmCfg.baseUrl} onChange={(e) => setLlmCfg((c) => ({ ...c, baseUrl: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--hair)", fontSize: 14, background: "var(--bg2)", outline: "none" }} />
            </div>
            <div style={{ paddingTop: 12 }}>
              <p style={{ fontSize: 13, color: "var(--ink3)", margin: "0 0 6px", fontWeight: 600 }}>Model</p>
              {llmModels.length ? (
                <select value={llmCfg.model} onChange={(e) => setLlmCfg((c) => ({ ...c, model: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--hair)", fontSize: 14, background: "var(--bg2)", outline: "none" }}>
                  {llmModels.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input value={llmCfg.model} onChange={(e) => setLlmCfg((c) => ({ ...c, model: e.target.value }))}
                  placeholder="llama3.1:8b"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--hair)", fontSize: 14, background: "var(--bg2)", outline: "none" }} />
              )}
            </div>
          </Card>

          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => { setLLMConfig(llmCfg); probeOllama(); }}>Save</Btn>
            <Btn kind="secondary" onClick={async () => { setLLMConfig(llmCfg); setLlmSample(""); setLlmState("checking"); const r = await testConnection(); setLlmState(r.ok ? "ok" : "bad"); setLlmSample(r.ok ? r.sample : r.error); }}>{llmState === "checking" ? "Testing…" : "Test"}</Btn>
          </div>
          {llmSample ? <p style={{ fontSize: 13, color: llmState === "ok" ? "var(--green)" : "var(--red)", marginTop: 12 }}>{llmState === "ok" ? `✓ Model replied: "${llmSample}"` : `✗ ${llmSample}`}</p> : null}

          {/* One-click model download — only meaningful if Ollama is reachable */}
          <Card style={{ marginTop: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Download a model</p>
            <p style={{ fontSize: 13, color: "var(--ink3)", margin: "0 0 14px", lineHeight: 1.5 }}>
              If Ollama is installed and running, CANA can download the recommended model for you — no Terminal needed. This is a one-time ~4–5 GB download.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input value={chosenModel} onChange={(e) => setChosenModel(e.target.value)} placeholder="llama3.1:8b"
                style={{ flex: 1, minWidth: 160, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--hair)", fontSize: 14, background: "var(--bg2)", outline: "none" }} />
              {!pull.active ? (
                <Btn onClick={startPull} disabled={llmState !== "ok"}>{pull.done ? "Download again" : "Download model"}</Btn>
              ) : (
                <Btn kind="secondary" onClick={() => { if (pullAbort.current) pullAbort.current.abort(); setPull((p) => ({ ...p, active: false, status: "cancelled" })); }}>Cancel</Btn>
              )}
            </div>
            {llmState !== "ok" ? (
              <p style={{ fontSize: 12.5, color: "var(--amber)", margin: "10px 0 0" }}>Start Ollama first (then tap Refresh above) to enable the download.</p>
            ) : null}
            {(pull.active || pull.done || pull.error) ? (
              <div style={{ marginTop: 14 }}>
                <div style={{ height: 8, background: "var(--hair2)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pull.percent}%`, background: pull.error ? "var(--red)" : pull.done ? "var(--green)" : "var(--accent)", borderRadius: 4, transition: "width .3s" }} />
                </div>
                <p style={{ fontSize: 12.5, color: pull.error ? "var(--red)" : "var(--ink3)", margin: "8px 0 0" }}>
                  {pull.error ? `✗ ${pull.error}` : pull.done ? "✓ Downloaded and selected — AI features are ready." : `${pull.status} · ${pull.percent}%`}
                </p>
              </div>
            ) : null}
          </Card>

          <Card style={{ marginTop: 28, background: "var(--bg2)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 12px", color: "var(--ink)" }}>One-time setup</p>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.9, color: "var(--ink2)" }}>
              <li>Install Ollama from <strong>ollama.com</strong></li>
              <li>In Terminal: <code style={{ background: "rgba(0,0,0,.06)", padding: "2px 6px", borderRadius: 5 }}>ollama pull llama3.1:8b</code></li>
              <li>If serving this app from a website, allow it: set <code style={{ background: "rgba(0,0,0,.06)", padding: "2px 6px", borderRadius: 5 }}>OLLAMA_ORIGINS=*</code> and restart Ollama. (Not needed when running the app locally.)</li>
              <li>Click <strong>Refresh</strong> above — your models will appear.</li>
            </ol>
            <p style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: 12, marginBottom: 0 }}>Full details in docs/LLM_SETUP.md.</p>
          </Card>
        </div>
      </Wrap>
    </div>
  );

  /* ── SETUP ── */
  if (screen === "setup") return (
    <div>
      <Chrome title="CANA" right={<div style={{ display: "flex", gap: 8 }}><Btn kind="ghost" onClick={() => setScreen("welcome")}>Back</Btn><Btn kind="ghost" onClick={() => { setScreen("welcome"); window.scrollTo({ top: 0 }); }}>Home</Btn></div>} />
      <Wrap narrow>
        <div style={{ padding: "44px 0 80px" }} className="rise">
          <p style={eyebrow}>{mode === "full" ? "Full Assessment" : "Quick Check-In"}</p>
          <h2 style={h2}>Who is taking this?</h2>
          <p style={body}>{mode === "full" ? "You will each answer independently across all nine domains, then write a letter from ten years in the future." : "A quick re-test — one anchor question per domain. Added to your trend history."}</p>
          <Card>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: "var(--ink3)", margin: "0 0 6px", fontWeight: 600 }}>Partner A</p>
              <input value={names.A} onChange={(e) => setNames((n) => ({ ...n, A: e.target.value }))} placeholder="First name"
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--hair)", fontSize: 16, background: "var(--bg2)", outline: "none" }} />
            </div>
            <div>
              <p style={{ fontSize: 13, color: "var(--ink3)", margin: "0 0 6px", fontWeight: 600 }}>Partner B</p>
              <input value={names.B} onChange={(e) => setNames((n) => ({ ...n, B: e.target.value }))} placeholder="First name"
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--hair)", fontSize: 16, background: "var(--bg2)", outline: "none" }} />
            </div>
          </Card>
          <p style={{ fontSize: 13, color: "var(--ink3)", margin: "16px 0 20px" }}>Answer independently, without discussing first. Either of you can go first.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Btn disabled={!names.A || !names.B} onClick={() => { resetDraft(); setPerson("A"); setDIdx(0); setScreen("assessment"); window.scrollTo({ top: 0 }); }}>
              {names.A || "Partner A"} — Begin
            </Btn>
            <Btn kind="secondary" disabled={!names.A || !names.B} onClick={() => { resetDraft(); setPerson("B"); setDIdx(0); setScreen("assessment"); window.scrollTo({ top: 0 }); }}>
              {names.B || "Partner B"} — Begin
            </Btn>
          </div>
        </div>
      </Wrap>
    </div>
  );

  /* ── ASSESSMENT ── */
  if (screen === "assessment") {
    const answeredInDomain = domain.questions.filter((q) => ans[q.id] !== undefined).length;
    const totalQ = activeDomains.reduce((s, d) => s + d.questions.length, 0);
    const totalAnswered = activeDomains.reduce((s, d) => s + d.questions.filter((q) => ans[q.id] !== undefined).length, 0);
    return (
    <div>
      <Chrome title={`CANA — ${person === "A" ? names.A : names.B}`} right={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>{mode === "checkin" ? "Check-In · " : ""}Chapter {dIdx + 1} of {N} · {totalAnswered}/{totalQ}</span>
          <Btn kind="subtle" onClick={saveAndExit}>Save &amp; exit</Btn>
          <Btn kind="ghost" onClick={() => { setScreen("welcome"); window.scrollTo({ top: 0 }); }}>Home</Btn>
        </div>
      } />
      <div style={{ height: 3, background: "var(--hair2)" }}><div style={{ height: "100%", background: "var(--accent)", width: `${(totalAnswered / totalQ) * 100}%`, transition: "width .5s cubic-bezier(.22,.61,.36,1)" }} /></div>
      <Wrap>
        <div style={{ padding: "32px 0 80px" }} key={domain.id}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 28 }}>
            {activeDomains.map((d, i) => {
              const isDone = doneSet(person).has(d.id), cur = i === dIdx;
              return <button key={d.id} onClick={() => { setDIdx(i); setShowAbout(false); setOpenInfo(null); }} style={{
                padding: "6px 12px", borderRadius: 20, fontSize: 12.5, fontWeight: 500,
                border: `1px solid ${cur ? "var(--accent)" : isDone ? "var(--green)" : "var(--hair)"}`,
                background: cur ? "var(--accent)" : "var(--panel-solid)", color: cur ? "#fff" : isDone ? "var(--green)" : "var(--ink2)" }}>
                {isDone && !cur ? "✓ " : ""}{d.icon} {d.label}</button>;
            })}
          </div>
          <div className="rise">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <p style={eyebrow}>{domain.icon} {domain.label}</p>
              <span style={{ fontSize: 12, color: "var(--ink3)", fontWeight: 500 }}>{answeredInDomain} / {domain.questions.length} answered</span>
            </div>
            <Card style={{ padding: "16px 20px", marginBottom: 14, background: "var(--bg2)", boxShadow: "none" }}>
              <p style={{ fontSize: 15, fontStyle: "italic", color: "var(--ink)", margin: "0 0 4px", lineHeight: 1.5 }}>"{domain.scripture.text}"</p>
              <p style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", margin: 0 }}>{domain.scripture.ref}</p>
            </Card>
            {mode === "full" ? <p style={body}>{domain.intro}</p> : null}

            {domain.about ? (
              <div style={{ marginBottom: 8 }}>
                <button onClick={() => setShowAbout((v) => !v)} aria-expanded={showAbout}
                  style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--hair)", background: "var(--panel-solid)",
                    borderRadius: 10, padding: "9px 14px", fontSize: 13.5, fontWeight: 500, color: "var(--ink2)", cursor: "pointer", width: "100%", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--accent)", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>?</span>
                    About this Chapter — why these questions, and the research behind them
                  </span>
                  <span style={{ color: "var(--ink3)", transform: showAbout ? "rotate(90deg)" : "none", transition: "transform .2s" }}>›</span>
                </button>
                {showAbout ? (
                  <Card className="rise" style={{ marginTop: 10, padding: 22 }}>
                    <p style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 16px" }}>{domain.about.weight} in the overall score</p>

                    <p style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 5px" }}>Biblical principle</p>
                    <p style={{ fontSize: 14.5, color: "var(--ink2)", lineHeight: 1.6, margin: "0 0 16px" }}><RichText text={domain.about.biblical} /></p>

                    {domain.about.books ? (
                      <>
                        <p style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 5px" }}>Drawn from</p>
                        <p style={{ fontSize: 14.5, color: "var(--ink2)", lineHeight: 1.6, margin: "0 0 16px" }}><RichText text={domain.about.books} /></p>
                      </>
                    ) : null}

                    <p style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 5px" }}>Peer-reviewed science</p>
                    <p style={{ fontSize: 14.5, color: "var(--ink2)", lineHeight: 1.6, margin: 0 }}><RichText text={domain.about.science} /></p>

                    <p style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.5, margin: "16px 0 0", paddingTop: 14, borderTop: "1px solid var(--hair2)" }}>
                      Full citations and the complete model are in the project's research foundation document. Reported figures are sample-specific findings from the cited studies, not guarantees about any individual couple.
                    </p>
                  </Card>
                ) : null}
              </div>
            ) : null}
          </div>
          {(() => {
            const PAGE = 4;
            const pages = Math.ceil(domain.questions.length / PAGE) || 1;
            const page = Math.min(qPage, pages - 1);
            const start = page * PAGE;
            const pageQs = domain.questions.slice(start, start + PAGE);
            const pageDone = pageQs.every((q) => ans[q.id] !== undefined);
            const lastPage = page >= pages - 1;
            return (
            <>
              <div style={{ marginTop: 16 }} className="rise" key={"q-" + domain.id + "-" + page}>
                {pages > 1 ? <p style={{ fontSize: 12, color: "var(--ink3)", margin: "0 0 12px", fontWeight: 500 }}>Part {page + 1} of {pages} in this chapter</p> : null}
                {pageQs.map((q, qiLocal) => {
                  const qi = start + qiLocal;
                  const infoOpen = openInfo === q.id;
                  const answered = ans[q.id] !== undefined;
                  return (
                  <Card key={q.id} style={{ marginBottom: 14, padding: 20, borderColor: answered ? "rgba(52,199,89,0.35)" : "var(--hair2)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <p style={{ flex: 1, fontSize: 16, color: "var(--ink)", margin: "0 0 14px", lineHeight: 1.45, fontWeight: 500, letterSpacing: "-.01em" }}>
                        <span style={{ color: answered ? "var(--green)" : "var(--ink3)", marginRight: 8, fontWeight: 500 }}>{answered ? "✓" : qi + 1 + "."}</span>{q.text}
                      </p>
                      {(QUESTION_HELP[q.id] || q.info) ? (
                        <button onClick={() => setOpenInfo(infoOpen ? null : q.id)} aria-label="What is this question asking?" aria-expanded={infoOpen}
                          style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", border: `1px solid ${infoOpen ? "var(--accent)" : "var(--hair)"}`,
                            background: infoOpen ? "var(--accent)" : "transparent", color: infoOpen ? "#fff" : "var(--ink3)",
                            fontSize: 15, fontWeight: 500, lineHeight: 1, cursor: "pointer", transition: "all .15s", display: "flex", alignItems: "center", justifyContent: "center" }}>ⓘ</button>
                      ) : null}
                    </div>
                    {infoOpen && (QUESTION_HELP[q.id] || q.info) ? (
                      <div className="rise" style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 10, background: "var(--bg2)", borderLeft: "3px solid var(--accent)" }}>
                        {QUESTION_HELP[q.id] ? (
                          <p style={{ fontSize: 14, color: "var(--ink)", margin: q.info ? "0 0 8px" : 0, lineHeight: 1.55 }}>{QUESTION_HELP[q.id]}</p>
                        ) : null}
                        {q.info ? (
                          <p style={{ fontSize: 12.5, color: "var(--ink3)", margin: 0, lineHeight: 1.5 }}>{QUESTION_HELP[q.id] ? "More context: " : ""}{q.info}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <ScaleInput question={q} value={ans[q.id]} onChange={(v) => handleAnswer(q.id, v)} />
                  </Card>
                );})}
              </div>
              <div style={{ marginTop: 24, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {!lastPage ? (
                  <Btn disabled={!pageDone} onClick={() => { setQPage(page + 1); setOpenInfo(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Continue</Btn>
                ) : (
                  <Btn disabled={!allDone} onClick={finishDomain}>{dIdx < N - 1 ? `Next — ${activeDomains[dIdx + 1].label}` : "Complete"}</Btn>
                )}
                {page > 0 ? (
                  <Btn kind="subtle" onClick={() => { setQPage(page - 1); setOpenInfo(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Previous</Btn>
                ) : dIdx > 0 ? (
                  <Btn kind="subtle" onClick={() => { setDIdx(dIdx - 1); setShowAbout(false); setOpenInfo(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Previous chapter</Btn>
                ) : null}
                {!pageDone ? <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Answer all to continue</span> : null}
              </div>
            </>
            );
          })()}
        </div>
      </Wrap>
    </div>
    );
  }

  /* ── REVIEW ── */
  if (screen === "review") {
    const letterOK = (p) => letters[p].trim().length > 20;
    const trackDone = (p) => (p === "A" ? dA : dB) === N && (mode === "full" ? letterOK(p) : true);
    const bothTracks = trackDone("A") && trackDone("B");
    return (
    <div>
      <Chrome title="CANA" right={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>{names.A} {dA}/{N} · {names.B} {dB}/{N}</span>
          <Btn kind="ghost" onClick={() => { setScreen("welcome"); window.scrollTo({ top: 0 }); }}>Home</Btn>
        </div>
      } />
      <Wrap narrow>
        <div style={{ padding: "44px 0 80px" }} className="rise">
          <p style={eyebrow}>{mode === "full" ? "Full Assessment" : "Check-In"}</p>
          <h2 style={h2}>{bothTracks ? "Both complete." : "In progress."}</h2>
          {mode === "full" ? <p style={{ ...body, marginTop: -6 }}>Each of you completes your own questions <em>and</em> your Future Perfect letter — independently, in any order. Your plan generates once you're both done.</p> : null}
          <div style={{ display: "flex", gap: 14, margin: "20px 0 26px", flexWrap: "wrap" }}>
            {["A", "B"].map((p) => {
              const c = p === "A" ? dA : dB, qComplete = c === N;
              const lOK = letterOK(p);
              const complete = trackDone(p);
              const nm = p === "A" ? names.A : names.B;
              return (
                <Card key={p} style={{ flex: 1, minWidth: 220 }}>
                  <p style={{ ...eyebrow, color: "var(--gold)" }}>{nm}</p>
                  <div style={{ fontSize: 34, fontWeight: 700, color: complete ? "var(--green)" : "var(--ink)", letterSpacing: "-.02em" }}>{c}<span style={{ fontSize: 18, color: "var(--ink3)" }}>/{N}</span></div>
                  <p style={{ fontSize: 13, color: "var(--ink3)", margin: "4px 0 10px" }}>domains complete</p>
                  {mode === "full" ? (
                    <p style={{ fontSize: 12.5, color: lOK ? "var(--green)" : "var(--ink3)", margin: "0 0 14px" }}>{lOK ? "✓ Letter written" : "Letter not yet written"}</p>
                  ) : null}
                  {!qComplete ? (
                    <Btn kind="secondary" onClick={() => { setPerson(p); setDIdx(activeDomains.findIndex((d) => !doneSet(p).has(d.id))); setScreen("assessment"); window.scrollTo({ top: 0 }); }}>{c === 0 ? "Begin" : "Continue questions"}</Btn>
                  ) : (mode === "full" && !lOK) ? (
                    <Btn kind="secondary" onClick={() => { setPerson(p); setScreen("letter"); window.scrollTo({ top: 0 }); }}>Write {nm}'s letter</Btn>
                  ) : (
                    <span style={{ color: "var(--green)", fontSize: 14, fontWeight: 600 }}>✓ Done</span>
                  )}
                  {mode === "full" && qComplete && lOK ? (
                    <button onClick={() => { setPerson(p); setScreen("letter"); window.scrollTo({ top: 0 }); }} style={{ display: "block", marginTop: 10, border: "none", background: "none", color: "var(--accent)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", padding: 0 }}>Edit letter</button>
                  ) : null}
                </Card>
              );
            })}
          </div>
          {bothTracks && (
            generating ? (
              <Card style={{ textAlign: "center", padding: 40 }}><div style={{ width: 30, height: 30, border: "3px solid var(--hair)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin .9s linear infinite", margin: "0 auto 14px" }} /><p style={{ fontSize: 14, color: "var(--ink2)" }}>{genMsg}</p></Card>
            ) : (
              <Card><p style={body}>Scoring runs on this device; a snapshot is saved to your trend history.</p><Btn onClick={generate}>Generate &amp; Save</Btn></Card>
            )
          )}
        </div>
      </Wrap>
    </div>
    );
  }

  /* ── LETTER ── */
  if (screen === "letter") {
    const text = letters[person], marks = dreamMarks[person];
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const enough = text.trim().length > 20, otherDone = letters[person === "A" ? "B" : "A"].trim().length > 20;
    return (
      <div>
        <Chrome title={`CANA — ${person === "A" ? names.A : names.B}`} right={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="ghost" onClick={() => setScreen("review")}>Back</Btn>
            <Btn kind="subtle" onClick={saveAndExit}>Save &amp; exit</Btn>
            <Btn kind="ghost" onClick={() => { setScreen("welcome"); window.scrollTo({ top: 0 }); }}>Home</Btn>
          </div>
        } />
        <Wrap narrow>
          <div style={{ padding: "44px 0 80px" }} className="rise">
            <p style={eyebrow}>Future Perfect</p>
            <h2 style={h2}>{person === "A" ? names.A : names.B}, write from ten years ahead.</h2>
            <Card style={{ padding: "14px 18px", marginBottom: 20, background: "var(--bg2)", boxShadow: "none" }}>
              <p style={{ fontSize: 14.5, fontStyle: "italic", color: "var(--ink)", margin: "0 0 4px", lineHeight: 1.5 }}>"…plans to give you a future and a hope."</p>
              <p style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600, margin: 0 }}>JEREMIAH 29:11</p>
            </Card>
            <p style={body}>Imagine it is ten years from now and, by God's grace, life has gone well. Write in the present tense: where you live, your marriage, your children, your work and craft, your walk with God, what you've built, what you're grateful for. Be specific about what a <em>good</em> decade looks like to you.</p>
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12.5, color: "var(--ink3)", margin: "0 0 8px", fontWeight: 500 }}>Stuck? Tap a starter to drop it in, then finish the sentence:</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  "It is the year ahead, and our marriage feels…",
                  "Our home is…",
                  "With our children, we…",
                  "In my work and craft, I…",
                  "In our walk with God, we…",
                  "The thing I'm most grateful we did is…",
                ].map((s) => (
                  <button key={s} onClick={() => setLetters((l) => { const cur = l[person] || ""; const sep = cur && !cur.endsWith("\n") ? "\n\n" : ""; return { ...l, [person]: cur + sep + s + " " }; })}
                    style={{ border: "1px solid var(--hair)", background: "var(--panel-solid)", borderRadius: 18, padding: "6px 13px", fontSize: 12.5, color: "var(--ink2)", cursor: "pointer" }}>
                    + {s.replace(/…$/, "")}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={text} onChange={(e) => setLetters((l) => ({ ...l, [person]: e.target.value }))}
              placeholder="Dear self, ten years from now…"
              style={{ width: "100%", minHeight: 240, padding: 18, borderRadius: 14, border: "1px solid var(--hair)", fontSize: 16, lineHeight: 1.7, background: "var(--panel-solid)", outline: "none", resize: "vertical", boxShadow: "var(--shadow-sm)" }} />
            <p style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: 6 }}>{words} words {enough ? "" : "· a little more"}</p>

            <div style={{ height: 1, background: "var(--hair2)", margin: "28px 0" }} />
            <p style={eyebrow}>Mark your dreams</p>
            <p style={body}>So your visions can be compared precisely, rate how central each is to your picture. <span style={{ color: "var(--ink3)" }}>0 = not part of it · 10 = essential</span></p>
            {DREAM_ELEMENTS.map((e) => (
              <div key={e.id} style={{ marginBottom: 18 }}>
                <p style={{ fontSize: 14.5, color: "var(--ink)", margin: "0 0 8px", fontWeight: 500 }}>{e.label}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[0, 1, 2, 3, 7, 8, 9, 10].map((v) => {
                    const on = marks[e.id] === v;
                    return <button key={v} onClick={() => setDreamMarks((dm) => ({ ...dm, [person]: { ...dm[person], [e.id]: v } }))}
                      style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${on ? "var(--accent)" : "var(--hair)"}`, background: on ? "var(--accent)" : "var(--panel-solid)", color: on ? "#fff" : "var(--ink)", fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", boxShadow: on ? "0 2px 8px rgba(10,132,255,.3)" : "var(--shadow-sm)" }}>{v}</button>;
                  })}
                </div>
              </div>
            ))}
            <div style={{ height: 1, background: "var(--hair2)", margin: "28px 0" }} />
            {(() => {
              // Per-partner track = their questions done AND their letter done.
              const meDone = (person === "A" ? dA : dB) === N && enough;
              const other = person === "A" ? "B" : "A";
              const otherName = other === "A" ? names.A : names.B;
              const otherQ = (other === "A" ? dA : dB) === N;
              const otherTrackDone = otherQ && otherDone;
              const bothDone = meDone && otherTrackDone;
              if (generating) {
                return <Card style={{ textAlign: "center", padding: 36 }}><div style={{ width: 30, height: 30, border: "3px solid var(--hair)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin .9s linear infinite", margin: "0 auto 14px" }} /><p style={{ fontSize: 14, color: "var(--ink2)" }}>{genMsg}</p></Card>;
              }
              return (
                <>
                  {bothDone ? (
                    <>
                      <Btn disabled={!enough} onClick={generate}>Generate Our Plan</Btn>
                      <p style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: 10 }}>{llmState === "ok" && llmCfg.enabled ? "Letters analyzed by your local Ollama." : "Local AI off — letters compared by your dream ratings."} <button style={{ border: "none", background: "none", color: "var(--accent)", fontWeight: 500, cursor: "pointer", fontSize: 12.5 }} onClick={() => setScreen("settings")}>Settings</button></p>
                    </>
                  ) : (
                    <>
                      <Btn disabled={!enough} onClick={() => { setScreen("review"); window.scrollTo({ top: 0 }); }}>
                        {enough ? `Save ${person === "A" ? names.A : names.B}'s part` : "Write a little more to continue"}
                      </Btn>
                      <p style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: 10 }}>
                        {otherTrackDone
                          ? `${otherName} is already done — once you save, you can generate your plan.`
                          : `${otherName} can complete their questions and letter any time, in any order. Your plan generates once you're both done.`}
                      </p>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </Wrap>
      </div>
    );
  }

  /* ── RESULTS ── */
  /* ── START THE CONVERSATION ── */
  if (convo.open) {
    const g = convo.guide;
    return (
      <div>
        <Chrome title="CANA — Start the Conversation" right={
          <div style={{ display: "flex", gap: 8 }} className="no-print">
            {g ? <Btn kind="ghost" onClick={() => window.print()}>Save as PDF</Btn> : null}
            <Btn kind="ghost" onClick={() => { setConvo({ open: false, loading: false, guide: null, usedAI: false }); setScreen("results"); window.scrollTo({ top: 0 }); }}>Back to report</Btn>
          </div>
        } />
        <Wrap>
          <div style={{ padding: "44px 0 90px" }}>
            <p style={{ fontSize: 12, color: convo.usedAI ? "var(--gold)" : "var(--ink3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 14 }}>
              {convo.usedAI ? "✦ Prepared by your local AI" : "Prepared locally"}
            </p>
            <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.02em", color: "var(--ink)", margin: "0 0 6px" }}>Start the Conversation</h1>
            <p style={{ fontSize: 15.5, color: "var(--ink2)", lineHeight: 1.6, margin: "0 0 28px", maxWidth: 640 }}>
              A guide for {convo.nameA} & {convo.nameB} to talk through what matters most — honestly, and toward each other.
            </p>

            {convo.loading ? (
              <Card style={{ padding: 40, textAlign: "center" }}>
                <p style={{ fontSize: 15, color: "var(--ink2)", margin: 0 }}>Preparing your conversation guide…</p>
              </Card>
            ) : g ? (
              <>
                {/* Framing summary */}
                <Card className="rise pdf-keep" style={{ marginBottom: 18, padding: 26 }}>
                  <p style={{ ...eyebrow, margin: "0 0 14px" }}>Where you stand</p>
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", margin: "0 0 4px" }}>Strengths</p>
                    <p style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>{g.summary.positive}</p>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--amber)", margin: "0 0 4px" }}>Growth areas</p>
                    <p style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>{g.summary.growth}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", margin: "0 0 4px" }}>The bigger picture</p>
                    <p style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>{g.summary.overall}</p>
                  </div>
                </Card>

                {/* Questions */}
                <p style={{ ...eyebrow, margin: "28px 0 12px" }}>Questions to explore together</p>
                {g.questions.map((q, i) => (
                  <Card key={i} className="pdf-keep" style={{ marginBottom: 12, padding: 20 }}>
                    {q.area ? <p style={{ fontSize: 11.5, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 6px" }}>{q.area}</p> : null}
                    <p style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", lineHeight: 1.5, margin: "0 0 6px" }}>{i + 1}. {q.prompt}</p>
                    {q.why ? <p style={{ fontSize: 13, color: "var(--ink3)", lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>{q.why}</p> : null}
                  </Card>
                ))}

                <Card style={{ marginTop: 24, background: "var(--bg2)", boxShadow: "none", textAlign: "center" }} className="pdf-keep">
                  <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.6, margin: 0 }}>
                    Take these slowly — one or two per sitting. The goal isn't to resolve everything tonight, but to move a little closer to each other and to God in the process.
                  </p>
                </Card>

                <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }} className="no-print">
                  <Btn kind="secondary" onClick={() => { setConvo({ open: false, loading: false, guide: null, usedAI: false }); setScreen("results"); window.scrollTo({ top: 0 }); }}>Back to report</Btn>
                  <Btn onClick={() => window.print()}>Save as PDF</Btn>
                </div>
              </>
            ) : (
              <Card style={{ padding: 30 }}><p style={{ margin: 0, color: "var(--ink2)" }}>Could not prepare the guide. Please try again.</p></Card>
            )}
          </div>
        </Wrap>
      </div>
    );
  }

  /* ── RESULTS ── */
  if (screen === "results" && (results || archiveReport)) {
    // When reviewing a past session, render its archived report; otherwise the
    // live results. `R` is what the whole screen reads from.
    const R = archiveReport || results;
    // Guard against an incomplete/old report that lacks the fields this screen
    // needs (older archives, or a partially-written report). Rather than crash
    // into a blank, unexitable page, show a friendly recoverable screen.
    const reportUsable = R && Array.isArray(R.domainScores) && R.domainScores.length > 0;
    if (!reportUsable) {
      return (
        <div>
          <Chrome title="CANA — Report" right={<div style={{ display: "flex", gap: 8 }}>{hasHistory ? <Btn kind="ghost" onClick={() => { setArchiveReport(null); setScreen("dashboard"); window.scrollTo({ top: 0 }); }}>Dashboard</Btn> : null}<Btn kind="ghost" onClick={() => { setArchiveReport(null); setScreen("welcome"); window.scrollTo({ top: 0 }); }}>Home</Btn></div>} />
          <Wrap>
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <p style={{ fontSize: 16, color: "var(--ink2)", marginBottom: 8 }}>This report can't be opened.</p>
              <p style={{ fontSize: 13.5, color: "var(--ink3)", marginBottom: 22, maxWidth: 460, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>It looks like an older or incomplete saved report that doesn't include the full results. Your other reports are unaffected.</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <Btn onClick={() => { setArchiveReport(null); setScreen("welcome"); window.scrollTo({ top: 0 }); }}>Back to home</Btn>
                {hasHistory ? <Btn kind="secondary" onClick={() => { setArchiveReport(null); setScreen("dashboard"); window.scrollTo({ top: 0 }); }}>View past assessments</Btn> : null}
              </div>
            </div>
          </Wrap>
        </div>
      );
    }
    const goals = (goalsTab === "1yr" ? R.goals1yr : goalsTab === "5yr" ? R.goals5yr : R.goals10yr) || [];
    const flagColor = (t) => t === "CRITICAL" || t === "URGENT" ? "var(--red)" : t === "STRENGTH" ? "var(--green)" : t === "TENSION" ? "var(--amber)" : "var(--accent)";
    const reviewing = !!archiveReport;

    // Build a strictly descriptive (non-interpreting) explanation for one
    // domain's result, including, when the gap is notable, exactly which
    // questions the divergence comes from and who scored higher on each.
    const domainDetail = (d) => {
      const A = R.nameA, B = R.nameB;
      const lines = [];
      lines.push(`${A} scored ${d.avgNormA.toFixed(1)} and ${B} scored ${d.avgNormB.toFixed(1)} out of 10 in this chapter (each is that partner's own average of their answers here, where higher always means a healthier self-report).`);
      const gap = d.domainGap;
      // Identify the questions that actually diverged, regardless of the
      // domain average — a chapter can look aligned on average yet hide a
      // sharp split on one question, which is exactly worth surfacing.
      const drivers = (d.questionGaps || [])
        .filter((q) => q.gap >= 2)
        .slice(0, 3)
        .map((q) => {
          const higherName = q.higher === "A" ? A : q.higher === "B" ? B : null;
          const detail = higherName
            ? `${higherName} answered more positively (${A}: ${q.normA.toFixed(0)}, ${B}: ${q.normB.toFixed(0)}; Δ${q.gap.toFixed(1)}).`
            : `both answered the same (Δ0).`;
          return { text: q.text, detail };
        });
      if (gap >= 2) {
        lines.push(`There is a notable gap in this chapter's averages (Δ${gap.toFixed(1)}) — the two of you answered its questions differently overall. It comes mostly from these questions:`);
      } else if (drivers.length) {
        lines.push(`Your chapter averages are close (Δ${gap.toFixed(1)}), but you answered some individual questions quite differently:`);
      } else {
        lines.push(`The gap between you is small (Δ${gap.toFixed(1)}) — your answers across this chapter were close to each other.`);
      }
      return { lines, drivers };
    };

    return (
      <div>
        <Chrome title={reviewing ? `CANA — Report · ${new Date(archiveReport.ts || Date.now()).toLocaleDateString()}` : "CANA — Your Plan"} right={<div style={{ display: "flex", gap: 8 }}>{reviewing ? <Btn kind="ghost" onClick={() => { setArchiveReport(null); setScreen("dashboard"); window.scrollTo({ top: 0 }); }}>Done reviewing</Btn> : <>{hasHistory ? <Btn kind="ghost" onClick={() => setScreen("dashboard")}>Dashboard</Btn> : null}<Btn kind="ghost" onClick={() => setScreen("welcome")}>Home</Btn></>}</div>} />
        <Wrap>
          <div style={{ padding: "44px 0 90px" }}>
            <p style={{ fontSize: 12, color: R.llmUsed ? "var(--gold)" : "var(--ink3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 18 }}>{R.llmUsed ? (R.goalsPersonalized ? "✦ Vision, mission & goals written by your local AI · editable" : "✦ Vision & mission written by your local AI · editable") : "Generated locally · editable"}</p>

            {!reviewing && !R.llmUsed && R.llmSkipReason ? (
              <Card className="rise no-print" style={{ marginBottom: 20, padding: 16, background: "var(--bg2)", borderLeft: "3px solid var(--amber)" }}>
                <p style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 600, margin: "0 0 4px" }}>This report used the built-in text, not the local AI.</p>
                <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.5, margin: "0 0 10px" }}>{R.llmSkipReason}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Btn kind="secondary" style={{ padding: "6px 14px", fontSize: 13 }} onClick={openSetup}>Set up the local AI</Btn>
                  <Btn kind="subtle" style={{ padding: "6px 14px", fontSize: 13 }} onClick={async () => { await probeOllama(); generate(); }}>Regenerate with AI</Btn>
                </div>
              </Card>
            ) : null}

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <p style={{ ...eyebrow, margin: 0 }}>Joint Vision</p>
              <span style={{ fontSize: 11, color: "var(--ink3)" }} className="no-print">{reviewing ? "saved report" : "✎ tap to edit"}</span>
            </div>
            <Card className="rise" style={{ marginBottom: 16, padding: 28 }}>
              <textarea value={reviewing ? R.vision : (editStmts?.vision ?? R.vision)} readOnly={reviewing} onChange={(e) => setEditStmts((p) => ({ ...p, vision: e.target.value }))}
                rows={2}
                style={{ width: "100%", border: "none", outline: "none", resize: "vertical", minHeight: 64, background: "transparent", fontSize: 21, lineHeight: 1.5, fontWeight: 600, letterSpacing: "-.02em", color: "var(--ink)", fontFamily: "var(--font)" }} />
            </Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <p style={{ ...eyebrow, margin: 0 }}>Joint Mission</p>
              <span style={{ fontSize: 11, color: "var(--ink3)" }} className="no-print">{reviewing ? "saved report" : "✎ tap to edit"}</span>
            </div>
            <Card className="rise-2" style={{ marginBottom: 32, padding: 28 }}>
              <textarea value={reviewing ? R.mission : (editStmts?.mission ?? R.mission)} readOnly={reviewing} onChange={(e) => setEditStmts((p) => ({ ...p, mission: e.target.value }))}
                rows={3}
                style={{ width: "100%", border: "none", outline: "none", resize: "vertical", minHeight: 64, background: "transparent", fontSize: 18, lineHeight: 1.55, color: "var(--ink2)", fontFamily: "var(--font)" }} />
            </Card>

            {(R.indivA || R.indivB) ? (
              <><p style={eyebrow}>Individual Visions</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginBottom: 32 }}>
                  {["A", "B"].map((p) => { const iv = p === "A" ? R.indivA : R.indivB; const nm = p === "A" ? R.nameA : R.nameB; if (!iv) return null;
                    return <Card key={p}><p style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", margin: "0 0 12px" }}>{nm}</p>
                      <p style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px" }}>Vision</p>
                      <p style={{ fontSize: 15, fontStyle: "italic", color: "var(--ink)", lineHeight: 1.55, margin: "0 0 12px" }}>{iv.vision}</p>
                      <p style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px" }}>Mission</p>
                      <p style={{ fontSize: 15, fontStyle: "italic", color: "var(--ink2)", lineHeight: 1.55, margin: 0 }}>{iv.mission}</p></Card>; })}
                </div></>
            ) : null}

            {R.comparison ? (
              <><p style={eyebrow}>Future Perfect — Where Your Letters Meet</p>
                <p style={body}>Letter alignment: <strong style={{ color: "var(--ink)" }}>{R.comparison.letterAlignment}/10</strong>. Differences can be complementary, not just conflicts.</p>
                <p style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", margin: "16px 0 8px" }}>Top Shared Dreams</p>
                {(R.comparison.commonalities || []).length ? (R.comparison.commonalities || []).map((c, i) => (
                  <Card key={i} style={{ padding: "14px 18px", marginBottom: 10, borderLeft: "3px solid var(--green)" }}>
                    <p style={{ fontSize: 15, fontWeight: 600, margin: c.detail ? "0 0 4px" : 0 }}>{c.theme}</p>
                    {c.detail ? <p style={{ fontSize: 13.5, color: "var(--ink2)", margin: 0 }}>{c.detail}</p> : null}</Card>
                )) : <p style={{ ...body, color: "var(--ink3)" }}>No strongly shared dreams surfaced — worth discussing.</p>}
                <p style={{ fontSize: 12, color: "var(--amber)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", margin: "18px 0 8px" }}>Top Differences</p>
                {(R.comparison.differences || []).length ? (R.comparison.differences || []).map((d, i) => (
                  <Card key={i} style={{ padding: "14px 18px", marginBottom: 10, borderLeft: `3px solid ${d.tension === "high" ? "var(--red)" : d.tension === "medium" ? "var(--amber)" : "var(--accent)"}` }}>
                    <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>{d.theme} <span style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 500, textTransform: "uppercase" }}>· {d.tension}</span></p>
                    <p style={{ fontSize: 13.5, color: "var(--ink2)", margin: 0 }}>{d.a} · {d.b}</p></Card>
                )) : <p style={{ ...body, color: "var(--ink3)" }}>No major divergences.</p>}
                <div style={{ height: 1, background: "var(--hair2)", margin: "32px 0" }} /></>
            ) : null}

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <p style={{ ...eyebrow, margin: 0 }}>Domain Health</p>
              <button onClick={() => setShowScoreInfo((v) => !v)} aria-expanded={showScoreInfo} aria-label="What these numbers are" className="no-print"
                style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${showScoreInfo ? "var(--accent)" : "var(--hair)"}`, background: showScoreInfo ? "var(--accent)" : "transparent", color: showScoreInfo ? "#fff" : "var(--ink3)", fontSize: 13, fontWeight: 500, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>ⓘ</button>
            </div>
            {showScoreInfo ? (
              <Card className="rise no-print" style={{ marginBottom: 14, padding: 20, background: "var(--bg2)" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: "0 0 12px" }}>{SCORE_INFO.title}</p>
                {SCORE_INFO.items.map((it, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{it.h}. </span>
                    <span style={{ fontSize: 13.5, color: "var(--ink2)", lineHeight: 1.55 }}>{it.t}</span>
                  </div>
                ))}
                <p style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.5, margin: "12px 0 0", paddingTop: 12, borderTop: "1px solid var(--hair2)" }}>{SCORE_INFO.footer}</p>
              </Card>
            ) : null}
            <Card style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", gap: 18, marginBottom: 14, fontSize: 12.5 }}>
                <span style={{ color: "var(--accent)" }}>● {R.nameA}</span><span style={{ color: "var(--gold)" }}>● {R.nameB}</span>
                <span style={{ color: "var(--ink3)", marginLeft: "auto" }}>gap = distance between you</span>
              </div>
              {R.domainScores.map((d) => {
                const gap = Math.abs(d.avgNormA - d.avgNormB);
                const gapCol = gap >= 3 ? "var(--red)" : gap >= 2 ? "var(--amber)" : "var(--ink3)";
                const open = openDomainInfo === d.id;
                const detail = open ? domainDetail(d) : null;
                return (
                <div key={d.id} className="pdf-keep" style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, width: 138, color: "var(--ink2)" }}>{d.icon} {d.label}</span>
                    <div style={{ flex: 1, height: 7, background: "var(--hair2)", borderRadius: 4, position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", height: "100%", width: `${d.avgNormA * 10}%`, background: "var(--accent)", borderRadius: 4, transition: "width .7s cubic-bezier(.22,.61,.36,1)" }} /></div>
                    <span style={{ fontSize: 12.5, width: 28, textAlign: "right", color: "var(--ink2)", fontVariantNumeric: "tabular-nums" }}>{d.avgNormA.toFixed(1)}</span>
                    <div style={{ flex: 1, height: 7, background: "var(--hair2)", borderRadius: 4, position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", height: "100%", width: `${d.avgNormB * 10}%`, background: "var(--gold)", borderRadius: 4, transition: "width .7s cubic-bezier(.22,.61,.36,1)" }} /></div>
                    <span style={{ fontSize: 12.5, width: 28, textAlign: "right", color: "var(--ink2)", fontVariantNumeric: "tabular-nums" }}>{d.avgNormB.toFixed(1)}</span>
                    <span style={{ fontSize: 11, width: 40, textAlign: "right", color: gapCol, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>Δ{gap.toFixed(1)}</span>
                    <button onClick={() => setOpenDomainInfo(open ? null : d.id)} aria-expanded={open} aria-label={`Explain ${d.label} score`} className="no-print"
                      style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", border: `1px solid ${open ? "var(--accent)" : "var(--hair)"}`, background: open ? "var(--accent)" : "transparent", color: open ? "#fff" : "var(--ink3)", fontSize: 12, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>ⓘ</button>
                  </div>
                  {open && detail ? (
                    <div className="rise" style={{ margin: "10px 0 4px", padding: "14px 16px", borderRadius: 10, background: "var(--bg2)", borderLeft: `3px solid ${gap >= 2 ? gapCol : "var(--accent)"}` }}>
                      {detail.lines.map((ln, i) => (
                        <p key={i} style={{ fontSize: 13.5, color: "var(--ink2)", lineHeight: 1.55, margin: i === detail.lines.length - 1 && !detail.drivers.length ? 0 : "0 0 8px" }}>{ln}</p>
                      ))}
                      {detail.drivers.length ? (
                        <div style={{ marginTop: 4 }}>
                          {detail.drivers.map((dr, i) => (
                            <div key={i} style={{ marginBottom: 8 }}>
                              <p style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 600, margin: "0 0 2px", lineHeight: 1.4 }}>“{dr.text}”</p>
                              <p style={{ fontSize: 13, color: "var(--ink3)", margin: 0, lineHeight: 1.5 }}>{dr.detail}</p>
                            </div>
                          ))}
                          <p style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.5, margin: "8px 0 0", paddingTop: 10, borderTop: "1px solid var(--hair2)" }}>This describes where your answers differed. It does not interpret what the difference means for you — that is a conversation worth having together.</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );})}
            </Card>

            {!reviewing ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ ...eyebrow, margin: 0 }}>Model Weights</p>
              <button onClick={() => setShowWeights((v) => !v)} className="no-print"
                style={{ border: "1px solid var(--hair)", background: "transparent", color: "var(--accent)", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
                {showWeights ? "Hide" : "Adjust weights"}
              </button>
            </div>
            ) : null}
            {showWeights && !reviewing ? (
              <Card style={{ marginBottom: 32 }} className="no-print">
                <p style={{ fontSize: 13, color: "var(--ink2)", margin: "0 0 16px", lineHeight: 1.5 }}>
                  Each domain's contribution to the overall score and tension ranking. Defaults are research-weighted (Faith and Marriage highest). Adjust and re-score to see how emphasis changes the picture — this is deterministic and instant.
                </p>
                {DOMAINS.map((d) => {
                  const cur = (weights || DOMAIN_WEIGHTS)[d.id];
                  return (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <span style={{ fontSize: 13, width: 150, color: "var(--ink2)" }}>{d.icon} {d.label}</span>
                      <input type="range" min="0.5" max="1.5" step="0.05" value={cur}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setWeights((w) => ({ ...(w || DOMAIN_WEIGHTS), [d.id]: v }));
                        }}
                        style={{ flex: 1, accentColor: "var(--accent)" }} />
                      <span style={{ fontSize: 13, width: 40, textAlign: "right", color: "var(--ink)", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{cur.toFixed(2)}</span>
                    </div>
                  );
                })}
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <Btn onClick={() => rescore(weights)}>Re-score</Btn>
                  <Btn kind="secondary" onClick={() => { setWeights(null); rescore(null); }}>Reset to defaults</Btn>
                </div>
                <p style={{ fontSize: 11.5, color: "var(--ink3)", margin: "12px 0 0", lineHeight: 1.5 }}>
                  Note: weights change emphasis, not the underlying answers. Re-scoring updates the overall score, domain health, tensions, and goals above; it does not re-run the AI-written vision/mission.
                </p>
              </Card>
            ) : null}

            <p style={eyebrow}>Shared Goals</p>
            <div style={{ marginBottom: 18 }}><Segmented value={goalsTab} onChange={setGoalsTab} options={[{ value: "1yr", label: "1 Year" }, { value: "5yr", label: "5 Years" }, { value: "10yr", label: "10 Years" }]} /></div>
            <Card style={{ marginBottom: 32 }}>
              {goals.map((g, i) => (
                <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: i < goals.length - 1 ? "1px solid var(--hair2)" : "none" }}>
                  <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700, minWidth: 24, fontVariantNumeric: "tabular-nums" }}>{String(i + 1).padStart(2, "0")}</span>
                  <div><p style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 3px", fontWeight: 600 }}>{g.domain}</p><p style={{ fontSize: 15, color: "var(--ink)", margin: 0, lineHeight: 1.5 }}>{g.goal}</p></div>
                </div>
              ))}
            </Card>

            <p style={eyebrow}>Top Tensions</p>
            <p style={body}>Ranked by weighted gap — the conversations worth having.</p>
            {results.tensions.map((t, i) => (
              <Card key={i} style={{ padding: "14px 18px", marginBottom: 10, borderLeft: `3px solid ${t.gapClass?.color || "var(--amber)"}` }}>
                <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 5px" }}><span style={{ color: "var(--ink3)", fontWeight: 400, marginRight: 8 }}>{i + 1}.</span>{t.title}</p>
                <p style={{ fontSize: 13.5, color: "var(--ink2)", margin: "0 0 8px", lineHeight: 1.5 }}>{t.explanation}</p>
                <div style={{ display: "flex", gap: 14, fontSize: 12.5, color: "var(--ink3)", flexWrap: "wrap" }}>
                  <span>{results.nameA}: {t.scoreA}</span><span>{results.nameB}: {t.scoreB}</span>
                  <span style={{ color: t.gapClass?.color, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{t.gapClass?.label} · {t.domain}</span>
                </div>
              </Card>
            ))}

            <div style={{ height: 1, background: "var(--hair2)", margin: "32px 0" }} />
            <p style={eyebrow}>Insights</p>
            {results.flags.length ? results.flags.map((f, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${flagColor(f.type)}`, paddingLeft: 16, marginBottom: 18 }}>
                <p style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, margin: "0 0 4px" }}>{f.label}</p>
                <p style={{ fontSize: 15, color: "var(--ink)", margin: 0, lineHeight: 1.55 }}>{f.text}</p>
              </div>
            )) : <p style={{ ...body, color: "var(--ink3)" }}>No critical flags — broad alignment.</p>}

            <Card style={{ marginTop: 24, background: "var(--bg2)", boxShadow: "none", textAlign: "center" }}>
              <p style={{ fontSize: 15, fontStyle: "italic", color: "var(--ink)", margin: "0 0 4px" }}>"{SCRIPTURES.synthesis.text}"</p>
              <p style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600, margin: 0 }}>{SCRIPTURES.synthesis.ref}</p>
            </Card>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }} className="no-print">
              <Btn kind="secondary" onClick={() => setScreen(reviewing ? "dashboard" : "welcome")}>{reviewing ? "Back" : "Home"}</Btn>
              <Btn onClick={() => window.print()}>Save as PDF</Btn>
              <Btn kind="secondary" onClick={() => emailReport(R, profile ? profile.email : "")}>Email report</Btn>
              <Btn onClick={() => startConversation(R)}>Start the conversation →</Btn>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink3)", marginTop: 10, lineHeight: 1.5 }} className="no-print">
              "Email report" opens your mail app with the report prefilled{profile ? ` to ${profile.email}` : ""} — you review and send it yourself, so nothing is transmitted by the app. If your mail app shortens a long report, use "Save as PDF" and attach it instead.
            </p>
          </div>
        </Wrap>
      </div>
    );
  }

  /* ── DASHBOARD ── */
  if (screen === "dashboard") {
    const trends = computeTrends(sessions);
    if (!trends) { setScreen("welcome"); return null; }
    const HD = trends.headline;
    const driftCol = HD.driftNow >= 3 ? "var(--red)" : HD.driftNow >= 1.5 ? "var(--amber)" : "var(--green)";
    const alignCol = HD.alignmentDelta < -0.5 ? "var(--red)" : HD.alignmentDelta > 0.5 ? "var(--green)" : "var(--ink)";
    const dir = (d) => d === "up" ? "↑" : d === "down" ? "↓" : "→";
    const dirCol = (d) => d === "up" ? "var(--green)" : d === "down" ? "var(--red)" : "var(--ink3)";
    const DeltaChip = ({ delta, invert }) => {
      if (delta === 0 || delta == null) return <span style={{ fontSize: 12, color: "var(--ink3)", fontWeight: 600 }}>→ steady</span>;
      const good = invert ? delta < 0 : delta > 0;
      const col = good ? "var(--green)" : "var(--red)";
      return <span style={{ fontSize: 12, color: col, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>{delta > 0 ? "↑" : "↓"} {delta > 0 ? "+" : ""}{delta}</span>;
    };
    const StatTile = ({ label, value, color, sub, metricKey, spark, sparkColor, delta, invert }) => (
      <Card style={{ flex: 1, minWidth: 168, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "0 0 4px" }}>
          <p style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, margin: 0 }}>{label}</p>
          {metricKey ? <MetricInfo metricKey={metricKey} value={value} /> : null}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
          <p style={{ fontSize: 32, fontWeight: 700, color, margin: 0, letterSpacing: "-.02em", lineHeight: 1 }}>{value}<span style={{ fontSize: 14, color: "var(--ink3)" }}>/10</span></p>
          {spark && spark.length > 1 ? <Sparkline series={spark} color={sparkColor || color} /> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <DeltaChip delta={delta} invert={invert} />
          <span style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.3 }}>{sub}</span>
        </div>
      </Card>
    );
    const ChartBlock = ({ label, desc, series, color }) => (
      <div style={{ marginBottom: 26 }}><p style={eyebrow}>{label}</p>{desc ? <p style={{ ...body, fontSize: 13 }}>{desc}</p> : null}
        <Card style={{ padding: 16 }}><LineChart series={series} color={color} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>{series.map((p, i) => <span key={i} style={{ fontSize: 10, color: "var(--ink3)" }}>{fmtDate(p.ts)}</span>)}</div></Card></div>
    );
    return (
      <div>
        <Chrome title="CANA — Dashboard" right={<div style={{ display: "flex", gap: 8 }}>{results ? <Btn kind="ghost" onClick={() => { setScreen("results"); window.scrollTo({ top: 0 }); }}>Results</Btn> : null}<Btn kind="ghost" onClick={() => setScreen("welcome")}>Home</Btn></div>} />
        <Wrap>
          <div style={{ padding: "44px 0 90px" }}>
            <p style={eyebrow}>Trend Dashboard</p>
            <h2 style={h2}>Your journey · {HD.sessions} session{HD.sessions > 1 ? "s" : ""}{HD.spanDays > 0 ? ` · ${HD.spanDays} days` : ""}</h2>

            {/* Hero: overall-health ring + the shape of all domains */}
            {(() => {
              const ov = trends.latest.overall;
              const band = bandFor(ov);
              const bandColor = ov >= 8 ? "var(--green)" : ov >= 6.5 ? "var(--accent)" : ov >= 5 ? "var(--gold)" : ov >= 3.5 ? "var(--amber)" : "var(--red)";
              const radarAxes = trends.domainTrends.map((d) => ({ icon: d.icon, label: d.label, value: d.last }));
              return (
                <Card className="rise" style={{ marginBottom: 16, padding: 24 }}>
                  <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <RingGauge value={ov} color={bandColor} label="Overall health" sub={band.label} />
                      <span style={{ fontSize: 12.5, color: HD.overallDelta > 0 ? "var(--green)" : HD.overallDelta < 0 ? "var(--red)" : "var(--ink3)", fontWeight: 600 }}>
                        {HD.overallDelta === 0 ? "Steady since baseline" : `${HD.overallDelta > 0 ? "↑ +" : "↓ "}${HD.overallDelta} since baseline`}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 280, maxWidth: 380 }}>
                      <p style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 600, margin: "0 0 2px", textAlign: "center" }}>The shape of your life together</p>
                      <RadarChart axes={radarAxes} color={bandColor} />
                    </div>
                  </div>
                </Card>
              );
            })()}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }} className="rise">
              <StatTile label="Mission Drift" metricKey="drift" value={HD.driftNow} color={driftCol} invert
                spark={trends.driftSeries} sparkColor="#FF9F0A" delta={null}
                sub={HD.driftNow >= 3 ? "Notable drift" : HD.driftNow >= 1.5 ? "Some movement" : "Close to baseline"} />
              <StatTile label="Value Alignment" metricKey="alignment" value={HD.alignmentNow} color={alignCol}
                spark={trends.alignmentSeries.map((p) => ({ ts: p.ts, value: p.score }))} delta={HD.alignmentDelta}
                sub={HD.alignmentDelta > 0 ? "converging" : HD.alignmentDelta < 0 ? "diverging" : "unchanged"} />
              <StatTile label="Overall Health" metricKey="overall" value={trends.latest.overall} color={HD.overallDelta >= 0 ? "var(--green)" : "var(--red)"}
                spark={trends.overallSeries} sparkColor="#34C759" delta={HD.overallDelta} sub="since baseline" />
            </div>
            {/* Permanent archive: every saved assessment, fully reviewable. */}
            {sessions.some((s) => s.report) ? (
              <div style={{ marginBottom: 30 }} className="rise">
                <p style={eyebrow}>Past Reports</p>
                <Card style={{ padding: 8 }}>
                  {[...sessions].filter((s) => s.report).sort((a, b) => new Date(b.ts) - new Date(a.ts)).map((s, i, arr) => (
                    <div key={s.id || i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderBottom: i < arr.length - 1 ? "1px solid var(--hair2)" : "none" }}>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>
                          {new Date(s.ts).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                          <span style={{ fontSize: 12, color: "var(--ink3)", fontWeight: 400 }}> · {s.kind === "full" ? "Full assessment" : "Check-in"}</span>
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: 2 }}>
                          {s.names ? `${s.names.A} & ${s.names.B}` : ""} · Overall {s.overall}/10
                        </div>
                      </div>
                      <Btn kind="secondary" style={{ padding: "6px 14px", fontSize: 13 }} onClick={() => { setArchiveReport({ ...s.report, ts: s.ts }); setScreen("results"); window.scrollTo({ top: 0 }); }}>Open report</Btn>
                    </div>
                  ))}
                </Card>
              </div>
            ) : null}
            {trends.trendFlags.length ? (<>{trends.trendFlags.map((f, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${f.type === "URGENT" ? "var(--red)" : f.type === "STRENGTH" ? "var(--green)" : "var(--amber)"}`, paddingLeft: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, margin: "0 0 4px" }}>{f.label}</p>
                <p style={{ fontSize: 15, color: "var(--ink)", margin: 0, lineHeight: 1.55 }}>{f.text}</p></div>))}
              <div style={{ height: 1, background: "var(--hair2)", margin: "26px 0" }} /></>) : null}
            <ChartBlock label="Mission Drift" desc="Distance from your first assessment. Flat = on mission; rising = drifting." series={trends.driftSeries} color="#FF9F0A" />
            <ChartBlock label="Value Alignment" desc="Higher = you experience your shared life more similarly." series={trends.alignmentSeries.map((p) => ({ ts: p.ts, kind: p.kind, value: p.score }))} color="var(--accent)" />
            <ChartBlock label="Overall Health" series={trends.overallSeries} color="#34C759" />
            <div style={{ height: 1, background: "var(--hair2)", margin: "26px 0" }} />
            <p style={eyebrow}>Domain Movement</p>
            <Card style={{ marginBottom: 26 }}>{trends.domainTrends.map((d) => {
              const v = d.last || 0;
              const barCol = v >= 8 ? "var(--green)" : v >= 6.5 ? "var(--accent)" : v >= 5 ? "var(--gold)" : v >= 3.5 ? "var(--amber)" : "var(--red)";
              return (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
                <span style={{ fontSize: 13, width: 150, color: "var(--ink2)" }}>{d.icon} {d.label}</span>
                <div style={{ flex: 1, height: 8, background: "var(--hair2)", borderRadius: 4, position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", height: "100%", width: `${v * 10}%`, background: `linear-gradient(90deg, ${barCol}99, ${barCol})`, borderRadius: 4, transition: "width .8s cubic-bezier(.22,.61,.36,1)" }} /></div>
                <span style={{ fontSize: 12.5, width: 28, textAlign: "right", color: "var(--ink)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{d.last != null ? d.last.toFixed(1) : "—"}</span>
                <span style={{ fontSize: 13, width: 50, color: dirCol(d.direction), fontWeight: 600 }}>{dir(d.direction)} {d.delta > 0 ? "+" : ""}{d.delta}</span>
              </div>);})}</Card>
            <p style={eyebrow}>History</p>
            <Card style={{ marginBottom: 26 }}>{trends.ordered.slice().reverse().map((sn, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < trends.ordered.length - 1 ? "1px solid var(--hair2)" : "none" }}>
                <span style={{ fontSize: 14 }}>{new Date(sn.ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}<span style={{ fontSize: 11, color: "var(--accent)", marginLeft: 10, fontWeight: 600, textTransform: "uppercase" }}>{sn.kind === "full" ? "Full" : "Check-in"}</span></span>
                <span style={{ fontSize: 13, color: "var(--ink2)" }}>health {sn.overall} · align {(10 - sn.alignmentGap).toFixed(1)}</span>
              </div>))}</Card>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }} className="no-print">
              <Btn onClick={() => startAssessment("checkin")}>New Check-In</Btn>
              <Btn kind="secondary" onClick={() => startAssessment("full")}>New Full Assessment</Btn>
              <Btn kind="subtle" onClick={() => window.print()}>Print</Btn>
              <Btn kind="subtle" onClick={eraseEverything}>Erase Data</Btn>
            </div>
          </div>
        </Wrap>
      </div>
    );
  }

  // Safety net: if we somehow reach here on a screen that produced no UI (e.g.
  // a results/dashboard view with no data to show), don't render a blank,
  // unexitable page — send the user somewhere with navigation.
  if (screen !== "welcome") {
    return (
      <div>
        <Chrome title="CANA" right={<Btn kind="ghost" onClick={() => { setArchiveReport(null); setScreen("welcome"); window.scrollTo({ top: 0 }); }}>Home</Btn>} />
        <Wrap>
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <p style={{ fontSize: 16, color: "var(--ink2)", marginBottom: 20 }}>There's nothing to show here yet.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Btn onClick={() => { setArchiveReport(null); setScreen("welcome"); window.scrollTo({ top: 0 }); }}>Back to home</Btn>
              {hasHistory ? <Btn kind="secondary" onClick={() => { setArchiveReport(null); setScreen("dashboard"); window.scrollTo({ top: 0 }); }}>View past assessments</Btn> : null}
            </div>
          </div>
        </Wrap>
      </div>
    );
  }
  return null;
}
