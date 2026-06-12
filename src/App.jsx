import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
import { TREE_PATH, TREE_TRANSFORM } from "./logo.js";
import { INTRO_SECTIONS, PREPARE, SCORE_INFO, MODEL_CHOICES, SETUP } from "./content.js";
import {
  APP_VERSION, checkForUpdate, GUIDE_BASE,
  hasNativeUpdater, nativeCheck, nativeDownload, nativeInstall, subscribeUpdateStatus,
} from "./update.js";
import { createProfile, signIn, listProfiles, registerProfileRecord } from "./auth.js";
import { encryptPayload, decryptPayload, buildTransferPayload, validateTransfer } from "./transfer.js";
import { exportCrashLog, readCrashLog, clearCrashLog } from "./crashLog.js";
import { credAvailable as credStoreAvailable, credSave, credGet, credRemove } from "./credentials.js";
import { ShareFile as NativeShareFile } from "./nativePlugins.js";
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
        <path d={TREE_PATH} transform={TREE_TRANSFORM} fill={`url(#lg-ink-${size})`} />
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

// Determinate progress bar (0-100). Used during AI generation/refresh so the
// user sees real step-by-step progress, not just a spinner.
function ProgressBar({ value = 0, label }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ width: "100%", maxWidth: 320, margin: "0 auto" }}>
      <div style={{ height: 8, background: "var(--hair)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: 999, transition: "width .4s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 13, color: "var(--ink2)" }}>{label}</span>
        <span style={{ fontSize: 13, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{Math.round(pct)}%</span>
      </div>
    </div>
  );
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
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 100, maxWidth: "calc(100vw - 40px)", boxSizing: "border-box",
      display: "flex", alignItems: "center", gap: 9, padding: "11px 18px", borderRadius: 12,
      background: "rgba(30,30,32,0.92)", color: "#fff", fontSize: 14, fontWeight: 500,
      boxShadow: "0 8px 28px rgba(0,0,0,0.28)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      animation: "rise .35s cubic-bezier(.22,.61,.36,1) both",
    }}>
      <span style={{ width: 18, height: 18, minWidth: 18, flexShrink: 0, borderRadius: "50%", background: "var(--green)", color: "#fff", fontSize: 12, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>
      {message}
    </div>
  );
}

/* Modal passphrase dialog. window.prompt() is not implemented in Electron
   (it throws), so transfer export/import use this on every platform. */
function PassphraseDialog({ message, onSubmit, onCancel }) {
  const [val, setVal] = useState("");
  return (
    <div className="no-print" style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.38)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--panel-solid)", borderRadius: 16, boxShadow: "0 18px 50px rgba(0,0,0,0.3)", padding: 24, width: "100%", maxWidth: 420 }}>
        <p style={{ fontSize: 15.5, fontWeight: 700, color: "var(--ink)", margin: "0 0 8px" }}>Passphrase</p>
        <p style={{ fontSize: 13.5, color: "var(--ink2)", lineHeight: 1.55, margin: "0 0 14px" }}>{message}</p>
        <input autoFocus type="password" value={val} onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSubmit(val); if (e.key === "Escape") onCancel(); }}
          style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid var(--hair)", fontSize: 15, boxSizing: "border-box", marginBottom: 16, background: "var(--panel-solid)", color: "var(--ink)", fontFamily: "var(--font)" }}
          placeholder="Passphrase" />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn kind="secondary" onClick={onCancel}>Cancel</Btn>
          <Btn onClick={() => onSubmit(val)}>Continue</Btn>
        </div>
      </div>
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
      <div className="scale-row">
        <div className="scale-half">{type.low.map((o) => <ScaleChip key={o.v} value={value} opt={o} onClick={onChange} />)}</div>
        <div className="scale-div" aria-hidden="true" />
        <div className="scale-half">{type.high.map((o) => <ScaleChip key={o.v} value={value} opt={o} onClick={onChange} />)}</div>
      </div>
    </div>
  );
}

/* Window chrome — macOS title bar look */
function Chrome({ title, right }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 20px",
      paddingTop: "calc(10px + env(safe-area-inset-top, 0px))",
      paddingLeft: "calc(20px + env(safe-area-inset-left, 0px))",
      paddingRight: "calc(20px + env(safe-area-inset-right, 0px))",
      background: "rgba(245,245,247,0.92)", backdropFilter: "saturate(180%) blur(20px)",
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
function MetricInfo({ metricKey, value, accent = "var(--accent)", onToggle }) {
  const [open, setOpen] = useState(false);
  const info = METRIC_INFO[metricKey];
  if (!info) return null;
  const sc = scaleText(metricKey, value);
  return (
    <span style={{ display: "inline-flex" }} className="no-print">
      <button onClick={() => { setOpen((v) => !v); if (onToggle) onToggle(!open, { info, sc, value }); }} aria-expanded={open} aria-label={`Explain ${info.title}`}
        style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", border: `1px solid ${open ? accent : "var(--hair)"}`, background: open ? accent : "transparent", color: open ? "#fff" : "var(--ink3)", fontSize: 11, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>ⓘ</button>
    </span>
  );
}

// Renders the explanation content for a metric inline (used in an expanding row
// below the metric, so it can never be clipped or hidden behind other cards).
function MetricInfoPanel({ metricKey, value }) {
  const info = METRIC_INFO[metricKey];
  if (!info) return null;
  const sc = scaleText(metricKey, value);
  return (
    <div className="rise no-print" style={{ marginTop: 12, padding: "14px 16px", borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--hair2)", textAlign: "left" }}>
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
  );
}
// Persistent quick-overview strip for the bottom of the window (#6). Shows the
// three headline metrics compactly; tapping opens the full dashboard.
/* Rich home-screen preview of the trend dashboard — ring + radar + sparkline tiles */
function DashboardPreview({ trends, onOpen }) {
  // Which info modal is open: "overall" | "alignment" | "drift" | "oxygen".
  const [info, setInfo] = useState(null);
  if (!trends) return null;
  const HD = trends.headline;
  const ov = trends.latest.overall;
  const ringColor = ov >= 8 ? "var(--green)" : ov >= 6.5 ? "var(--accent)" : ov >= 5 ? "var(--gold)" : ov >= 3.5 ? "var(--amber)" : "var(--red)";
  const radarAxes = trends.domainTrends.map((d) => ({ icon: d.icon, label: d.label, value: d.last }));
  const tiles = [
    { key: "overall", label: "Overall", value: ov, color: ringColor, spark: trends.overallSeries, delta: HD.overallDelta, invert: false },
    { key: "alignment", label: "Alignment", value: HD.alignmentNow, color: "var(--accent)", spark: (trends.alignmentSeries || []).map((p) => ({ ts: p.ts, value: p.score })), delta: HD.alignmentDelta, invert: false },
    { key: "drift", label: "Drift", value: HD.driftNow, color: "#FF9F0A", spark: trends.driftSeries, delta: null, invert: true },
  ];
  const tileValue = { overall: ov, alignment: HD.alignmentNow, drift: HD.driftNow };
  const dchip = (delta, invert) => {
    if (delta === 0 || delta == null) return <span style={{ fontSize: 11.5, color: "var(--ink3)", fontWeight: 600 }}>→ steady</span>;
    const good = invert ? delta < 0 : delta > 0;
    return <span style={{ fontSize: 11.5, color: good ? "var(--green)" : "var(--red)", fontWeight: 700 }}>{delta > 0 ? "↑ +" : "↓ "}{delta}</span>;
  };
  return (
    <Card className="rise" style={{ marginTop: 40, padding: 24 }}>
      {info === "oxygen" ? <OxygenInfoModal onClose={() => setInfo(null)} />
        : info ? <MetricInfoModal metricKey={info} value={tileValue[info]} onClose={() => setInfo(null)} /> : null}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <p style={{ ...eyebrow, margin: 0 }}>Your journey · {HD.sessions} session{HD.sessions > 1 ? "s" : ""}{HD.spanDays > 0 ? ` · ${HD.spanDays} days` : ""}</p>
        <button onClick={onOpen} style={{ border: "none", background: "none", color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>Open full dashboard →</button>
      </div>
      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <RingGauge value={ov} color={ringColor} size={150} stroke={13} label="Overall" />
          <span style={{ fontSize: 12, color: HD.overallDelta > 0 ? "var(--green)" : HD.overallDelta < 0 ? "var(--red)" : "var(--ink3)", fontWeight: 600 }}>
            {HD.overallDelta === 0 ? "Steady" : `${HD.overallDelta > 0 ? "↑ +" : "↓ "}${HD.overallDelta} since baseline`}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 260, maxWidth: 460 }}>
          <RadarChart axes={radarAxes} color={ringColor} size={280} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
        {tiles.map((it) => (
          <button key={it.key} type="button" onClick={() => setInfo(it.key)} aria-label={`Explain ${it.label}`}
            style={{ ...pressable, flex: 1, minWidth: 150, width: "auto" }}>
          <div style={{ padding: "12px 14px", border: "1px solid var(--hair)", borderRadius: 12, background: "var(--panel-solid)", height: "100%", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>{it.label}</span>
              <span style={{ fontSize: 13, color: "var(--ink3)", lineHeight: 1, flexShrink: 0 }}>ⓘ</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 6 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: it.color, letterSpacing: "-.02em", lineHeight: 1 }}>{it.value}<span style={{ fontSize: 12, color: "var(--ink3)" }}>/10</span></span>
              {it.spark && it.spark.length > 1 ? <Sparkline series={it.spark} color={it.color} w={70} h={24} /> : null}
            </div>
            <div style={{ marginTop: 6 }}>{dchip(it.delta, it.invert)}</div>
          </div>
          </button>
        ))}
        {(() => {
          const ox = (trends.oxygenSeries && trends.oxygenSeries.length) ? trends.oxygenSeries[trends.oxygenSeries.length - 1] : null;
          if (!ox) return null;
          const c = ox.state === "thinair" ? "var(--red)" : ox.state === "narrow" ? "var(--amber)" : "var(--green)";
          const lbl = ox.state === "thinair" ? "Thin air" : ox.state === "narrow" ? "Narrow margin" : "Breathable";
          return (
            <button type="button" onClick={() => setInfo("oxygen")} aria-label="About the Oxygen check"
              style={{ ...pressable, flex: 1, minWidth: 150, width: "auto" }}>
            <div style={{ padding: "12px 14px", border: "1px solid var(--hair)", borderRadius: 12, background: "var(--panel-solid)", height: "100%", boxSizing: "border-box" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>Oxygen</span>
                <span style={{ fontSize: 13, color: "var(--ink3)", lineHeight: 1, flexShrink: 0 }}>ⓘ</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: c, letterSpacing: "-.02em", lineHeight: 1 }}>{ox.supply.toFixed(1)}<span style={{ fontSize: 12, color: "var(--ink3)" }}>/10</span></span>
                <div style={{ position: "relative", width: 16, height: 40, border: "1px solid var(--hair)", borderRadius: 8, overflow: "hidden", background: "var(--bg2)" }}>
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${Math.min(100, ox.supply * 10)}%`, background: c, opacity: 0.8 }} />
                  <div style={{ position: "absolute", left: 1, right: 1, top: `${Math.max(0, 100 - ox.demand * 10)}%`, borderTop: "1.5px dashed var(--ink)", opacity: 0.7 }} />
                </div>
              </div>
              <div style={{ marginTop: 6 }}><span style={{ fontSize: 11.5, color: c, fontWeight: 700 }}>{lbl}</span></div>
            </div>
            </button>
          );
        })()}
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
/* Oxygen tank — Finkel "suffocation model" telemetry on the report.
   Fill = Supply (couple-mean of time/rest/balance items). The dashed marker
   is the LINE THE OXYGEN NEEDS TO REACH: Demand (couple-mean of the calling/
   vision/growth items). State colors only on the fill and the pill. */
// Chrome-less press target — tiles/cards that open an info modal without any
// button frame of their own.
const pressable = { display: "block", width: "100%", textAlign: "left", cursor: "pointer",
  font: "inherit", color: "inherit", background: "none", border: "none",
  padding: 0, margin: 0, appearance: "none", WebkitAppearance: "none",
  WebkitTapHighlightColor: "transparent", outline: "none" };

// Shared shell for the tap-to-learn-more modals (oxygen science, metric
// explanations). Backdrop and Escape close; inner clicks don't.
function InfoModal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div onClick={onClose} className="no-print"
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}
        style={{ background: "var(--panel-solid)", borderRadius: 16, maxWidth: 540, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 21, fontWeight: 700, color: "var(--ink)", margin: 0, letterSpacing: "-.01em" }}>{title}</h2>
          <button onClick={onClose} aria-label="Close"
            style={{ border: "none", background: "var(--bg2)", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", color: "var(--ink2)", fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const infoSec = { fontSize: 11.5, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 6px" };
const infoBody = { fontSize: 14, color: "var(--ink2)", lineHeight: 1.6, margin: "0 0 16px" };

// Tapping a metric tile opens this: what the number means, how it is computed,
// and how to read the current value. Content comes from METRIC_INFO — the same
// single source the inline ⓘ panels use.
function MetricInfoModal({ metricKey, value, onClose }) {
  const info = METRIC_INFO[metricKey];
  if (!info) return null;
  const sc = scaleText(metricKey, value);
  return (
    <InfoModal title={info.title} onClose={onClose}>
      <p style={infoSec}>What it means</p>
      <p style={infoBody}>{info.what}</p>
      <p style={infoSec}>How it's measured</p>
      <p style={infoBody}>{info.how}</p>
      {sc ? (<>
        <p style={infoSec}>Your value</p>
        <p style={infoBody}>{value != null && !isNaN(value) ? <strong>{Number(value).toFixed(1)} — {sc.band}. </strong> : null}{sc.blurb}</p>
      </>) : null}
      <p style={{ fontSize: 11.5, color: "var(--ink3)", lineHeight: 1.5, margin: 0, paddingTop: 12, borderTop: "1px solid var(--hair2)" }}>
        These are self-rated reflections. They are not clinical measurements. They are not compared against other couples.
      </p>
    </InfoModal>
  );
}

// Science background shown when the oxygen card is tapped. Kept honest:
// named source, named items, thresholds labeled editorial.
function OxygenInfoModal({ onClose }) {
  const sec = infoSec;
  const body = infoBody;
  return (
    <InfoModal title="The Oxygen check" onClose={onClose}>
        <p style={sec}>Where this comes from</p>
        <p style={body}>
          Psychologist Eli Finkel studies modern marriage. His team found a pattern: couples expect more from marriage
          than ever — growth, purpose, deep friendship. At the same time, they invest less time and energy in it.
          He calls this the "suffocation model." The image is a mountain climb. The height is not the problem.
          Climbing without enough oxygen is. (Finkel, Hui, Carswell &amp; Larson, 2014; <em>The All-or-Nothing Marriage</em>, 2017.)
        </p>
        <p style={sec}>How CANA computes it</p>
        <p style={body}>
          <strong>Demand</strong> is the average of three of your answers: a clear shared vision, helping each other grow,
          and a sense of family calling. <strong>Supply</strong> is the average of three more: time together, work–life
          balance, and rest. Both partners count equally. The dashed line on the tank marks Demand.
          Margin is Supply minus Demand.
        </p>
        <p style={sec}>What the states mean</p>
        <p style={body}>
          <strong>Thin air</strong>: Demand is 8 or higher while Supply is 4 or lower.
          <strong> Narrow margin</strong>: Demand is at least 3 points above Supply.
          <strong> Breathable</strong>: everything else.
          These cutoffs are our editorial choice. They are not clinical values.
        </p>
        <p style={{ ...body, margin: 0 }}>
          CANA measures how you both <em>perceive</em> your time, energy, and calling. It is not a stopwatch.
          If the margin is negative, don't lower the calling. Add oxygen: protected, unhurried time together.
        </p>
    </InfoModal>
  );
}

function OxygenTank({ oxygen, style }) {
  const [info, setInfo] = useState(false);
  if (!oxygen || !oxygen.complete) return null;
  const { supply, demand, margin, state } = oxygen;
  const stateColor = state === "thinair" ? "var(--red)" : state === "narrow" ? "var(--amber)" : "var(--green)";
  const stateTint = state === "thinair" ? "rgba(255,59,48,0.10)" : state === "narrow" ? "rgba(255,159,10,0.12)" : "rgba(52,199,89,0.12)";
  const stateLabel = state === "thinair" ? "Thin air" : state === "narrow" ? "Narrow margin" : "Breathable";
  const stateText = state === "thinair"
    ? "High callings on low reserves. Refill before you climb — the goal is more oxygen, not a lower calling."
    : state === "narrow"
    ? "Your hopes sit above your supply line. Budget unhurried time together before adding anything new."
    : "Your time and energy reach the altitude your callings ask for. Keep the tank filled.";
  const H = 180, W = 64;
  const fillH = Math.max(0, Math.min(H, (supply / 10) * H));
  const demandY = H - Math.max(0, Math.min(H, (demand / 10) * H));
  const fmt = (v) => v.toFixed(1);
  return (
    <>
    {info ? <OxygenInfoModal onClose={() => setInfo(false)} /> : null}
    <button type="button" onClick={() => setInfo(true)} aria-label="About the Oxygen check" style={pressable}>
    <Card style={{ marginTop: 28, padding: 22, ...style }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "0 0 14px" }}>
        <p style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, margin: 0 }}>Oxygen check</p>
        <span style={{ fontSize: 15, color: "var(--ink3)", lineHeight: 1, flexShrink: 0 }}>ⓘ</span>
      </div>
      <div style={{ display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: H, padding: "2px 0", textAlign: "right" }}>
            {[10, 5, 0].map((n) => <span key={n} style={{ fontSize: 10.5, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{n}</span>)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div style={{ width: 20, height: 8, border: "1px solid var(--hair)", borderBottom: "none", borderRadius: "4px 4px 0 0" }} />
            <div style={{ position: "relative", width: W, height: H, border: "1px solid var(--hair)", borderRadius: W / 2, overflow: "hidden", background: "var(--bg2)", marginTop: -5 }}>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: fillH, background: stateColor, opacity: 0.8 }} />
              <div style={{ position: "absolute", left: 5, right: 5, top: demandY, borderTop: "2px dashed var(--ink)", opacity: 0.7 }} />
            </div>
            <span style={{ fontSize: 11, color: "var(--ink3)", letterSpacing: ".03em" }}>O₂ — time &amp; energy</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 26, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: 11.5, color: "var(--ink3)", margin: "0 0 1px" }}>Supply</p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{fmt(supply)}<span style={{ fontSize: 12, fontWeight: 400, color: "var(--ink3)" }}> / 10</span></p>
            </div>
            <div>
              <p style={{ fontSize: 11.5, color: "var(--ink3)", margin: "0 0 1px" }}>Demand <span style={{ opacity: 0.8 }}>— — needed</span></p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{fmt(demand)}<span style={{ fontSize: 12, fontWeight: 400, color: "var(--ink3)" }}> / 10</span></p>
            </div>
            <div>
              <p style={{ fontSize: 11.5, color: "var(--ink3)", margin: "0 0 1px" }}>Margin</p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{margin > 0 ? "+" : margin < 0 ? "−" : ""}{fmt(Math.abs(margin))}</p>
            </div>
          </div>
          <div>
            <span style={{ display: "inline-block", fontSize: 12.5, fontWeight: 600, padding: "5px 13px", borderRadius: 999, background: stateTint, color: stateColor }}>{stateLabel}</span>
            <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.55, margin: "8px 0 0" }}>{stateText}</p>
            <p style={{ fontSize: 11.5, color: "var(--ink3)", lineHeight: 1.5, margin: "6px 0 0" }}>Supply: your shared time, rest, and balance. Demand: what your shared vision, growth, and sense of calling ask of you. The dashed line marks where the oxygen needs to be. Tap for the science behind this.</p>
          </div>
        </div>
      </div>
    </Card>
    </button>
    </>
  );
}

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
  const cx = size / 2, cy = size / 2, R = size / 2 - 58;
  const n = axes.length;
  if (n < 3) return null;
  const ang = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i, frac) => [cx + Math.cos(ang(i)) * R * frac, cy + Math.sin(ang(i)) * R * frac];
  const poly = axes.map((a, i) => pt(i, Math.max(0, Math.min(1, (a.value || 0) / 10))).join(",")).join(" ");
  const rings = [0.25, 0.5, 0.75, 1];
  // Short label per axis (first word of the domain label) so each point is
  // identifiable on the chart itself — no separate legend needed.
  const shortLabel = (a) => (a.label || "").split(/[ &]/)[0];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: size, height: "auto", display: "block", margin: "0 auto", overflow: "visible" }}>
      {rings.map((f, ri) => (
        <polygon key={ri} points={axes.map((a, i) => pt(i, f).join(",")).join(" ")} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      ))}
      {axes.map((a, i) => { const [ex, ey] = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />; })}
      <polygon points={poly} fill={color} fillOpacity="0.16" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {axes.map((a, i) => { const [px, py] = pt(i, Math.max(0, Math.min(1, (a.value || 0) / 10))); return <circle key={i} cx={px} cy={py} r="3" fill={color} />; })}
      {axes.map((a, i) => {
        const [lx, ly] = pt(i, 1.12);
        const anchor = Math.abs(Math.cos(ang(i))) < 0.3 ? "middle" : Math.cos(ang(i)) > 0 ? "start" : "end";
        return <text key={i} x={lx} y={ly} fill="#8E8E93" fontSize="9" fontWeight="600" textAnchor={anchor} dominantBaseline="middle">{shortLabel(a)}</text>;
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

/* Oxygen over time — supply (solid, state-colored dots) vs demand (dashed).
   Same geometry as LineChart; two series from trends.oxygenSeries. */
function OxygenTrendChart({ series }) {
  const W = 700, H = 130, padL = 28, padR = 12, padT = 14, padB = 24;
  const pts = (series || []).filter((p) => p.supply != null && p.demand != null);
  if (!pts.length) return null;
  const n = pts.length;
  const x = (i) => padL + (n === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1));
  const y = (v) => padT + (1 - v / 10) * (H - padT - padB);
  const path = (key) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const dotColor = (st) => st === "thinair" ? "var(--red)" : st === "narrow" ? "var(--amber)" : "var(--green)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {[0, 5, 10].map((g, i) => (
        <g key={i}><line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="rgba(0,0,0,0.07)" strokeWidth="1" />
          <text x={2} y={y(g) + 3} fill="#8E8E93" fontSize="10">{g}</text></g>
      ))}
      <path d={path("demand")} fill="none" stroke="var(--ink3)" strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path("supply")} fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.supply)} r={p.kind === "full" ? 4.5 : 3.5}
        fill="#fff" stroke={dotColor(p.state)} strokeWidth="2.5" />)}
    </svg>
  );
}

export default function App() {
  // Platform flags — defined first so effects and handlers can use them safely.
  // isDesktop = Electron build; isIOS = native iOS app (Capacitor). Used to hide
  // desktop-only UI on iOS (update check, Ollama setup, Mac links) and to label
  // the on-device AI correctly.
  const isDesktop = typeof window !== "undefined" && window.cana && window.cana.isDesktop;
  const isIOS = typeof window !== "undefined" && window.Capacitor &&
    typeof window.Capacitor.getPlatform === "function" && window.Capacitor.getPlatform() === "ios";

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
  // On iOS: whether the on-device Apple model is available ("yes"|"no"|"checking").
  // Used to label/hide the AI badge correctly (never show "Ollama" on iOS).
  const [appleAI, setAppleAI] = useState("checking");
  const [llmModels, setLlmModels] = useState([]);
  const [llmSample, setLlmSample] = useState("");
  const [genMsg, setGenMsg] = useState("");
  const [genProg, setGenProg] = useState(0); // 0-100, real step progress during AI generation
  const [generating, setGenerating] = useState(false);
  const [editStmts, setEditStmts] = useState(null);
  const [openInfo, setOpenInfo] = useState(null);   // which question's info is expanded
  const [chapterInfo, setChapterInfo] = useState(null); // which domain's summary modal is open (domain id)
  // Escape closes the chapter modal (InfoModal-based modals handle this themselves).
  useEffect(() => {
    if (!chapterInfo) return;
    const h = (e) => { if (e.key === "Escape") setChapterInfo(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [chapterInfo]);
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
  // Opt-in "Remember password" (Keychain-backed: safeStorage on Mac, iOS
  // Keychain via native plugin on iPhone). Defaults ON on iOS — a phone is a
  // personal device — and OFF on the Mac, which may be a shared family
  // machine. keychainFilled marks that the password field was auto-filled,
  // so a failed sign-in can discard the stale entry instead of dead-ending.
  const [rememberPw, setRememberPw] = useState(() => (typeof window !== "undefined" && window.Capacitor && typeof window.Capacitor.getPlatform === "function" && window.Capacitor.getPlatform() === "ios"));
  const [credAvailable, setCredAvailable] = useState(false);
  const [keychainFilled, setKeychainFilled] = useState(false);
  // Pending in-app passphrase request: { message, resolve }. Promise-based so
  // the transfer flows read like the old window.prompt code.
  const [passPrompt, setPassPrompt] = useState(null);
  const askPassphrase = (message) => new Promise((resolve) => setPassPrompt({ message, resolve }));
  const passModal = passPrompt ? (
    <PassphraseDialog message={passPrompt.message}
      onSubmit={(v) => { const r = passPrompt.resolve; setPassPrompt(null); r(v); }}
      onCancel={() => { const r = passPrompt.resolve; setPassPrompt(null); r(null); }} />
  ) : null;
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

  // Check-in = the 11 per-domain anchors PLUS the six oxygen items
  // (f12/m16/m5/v3/b7/m4, flagged `checkin` in the engine) — so every
  // check-in report carries a fresh Oxygen-check reading. Supply-side
  // answers (time, rest, balance) are exactly what shifts week to week.
  const activeDomains = mode === "full" ? DOMAINS
    : DOMAINS.map((d) => ({ ...d, questions: d.questions.filter((q) => q.core || q.checkin) }));

  useEffect(() => { setQPage(0); }, [dIdx, person]);

  useEffect(() => { probeOllama(); }, []);

  // On iOS, detect once whether the on-device Apple model is actually available
  // (iPhone supports it, iOS 26+, Apple Intelligence on, built with iOS 26 SDK).
  // Drives the header AI badge so it never shows "Ollama" on iOS.
  useEffect(() => {
    if (!isIOS) return;
    let cancelled = false;
    (async () => {
      try {
        const fm = await import("./foundationModel.js");
        const ok = await fm.isAppleAIAvailable();
        if (!cancelled) setAppleAI(ok ? "yes" : "no");
      } catch (e) {
        if (!cancelled) setAppleAI("no");
      }
    })();
    return () => { cancelled = true; };
  }, [isIOS]);

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
  // Memoized so it only recomputes when the sessions actually change, not on
  // every unrelated re-render.
  const liveTrends = useMemo(() => {
    try { return computeTrends(sessions); } catch (e) { return null; }
  }, [sessions]);

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
  // Skip an entire chapter: marks every question in the current domain as
  // Not applicable for the current partner, then advances. N/A questions are
  // excluded from all scoring (engine treats them as unscorable), so a
  // skipped chapter never distorts a score — it is simply absent.
  const skipDomain = useCallback(() => {
    const who = person === "A" ? (names.A || "Partner A") : (names.B || "Partner B");
    if (!confirm(`Skip "${domain.label}" for ${who}? All its questions will be marked Not applicable — the chapter won't count toward any score. You can come back later via the chapter pills.`)) return;
    setAnswers((p) => {
      const mine = { ...p[person] };
      for (const q of domain.questions) mine[q.id] = "NA";
      return { ...p, [person]: mine };
    });
    finishDomain();
  }, [domain, person, names, finishDomain]);

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

  // Opens the standalone update guide in the user's BROWSER (separate from this
  // app), so it stays open while CANA is quit and replaced. The guide page
  // auto-starts the .dmg download and walks through quit → replace → reopen.
  const openUpdateGuide = (result) => {
    try {
      // Desktop app: prefer the hosted https guide (reliable cross-origin
      // download, stays open in the browser through the swap). Browser build:
      // use the guide shipped alongside this page (same origin).
      const baseHref = (isDesktop && GUIDE_BASE) ? GUIDE_BASE : new URL("update-guide.html", window.location.href).toString();
      const base = new URL(baseHref);
      // Per-arch links (the guide shows one button per architecture). The
      // legacy `dmg` param stays for older deployed guide pages.
      if (result.dmgArm64Url) base.searchParams.set("arm", result.dmgArm64Url);
      if (result.dmgX64Url) base.searchParams.set("x64", result.dmgX64Url);
      if (result.dmgUrl) base.searchParams.set("dmg", result.dmgUrl);
      if (result.latest) base.searchParams.set("v", result.latest);
      if (result.url) base.searchParams.set("rel", result.url);
      const guideUrl = base.toString();
      if (isDesktop && window.cana && window.cana.openExternal) window.cana.openExternal(guideUrl);
      else window.open(guideUrl, "_blank", "noopener");
    } catch (e) {
      openDownload(result.url);
    }
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
  // Is a Keychain-backed credential store available? (Packaged Mac app via
  // safeStorage, or native iOS app via the Credentials plugin — never web.)
  useEffect(() => {
    credStoreAvailable().then((ok) => setCredAvailable(!!ok)).catch(() => {});
  }, []);

  // Single-account convenience: prefill the email on the sign-in screen and
  // ask the Keychain for its remembered password right away.
  useEffect(() => {
    if (profile || !credAvailable || authMode !== "signin") return;
    const list = listProfiles();
    if (list.length === 1) {
      const email = list[0].email;
      setAuthForm((f) => (f.email ? f : { ...f, email }));
      tryKeychainFill(email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credAvailable, profile, authMode]);

  // When a known email is entered on the sign-in screen, offer the remembered
  // password automatically. Only fills an EMPTY password field — it never
  // overwrites something the user typed.
  const tryKeychainFill = async (email) => {
    if (!credAvailable || !email || authMode !== "signin") return;
    try {
      const res = await credGet(email);
      if (res && res.ok && typeof res.password === "string") {
        setAuthForm((f) => (f.password ? f : { ...f, password: res.password }));
        setKeychainFilled(true);
        setRememberPw(true); // reflects reality: a credential exists
      }
    } catch (e) { /* best-effort */ }
  };

  const afterAuthSuccess = async (email, password) => {
    if (credAvailable) {
      try {
        if (rememberPw) await credSave(email, password);
        else await credRemove(email); // unchecked = explicit opt-out
      } catch (e) { /* convenience only — never block sign-in */ }
    }
  };

  const handleSignIn = async () => {
    setAuthBusy(true); setAuthError("");
    const res = await signIn({ email: authForm.email, password: authForm.password });
    setAuthBusy(false);
    if (!res.ok) {
      // A stale remembered password (e.g. changed via import on another
      // device) shouldn't dead-end the user: discard it and let them type.
      if (keychainFilled && credAvailable) {
        try { await credRemove(authForm.email); } catch (e) {}
        setAuthForm((f) => ({ ...f, password: "" }));
        setKeychainFilled(false);
        setAuthError("The password saved in your Keychain no longer matches — it was removed. Please type your password.");
        return;
      }
      setAuthError(res.error); return;
    }
    await afterAuthSuccess(authForm.email, authForm.password);
    enterApp(res.profile);
  };
  const handleSignUp = async () => {
    setAuthBusy(true); setAuthError("");
    const res = await createProfile(authForm);
    setAuthBusy(false);
    if (!res.ok) { setAuthError(res.error); return; }
    await afterAuthSuccess(authForm.email, authForm.password);
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
  // The generated guide is SAVED into the report so it's stable on reopen —
  // it isn't regenerated every time (use the Refresh button to redo it).
  const startConversation = async (R, { force = false } = {}) => {
    // If this report already has a saved guide and we're not forcing a refresh,
    // just show it — no regeneration, so it stays consistent.
    if (!force && R.convoGuide) {
      setConvo({ open: true, loading: false, guide: R.convoGuide, usedAI: !!R.convoUsedAI, nameA: R.nameA, nameB: R.nameB });
      window.scrollTo({ top: 0 });
      return;
    }
    setConvo({ open: true, loading: true, guide: null, usedAI: false, nameA: R.nameA, nameB: R.nameB });
    // Deterministic guide is always available from the report's analytics-shaped data.
    const fallback = buildConversationGuide({
      domainScores: R.domainScores, tensions: R.tensions || [],
      overallScore: R.overallScore, nameA: R.nameA, nameB: R.nameB,
    });
    let guide = fallback, usedAI = false;
    const cfg = getLLMConfig();
    const live = (isIOS || cfg.enabled) ? await ollamaRunning() : false;
    if (live) {
      const overallSummary = (R.domainScores || []).map((d) => `${d.label} ${d.avgNorm.toFixed(1)} (gap ${d.domainGap.toFixed(1)})`).join("; ");
      const topGaps = [...(R.tensions || [])].slice(0, 5).map((t) => ({ domain: t.domainLabel || "", question: t.title, scoreA: t.scoreA, scoreB: t.scoreB, gap: t.gap }));
      const ai = await conversationGuide(R.nameA, R.nameB, overallSummary, topGaps, R.comparison);
      if (ai) { guide = ai; usedAI = true; }
    }
    setConvo({ open: true, loading: false, guide, usedAI, nameA: R.nameA, nameB: R.nameB });
    // Save the guide into the live report + its archived session, so reopening
    // shows the same guide instead of regenerating. Only for the live report
    // (archived past reports are read-only here).
    if (!archiveReport && results) {
      const withGuide = { ...results, convoGuide: guide, convoUsedAI: usedAI };
      saveResults(withGuide);
      setSessions((prev) => {
        if (!prev.length) return prev;
        const copy = [...prev];
        copy[copy.length - 1] = { ...copy[copy.length - 1], report: withGuide };
        persistSessions(copy, withGuide);
        return copy;
      });
    }
    window.scrollTo({ top: 0 });
  };

  // Print helper: macOS uses the document title as the default PDF filename, so
  // we set a precise label (e.g. "Report Summary 05062026 David Abby") for the
  // duration of the print, then restore it. Sanitized to filename-safe text.
  // On iOS window.print() is a no-op inside WKWebView, so the native plugin
  // renders the print CSS to a paginated PDF and opens the share sheet.
  const printWithTitle = (label) => {
    const safe = String(label || "CANA").replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
    if (isIOS) {
      NativeShareFile.sharePdf({ filename: `${safe}.pdf` }).catch((e) => {
        // Surface the native error — a silent failure here cost a TestFlight
        // round once already.
        setToast(`PDF failed: ${(e && e.message) || "unknown error"}`);
      });
      return;
    }
    const prev = document.title;
    document.title = safe;
    // Restore after the print dialog returns (and as a fallback timer).
    const restore = () => { document.title = prev; window.removeEventListener("afterprint", restore); };
    window.addEventListener("afterprint", restore);
    try { window.print(); } catch (e) {}
    setTimeout(restore, 4000);
  };
  // Build the date stamp DDMMYYYY used in PDF labels.
  const dateStamp = (ts) => { const d = ts ? new Date(ts) : new Date(); const p = (n) => String(n).padStart(2, "0"); return `${p(d.getDate())}${p(d.getMonth() + 1)}${d.getFullYear()}`; };

  // Email flow. A mailto: link CANNOT carry a file attachment (protocol
  // limitation), so we trigger the PDF save, then open a short email draft that
  // asks the user to attach the PDF they just saved.
  const emailReport = (R, toEmail) => {
    const L = (s) => (s == null ? "" : String(s));
    const subject = `CANA — Covenant Life plan for ${L(R.nameA)} & ${L(R.nameB)}`;
    const body = [
      `Hi,`,
      ``,
      `Attached is our CANA — Covenant Life plan for ${L(R.nameA)} & ${L(R.nameB)}.`,
      ``,
      `(If the PDF isn't attached yet: it was just saved to your downloads when you tapped the button — please attach that file before sending.)`,
      ``,
      `— Generated by CANA. These are conversation-starters, not clinical measurements.`,
    ].join("\n");
    // 1) Save the PDF via the print dialog (precise filename).
    printWithTitle(`Report Summary ${dateStamp()} ${L(R.nameA)} ${L(R.nameB)}`);
    // 2) Open a short, clean email draft.
    const url = `mailto:${encodeURIComponent(toEmail || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (isDesktop && window.cana && window.cana.openExternal) window.cana.openExternal(url);
    else window.location.href = url;
  };

  const runUpdateCheck = async () => {
    setUpdate({ checking: true, result: null });
    // Packaged desktop: delegate to electron-updater (Squirrel.Mac verifies
    // the new .dmg's signature against ours before installing). The status
    // arrives asynchronously via subscribeUpdateStatus below.
    if (hasNativeUpdater()) {
      const r = await nativeCheck();
      if (!r.ok) {
        setUpdate({ checking: false, result: { state: "error", message: r.error || "Updater unavailable." } });
      }
      // The "available / uptodate / error" state will come in via the
      // subscription effect; don't synthesise a result here.
      return;
    }
    const result = await checkForUpdate();
    setUpdate({ checking: false, result });
    // Auto-dismiss the message after 10 seconds (but keep an available update visible).
    if (result.state !== "update") {
      setTimeout(() => setUpdate((u) => (u.result === result ? { checking: false, result: null } : u)), 10000);
    }
  };

  // Subscribe to native updater lifecycle once at mount. The bridge is only
  // present in the packaged Electron app, so this is a no-op on web / iOS.
  useEffect(() => {
    if (!hasNativeUpdater()) return;
    const off = subscribeUpdateStatus((s) => {
      if (!s) return;
      if (s.state === "checking")    setUpdate({ checking: true,  result: null });
      else if (s.state === "available")   setUpdate({ checking: false, result: { state: "update",   current: APP_VERSION, latest: s.version, notes: s.notes || "", native: true } });
      else if (s.state === "uptodate")    setUpdate({ checking: false, result: { state: "uptodate", current: APP_VERSION } });
      else if (s.state === "downloading") setUpdate({ checking: false, result: { state: "downloading", percent: s.percent, native: true } });
      else if (s.state === "downloaded")  setUpdate({ checking: false, result: { state: "downloaded",  version: s.version, native: true } });
      else if (s.state === "error")       setUpdate({ checking: false, result: { state: "error",      message: s.message || "Update error" } });
    });
    return off;
  }, []);

  const generate = async () => {
    setGenerating(true); setGenProg(5); setGenMsg("Scoring on this device…");
    const analytics = computeAnalytics(answers.A, answers.B, names.A || "Partner A", names.B || "Partner B", weights || undefined);
    const localPlan = generateLocalPlan(analytics);
    const nameA = analytics.nameA, nameB = analytics.nameB;
    let comparison = mode === "full" ? compareDreamMarks(dreamMarks.A, dreamMarks.B, nameA, nameB) : null;
    // Default to the deterministic individual visions so the report is complete
    // even with no AI. The AI (if it runs) overwrites these below.
    let indivA = localPlan.indivA || null, indivB = localPlan.indivB || null, jointVM = null, llmUsed = false;
    const cfg = getLLMConfig();
    // Check Ollama liveness directly at generation time (don't rely on the
    // possibly-stale llmState from a prior probe).
    const aiEnabled = isIOS || cfg.enabled; // iOS uses the Apple model regardless of the Ollama toggle
    const ollamaLive = (aiEnabled && mode === "full") ? await ollamaRunning() : false;
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
    else if (isIOS && !ollamaLive) llmSkipReason = "On-device AI isn't available on this device, so the built-in text was used. The built-in plan is complete on its own.";
    else if (!aiEnabled) llmSkipReason = "The local AI is turned off in settings, so the built-in text was used.";
    else if (!ollamaLive) llmSkipReason = "Ollama wasn't detected as running, so the built-in text was used. Start Ollama and regenerate to use the AI.";
    if (aiEnabled && mode === "full" && ollamaLive) {
      try {
        setGenMsg("Reading the letters…"); setGenProg(20);
        const exA = letters.A ? await extractLetter(letters.A, nameA) : null;
        const exB = letters.B ? await extractLetter(letters.B, nameB) : null;
        if (exA && exB) { setGenMsg("Comparing your visions…"); setGenProg(35); comparison = mergeComparisons(comparison, await compareLetters(exA, exB, nameA, nameB)); }
        setGenMsg(`Writing ${nameA}'s vision…`); setGenProg(50); const aiIndivA = await individualVisionMission(nameA, domSummary("A"), exA, localPlan.indivA);
        setGenMsg(`Writing ${nameB}'s vision…`); setGenProg(65); const aiIndivB = await individualVisionMission(nameB, domSummary("B"), exB, localPlan.indivB);
        if (aiIndivA) indivA = aiIndivA;
        if (aiIndivB) indivB = aiIndivB;
        setGenMsg("Compiling your joint vision…"); setGenProg(80); jointVM = await jointVisionMission(nameA, nameB, indivA, indivB, comparison, overallSummary, evalSynthesis, { vision: localPlan.vision, mission: localPlan.mission });
        setGenMsg("Personalizing your goals…"); setGenProg(92); goalsLLM = await personalizeGoals(nameA, nameB, overallSummary, comparison, { goals1yr: localPlan.goals1yr, goals5yr: localPlan.goals5yr, goals10yr: localPlan.goals10yr });
        llmUsed = !!(aiIndivA || aiIndivB || jointVM);
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
    setGenerating(false); setGenMsg(""); setGenProg(0); setScreen("results"); window.scrollTo({ top: 0 });
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

  // Re-run ONLY the AI portion of the current live report, keeping the
  // deterministic scores/gaps/flags exactly as they are. Use when the local
  // model has improved (or was started after the report was first made) and you
  // want fresh AI-written vision/mission/goals/letter-comparison. Only works on
  // the live report (the original answers + letters must still be in memory) —
  // archived past reports don't store the raw inputs, so they can't be refreshed.
  const [regenerating, setRegenerating] = useState(false);
  const regenerateAI = async () => {
    if (!results || regenerating) return;
    const cfg = getLLMConfig();
    setRegenerating(true);
    setGenMsg("Checking the on-device AI…"); setGenProg(5);
    // On iOS the Apple on-device model is used (no Ollama toggle needed); elsewhere
    // the Ollama path is gated by the user's "enable local AI" setting.
    const live = isIOS ? await ollamaRunning() : (cfg.enabled ? await ollamaRunning() : false);
    if (!live) {
      setRegenerating(false); setGenMsg(""); setGenProg(0);
      window.alert(isIOS
        ? "On-device AI isn't available on this device. The built-in plan is complete on its own."
        : (cfg.enabled ? "Ollama isn't running. Start it (and make sure a model is installed), then try again." : "The local AI is turned off in Settings. Turn it on and start Ollama, then try again."));
      return;
    }
    try {
      const analytics = computeAnalytics(answers.A, answers.B, names.A || "Partner A", names.B || "Partner B", weights || undefined);
      const localPlan = generateLocalPlan(analytics);
      const nameA = analytics.nameA, nameB = analytics.nameB;
      const domSummary = (w) => analytics.domainScores.map((d) => `${d.label}: ${(w === "A" ? d.avgNormA : d.avgNormB).toFixed(1)}`).join(", ");
      const overallSummary = analytics.domainScores.map((d) => `${d.label} ${d.avgNorm.toFixed(1)} (gap ${d.domainGap.toFixed(1)})`).join("; ");
      const sortedDoms = [...analytics.domainScores].sort((a, b) => b.avgNorm - a.avgNorm);
      const evalSynthesis = {
        overall: analytics.overallScore.toFixed(1),
        strongest: sortedDoms.slice(0, 2).map((d) => `${d.label} (${d.avgNorm.toFixed(1)})`),
        weakest: sortedDoms.slice(-2).map((d) => `${d.label} (${d.avgNorm.toFixed(1)})`),
        widestGaps: [...analytics.domainScores].sort((a, b) => b.domainGap - a.domainGap).slice(0, 2).map((d) => `${d.label} (gap ${d.domainGap.toFixed(1)})`),
        topTensions: (localPlan.tensions || []).slice(0, 3).map((t) => t.title),
        flags: (localPlan.flags || []).map((f) => f.title || f.label || "").filter(Boolean),
      };
      let comparison = compareDreamMarks(dreamMarks.A, dreamMarks.B, nameA, nameB);
      setGenMsg("Reading the letters…"); setGenProg(20);
      const exA = letters.A ? await extractLetter(letters.A, nameA) : null;
      const exB = letters.B ? await extractLetter(letters.B, nameB) : null;
      if (exA && exB) { setGenMsg("Comparing your visions…"); setGenProg(35); comparison = mergeComparisons(comparison, await compareLetters(exA, exB, nameA, nameB)); }
      setGenMsg(`Writing ${nameA}'s vision…`); setGenProg(50); const indivA = await individualVisionMission(nameA, domSummary("A"), exA, localPlan.indivA) || localPlan.indivA;
      setGenMsg(`Writing ${nameB}'s vision…`); setGenProg(65); const indivB = await individualVisionMission(nameB, domSummary("B"), exB, localPlan.indivB) || localPlan.indivB;
      setGenMsg("Compiling your joint vision…"); setGenProg(80); const jointVM = await jointVisionMission(nameA, nameB, indivA, indivB, comparison, overallSummary, evalSynthesis, { vision: localPlan.vision, mission: localPlan.mission });
      setGenMsg("Personalizing your goals…"); setGenProg(92); const goalsLLM = await personalizeGoals(nameA, nameB, overallSummary, comparison, { goals1yr: localPlan.goals1yr, goals5yr: localPlan.goals5yr, goals10yr: localPlan.goals10yr });
      const llmUsed = !!(jointVM || goalsLLM);
      if (!llmUsed) { setRegenerating(false); setGenMsg(""); setGenProg(0); window.alert("The AI was reachable but returned nothing usable this time. Your report is unchanged."); return; }
      const refreshed = {
        ...results,
        vision: jointVM?.vision || localPlan.vision,
        mission: jointVM?.mission || localPlan.mission,
        goals1yr: goalsLLM?.goals1yr || localPlan.goals1yr,
        goals5yr: goalsLLM?.goals5yr || localPlan.goals5yr,
        goals10yr: goalsLLM?.goals10yr || localPlan.goals10yr,
        indivA, indivB, comparison, llmUsed: true,
        goalsPersonalized: !!goalsLLM,
        llmSkipReason: "",
      };
      saveResults(refreshed);
      setEditStmts({ vision: refreshed.vision, mission: refreshed.mission });
      setSessions((prev) => {
        if (!prev.length) return prev;
        const copy = [...prev];
        copy[copy.length - 1] = { ...copy[copy.length - 1], report: refreshed };
        persistSessions(copy, refreshed);
        return copy;
      });
    } catch (e) {
      window.alert("The AI refresh failed mid-way. Your existing report is unchanged.");
    } finally {
      setRegenerating(false); setGenMsg(""); setGenProg(0);
    }
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

  // ── Encrypted device-to-device transfer (Mac ⇄ iPhone) ──────────────────
  // Export this profile's full data into one encrypted file the user carries
  // over (AirDrop / email / Files). The passphrase never leaves the device and
  // is required to import; a leaked file reveals nothing without it.
  const [transferBusy, setTransferBusy] = useState(false);

  const exportData = async () => {
    if (transferBusy) return;
    const pass = await askPassphrase(
      "Choose a passphrase to protect this export — you'll need the same one to import on the other device. At least 6 characters."
    );
    if (pass == null) return; // cancelled
    setTransferBusy(true);
    try {
      const payload = buildTransferPayload(
        { names, answers, sessions, results },
        { appVersion: APP_VERSION, platform: isIOS ? "ios" : isDesktop ? "desktop" : "web", profileEmail: profile ? profile.email : null },
        profile // carry the account (email + salt + hash) so the other device can recreate the same login
      );
      const fileText = await encryptPayload(payload, pass);
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const fname = `CANA-data-${(profile && profile.nameA) || "export"}-${stamp}.cana`;
      const n = payload.counts;
      const shareFile = isIOS ? NativeShareFile : null;
      if (shareFile) {
        // Native iOS share sheet: AirDrop to the other iPhone, save to Files,
        // or send via Mail/Messages. The file is already encrypted here.
        const r = await shareFile.share({ filename: fname, text: fileText });
        if (r && r.ok) setToast(`Exported ${n.reports} report${n.reports === 1 ? "" : "s"} — keep your passphrase safe`);
        else setToast("Export failed");
      } else if (isDesktop && window.cana && window.cana.saveFile) {
        // Packaged Mac app: the <a download> blob trick silently does nothing
        // in a file://-loaded window — use the native save panel instead.
        const res = await window.cana.saveFile(fname, fileText);
        if (res && res.ok) setToast(`Exported ${n.reports} report${n.reports === 1 ? "" : "s"} — keep your passphrase safe`);
        else if (res && res.canceled) { /* user closed the dialog — no toast */ }
        else setToast((res && res.error) || "Export failed");
      } else {
        const blob = new Blob([fileText], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = fname;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setToast(`Exported ${n.reports} report${n.reports === 1 ? "" : "s"} — keep your passphrase safe`);
      }
    } catch (e) {
      setToast(e.message || "Export failed");
    } finally {
      setTransferBusy(false);
    }
  };

  const importFileRef = useRef(null);

  const onImportFileChosen = async (ev) => {
    const file = ev.target && ev.target.files && ev.target.files[0];
    if (ev.target) ev.target.value = ""; // allow re-picking the same file later
    if (!file) return;
    let text;
    try { text = await file.text(); } catch (e) { setToast("Couldn't read that file"); return; }
    const pass = await askPassphrase("Enter the passphrase used when this file was exported:");
    if (pass == null) return;
    setTransferBusy(true);
    try {
      const decoded = await decryptPayload(text, pass);
      const v = validateTransfer(decoded);
      const nReports = (v.sessions || []).filter((s) => s && s.report).length;
      const when = v.meta && v.meta.exportedAt ? new Date(v.meta.exportedAt).toLocaleString() : "another device";

      // Decide which profile the imported data belongs to.
      // 1) If signed in → import into the current profile (replacing its data).
      // 2) If NOT signed in and the file carries its account → recreate that
      //    login automatically and sign into it (no manual sign-up needed).
      // 3) If NOT signed in and the file has no account → ask the user to sign in
      //    or create an account first.
      let targetProfile = profile;
      let createdAccount = false;
      if (!targetProfile) {
        if (v.account) {
          const reg = registerProfileRecord(v.account);
          if (!reg.ok) { setToast(reg.error || "Couldn't recreate the account from this file."); setTransferBusy(false); return; }
          targetProfile = reg.profile;
          createdAccount = !reg.existed;
        } else {
          setToast("Please sign in or create an account first, then import.");
          setTransferBusy(false);
          return;
        }
      }
      const tpid = targetProfile.id;

      const confirmMsg = createdAccount
        ? `Set up the account "${targetProfile.email}" on this device and import ${nReports} report${nReports === 1 ? "" : "s"} and ${v.sessions.length} saved session${v.sessions.length === 1 ? "" : "s"} (exported ${when})?\n\nYou'll sign in with the same email and password you used before.`
        : `Import ${nReports} report${nReports === 1 ? "" : "s"} and ${v.sessions.length} saved session${v.sessions.length === 1 ? "" : "s"} (exported ${when})?\n\nThis REPLACES the data in "${targetProfile.email}".`;
      if (!window.confirm(confirmMsg)) { setTransferBusy(false); return; }

      // Persist the imported data under the target profile.
      try {
        localStorage.setItem(keyFor(LS_KEY_BASE, tpid), JSON.stringify({ names: v.names, answers: v.answers }));
        localStorage.setItem(keyFor(LS_SESSIONS_BASE, tpid), JSON.stringify(v.sessions));
        if (v.results) localStorage.setItem(keyFor(LS_RESULTS_BASE, tpid), JSON.stringify(v.results));
        else localStorage.removeItem(keyFor(LS_RESULTS_BASE, tpid));
      } catch (e) {}

      // Reflect into in-memory state and make the target profile active.
      setNames(v.names);
      setAnswers(v.answers && (v.answers.A || v.answers.B) ? v.answers : { A: {}, B: {} });
      setSessions(v.sessions);
      setResults(v.results);
      setArchiveReport(null);
      if (!profile) enterApp(targetProfile); // sign into the freshly imported account
      setToast(createdAccount ? "Account and data imported — you're signed in" : "Imported successfully");
      setScreen("welcome");
      window.scrollTo({ top: 0 });
    } catch (e) {
      setToast(e.message || "Import failed");
    } finally {
      setTransferBusy(false);
    }
  };

  const eraseEverything = () => {
    if (!confirm("Erase ALL data — answers and history — from this device?")) return;
    localStorage.removeItem(keyFor(LS_KEY_BASE, pid)); localStorage.removeItem(keyFor(LS_SESSIONS_BASE, pid)); localStorage.removeItem(keyFor(LS_RESULTS_BASE, pid));
    setNames({ A: "", B: "" }); resetDraft(); setSessions([]); setResults(null); setArchiveReport(null); setScreen("welcome");
  };

  // On iOS: show "On-device AI" only when the Apple model is actually available;
  // otherwise hide the badge entirely (never show Ollama wording on iOS).
  // On desktop/web: unchanged Ollama status.
  const llmBadge = (isIOS && appleAI !== "yes") ? null : (
    <button onClick={() => setScreen("settings")} className="no-print" style={{
      display: "flex", alignItems: "center", gap: 7, border: "1px solid var(--hair)",
      background: "var(--panel-solid)", borderRadius: 20, padding: "5px 12px", fontSize: 12.5, color: "var(--ink2)", fontWeight: 500 }}>
      {isIOS
        ? (<><StatusDot state="ok" /> On-device AI</>)
        : (<><StatusDot state={llmState} /> {llmState === "ok" ? `Ollama · ${(llmCfg.model || "").split(":")[0]}` : llmState === "bad" ? "Ollama offline" : "Checking…"}</>)}
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
        {passModal}
        <Toast message={toast} />
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
              <input style={inputStyle} type="email" autoComplete="username" value={authForm.email} onChange={set("email")} onBlur={() => tryKeychainFill(authForm.email)} onKeyDown={onKey} placeholder="you@example.com" />
              <p style={labelStyle}>Password</p>
              <input style={inputStyle} type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} value={authForm.password}
                onChange={(e) => { setKeychainFilled(false); setAuthForm((f) => ({ ...f, password: e.target.value })); }}
                onKeyDown={onKey} placeholder={authMode === "signup" ? "At least 6 characters" : "Your password"} />
              {keychainFilled ? (
                <p style={{ fontSize: 11.5, color: "var(--green)", margin: "-6px 0 10px" }}>✓ Filled from your {isIOS ? "iOS" : "macOS"} Keychain</p>
              ) : null}
              {credAvailable ? (
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink2)", margin: "2px 0 12px", cursor: "pointer", userSelect: "none" }}>
                  <input type="checkbox" checked={rememberPw} onChange={(e) => setRememberPw(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
                  Remember password in this {isIOS ? "iPhone's" : "Mac's"} Keychain
                </label>
              ) : null}

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

            <div style={{ marginTop: 16, textAlign: "center" }}>
              <button onClick={() => importFileRef.current && importFileRef.current.click()} disabled={transferBusy}
                style={{ border: "none", background: "none", color: "var(--accent)", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0 }}>
                {transferBusy ? "Working…" : "Coming from another device? Import your data"}
              </button>
              <input ref={importFileRef} type="file" accept=".cana,application/octet-stream,application/json"
                onChange={onImportFileChosen} style={{ display: "none" }} />
              <p style={{ fontSize: 11.5, color: "var(--ink3)", lineHeight: 1.5, marginTop: 6 }}>
                Brings over your account and reports from an encrypted file exported on your other device.
              </p>
            </div>

            <p style={{ fontSize: 11.5, color: "var(--ink3)", lineHeight: 1.6, marginTop: 18, textAlign: "center" }}>
              Accounts are stored only on this device to keep couples' data separate. This is local privacy separation, not a secure server login — your password is saved as a one-way hash, never in plain text, but anyone with full access to this Mac could reach the underlying data. Don't reuse an important password here.
              {credAvailable ? ` If you choose “Remember password”, it is stored encrypted in this ${isIOS ? "iPhone's" : "Mac's"} Keychain — and anyone using this unlocked device can then open CANA without typing it.` : ""}
            </p>
          </div>
        </Wrap>
      </div>
    );
  }

  /* ── WELCOME ── */
  if (screen === "welcome") return (
    <div>
      {passModal}
      <Toast message={toast} />
      {chapterInfo ? (() => {
        const d = DOMAINS.find((x) => x.id === chapterInfo);
        if (!d) return null;
        return (
          <div onClick={() => setChapterInfo(null)} className="no-print"
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`About ${d.label}`}
              style={{ background: "var(--panel-solid)", borderRadius: 16, maxWidth: 540, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24, color: "var(--gold)" }}>{d.icon}</span>
                  <h2 style={{ fontSize: 21, fontWeight: 700, color: "var(--ink)", margin: 0, letterSpacing: "-.01em" }}>{d.label}</h2>
                </div>
                <button onClick={() => setChapterInfo(null)} aria-label="Close"
                  style={{ border: "none", background: "var(--bg2)", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", color: "var(--ink2)", fontSize: 16, lineHeight: 1 }}>✕</button>
              </div>
              {d.about && d.about.weight ? (
                <p style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 14px" }}>{d.about.weight} in the overall score</p>
              ) : null}
              {d.summary ? (
                <p style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.6, margin: "0 0 16px" }}>{d.summary}</p>
              ) : null}
              <div style={{ borderTop: "1px solid var(--hair2)", paddingTop: 16 }}>
                <p style={{ fontSize: 11.5, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 6px" }}>Biblical grounding</p>
                <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.6, margin: "0 0 16px" }}><RichText text={d.about.biblical} /></p>
                {d.about.books ? (<>
                  <p style={{ fontSize: 11.5, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 6px" }}>Further reading</p>
                  <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.6, margin: "0 0 16px" }}><RichText text={d.about.books} /></p>
                </>) : null}
                <p style={{ fontSize: 11.5, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 6px" }}>What the research says</p>
                <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.6, margin: 0 }}><RichText text={d.about.science} /></p>
              </div>
              <div style={{ marginTop: 18, fontStyle: "italic", color: "var(--ink2)", fontSize: 13.5, borderLeft: "3px solid var(--hair)", paddingLeft: 12 }}>
                "{d.scripture.text}" — {d.scripture.ref}
              </div>
            </div>
          </div>
        );
      })() : null}
      <Chrome title="CANA" right={
        isIOS ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {llmBadge}
            <Btn kind="ghost" onClick={() => { setScreen("settings"); window.scrollTo({ top: 0 }); }} style={{ padding: "6px 10px", fontSize: 13 }}>Settings</Btn>
            <Btn kind="ghost" onClick={logout} style={{ padding: "6px 10px", fontSize: 13 }}>Sign out</Btn>
          </div>
        ) : llmBadge
      } />
      <Wrap>
        <div style={{ padding: isIOS ? "20px 0 80px" : "60px 0 80px" }}>
          <div className="rise" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
            <Logo size={64} />
            <div>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.02em", color: "var(--ink)", lineHeight: 1 }}>CANA</div>
              <div style={{ fontSize: 15, color: "var(--ink3)", marginTop: 3, letterSpacing: ".01em" }}>Covenant Life</div>
            </div>
          </div>
          <p style={eyebrow} className="rise">A Biblical Life Plan for Couples</p>
          <h1 style={h1} className="rise-2">Where are you going,<br />and are you going there together?</h1>
          <p style={{ ...lead, maxWidth: 560 }} className="rise-3">A calm, private space to discover where you are, where God is calling you, and how to get there — as one. Everything runs on {isIOS ? "your iPhone" : "your Mac"}. Nothing leaves it.</p>
          <div className="rise-4" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28, alignItems: "center" }}>
            <Btn onClick={() => { setMode("full"); setScreen("prepare"); window.scrollTo({ top: 0 }); }}>Begin Full Assessment</Btn>
            <Btn kind="secondary" onClick={() => startAssessment("checkin")} disabled={!names.A && !hasHistory}>Quick Check-In</Btn>
            {results ? <Btn kind="subtle" onClick={() => { setScreen("results"); window.scrollTo({ top: 0 }); }}>View latest results</Btn> : null}
            {/* The conversation screen renders on convo.open, but the welcome
                gate is checked first — switch to "results" so the guide shows
                and its "Back to report" lands somewhere sensible. */}
            {results ? <Btn kind="subtle" onClick={() => { setScreen("results"); startConversation(results); }}>Start the conversation →</Btn> : null}
            {hasHistory ? <Btn kind="subtle" onClick={() => setScreen("dashboard")}>Dashboard · {sessions.length}</Btn> : null}
          </div>
          <div className="rise-4" style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Btn kind="secondary" onClick={() => { setScreen("intro"); window.scrollTo({ top: 0 }); }}>Introduction</Btn>
            {!isIOS ? <Btn kind="secondary" onClick={openSetup}>Set up the local AI</Btn> : null}
          </div>
          {!names.A && !hasHistory ? <p style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: 10 }}>The quick check-in unlocks after your first full assessment.</p> : null}

          {(() => {
            const ansA = Object.keys(answers.A).length, ansB = Object.keys(answers.B).length;
            const anyProgress = names.A && (dA > 0 || dB > 0 || ansA > 0 || ansB > 0);
            const bothComplete = dA === N && dB === N && (mode === "full" ? (letters.A.trim().length > 20 && letters.B.trim().length > 20) : true);
            // Show whenever a draft is in progress. Only hide the just-finished
            // state (draft complete AND a report exists) — previously `|| results`
            // hid the resume card for ANYONE with an older report, making a
            // saved check-in unreachable.
            if (!anyProgress || (results && bothComplete)) return null;
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

          <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, alignItems: "stretch" }}>
            {DOMAINS.map((d, i) => (
              <button key={d.id} onClick={() => setChapterInfo(d.id)}
                aria-label={`About ${d.label}`}
                style={{ display: "block", width: "100%", height: "100%", textAlign: "left", cursor: "pointer",
                  font: "inherit", color: "inherit", background: "none", border: "none",
                  padding: 0, margin: 0, appearance: "none", WebkitAppearance: "none",
                  WebkitTapHighlightColor: "transparent", outline: "none" }}>
                <Card style={{ padding: 16, animationDelay: `${.2 + i * .03}s`, height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }} className="rise lift">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 22, color: "var(--gold)" }}>{d.icon}</div>
                    <span style={{ fontSize: 15, color: "var(--ink3)", lineHeight: 1 }}>ⓘ</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: "auto", paddingTop: 10, minHeight: "2.6em", display: "flex", alignItems: "flex-end" }}>{d.label}</div>
                </Card>
              </button>
            ))}
          </div>
          {hasHistory && liveTrends ? <DashboardPreview trends={liveTrends} onOpen={() => { setScreen("dashboard"); window.scrollTo({ top: 0 }); }} /> : null}
          <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <p style={{ fontSize: 12.5, color: "var(--ink3)", margin: 0, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} /> Private by design — all data stays on this machine.
            </p>
            <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>·</span>
            <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>CANA {APP_VERSION}</span>
            {!isIOS ? (
              <button onClick={runUpdateCheck} disabled={update.checking}
                style={{ border: "none", background: "none", color: "var(--accent)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", padding: 0 }}>
                {update.checking ? "Checking…" : "Check for updates"}
              </button>
            ) : null}
            {!isIOS ? <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>·</span> : null}
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

          {/* Encrypted transfer between devices (Mac ⇄ iPhone) */}
          <Card style={{ marginTop: 20, maxWidth: 560 }}>
            <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Move your data to another device</p>
            <p style={{ fontSize: 12.5, color: "var(--ink3)", margin: "0 0 14px", lineHeight: 1.55 }}>
              {isIOS
                ? "Export an encrypted file here, then send it to your iPhone or Mac (AirDrop, email, or Files) and import it there. Bring your CANA account's answers and reports with you. You choose a passphrase — without it the file can't be read."
                : "Export an encrypted file here, then send it to your other device — your iPhone or another Mac (AirDrop, email, or Files) — and import it there. Bring your CANA account's answers and reports with you. You choose a passphrase — without it the file can't be read."}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn onClick={exportData} disabled={transferBusy}>
                {transferBusy ? "Working…" : (isIOS ? "Export to share" : "Export to share")}
              </Btn>
              <Btn kind="secondary" disabled={transferBusy} onClick={() => importFileRef.current && importFileRef.current.click()}>
                {isIOS ? "Import from Mac" : "Import from iPhone"}
              </Btn>
              <input ref={importFileRef} type="file" accept=".cana,application/octet-stream,application/json"
                onChange={onImportFileChosen} style={{ display: "none" }} />
            </div>
            <p style={{ fontSize: 11.5, color: "var(--ink3)", marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
              Importing replaces this profile's current answers and reports with the ones in the file. Keep your passphrase somewhere safe — it cannot be recovered.
            </p>
          </Card>

          {/* Diagnostic log: desktop/web only. On iOS the saved-file flow has
              no natural home (no Finder) and TestFlight already carries crash
              reporting; the log still records silently for future support. */}
          {!isIOS ? <Card style={{ marginTop: 14, padding: 22 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.015em", color: "var(--ink)", margin: "0 0 6px" }}>Diagnostic log</h2>
            <p style={{ fontSize: 12.5, color: "var(--ink3)", margin: "0 0 14px", lineHeight: 1.55 }}>
              If the app ever crashes or misbehaves, the last {25} errors are kept on this device. You can save them as a file and send it to support if you'd like help. <strong>Nothing is sent automatically.</strong> No data ever leaves your machine without your action.
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Btn kind="secondary" onClick={() => {
                const n = readCrashLog().length;
                if (n === 0) { window.alert("No diagnostic entries recorded — nothing to save."); return; }
                exportCrashLog();
              }}>
                Save diagnostic log
              </Btn>
              <button onClick={() => {
                if (window.confirm("Clear all diagnostic entries on this device?")) clearCrashLog();
              }} style={{ border: "none", background: "none", color: "var(--ink3)", fontSize: 12.5, cursor: "pointer", padding: 0 }}>
                Clear log
              </button>
              <span style={{ fontSize: 11.5, color: "var(--ink3)" }}>{readCrashLog().length} entries recorded</span>
            </div>
          </Card> : null}

          {(update.checking || update.result) ? (() => {
            const r = update.result || {};
            const isNative = !!r.native;            // came from electron-updater
            const accent =
              r.state === "update"      ? "var(--accent)" :
              r.state === "available"   ? "var(--accent)" :
              r.state === "downloading" ? "var(--accent)" :
              r.state === "downloaded"  ? "var(--green)"  :
              r.state === "error"       ? "var(--amber)"  : "var(--green)";
            const tint =
              r.state === "update" || r.state === "available" || r.state === "downloading"
                ? "rgba(10,132,255,0.07)"
                : r.state === "downloaded" ? "rgba(52,199,89,0.07)"
                : r.state === "error" ? "rgba(255,159,10,0.07)"
                : "var(--bg2)";
            return (
              <div className="rise" style={{ marginTop: 12, padding: "14px 18px", borderRadius: 10, maxWidth: 560, background: tint, borderLeft: `3px solid ${accent}` }}>
                {update.checking && !r.state ? (
                  <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>Checking for updates…</span>
                ) : r.state === "checking" ? (
                  <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>Checking for updates…</span>
                ) : r.state === "available" && isNative ? (
                  // Native flow: electron-updater has confirmed an update.
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>CANA {r.latest} is available</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink3)", marginBottom: 10 }}>You have {r.current}. The update will download in the background; you can keep using the app.</div>
                    {r.notes ? (
                      <details style={{ marginBottom: 10 }}>
                        <summary style={{ fontSize: 12, color: "var(--accent)", cursor: "pointer" }}>Release notes</summary>
                        <pre style={{ fontSize: 12, color: "var(--ink2)", whiteSpace: "pre-wrap", maxHeight: 160, overflow: "auto", marginTop: 8, padding: 10, background: "var(--bg2)", borderRadius: 8 }}>{String(r.notes).slice(0, 1200)}</pre>
                      </details>
                    ) : null}
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <Btn style={{ padding: "8px 18px", fontSize: 13.5 }} onClick={async () => {
                        const dl = await nativeDownload();
                        if (!dl.ok) setUpdate({ checking: false, result: { state: "error", message: dl.error || "Download failed to start." } });
                      }}>Download update</Btn>
                      <button onClick={() => setUpdate({ checking: false, result: null })} style={{ border: "none", background: "none", color: "var(--ink3)", fontSize: 12.5, cursor: "pointer", padding: 0 }}>Not now</button>
                    </div>
                  </div>
                ) : r.state === "update" ? (
                  // Legacy / web fallback: open GitHub page or download URL.
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13.5, color: "var(--ink)" }}>CANA {r.latest} is available (you have {r.current}).</span>
                    <Btn kind="secondary" style={{ padding: "6px 14px", fontSize: 13 }} onClick={() => openUpdateGuide(r)}>Download &amp; install →</Btn>
                    <button onClick={() => openDownload(r.url)} style={{ border: "none", background: "none", color: "var(--accent)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", padding: 0 }}>View on GitHub</button>
                  </div>
                ) : r.state === "downloading" ? (
                  <div>
                    <div style={{ fontSize: 13.5, color: "var(--ink)", marginBottom: 8 }}>Downloading update…</div>
                    <div style={{ height: 6, background: "var(--hair)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${Math.max(2, Math.min(100, r.percent || 0))}%`, height: "100%", background: "var(--accent)", transition: "width .3s ease" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--ink3)" }}>You can keep using CANA.</span>
                      <span style={{ fontSize: 12, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{Math.round(r.percent || 0)}%</span>
                    </div>
                  </div>
                ) : r.state === "downloaded" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>CANA {r.version} is ready to install</div>
                      <div style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: 2 }}>Apple has verified the new version's signature. CANA will quit, install the update, and reopen.</div>
                    </div>
                    <Btn style={{ padding: "8px 18px", fontSize: 13.5 }} onClick={() => nativeInstall()}>Restart &amp; install</Btn>
                    <button onClick={() => setUpdate({ checking: false, result: null })} style={{ border: "none", background: "none", color: "var(--ink3)", fontSize: 12.5, cursor: "pointer", padding: 0 }}>Install on next quit</button>
                  </div>
                ) : r.state === "uptodate" ? (
                  <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>You're up to date — CANA {r.current || APP_VERSION} is the latest.</span>
                ) : r.state === "unconfigured" ? (
                  <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>Update checking isn't set up yet. (No release source configured.)</span>
                ) : r.state === "error" ? (
                  <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>{r.message || "Update check failed."}</span>
                ) : null}
              </div>
            );
          })() : null}
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
      {passModal}
      <Toast message={toast} />
      <Wrap narrow>
        <div style={{ padding: "44px 0 80px" }}>
          <p style={eyebrow}>Settings</p>
          {isIOS ? (
            <>
              <h2 style={h2}>On-device AI</h2>
              <p style={body}>On supported iPhones (iOS 26 and later with Apple Intelligence), your vision, mission, and letter analysis can be enhanced by Apple's on-device model. It runs entirely on your iPhone — nothing is ever sent anywhere. On other devices, the app uses its built-in writing, which is fully complete on its own. There is nothing to configure here.</p>
              <Card style={{ marginTop: 8 }}>
                <p style={{ fontSize: 14, color: "var(--ink2)", margin: 0, lineHeight: 1.6 }}>
                  AI enhancement is automatic and optional. Whether or not it is available, every score, comparison, and the full plan are generated on your device.
                </p>
              </Card>
            </>
          ) : (
          <>
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
            <Btn onClick={() => { const r = setLLMConfig(llmCfg); if (!r.ok) { setLlmState("bad"); setLlmSample(r.error); return; } probeOllama(); setLlmState("ok"); setLlmSample(""); }}>Save</Btn>
            <Btn kind="secondary" onClick={async () => { const r = setLLMConfig(llmCfg); if (!r.ok) { setLlmState("bad"); setLlmSample(r.error); return; } setLlmSample(""); setLlmState("checking"); const tr = await testConnection(); setLlmState(tr.ok ? "ok" : "bad"); setLlmSample(tr.ok ? tr.sample : tr.error); }}>{llmState === "checking" ? "Testing…" : "Test"}</Btn>
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
          </>
          )}
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
                    <span style={{ width: 20, height: 20, minWidth: 20, flexShrink: 0, borderRadius: "50%", background: "var(--accent)", color: "#fff", fontSize: 12, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>?</span>
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
                  const isNA = ans[q.id] === "NA";
                  const answered = ans[q.id] !== undefined;
                  return (
                  <Card key={q.id} style={{ marginBottom: 14, padding: 20, borderColor: isNA ? "var(--hair2)" : answered ? "rgba(52,199,89,0.35)" : "var(--hair2)", opacity: isNA ? 0.72 : 1 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <p style={{ flex: 1, fontSize: 16, color: "var(--ink)", margin: "0 0 14px", lineHeight: 1.45, fontWeight: 500, letterSpacing: "-.01em" }}>
                        <span style={{ color: isNA ? "var(--ink3)" : answered ? "var(--green)" : "var(--ink3)", marginRight: 8, fontWeight: 500 }}>{isNA ? "—" : answered ? "✓" : qi + 1 + "."}</span>{q.text}
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
                    {isNA ? (
                      <p style={{ fontSize: 13.5, color: "var(--ink3)", fontStyle: "italic", margin: "4px 0 12px" }}>Marked not applicable — this question won't be included in your results.</p>
                    ) : (
                      <ScaleInput question={q} value={ans[q.id]} onChange={(v) => handleAnswer(q.id, v)} />
                    )}
                    <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                      <button onClick={() => handleAnswer(q.id, isNA ? undefined : "NA")}
                        style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "none", background: "none", cursor: "pointer", fontSize: 12.5, color: isNA ? "var(--accent)" : "var(--ink3)", fontWeight: 500, padding: 0 }}>
                        <span style={{ width: 34, height: 20, borderRadius: 10, background: isNA ? "var(--accent)" : "var(--hair)", position: "relative", transition: "background .15s", flexShrink: 0 }}>
                          <span style={{ position: "absolute", top: 2, left: isNA ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
                        </span>
                        Not applicable
                      </button>
                    </div>
                  </Card>
                );})}
              </div>
              <div style={{ marginTop: 24, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {!lastPage ? (
                  <Btn disabled={!pageDone} onClick={() => { setQPage(page + 1); setOpenInfo(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Continue</Btn>
                ) : (
                  <Btn disabled={!allDone} onClick={finishDomain}>{dIdx < N - 1 ? `Next — ${activeDomains[dIdx + 1].label}` : "Complete"}</Btn>
                )}
                {!allDone && (
                  <Btn kind="subtle" onClick={skipDomain}>Skip chapter</Btn>
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
              <Card style={{ textAlign: "center", padding: 40 }}><div style={{ width: 30, height: 30, border: "3px solid var(--hair)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin .9s linear infinite", margin: "0 auto 18px" }} /><ProgressBar value={genProg} label={genMsg} /></Card>
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
                return <Card style={{ textAlign: "center", padding: 36 }}><div style={{ width: 30, height: 30, border: "3px solid var(--hair)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin .9s linear infinite", margin: "0 auto 18px" }} /><ProgressBar value={genProg} label={genMsg} /></Card>;
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
    const convoLabel = `Start the Conversation ${dateStamp()} ${convo.nameA || ""} ${convo.nameB || ""}`;
    const canRefresh = !archiveReport && !!results; // only the live report can be refreshed
    // Dedicated 3-page print layout for the conversation guide:
    //  Page 1: title + "Where you stand"
    //  Page 2: "Questions to explore together" (shrink to fit one page)
    //  Page 3: final comments
    const ConvoPrint = () => {
      if (!g) return null;
      const H = ({ children }) => <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1d1d1f", margin: "0 0 14px", borderBottom: "2px solid #e5e5ea", paddingBottom: 8, letterSpacing: "-.01em" }}>{children}</h2>;
      const Lbl = ({ c, children }) => <p style={{ fontSize: 11, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: ".05em", margin: "14px 0 4px" }}>{children}</p>;
      return (
        <div className="print-only">
          {/* PAGE 1 */}
          <section className="pdf-page">
            <p style={{ fontSize: 12, color: "#8e8e93", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700, margin: "0 0 4px" }}>CANA — Covenant Life</p>
            <p style={{ fontSize: 13, color: "#8e8e93", margin: "0 0 18px" }}>Start the Conversation · a guide for {convo.nameA} &amp; {convo.nameB}</p>
            <H>Where you stand</H>
            <Lbl c="#2e7d4f">Highest-scoring</Lbl>
            <p style={{ fontSize: 13.5, color: "#1d1d1f", lineHeight: 1.55, margin: 0 }}>{g.summary.positive}</p>
            <Lbl c="#b06a2c">Lowest-scoring &amp; widest gaps</Lbl>
            <p style={{ fontSize: 13.5, color: "#1d1d1f", lineHeight: 1.55, margin: 0 }}>{g.summary.growth}</p>
            <Lbl c="#3a5a44">About this guide</Lbl>
            <p style={{ fontSize: 13.5, color: "#1d1d1f", lineHeight: 1.55, margin: 0 }}>{g.summary.overall}</p>
          </section>
          {/* PAGE 2 — shrink to fit */}
          <section className="pdf-page" style={{ fontSize: 11 }}>
            <H>Questions to explore together</H>
            {g.questions.map((q, i) => (
              <div key={i} style={{ marginBottom: 9, breakInside: "avoid" }}>
                {q.area ? <p style={{ fontSize: 9.5, fontWeight: 700, color: "#3a5a44", textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 2px" }}>{q.area}</p> : null}
                <p style={{ fontSize: 12.5, fontWeight: 600, color: "#1d1d1f", lineHeight: 1.4, margin: "0 0 2px" }}>{i + 1}. {q.prompt}</p>
                {q.why ? <p style={{ fontSize: 10.5, color: "#8e8e93", fontStyle: "italic", lineHeight: 1.4, margin: 0 }}>{q.why}</p> : null}
              </div>
            ))}
          </section>
          {/* PAGE 3 — final comments */}
          <section className="pdf-page">
            <H>Final comments</H>
            <p style={{ fontSize: 13.5, color: "#1d1d1f", lineHeight: 1.6, margin: "0 0 14px" }}>Take these slowly — one or two per sitting. The goal isn't to resolve everything at once, but to move a little closer to each other and to God in the process.</p>
            <p style={{ fontSize: 11.5, color: "#8e8e93", lineHeight: 1.55, margin: 0, paddingTop: 12, borderTop: "1px solid #ececec" }}>These prompts are based on your own self-rated scores and are starting points for conversation, not conclusions or clinical assessments. Generated by CANA — Covenant Life.</p>
          </section>
        </div>
      );
    };
    return (
      <div>
        <Toast message={toast} />
        <ConvoPrint />
        <Chrome title="CANA — Start the Conversation" right={
          <div style={{ display: "flex", gap: 8 }} className="no-print">
            {g ? <Btn kind="ghost" onClick={() => printWithTitle(convoLabel)}>Save as PDF</Btn> : null}
            <Btn kind="ghost" onClick={() => { setConvo({ open: false, loading: false, guide: null, usedAI: false }); setScreen("results"); window.scrollTo({ top: 0 }); }}>Back to report</Btn>
          </div>
        } />
        <Wrap>
          <div style={{ padding: "44px 0 90px" }} className="no-print">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
              <p style={{ fontSize: 12, color: convo.usedAI ? "var(--gold)" : "var(--ink3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", margin: 0 }}>
                {convo.usedAI ? "✦ Prepared by your local AI" : "Prepared locally"}
              </p>
              {canRefresh && !convo.loading ? (
                <Btn kind="subtle" style={{ padding: "6px 14px", fontSize: 13 }} onClick={() => startConversation(results, { force: true })}>↻ Refresh AI output</Btn>
              ) : null}
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.02em", color: "var(--ink)", margin: "0 0 6px" }}>Start the Conversation</h1>
            <p style={{ fontSize: 15.5, color: "var(--ink2)", lineHeight: 1.6, margin: "0 0 28px", maxWidth: 640 }}>
              A guide for {convo.nameA} & {convo.nameB} to talk through what matters most — honestly, and toward each other.
            </p>

            {convo.loading ? (
              <Card style={{ padding: 40, textAlign: "center" }}>
                <div style={{ width: 30, height: 30, border: "3px solid var(--hair)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin .9s linear infinite", margin: "0 auto 14px" }} />
                <p style={{ fontSize: 15, color: "var(--ink2)", margin: 0 }}>Preparing your conversation guide…</p>
              </Card>
            ) : g ? (
              <>
                <Card className="rise" style={{ marginBottom: 18, padding: 26 }}>
                  <p style={{ ...eyebrow, margin: "0 0 14px" }}>Where you stand</p>
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", margin: "0 0 4px" }}>Highest-scoring</p>
                    <p style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>{g.summary.positive}</p>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--amber)", margin: "0 0 4px" }}>Lowest-scoring & widest gaps</p>
                    <p style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>{g.summary.growth}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", margin: "0 0 4px" }}>About this guide</p>
                    <p style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>{g.summary.overall}</p>
                  </div>
                </Card>

                <p style={{ ...eyebrow, margin: "28px 0 12px" }}>Questions to explore together</p>
                {g.questions.map((q, i) => (
                  <Card key={i} style={{ marginBottom: 12, padding: 20 }}>
                    {q.area ? <p style={{ fontSize: 11.5, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 6px" }}>{q.area}</p> : null}
                    <p style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", lineHeight: 1.5, margin: "0 0 6px" }}>{i + 1}. {q.prompt}</p>
                    {q.why ? <p style={{ fontSize: 13, color: "var(--ink3)", lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>{q.why}</p> : null}
                  </Card>
                ))}

                <Card style={{ marginTop: 24, background: "var(--bg2)", boxShadow: "none", textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.6, margin: 0 }}>
                    Take these slowly — one or two per sitting. The goal isn't to resolve everything tonight, but to move a little closer to each other and to God in the process.
                  </p>
                </Card>

                <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }} className="no-print">
                  <Btn kind="secondary" onClick={() => { setConvo({ open: false, loading: false, guide: null, usedAI: false }); setScreen("results"); window.scrollTo({ top: 0 }); }}>Back to report</Btn>
                  <Btn onClick={() => printWithTitle(convoLabel)}>Save as PDF</Btn>
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

    // ── Dedicated PRINT layout (PDF). One section per page, fixed order,
    // independent of the interactive on-screen layout (hidden in print). Each
    // .pdf-page forces a page break after it; "fit" pages use smaller type so a
    // long list stays on its single page.
    const PrintReport = () => {
      const A = R.nameA, B = R.nameB;
      const Page = ({ children, fit }) => (
        <section className="pdf-page" style={{ fontSize: fit ? 11 : 12.5 }}>{children}</section>
      );
      const H = ({ children }) => (
        <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.01em", color: "#1d1d1f", margin: "0 0 14px", borderBottom: "2px solid #e5e5ea", paddingBottom: 8 }}>{children}</h2>
      );
      const Sub = ({ children }) => (
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#8e8e93", margin: "16px 0 8px" }}>{children}</p>
      );
      const goalList = (list, fit) => (
        <div>
          {(list || []).map((g, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: fit ? "5px 0" : "8px 0", borderBottom: i < (list || []).length - 1 ? "1px solid #ececec" : "none" }}>
              <span style={{ color: "#0a84ff", fontWeight: 700, minWidth: 20, fontSize: fit ? 11 : 12 }}>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p style={{ fontSize: fit ? 9 : 10, color: "#8e8e93", textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 2px", fontWeight: 600 }}>{g.domain}</p>
                <p style={{ fontSize: fit ? 11 : 13, color: "#1d1d1f", margin: 0, lineHeight: 1.4 }}>{g.goal}</p>
              </div>
            </div>
          ))}
        </div>
      );
      return (
        <div className="print-only">
          <Page>
            <p style={{ fontSize: 12, color: "#8e8e93", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700, margin: "0 0 4px" }}>CANA — Covenant Life</p>
            <p style={{ fontSize: 13, color: "#8e8e93", margin: "0 0 20px" }}>A plan for {A} &amp; {B}</p>
            <H>Joint Vision</H>
            <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5, color: "#1d1d1f", margin: "0 0 20px", letterSpacing: "-.01em" }}>{R.vision}</p>
            <H>Joint Mission</H>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "#3a3a3c", margin: "0 0 20px" }}>{R.mission}</p>
            {(R.indivA || R.indivB) ? (
              <>
                <H>Individual Visions</H>
                {["A", "B"].map((p) => { const iv = p === "A" ? R.indivA : R.indivB; const nm = p === "A" ? A : B; if (!iv) return null;
                  return (
                    <div key={p} style={{ marginBottom: 14 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#b8860b", margin: "0 0 4px" }}>{nm}</p>
                      <p style={{ fontSize: 12.5, fontStyle: "italic", color: "#1d1d1f", lineHeight: 1.5, margin: "0 0 4px" }}><strong>Vision:</strong> {iv.vision}</p>
                      <p style={{ fontSize: 12.5, fontStyle: "italic", color: "#3a3a3c", lineHeight: 1.5, margin: 0 }}><strong>Mission:</strong> {iv.mission}</p>
                    </div>
                  ); })}
              </>
            ) : null}
          </Page>

          {R.comparison ? (
            <Page>
              <H>Future Perfect — Where Your Letters Meet</H>
              <p style={{ fontSize: 12.5, color: "#3a3a3c", margin: "0 0 16px" }}>Letter alignment: <strong>{R.comparison.letterAlignment}/10</strong>. Differences can be complementary, not just conflicts.</p>
              <Sub>Top Shared Dreams</Sub>
              {(R.comparison.commonalities || []).length ? (R.comparison.commonalities || []).map((c, i) => (
                <div key={i} style={{ borderLeft: "3px solid #34c759", paddingLeft: 12, marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: c.detail ? "0 0 2px" : 0, color: "#1d1d1f" }}>{c.theme}</p>
                  {c.detail ? <p style={{ fontSize: 12, color: "#3a3a3c", margin: 0, lineHeight: 1.4 }}>{c.detail}</p> : null}
                </div>
              )) : <p style={{ fontSize: 12.5, color: "#8e8e93" }}>No strongly shared dreams surfaced — worth discussing.</p>}
            </Page>
          ) : null}

          {R.comparison ? (
            <Page>
              <H>Top Differences</H>
              <p style={{ fontSize: 12, color: "#8e8e93", margin: "0 0 14px" }}>Where your letters point in different directions. A difference is not automatically a conflict.</p>
              {(R.comparison.differences || []).length ? (R.comparison.differences || []).map((d, i) => (
                <div key={i} style={{ borderLeft: `3px solid ${d.tension === "high" ? "#ff3b30" : d.tension === "medium" ? "#ff9f0a" : "#0a84ff"}`, paddingLeft: 12, marginBottom: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 2px", color: "#1d1d1f" }}>{d.theme} <span style={{ fontSize: 10, color: "#8e8e93", textTransform: "uppercase" }}>· {d.tension}</span></p>
                  <p style={{ fontSize: 12, color: "#3a3a3c", margin: 0, lineHeight: 1.4 }}>{d.a} · {d.b}</p>
                </div>
              )) : <p style={{ fontSize: 12.5, color: "#8e8e93" }}>No major divergences.</p>}
            </Page>
          ) : null}

          <Page fit>
            <H>Domain Health</H>
            <div style={{ display: "flex", gap: 8, fontSize: 10, color: "#8e8e93", marginBottom: 8, fontWeight: 600 }}>
              <span style={{ width: 130 }}></span><span style={{ flex: 1 }}>{A}</span><span style={{ width: 24 }}></span><span style={{ flex: 1 }}>{B}</span><span style={{ width: 24 }}></span><span style={{ width: 34, textAlign: "right" }}>Gap</span>
            </div>
            {(R.domainScores || []).map((d) => {
              const gap = Math.abs(d.avgNormA - d.avgNormB);
              const gapCol = gap >= 3 ? "#ff3b30" : gap >= 2 ? "#ff9f0a" : "#8e8e93";
              return (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  <span style={{ fontSize: 11, width: 130, color: "#3a3a3c" }}>{d.label}</span>
                  <div style={{ flex: 1, height: 6, background: "#ececec", borderRadius: 3, position: "relative" }}><div style={{ position: "absolute", height: "100%", width: `${d.avgNormA * 10}%`, background: "#0a84ff", borderRadius: 3 }} /></div>
                  <span style={{ fontSize: 11, width: 24, textAlign: "right", color: "#3a3a3c" }}>{d.avgNormA.toFixed(1)}</span>
                  <div style={{ flex: 1, height: 6, background: "#ececec", borderRadius: 3, position: "relative" }}><div style={{ position: "absolute", height: "100%", width: `${d.avgNormB * 10}%`, background: "#b8860b", borderRadius: 3 }} /></div>
                  <span style={{ fontSize: 11, width: 24, textAlign: "right", color: "#3a3a3c" }}>{d.avgNormB.toFixed(1)}</span>
                  <span style={{ fontSize: 10, width: 34, textAlign: "right", color: gapCol, fontWeight: 700 }}>Δ{gap.toFixed(1)}</span>
                </div>
              );
            })}
            <p style={{ fontSize: 12, color: "#1d1d1f", fontWeight: 700, marginTop: 14 }}>Overall: {R.overallScore?.toFixed ? R.overallScore.toFixed(1) : R.overallScore}/10</p>
          </Page>

          <Page fit><H>Shared Goals — 1 Year</H>{goalList(R.goals1yr, true)}</Page>
          <Page fit><H>Shared Goals — 5 Years</H>{goalList(R.goals5yr, true)}</Page>
          <Page fit><H>Shared Goals — 10 Years</H>{goalList(R.goals10yr, true)}</Page>

          <Page fit>
            <H>Top Tensions</H>
            <p style={{ fontSize: 11, color: "#8e8e93", margin: "0 0 12px" }}>Ranked by weighted gap — the conversations worth having.</p>
            {(R.tensions || []).map((t, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${t.gapClass?.color || "#ff9f0a"}`, paddingLeft: 12, marginBottom: 10 }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, margin: "0 0 3px", color: "#1d1d1f" }}>{i + 1}. {t.title}</p>
                <p style={{ fontSize: 11.5, color: "#3a3a3c", margin: "0 0 3px", lineHeight: 1.4 }}>{t.explanation}</p>
                <p style={{ fontSize: 10.5, color: "#8e8e93", margin: 0 }}>{A}: {t.scoreA} · {B}: {t.scoreB} · {t.gapClass?.label} · {t.domain}</p>
              </div>
            ))}
          </Page>

          <Page>
            <H>Insights</H>
            {(R.flags || []).length ? (R.flags || []).map((f, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${flagColor(f.type)}`, paddingLeft: 14, marginBottom: 16 }}>
                <p style={{ fontSize: 10.5, color: "#8e8e93", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700, margin: "0 0 4px" }}>{f.label}</p>
                <p style={{ fontSize: 13, color: "#1d1d1f", margin: 0, lineHeight: 1.5 }}>{f.text}</p>
              </div>
            )) : <p style={{ fontSize: 12.5, color: "#8e8e93" }}>No critical flags — broad alignment.</p>}
            <p style={{ fontSize: 10.5, color: "#8e8e93", marginTop: 24, paddingTop: 12, borderTop: "1px solid #ececec", lineHeight: 1.5 }}>Generated by CANA — Covenant Life. These are self-rated reflections and conversation-starters, not clinical measurements.</p>
          </Page>
        </div>
      );
    };

    return (
      <div>
        <Toast message={toast} />
        <PrintReport />
        <Chrome title={reviewing ? `CANA — Report · ${new Date(archiveReport.ts || Date.now()).toLocaleDateString()}` : "CANA — Your Plan"} right={<div style={{ display: "flex", gap: 8 }}>{reviewing ? <Btn kind="ghost" onClick={() => { setArchiveReport(null); setScreen("dashboard"); window.scrollTo({ top: 0 }); }}>Done reviewing</Btn> : <>{hasHistory ? <Btn kind="ghost" onClick={() => setScreen("dashboard")}>Dashboard</Btn> : null}<Btn kind="ghost" onClick={() => setScreen("welcome")}>Home</Btn></>}</div>} />
        <Wrap>
          <div style={{ padding: "44px 0 90px" }} className="no-print">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
              <p style={{ fontSize: 12, color: R.llmUsed ? "var(--gold)" : "var(--ink3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", margin: 0 }}>{R.llmUsed ? (R.goalsPersonalized ? "✦ Vision, mission & goals written by your local AI · editable" : "✦ Vision & mission written by your local AI · editable") : "Generated locally · editable"}</p>
              {!reviewing ? (
                <Btn kind="subtle" style={{ padding: "6px 14px", fontSize: 13 }} disabled={regenerating} onClick={regenerateAI}>
                  {regenerating ? (genMsg || "Refreshing…") : "↻ Refresh AI output"}
                </Btn>
              ) : null}
            </div>
            {!reviewing && regenerating ? (
              <Card className="rise" style={{ marginBottom: 20, padding: 18, background: "var(--bg2)", borderLeft: "3px solid var(--accent)" }}>
                <ProgressBar value={genProg} label={genMsg || "Re-running the local AI…"} />
                <p style={{ fontSize: 12.5, color: "var(--ink3)", margin: "12px 0 0", textAlign: "center" }}>The scores and gaps stay the same — only the AI-written text is refreshed.</p>
              </Card>
            ) : null}

            {!reviewing && !R.llmUsed && R.llmSkipReason ? (
              <Card className="rise no-print" style={{ marginBottom: 20, padding: 16, background: "var(--bg2)", borderLeft: "3px solid var(--amber)" }}>
                <p style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 600, margin: "0 0 4px" }}>This report used the built-in text, not the local AI.</p>
                <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.5, margin: "0 0 10px" }}>{R.llmSkipReason}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {!isIOS ? <Btn kind="secondary" style={{ padding: "6px 14px", fontSize: 13 }} onClick={openSetup}>Set up the local AI</Btn> : null}
                  <Btn kind="subtle" style={{ padding: "6px 14px", fontSize: 13 }} disabled={regenerating} onClick={regenerateAI}>{regenerating ? "Working…" : "Regenerate with AI"}</Btn>
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
            {/* On screen: interactive tabbed view. The PDF (PrintReport) renders all horizons. */}
            <div>
              <div style={{ marginBottom: 18 }}><Segmented value={goalsTab} onChange={setGoalsTab} options={[{ value: "1yr", label: "1 Year" }, { value: "5yr", label: "5 Years" }, { value: "10yr", label: "10 Years" }]} /></div>
              <Card style={{ marginBottom: 32 }}>
                {goals.map((g, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: i < goals.length - 1 ? "1px solid var(--hair2)" : "none" }}>
                    <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700, minWidth: 24, fontVariantNumeric: "tabular-nums" }}>{String(i + 1).padStart(2, "0")}</span>
                    <div><p style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 3px", fontWeight: 600 }}>{g.domain}</p><p style={{ fontSize: 15, color: "var(--ink)", margin: 0, lineHeight: 1.5 }}>{g.goal}</p></div>
                  </div>
                ))}
              </Card>
            </div>

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

            <OxygenTank oxygen={R.oxygen} />

            {R.recommendedPractice ? (
              <Card style={{ marginTop: 28, padding: 22, borderLeft: `3px solid ${R.recommendedPractice.id === "referral" ? "var(--red)" : "var(--accent)"}` }}>
                <p style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, margin: "0 0 6px" }}>A practice for this season</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: "0 0 8px" }}>{R.recommendedPractice.title}</p>
                <p style={{ fontSize: 14.5, color: "var(--ink2)", lineHeight: 1.6, margin: 0 }}>{R.recommendedPractice.body}</p>
              </Card>
            ) : null}

            <p style={{ fontSize: 12.5, color: "var(--ink3)", lineHeight: 1.6, marginTop: 20 }}>
              CANA measures your <em>perception</em> of the relationship, not necessarily your behavior. Gaps are an invitation to a conversation, not a verdict.
            </p>

            <Card style={{ marginTop: 24, background: "var(--bg2)", boxShadow: "none", textAlign: "center" }}>
              <p style={{ fontSize: 15, fontStyle: "italic", color: "var(--ink)", margin: "0 0 4px" }}>"{SCRIPTURES.synthesis.text}"</p>
              <p style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600, margin: 0 }}>{SCRIPTURES.synthesis.ref}</p>
            </Card>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }} className="no-print">
              <Btn kind="secondary" onClick={() => setScreen(reviewing ? "dashboard" : "welcome")}>{reviewing ? "Back" : "Home"}</Btn>
              <Btn onClick={() => printWithTitle(`Report Summary ${dateStamp(reviewing ? archiveReport.ts : undefined)} ${R.nameA || ""} ${R.nameB || ""}`)}>Save as PDF</Btn>
              {!isIOS ? <Btn kind="secondary" onClick={() => emailReport(R, profile ? profile.email : "")}>Email report</Btn> : null}
              <Btn onClick={() => startConversation(R)}>Start the conversation →</Btn>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink3)", marginTop: 10, lineHeight: 1.5 }} className="no-print">
              {isIOS
                ? '"Save as PDF" renders the report and opens the share sheet — save it to Files, AirDrop it, or attach it to an email from there. Nothing is transmitted by the app itself.'
                : `"Email report" opens your mail app with the report prefilled${profile ? ` to ${profile.email}` : ""} — you review and send it yourself, so nothing is transmitted by the app. If your mail app shortens a long report, use "Save as PDF" and attach it instead.`}
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
    const StatTile = ({ label, value, color, sub, metricKey, spark, sparkColor, delta, invert }) => {
      const [infoOpen, setInfoOpen] = useState(false);
      return (
      <Card style={{ flex: 1, minWidth: 168, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "0 0 4px" }}>
          <p style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, margin: 0 }}>{label}</p>
          {metricKey ? <MetricInfo metricKey={metricKey} value={value} onToggle={(o) => setInfoOpen(o)} /> : null}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
          <p style={{ fontSize: 32, fontWeight: 700, color, margin: 0, letterSpacing: "-.02em", lineHeight: 1 }}>{value}<span style={{ fontSize: 14, color: "var(--ink3)" }}>/10</span></p>
          {spark && spark.length > 1 ? <Sparkline series={spark} color={sparkColor || color} /> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <DeltaChip delta={delta} invert={invert} />
          <span style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.3 }}>{sub}</span>
        </div>
        {infoOpen && metricKey ? <MetricInfoPanel metricKey={metricKey} value={value} /> : null}
      </Card>
      );
    };
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
            {trends.oxygenSeries && trends.oxygenSeries.length ? (
              <div style={{ marginBottom: 26 }}>
                <p style={eyebrow}>Oxygen</p>
                <p style={{ ...body, fontSize: 13 }}>Solid line: your supply of time, rest, and balance. Dashed line: what your shared callings ask. Breathing room is the space between them.</p>
                <OxygenTank oxygen={trends.latest.oxygen} style={{ marginTop: 0, marginBottom: 14 }} />
                <Card style={{ padding: 16 }}>
                  <OxygenTrendChart series={trends.oxygenSeries} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>{trends.oxygenSeries.map((p, i) => <span key={i} style={{ fontSize: 10, color: "var(--ink3)" }}>{fmtDate(p.ts)}</span>)}</div>
                  <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                    <span style={{ fontSize: 11.5, color: "var(--ink2)" }}><span style={{ display: "inline-block", width: 16, height: 0, borderTop: "2.5px solid var(--green)", verticalAlign: "middle", marginRight: 5 }} />Supply</span>
                    <span style={{ fontSize: 11.5, color: "var(--ink2)" }}><span style={{ display: "inline-block", width: 16, height: 0, borderTop: "2px dashed var(--ink3)", verticalAlign: "middle", marginRight: 5 }} />Demand</span>
                  </div>
                </Card>
              </div>
            ) : null}
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
              <Btn kind="subtle" onClick={() => printWithTitle(`CANA History ${dateStamp()} ${names.A || ""} ${names.B || ""}`)}>Print</Btn>
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
