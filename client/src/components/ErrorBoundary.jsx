import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 m-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
          <h2 className="text-lg font-bold text-red-400 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-400 mb-4 max-w-md">
            The UI encountered an unexpected error. This might be due to malformed analysis data from the AI.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 rounded-lg bg-[border] text-slate-300 text-sm hover:bg-[#363a4a] transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
