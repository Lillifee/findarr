import type { Media, MediaDetails, MediaType, TVDetails } from '@findarr/shared/media';
import { useState } from 'react';

import { interactionService, searchService } from '../../services/api';
import { asVoid } from '../../utils/asyncHandlers';
import { Icon } from '../ui/Icon';
import SeasonSelectorModal from './SeasonSelectorModal';

interface LikeDislikeButtonProps {
  tmdbId: number;
  mediaType: MediaType;
  initialAction?: 'liked' | 'disliked' | null;
  onUpdate?: (updatedMedia: MediaDetails) => void;
  compact?: boolean;
  existingMedia?: Media;
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
        selectedSeasons,
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
      onUpdate?.(updatedMedia);
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
        const details = await searchService.getMediaDetails({
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
    ? 'inline-flex items-center justify-center rounded-full p-1.5 transition-all duration-200'
    : 'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 sm:flex-none sm:min-w-[10.5rem] sm:px-5';

  // Get already requested seasons from existing media (from database state)
  // Only include seasons with actual status (not 'none')
  const alreadyRequestedSeasons =
    existingMedia?.type === 'tv' && existingMedia.state?.record?.seasons
      ? existingMedia.state.record.seasons
          .filter((s) => s.status !== 'none')
          .map((s) => s.seasonNumber)
      : [];

  return (
    <>
      <div className={`flex items-center justify-center gap-2 ${compact ? '' : 'w-full max-w-xl'}`}>
        {/* Like Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            void handleAction('liked');
          }}
          disabled={isLoading}
          className={`${buttonClass} ${
            currentAction === 'liked'
              ? 'border border-emerald-400/70 bg-emerald-500/18 text-emerald-50 shadow-[0_0_0_1px_rgba(52,211,153,0.18),0_14px_34px_rgba(16,185,129,0.16)]'
              : 'border border-zinc-700 bg-zinc-900 text-zinc-200 shadow-[0_10px_28px_rgba(0,0,0,0.18)] hover:border-emerald-500/70 hover:bg-emerald-500/10 hover:text-emerald-100'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          title="Like"
        >
          <Icon filled name="thumb_up" weight={500} />
          {!compact && <span>Like</span>}
        </button>

        {/* Dislike Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            void handleAction('disliked');
          }}
          disabled={isLoading}
          className={`${buttonClass} ${
            currentAction === 'disliked'
              ? 'border border-red-400/70 bg-red-500/18 text-red-50 shadow-[0_0_0_1px_rgba(248,113,113,0.18),0_14px_34px_rgba(239,68,68,0.16)]'
              : 'border border-zinc-700 bg-zinc-900 text-zinc-200 shadow-[0_10px_28px_rgba(0,0,0,0.18)] hover:border-red-500/70 hover:bg-red-500/10 hover:text-red-100'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          title="Dislike"
        >
          <Icon filled name="thumb_down" weight={500} />
          {!compact && <span>Dislike</span>}
        </button>
      </div>

      {/* Season Selector Modal for TV shows */}
      {tvDetails && (
        <SeasonSelectorModal
          isOpen={isSeasonModalOpen}
          onClose={handleSeasonCancel}
          onConfirm={asVoid(handleSeasonConfirm)}
          seasons={tvDetails.seasons}
          alreadyRequestedSeasons={alreadyRequestedSeasons}
          showName={tvDetails.name}
        />
      )}
    </>
  );
}
