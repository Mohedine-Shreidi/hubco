import { Component } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary
 * Catches render-time errors in child components and shows a fallback UI
 * instead of a white screen.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
              <AlertCircle size={32} className="text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Something went wrong</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              An unexpected error occurred. You can try refreshing the page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-xs text-red-600 dark:text-red-400 mb-6 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
