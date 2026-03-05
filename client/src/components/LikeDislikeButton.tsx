import { useState } from 'react';
import { interactionService } from '../services/api';

interface LikeDislikeButtonProps {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  initialAction?: 'liked' | 'disliked' | null;
  onToggle?: (action: 'liked' | 'disliked' | null) => void;
  compact?: boolean;
}

export function LikeDislikeButton({
  tmdbId,
  mediaType,
  initialAction = null,
  onToggle,
  compact = false,
}: LikeDislikeButtonProps) {
  const [currentAction, setCurrentAction] = useState<'liked' | 'disliked' | null>(initialAction);
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: 'liked' | 'disliked') => {
    setIsLoading(true);
    try {
      // Toggle: if clicking same action, it will be removed by the server
      await interactionService.toggleInteraction(tmdbId, mediaType, action);

      const newAction = currentAction === action ? null : action;
      setCurrentAction(newAction);
      onToggle?.(newAction);
    } catch (error) {
      console.error('Failed to update interaction:', error);
      // Revert on error
      setCurrentAction(currentAction);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonClass = compact
    ? 'p-1.5 rounded-full transition-all duration-200'
    : 'px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2';

  const iconClass = compact ? 'w-5 h-5' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-2">
      {/* Like Button */}
      <button
        onClick={e => {
          e.stopPropagation();
          handleAction('liked');
        }}
        disabled={isLoading}
        className={`${buttonClass} ${
          currentAction === 'liked'
            ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
            : 'bg-gray-700/50 text-gray-300 hover:bg-green-600/30 hover:text-green-400'
        } disabled:opacity-50`}
        title="Like"
      >
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
        </svg>
        {!compact && <span>Like</span>}
      </button>

      {/* Dislike Button */}
      <button
        onClick={e => {
          e.stopPropagation();
          handleAction('disliked');
        }}
        disabled={isLoading}
        className={`${buttonClass} ${
          currentAction === 'disliked'
            ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
            : 'bg-gray-700/50 text-gray-300 hover:bg-red-600/30 hover:text-red-400'
        } disabled:opacity-50`}
        title="Dislike"
      >
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" />
        </svg>
        {!compact && <span>Dislike</span>}
      </button>
    </div>
  );
}
