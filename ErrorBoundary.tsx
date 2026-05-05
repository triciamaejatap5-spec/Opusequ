import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary for Opusequ.
 * Prevents minor feature crashes (like deletion logic or AI extraction) from breaking the main UX.
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Opusequ Uncaught Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="w-16 h-16 bg-accent/10 border border-accent rounded-full flex items-center justify-center text-accent mb-2">
            <AlertCircle size={32} />
          </div>
          
          <div className="space-y-2 max-w-md">
            <h1 className="text-2xl font-serif italic text-text-primary">Something went wrong.</h1>
            <p className="text-text-secondary text-sm">
              An unexpected error occurred while processing your academic data. 
              Don't worry, your progress is likely still safe in the cloud.
            </p>
          </div>

          {this.state.error && (
            <div className="w-full max-w-md bg-surface border border-border p-3 rounded-sm text-left">
              <p className="text-[10px] font-mono text-text-secondary uppercase mb-1">Error Trace:</p>
              <p className="text-[11px] font-mono text-red-400 break-all">{this.state.error.message}</p>
            </div>
          )}

          <button 
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-accent text-bg text-[11px] uppercase font-bold tracking-widest rounded-sm hover:opacity-90 transition-opacity"
          >
            <RefreshCw size={14} /> Refresh Opusequ
          </button>
          
          <p className="text-[10px] text-text-secondary opacity-50 uppercase tracking-tighter">
            Quezon City Working Students Productivity Hub
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
