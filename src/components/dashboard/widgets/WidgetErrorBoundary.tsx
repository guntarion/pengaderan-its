/**
 * src/components/dashboard/widgets/WidgetErrorBoundary.tsx
 * Per-widget error boundary — catches render errors and shows fallback.
 * Prevents one widget failure from crashing the entire dashboard.
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { createLogger } from '@/lib/logger';

const log = createLogger('m13/widget-error-boundary');

interface Props {
  children: ReactNode;
  widgetName?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    log.error('Widget render error caught by boundary', {
      widgetName: this.props.widgetName ?? 'unknown',
      error,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="rounded-2xl border border-red-100 dark:border-red-900 bg-white dark:bg-slate-800 p-5">
          <EmptyState
            variant="error"
            title={`Widget tidak dapat dimuat${this.props.widgetName ? ` (${this.props.widgetName})` : ''}`}
            description="Coba refresh halaman. Hubungi admin jika masalah berlanjut."
          />
        </div>
      );
    }

    return this.props.children;
  }
}
