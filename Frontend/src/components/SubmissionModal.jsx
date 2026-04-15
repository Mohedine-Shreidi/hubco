import { useState } from 'react';
import { X, Upload, Link as LinkIcon, FileText } from 'lucide-react';
import { taskAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

/**
 * SubmissionModal Component
 * Modal for submitting tasks with file upload and GitHub link
 */
const SubmissionModal = ({ task, isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    githubLink: '',
    comment: '',
    file: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFormData((prev) => ({
        ...prev,
        file
      }));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.githubLink.trim()) {
      setError('GitHub link is required');
      return;
    }

    // Validate GitHub URL
    if (!formData.githubLink.includes('github.com')) {
      setError('Please enter a valid GitHub URL');
      return;
    }

    try {
      setSubmitting(true);

      // Submit via the dedicated task submit endpoint
      await taskAPI.submitTask(task.id, {
        githubLink: formData.githubLink,
        comment: formData.comment,
      });

      // Success
      if (onSuccess) {
        onSuccess();
      }

      // Reset form
      setFormData({
        githubLink: '',
        comment: '',
        file: null
      });

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-soft-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Submit Task</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            disabled={submitting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Task info */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-1">{task.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{task.description}</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* GitHub link */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              GitHub Repository Link *
            </label>
            <div className="relative">
              <LinkIcon
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="url"
                name="githubLink"
                value={formData.githubLink}
                onChange={handleChange}
                placeholder="https://github.com/username/repo"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={submitting}
              />
            </div>
          </div>

          {/* File upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload File (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
              <input
                type="file"
                id="file-upload"
                onChange={handleFileChange}
                className="hidden"
                disabled={submitting}
                accept=".zip,.pdf,.doc,.docx"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload size={32} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formData.file ? (
                    <span className="flex items-center text-primary-600">
                      <FileText size={16} className="mr-1" />
                      {formData.file.name}
                    </span>
                  ) : (
                    'Click to upload or drag and drop'
                  )}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ZIP, PDF, DOC, DOCX (Max 10MB)
                </span>
              </label>
            </div>
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Comment (Optional)
            </label>
            <textarea
              name="comment"
              value={formData.comment}
              onChange={handleChange}
              rows={4}
              placeholder="Add any notes or comments about your submission..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              disabled={submitting}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmissionModal;
