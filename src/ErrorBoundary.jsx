import React from "react";
import { recordCrash, exportCrashLog } from "./crashLog.js";

// Catches any render error anywhere below it and shows a recoverable screen
// with a working exit, instead of React unmounting into a blank, dead page.
// "Return home" clears the transient view state (which screen / which report is
// open) WITHOUT touching saved data, so a bad report can't trap the user.
//
// All errors are also written to the LOCAL crash log (localStorage). Nothing
// is uploaded; CANA's no-telemetry promise holds. The user can choose to
// export the log from Settings and share it manually.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    // Best-effort log; never throws.
    try { console.error("CANA render error:", error, info); } catch (e) {}
    try {
      recordCrash({
        kind: "react.render",
        message: error && (error.message || String(error)),
        stack: error && error.stack,
        extra: info && info.componentStack ? { componentStack: String(info.componentStack).split("\n").slice(0, 12).join("\n") } : null,
      });
    } catch (e) { /* never propagate from the boundary */ }
  }
  handleHome = () => {
    // Clear only the transient UI pointers that can cause a bad render, never
    // the user's saved reports/sessions/profiles.
    try {
      // The app reads `screen` from React state on mount; a full reload returns
      // to the login/home flow cleanly with all saved data intact.
      window.location.reload();
    } catch (e) {
      this.setState({ hasError: false });
    }
  };
  handleExport = () => {
    try { exportCrashLog(); } catch (e) { /* ignore */ }
  };
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#f5f5f7", color: "#1d1d1f" }}>
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>Something went wrong displaying this page.</p>
          <p style={{ fontSize: 14.5, color: "#6e6e73", lineHeight: 1.5, margin: "0 0 24px" }}>
            Your saved data is safe — this only affected what was on screen. Returning home will reload the app with everything intact.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={this.handleHome}
              style={{ border: "none", borderRadius: 10, padding: "12px 22px", fontSize: 15, fontWeight: 600, color: "#fff", background: "#0a84ff", cursor: "pointer" }}>
              Return home
            </button>
            <button onClick={this.handleExport}
              style={{ border: "1px solid #d2d2d7", borderRadius: 10, padding: "12px 22px", fontSize: 15, fontWeight: 500, color: "#1d1d1f", background: "#fff", cursor: "pointer" }}>
              Save diagnostic log
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#86868b", marginTop: 16, lineHeight: 1.45 }}>
            The diagnostic log stays on this device. Nothing is sent anywhere. You can email it to support if you want help.
          </p>
        </div>
      </div>
    );
  }
}
