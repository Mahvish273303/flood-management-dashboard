import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "", resetKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: String(error?.message || error || "Unknown error") };
  }

  componentDidCatch(error, info) {
    console.warn("[flood-app] ErrorBoundary:", error?.message, info?.componentStack);
  }

  handleTryAgain = () => {
    this.setState((s) => ({ hasError: false, message: "", resetKey: s.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback" role="alert">
          <h2 className="error-boundary-fallback__title">Something went wrong</h2>
          <p className="error-boundary-fallback__text">
            The map dashboard hit an internal error. Your data is unchanged. You can try again or reload the page.
          </p>
          {this.state.message && (
            <pre className="error-boundary-fallback__pre" tabIndex={0}>
              {this.state.message}
            </pre>
          )}
          <div className="error-boundary-fallback__actions">
            <button type="button" className="btn" onClick={this.handleTryAgain}>
              Try again
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}
