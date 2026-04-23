'use client';

// React error boundary with user-friendly fallback.
// Catches render errors in child components.
//
// Usage:
//   <ErrorBoundary>
//     <MyComponent />
//   </ErrorBoundary>
//
//   <ErrorBoundary fallback={<p>Custom error UI</p>}>
//     <MyComponent />
//   </ErrorBoundary>

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Custom fallback UI. If not provided, uses a default error card. */
  fallback?: React.ReactNode;
  /** Called when an error is caught. Useful for logging. */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] items-center justify-center p-6">
          <div className="text-center space-y-4">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Something went wrong</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {this.state.error?.message || 'An unexpected error occurred.'}
              </p>
            </div>
            <Button variant="outline" onClick={this.handleReset}>
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
