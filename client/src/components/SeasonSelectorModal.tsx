import type { Season } from '@findarr/shared';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { StatusBadge, type StatusType } from './ui/StatusBadge';

interface SeasonSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedSeasons: number[]) => void;
  seasons: Season[];
  alreadyRequestedSeasons?: number[]; // Seasons already requested (grayed out)
  showName: string;
}

export default function SeasonSelectorModal({
  isOpen,
  onClose,
  onConfirm,
  seasons,
  alreadyRequestedSeasons = [],
  showName,
}: SeasonSelectorModalProps) {
  const [selectedSeasons, setSelectedSeasons] = useState<Set<number>>(new Set());

  // Initialize selection with already requested seasons when modal opens
  useEffect(() => {
    if (isOpen) {
      // Start with already requested seasons pre-selected
      setSelectedSeasons(new Set(alreadyRequestedSeasons));
    }
  }, [isOpen, alreadyRequestedSeasons]);

  if (!isOpen) return null;

  const handleToggleSeason = (seasonNumber: number) => {
    const newSelected = new Set(selectedSeasons);
    if (newSelected.has(seasonNumber)) {
      newSelected.delete(seasonNumber);
    } else {
      newSelected.add(seasonNumber);
    }
    setSelectedSeasons(newSelected);
  };

  const handleSelectAll = () => {
    // Select all non-special seasons (including already requested)
    const allSeasons = seasons.filter(s => s.seasonNumber > 0).map(s => s.seasonNumber);
    setSelectedSeasons(new Set(allSeasons));
  };

  const handleConfirm = () => {
    const seasonsToRequest = [...selectedSeasons].sort((a, b) => a - b);
    onConfirm(seasonsToRequest);
  };

  // Filter out specials (season 0)
  const regularSeasons = seasons.filter(s => s.seasonNumber > 0);
  const newlySelectedCount = [...selectedSeasons].filter(
    s => !alreadyRequestedSeasons.includes(s)
  ).length;

  const badgeStatusMap: Partial<Record<string, StatusType>> = {
    available: 'available',
    downloaded: 'downloaded',
    monitored: 'monitored',
    requested: 'requested',
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - More compact for grid view */}
      <Card
        variant="solid"
        padding="none"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden"
      >
        {/* Header - More compact */}
        <div className="flex items-center justify-between border-b border-gray-700/50 p-4">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-lg font-bold text-white">Select Seasons</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{showName}</p>
          </div>
          <Button
            onClick={onClose}
            variant="icon"
            size="sm"
            className="shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>

        {/* Content - More compact */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400">
              {alreadyRequestedSeasons.length > 0
                ? `${alreadyRequestedSeasons.length} requested`
                : 'Choose seasons'}
            </p>
            <Button
              onClick={handleSelectAll}
              type="button"
              variant="ghost"
              size="sm"
              className="px-0"
            >
              Select All
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {regularSeasons.map(season => {
              const isAlreadyRequested = alreadyRequestedSeasons.includes(season.seasonNumber);
              const isSelected = selectedSeasons.has(season.seasonNumber);
              const status = season.status || 'none';

              return (
                <label
                  key={season.seasonNumber}
                  className={`flex items-center p-3 border rounded-lg transition-all ${
                    isAlreadyRequested
                      ? 'bg-green-900/20 border-green-600/50 cursor-pointer'
                      : isSelected
                        ? 'bg-blue-900/30 border-blue-400 cursor-pointer'
                        : 'border-gray-600 hover:bg-gray-700/50 hover:border-gray-500 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSeason(season.seasonNumber)}
                    className={`mr-3 h-4 w-4 rounded focus:ring-blue-500 ${
                      isAlreadyRequested
                        ? 'text-green-600 cursor-pointer'
                        : 'text-blue-600 cursor-pointer'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium text-sm text-white truncate">{season.name}</div>
                      {/* Show status badge based on season.status field */}
                      {badgeStatusMap[status] && (
                        <StatusBadge status={badgeStatusMap[status]!} size="sm" />
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {season.episodeCount} ep{season.episodeCount === 1 ? '' : 's'}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer - More compact */}
        <div className="border-t border-gray-700/50 p-4">
          {newlySelectedCount > 0 && (
            <p className="text-xs text-gray-300 mb-3">
              {newlySelectedCount} new season{newlySelectedCount === 1 ? '' : 's'} to request
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <Button onClick={onClose} variant="secondary" size="sm">
              Cancel
            </Button>
            <Button onClick={handleConfirm} variant="primary" size="sm">
              {selectedSeasons.size === 0
                ? 'Remove All Seasons'
                : newlySelectedCount > 0 && alreadyRequestedSeasons.length > 0
                  ? 'Update Seasons'
                  : newlySelectedCount > 0
                    ? 'Request Seasons'
                    : 'Keep Selection'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  return createPortal(modalContent, document.body);
}
