import React from "react";

// Catches any render error anywhere below it and shows a recoverable screen
// with a working exit, instead of React unmounting into a blank, dead page.
// "Return home" clears the transient view state (which screen / which report is
// open) WITHOUT touching saved data, so a bad report can't trap the user.
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
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#f5f5f7", color: "#1d1d1f" }}>
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>Something went wrong displaying this page.</p>
          <p style={{ fontSize: 14.5, color: "#6e6e73", lineHeight: 1.5, margin: "0 0 24px" }}>
            Your saved data is safe — this only affected what was on screen. Returning home will reload the app with everything intact.
          </p>
          <button onClick={this.handleHome}
            style={{ border: "none", borderRadius: 10, padding: "12px 22px", fontSize: 15, fontWeight: 600, color: "#fff", background: "#0a84ff", cursor: "pointer" }}>
            Return home
          </button>
        </div>
      </div>
    );
  }
}
