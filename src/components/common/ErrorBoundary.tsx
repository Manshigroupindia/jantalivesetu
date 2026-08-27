import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-surface-bg">
          <div className="bg-white p-8 rounded-2xl border border-red-100 shadow-modal max-w-md text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Something went wrong</h2>
              <p className="text-xs text-gray-500 mt-1">
                An unexpected interface error occurred. Please try reloading the page.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
            <p className="text-[11px] text-gray-400">Secure with Janta Live Setu</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
