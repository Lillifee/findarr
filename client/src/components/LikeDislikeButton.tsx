import { useState } from 'react';
import type { Media, TVDetails } from '../../../shared/dist/types';
import { interactionService, searchService } from '../services/api';
import SeasonSelectorModal from './SeasonSelectorModal';

interface LikeDislikeButtonProps {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  initialAction?: 'liked' | 'disliked' | null;
  onUpdate?: (updatedMedia: Media) => void;
  compact?: boolean;
  existingMedia?: Media; // Pass full media if available for optimization
}

export function LikeDislikeButton({
  tmdbId,
  mediaType,
  initialAction = null,
  onUpdate,
  compact = false,
  existingMedia,
}: LikeDislikeButtonProps) {
  const [currentAction, setCurrentAction] = useState<'liked' | 'disliked' | null>(initialAction);
  const [isLoading, setIsLoading] = useState(false);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [tvDetails, setTvDetails] = useState<TVDetails | null>(null);
  const [pendingAction, setPendingAction] = useState<'liked' | 'disliked' | null>(null);

  const performAction = async (action: 'liked' | 'disliked', selectedSeasons?: number[]) => {
    setIsLoading(true);
    try {
      const updatedMedia = await interactionService.toggleInteraction(
        tmdbId,
        mediaType,
        action,
        selectedSeasons
      );

      // Determine new action based on context:
      // - Empty season array: unliking (remove interaction)
      // - Season update with selections: always set to the action (not a toggle)
      // - Simple click: toggle if clicking same action again
      const isSeasonUpdate = selectedSeasons !== undefined;
      const isEmptySeasonArray = isSeasonUpdate && selectedSeasons.length === 0;
      const newAction = isEmptySeasonArray
        ? null
        : isSeasonUpdate
          ? action
          : currentAction === action
            ? null
            : action;
      setCurrentAction(newAction);

      // Update parent with enriched media (has state.record.status, state.votes, etc.)
      if (updatedMedia) {
        onUpdate?.(updatedMedia);
      }
    } catch (error) {
      console.error('Failed to update interaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: 'liked' | 'disliked') => {
    // For TV shows and Like action, show season selector modal
    if (mediaType === 'tv' && action === 'liked') {
      setIsLoading(true);
      setPendingAction(action);

      try {
        // Fetch TV details to get seasons
        const details = await searchService.detailsMedia({
          id: tmdbId,
          type: 'tv',
        });

        if (details.type === 'tv') {
          setTvDetails(details);
          setIsSeasonModalOpen(true);
        }
      } catch (error) {
        console.error('Failed to fetch TV details:', error);
        // Fall back to requesting without season selection
        await performAction(action);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // For movies or dislike action, proceed immediately
    await performAction(action);
  };

  const handleSeasonConfirm = async (selectedSeasons: number[]) => {
    setIsSeasonModalOpen(false);
    if (pendingAction) {
      await performAction(pendingAction, selectedSeasons);
    }
    setPendingAction(null);
    setTvDetails(null);
  };

  const handleSeasonCancel = () => {
    setIsSeasonModalOpen(false);
    setPendingAction(null);
    setTvDetails(null);
  };

  const buttonClass = compact
    ? 'p-1.5 rounded-full transition-all duration-200'
    : 'min-w-[8.5rem] justify-center px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 sm:min-w-[9.5rem]';

  const iconClass = compact ? 'w-5 h-5' : 'w-5 h-5';

  // Get already requested seasons from existing media (from database state)
  // Only include seasons with actual status (not 'none')
  const alreadyRequestedSeasons =
    existingMedia?.type === 'tv' && existingMedia.state?.record?.seasons
      ? existingMedia.state.record.seasons.filter(s => s.status !== 'none').map(s => s.seasonNumber)
      : [];

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Like Button */}
        <button
          onClick={e => {
            e.stopPropagation();
            void handleAction('liked');
          }}
          disabled={isLoading}
          className={`${buttonClass} ${
            currentAction === 'liked'
              ? 'border border-emerald-500 bg-emerald-900/40 text-emerald-100'
              : 'border border-gray-700/50 bg-gray-800/70 text-gray-300 hover:border-emerald-500/60 hover:bg-gray-700/80 hover:text-emerald-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
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
            void handleAction('disliked');
          }}
          disabled={isLoading}
          className={`${buttonClass} ${
            currentAction === 'disliked'
              ? 'border border-red-500 bg-red-900/40 text-red-100'
              : 'border border-gray-700/50 bg-gray-800/70 text-gray-300 hover:border-red-500/60 hover:bg-gray-700/80 hover:text-red-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Dislike"
        >
          <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" />
          </svg>
          {!compact && <span>Dislike</span>}
        </button>
      </div>

      {/* Season Selector Modal for TV shows */}
      {tvDetails && (
        <SeasonSelectorModal
          isOpen={isSeasonModalOpen}
          onClose={handleSeasonCancel}
          onConfirm={handleSeasonConfirm}
          seasons={tvDetails.seasons}
          alreadyRequestedSeasons={alreadyRequestedSeasons}
          showName={tvDetails.name}
        />
      )}
    </>
  );
}
