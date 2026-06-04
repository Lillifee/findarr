import type { MediaScore } from '@findarr/shared/media';

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
  const scores = [
    { label: 'Popularity', value: score.popularityScore, icon: '⭐' },
    { label: 'Rating', value: score.weightedRating, icon: '👍' },
    { label: 'Genre Match', value: score.genreScore, icon: '🎭' },
    { label: 'Keyword Match', value: score.keywordScore, icon: '🔖' },
  ];

  return (
    <div className="mb-6 md:mb-8">
      <h3 className="m-0 mb-4 flex items-center gap-2 text-base font-semibold text-white md:text-lg">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        Score Breakdown
      </h3>

      {/* Overall score display */}
      <div className="mb-4 rounded-lg border border-gray-700/50 bg-gray-800/70 p-4">
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
                  className="text-gray-700"
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
      <div className="space-y-3 rounded-lg border border-gray-700/50 bg-gray-800/60 p-4">
        {scores.map(({ label, value, icon }) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-300">
                <span className="text-base">{icon}</span>
                {label}
              </span>
              <span className="font-medium text-white">{toPercent(value)}%</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-700">
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
          <div className="rounded-lg border border-gray-700/50 bg-gray-800/60 p-3">
            <div className="mb-1 text-blue-200">Base Score</div>
            <div className="text-xl font-bold text-blue-400">{toPercent(score.baseScore)}%</div>
          </div>
          <div className="rounded-lg border border-gray-700/50 bg-gray-800/60 p-3">
            <div className="mb-1 text-purple-200">User Match</div>
            <div className="text-xl font-bold text-purple-400">{toPercent(score.userScore)}%</div>
          </div>
        </div>
      )}
    </div>
  );
}
