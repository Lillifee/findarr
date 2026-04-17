import type { MediaScore } from '@findarr/shared';

interface ScoreBreakdownProps {
  score: MediaScore;
}

export function ScoreBreakdown({ score }: ScoreBreakdownProps) {
  // Helper to format percentage
  const toPercent = (value: number) => Math.round(value * 100);

  console.log('Score breakdown:', score);
  // Helper to get color based on score value
  const getColor = (value: number): string => {
    if (value >= 0.7) return 'bg-green-500';
    if (value >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const scores = [
    { label: 'Popularity', value: score.popularityScore, icon: '⭐' },
    { label: 'Rating', value: score.weightedRating, icon: '👍' },
    { label: 'Genre Match', value: score.genreScore, icon: '🎭' },
    { label: 'Keyword Match', value: score.keywordScore, icon: '🔖' },
  ];

  return (
    <div className="mb-6 md:mb-8">
      <h3 className="m-0 mb-4 text-base md:text-lg font-semibold text-white flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="mb-4 p-4 bg-linear-to-r from-amber-600/20 to-amber-500/10 border border-amber-500/40 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-white font-semibold">Overall Score</span>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold text-amber-400">{toPercent(score.finalScore)}%</div>
            <div className="w-16 h-16 relative">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
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
      <div className="space-y-3 bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
        {scores.map(({ label, value, icon }) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300 flex items-center gap-2">
                <span className="text-base">{icon}</span>
                {label}
              </span>
              <span className="text-white font-medium">{toPercent(value)}%</span>
            </div>
            <div className="relative w-full h-2 bg-gray-700 rounded-full overflow-hidden">
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
          <div className="p-3 bg-blue-600/20 border border-blue-500/40 rounded-lg">
            <div className="text-blue-200 mb-1">Base Score</div>
            <div className="text-xl font-bold text-blue-400">{toPercent(score.baseScore)}%</div>
          </div>
          <div className="p-3 bg-purple-600/20 border border-purple-500/40 rounded-lg">
            <div className="text-purple-200 mb-1">User Match</div>
            <div className="text-xl font-bold text-purple-400">{toPercent(score.userScore)}%</div>
          </div>
        </div>
      )}
    </div>
  );
}
