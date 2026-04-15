import { getAvatarColor, getInitials } from '../utils/helpers';

/**
 * Avatar - Reusable avatar component with image support and fallback.
 * Shows user image if available, otherwise renders initials with a colored background.
 *
 * @param {string}  name       - User's display name (used for initials & color)
 * @param {string}  [imageUrl] - Optional image URL from backend
 * @param {number}  [size=40]  - Pixel size (width & height)
 * @param {string}  [className] - Additional CSS classes
 * @param {string}  [role]     - User role for optional role ring color
 */
const Avatar = ({ name = '', imageUrl, size = 40, className = '', role }) => {
    const initials = getInitials(name);
    const bgColor = getAvatarColor(name);

    const sizeClasses = {
        24: 'w-6 h-6 text-[10px]',
        28: 'w-7 h-7 text-xs',
        32: 'w-8 h-8 text-xs',
        36: 'w-9 h-9 text-sm',
        40: 'w-10 h-10 text-sm',
        48: 'w-12 h-12 text-base',
        56: 'w-14 h-14 text-lg',
        64: 'w-16 h-16 text-xl',
        80: 'w-20 h-20 text-2xl',
        96: 'w-24 h-24 text-3xl',
    };

    const sizeClass = sizeClasses[size] || `text-sm`;
    const inlineSize = sizeClasses[size] ? undefined : { width: size, height: size };

    const roleRing = {
        admin: 'ring-red-400',
        instructor: 'ring-purple-400',
        student: 'ring-green-400',
        team_leader: 'ring-blue-400',
    };

    const ringClass = role && roleRing[role] ? `ring-2 ${roleRing[role]}` : '';

    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={name}
                className={`rounded-full object-cover flex-shrink-0 ${sizeClass} ${ringClass} ${className}`}
                style={inlineSize}
                onError={(e) => {
                    // On error, swap to fallback initials
                    e.target.style.display = 'none';
                    e.target.nextSibling?.style && (e.target.nextSibling.style.display = 'flex');
                }}
            />
        );
    }

    return (
        <div
            className={`rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 ${sizeClass} ${ringClass} ${className}`}
            style={{ backgroundColor: bgColor, ...inlineSize }}
            aria-label={name}
        >
            {initials}
        </div>
    );
};

export default Avatar;
