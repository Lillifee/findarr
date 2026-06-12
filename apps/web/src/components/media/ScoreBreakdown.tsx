import type { MediaScore } from '@findarr/shared/media';

import { Icon, type IconName } from '../ui/Icon';

interface ScoreBreakdownProps {
  score: MediaScore;
}

// Helper to format percentage
const toPercent = (value: number) => Math.round(value * 100);

// Helper to get color based on score value
const getColor = (value: number): string => {
  if (value >= 0.7) {
    return 'bg-green-500';
  }
  if (value >= 0.4) {
    return 'bg-yellow-500';
  }
  return 'bg-red-500';
};

export function ScoreBreakdown({ score }: ScoreBreakdownProps) {
  const scores: { label: string; value: number; icon: IconName }[] = [
    { label: 'Popularity', value: score.popularityScore, icon: 'star' },
    { label: 'Rating', value: score.weightedRating, icon: 'thumb_up' },
    { label: 'Genre Match', value: score.genreScore, icon: 'theater_comedy' },
    { label: 'Keyword Match', value: score.keywordScore, icon: 'sell' },
  ];

  return (
    <div className="mb-6 md:mb-8">
      <h3 className="m-0 mb-4 flex items-center gap-2 text-base font-semibold text-white md:text-lg">
        <Icon name="bar_chart" />
        Score Breakdown
      </h3>

      {/* Overall score display */}
      <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/35 p-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white">Overall Score</span>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold text-amber-400">{toPercent(score.finalScore)}%</div>
            <div className="relative h-16 w-16">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                {/* Background circle */}
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-zinc-700"
                />
                {/* Progress circle */}
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${score.finalScore * 100} 100`}
                  className="text-amber-400"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Individual scores */}
      <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/35 p-4">
        {scores.map(({ label, value, icon }) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-zinc-300">
                <Icon name={icon} size="sm" />
                {label}
              </span>
              <span className="font-medium text-white">{toPercent(value)}%</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`absolute top-0 left-0 h-full ${getColor(value)} rounded-full transition-all duration-300`}
                style={{ width: `${toPercent(value)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Base vs User score comparison (if user scores present) */}
      {score.userScore > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 text-center text-sm">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/35 p-3">
            <div className="mb-1 text-zinc-300">Base Score</div>
            <div className="text-xl font-bold text-zinc-100">{toPercent(score.baseScore)}%</div>
          </div>
          <div className="rounded-lg border border-amber-400/35 bg-amber-400/10 p-3">
            <div className="mb-1 text-amber-100/80">User Match</div>
            <div className="text-xl font-bold text-amber-300">{toPercent(score.userScore)}%</div>
          </div>
        </div>
      )}
    </div>
  );
}
