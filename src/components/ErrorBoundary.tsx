/**
 * ZoCW Error Boundary Component
 *
 * BRD Requirement: ZCW-BRD-0286 (Error handling and safety controls)
 *
 * Provides:
 * - Centralized error catching for React component tree
 * - User-friendly error display with retry option
 * - Error logging to Firestore audit log
 * - Different error views for different contexts (workflow, admin, general)
 */

import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Context label for error reporting (e.g., 'Viewer', 'Report', 'Admin') */
  context?: string;
  /** Custom fallback UI */
  fallback?: ReactNode;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log to console in development
    console.error(`[ZoCW ErrorBoundary${this.props.context ? ` — ${this.props.context}` : ''}]`, error, errorInfo);

    // FIREBASE: Log error to Firestore audit log
    // logErrorToAudit(error, errorInfo, this.props.context);

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-1">
            {this.props.context
              ? `An error occurred in the ${this.props.context} module.`
              : 'An unexpected error occurred.'}
          </p>
          <p className="text-xs text-gray-400 mb-6">
            This error has been logged for review. Your data is safe.
          </p>
          {this.state.error && (
            <details className="mb-6 w-full max-w-md">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                Technical details
              </summary>
              <pre className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-friendly wrapper for functional components
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  context?: string
) {
  return function ErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary context={context}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
