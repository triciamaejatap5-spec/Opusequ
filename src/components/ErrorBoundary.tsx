import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6 text-center">
          <div className="border border-accent/20 p-8 sm:p-12 bg-accent/5 backdrop-blur-xl relative overflow-hidden">
            {/* Gold Accents */}
            <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
            <div className="absolute bottom-0 right-0 w-full h-1 bg-accent/20"></div>
            
            <div className="space-y-6 relative z-10">
              <div className="text-accent text-[10px] sm:text-xs uppercase tracking-[5px] font-bold">System Alert</div>
              <h1 className="text-xl sm:text-2xl font-serif italic text-white tracking-wide">
                Opusequ: Configuration Sync in Progress.
              </h1>
              <p className="text-accent/60 text-xs sm:text-sm uppercase tracking-[2px] font-medium">
                Please refresh to complete synchronization.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 border border-accent text-accent hover:bg-accent hover:text-bg transition-all text-xs uppercase tracking-widest font-black"
              >
                Refresh Archive
              </button>
            </div>

            {/* Decorative Grid */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#D4AF37 1px, transparent 1px), linear-gradient(90deg, #D4AF37 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
