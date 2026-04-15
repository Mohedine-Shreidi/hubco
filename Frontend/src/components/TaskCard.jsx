import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, User } from 'lucide-react';
import { formatDate, getDaysRemaining, getStatusColor } from '../utils/helpers';

/**
 * TaskCard Component
 * Displays task information in a card format
 */
const TaskCard = ({ task }) => {
  const navigate = useNavigate();
  const daysRemaining = getDaysRemaining(task.due_date);

  const handleCardClick = () => {
    navigate(`/tasks/${task.id}`);
  };

  const getDeadlineColor = () => {
    if (task.status === 'accepted' || task.status === 'submitted') return 'text-green-600';
    if (daysRemaining < 0) return 'text-red-600';
    if (daysRemaining <= 3) return 'text-orange-600';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getDeadlineText = () => {
    if (task.status === 'accepted' || task.status === 'submitted') {
      if (daysRemaining < 0) return `Accepted in ${Math.abs(daysRemaining)} days`;
      return 'Submitted';
    }
    if (daysRemaining < 0) return `${Math.abs(daysRemaining)} days overdue`;
    if (daysRemaining === 0) return 'Due today';
    if (daysRemaining === 1) return 'Due tomorrow';
    return `${daysRemaining} days left`;
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-soft hover:shadow-soft-lg transition-shadow p-6 cursor-pointer border border-gray-100 dark:border-gray-700"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex-1 pr-4">
          {task.title}
        </h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
            task.status
          )}`}
        >
          {task.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
        {task.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          {/* Deadline */}
          <div className="flex items-center space-x-1">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">{formatDate(task.due_date)}</span>
          </div>

          {/* Days remaining */}
          <div className="flex items-center space-x-1">
            <Clock size={16} className="text-gray-400" />
            <span className={getDeadlineColor()}>{getDeadlineText()}</span>
          </div>
        </div>

        {/* Assignment type */}
        <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
          {task.team_id != null ? (
            <>
              <Users size={16} />
              <span className="text-xs">{task.team_name || 'Team'}</span>
            </>
          ) : (
            <>
              <User size={16} />
              <span className="text-xs">{task.assignee_name || 'Individual'}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
