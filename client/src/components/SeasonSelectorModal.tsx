import type { Season } from '@findarr/shared';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

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

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal - More compact for grid view */}
      <div className="relative bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-700">
        {/* Header - More compact */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-lg font-bold text-white">Select Seasons</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{showName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors shrink-0"
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
          </button>
        </div>

        {/* Content - More compact */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400">
              {alreadyRequestedSeasons.length > 0
                ? `${alreadyRequestedSeasons.length} requested`
                : 'Choose seasons'}
            </p>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Select All
            </button>
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
                      {status === 'available' && (
                        <span className="text-xs bg-purple-600/30 text-purple-300 px-1.5 py-0.5 rounded border border-purple-600/50 shrink-0">
                          Available
                        </span>
                      )}
                      {status === 'downloaded' && (
                        <span className="text-xs bg-emerald-600/30 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-600/50 shrink-0">
                          Downloaded
                        </span>
                      )}
                      {status === 'monitored' && (
                        <span className="text-xs bg-blue-600/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-600/50 shrink-0">
                          Monitored
                        </span>
                      )}
                      {status === 'requested' && (
                        <span className="text-xs bg-green-600/30 text-green-300 px-1.5 py-0.5 rounded border border-green-600/50 shrink-0">
                          Requested
                        </span>
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
        <div className="p-4 border-t border-gray-700">
          {newlySelectedCount > 0 && (
            <p className="text-xs text-gray-300 mb-3">
              {newlySelectedCount} new season{newlySelectedCount === 1 ? '' : 's'} to request
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
            >
              {selectedSeasons.size === 0
                ? 'Remove All Seasons'
                : newlySelectedCount > 0 && alreadyRequestedSeasons.length > 0
                  ? 'Update Seasons'
                  : newlySelectedCount > 0
                    ? 'Request Seasons'
                    : 'Keep Selection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
