import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center gap-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
             style={{ background: "rgba(239,68,68,0.1)" }}>
          <AlertTriangle size={32} style={{ color: "var(--danger)" }} />
        </div>
        <div>
          <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            Something went wrong
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          {this.state.error && (
            <p className="text-xs mt-2 font-mono px-3 py-1.5 rounded-lg"
               style={{ background: "var(--bg-secondary)", color: "var(--danger)" }}>
              {this.state.error.message}
            </p>
          )}
        </div>
        <button className="btn-primary flex items-center gap-2"
                onClick={() => window.location.reload()}>
          <RefreshCw size={14} />
          Reload Page
        </button>
      </div>
    );
  }
}
