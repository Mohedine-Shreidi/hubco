import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

/**
 * NotFound Page
 * 404 error page
 */
const NotFound = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* 404 Illustration */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary-600 mb-4">404</h1>
          <div className="text-6xl mb-4">🔍</div>
        </div>

        {/* Error message */}
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Oops! The page you're looking for doesn't exist. It might have been moved
          or deleted.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleGoBack}
            className="flex items-center justify-center space-x-2 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Go Back</span>
          </button>
          <button
            onClick={handleGoHome}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Home size={20} />
            <span>Go to Dashboard</span>
          </button>
        </div>

        {/* Additional links */}
        <div className="mt-12 text-sm text-gray-500 dark:text-gray-400">
          <p>Need help? Contact support or check our documentation.</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
