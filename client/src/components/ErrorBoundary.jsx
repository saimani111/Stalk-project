import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#0f172a",
            color: "#f8fafc",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "24px", marginBottom: "12px", color: "#fca5a5" }}>
            Something went wrong rendering this page.
          </h2>
          <p style={{ color: "#94a3b8", maxWidth: "600px", marginBottom: "20px" }}>
            {this.state.error?.toString()}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 24px",
              borderRadius: "10px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
