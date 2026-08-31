import type { MediaScore, MediaScoreSignal } from '@findarr/shared/media';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMediaNavigation } from '../../hooks/useMediaNavigation';
import { Icon, type IconName } from '../ui/Icon';

interface ScoreProps {
  score: MediaScore;
}

const signalIcons: Record<MediaScoreSignal['kind'], IconName> = {
  genre: 'theater_comedy',
  keyword: 'sell',
  cast: 'person',
};

const getVerdict = (score: number) => {
  if (score >= 0.6) {
    return { key: 'good', color: 'text-emerald-300', ringColor: '#34d399' };
  }
  if (score >= 0.4) {
    return { key: 'mixed', color: 'text-amber-300', ringColor: '#fbbf24' };
  }
  return { key: 'unlikely', color: 'text-rose-300', ringColor: '#fb7185' };
};

export function Score({ score }: ScoreProps) {
  const { t } = useTranslation();
  const { goToDiscovery } = useMediaNavigation();
  const [expanded, setExpanded] = useState(false);

  const { explanation } = score;
  const hasEvidence =
    explanation.positiveSignals.length > 0 ||
    explanation.mixedSignals.length > 0 ||
    explanation.negativeSignals.length > 0;
  const verdict = getVerdict(score.userScore);
  const matchScore = Math.max(1, Math.round(score.userScore * 10));
  const [strongestPositive] = explanation.positiveSignals;
  const [strongestMixed] = explanation.mixedSignals;
  const [strongestNegative] = explanation.negativeSignals;
  const summary =
    strongestPositive && strongestNegative
      ? t('scoreBreakdown.summary.mixed', {
          positive: strongestPositive.name,
          negative: strongestNegative.name,
        })
      : strongestPositive
        ? t('scoreBreakdown.summary.positive', { name: strongestPositive.name })
        : strongestNegative
          ? t('scoreBreakdown.summary.negative', { name: strongestNegative.name })
          : strongestMixed
            ? t('scoreBreakdown.summary.balanced', { name: strongestMixed.name })
            : t('scoreBreakdown.summary.generic');

  const goToSignal = (signal: MediaScoreSignal) => {
    const subjectId = Number(signal.subjectKey);
    if (!Number.isSafeInteger(subjectId) || subjectId <= 0) {
      return;
    }

    const type = signal.kind === 'cast' ? 'person' : signal.kind;
    goToDiscovery(type, subjectId, signal.name);
  };

  const renderSignals = (
    signals: MediaScoreSignal[],
    preferenceType: MediaScoreSignal['preferenceType'],
  ) => (
    <div className="flex flex-wrap gap-2">
      {signals.map((signal) => {
        const tone =
          preferenceType === 'positive'
            ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
            : preferenceType === 'negative'
              ? 'border-rose-400/25 bg-rose-400/10 text-rose-100'
              : 'border-amber-400/25 bg-amber-400/10 text-amber-100';

        const evidenceKey =
          preferenceType === 'positive'
            ? 'positiveEvidence'
            : preferenceType === 'negative'
              ? 'negativeEvidence'
              : 'mixedEvidence';

        return (
          <button
            key={`${signal.kind}-${signal.subjectKey}`}
            type="button"
            onClick={() => {
              goToSignal(signal);
            }}
            className={`inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-full border px-2.5 py-1.5 text-xs transition-colors hover:border-amber-400/60 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${tone}`}
          >
            <Icon name={signalIcons[signal.kind]} size="xs" />
            <span className="font-medium">{signal.name}</span>
            <span className="text-current/70">
              {t(`scoreBreakdown.${evidenceKey}`, {
                positive: signal.positiveCount,
                negative: signal.negativeCount,
                total: signal.positiveCount + signal.negativeCount,
              })}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <section className="mb-8 overflow-hidden rounded-lg border border-zinc-700/80 bg-zinc-950/78 shadow-[0_18px_50px_rgba(0,0,0,0.2)] backdrop-blur-sm">
      <div className="flex gap-4 p-4 sm:p-5">
        {hasEvidence ? (
          <div
            role="progressbar"
            aria-label={t('scoreBreakdown.title')}
            aria-valuemin={1}
            aria-valuemax={10}
            aria-valuenow={matchScore}
            className="mt-0.5 h-12 w-12 shrink-0 rounded-full p-0.75"
            style={{
              background: `conic-gradient(${verdict.ringColor} ${score.userScore * 360}deg, #3f3f46 0deg)`,
            }}
          >
            <div
              className={`flex h-full w-full items-center justify-center rounded-full bg-zinc-950 text-xl font-bold ${verdict.color}`}
            >
              {matchScore}
            </div>
          </div>
        ) : (
          <div className="relative mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-100">
            <Icon filled name="info" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-zinc-400 uppercase">
            {t('scoreBreakdown.title')}
          </p>
          {hasEvidence ? (
            <>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className={`text-xl font-semibold ${verdict.color}`}>
                  {t(`scoreBreakdown.verdict.${verdict.key}`)}
                </h2>
              </div>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-200">{summary}</p>
            </>
          ) : (
            <>
              <h2 className="mt-1 text-xl font-semibold text-white">
                {t('scoreBreakdown.noEvidenceTitle')}
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-300">
                {t('scoreBreakdown.noEvidenceBody')}
              </p>
            </>
          )}
        </div>
      </div>

      {hasEvidence && (
        <>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => {
              setExpanded((value) => !value);
            }}
            className="flex w-full items-center justify-between border-t border-zinc-800 px-4 py-3 text-left text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-900/80 hover:text-white sm:px-5"
          >
            <span>{t(expanded ? 'scoreBreakdown.hideReasons' : 'scoreBreakdown.showReasons')}</span>
            <Icon
              name="expand_more"
              size="sm"
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>

          {expanded && (
            <div className="space-y-5 border-t border-zinc-800 bg-zinc-900/35 px-4 py-4 sm:px-5">
              {explanation.positiveSignals.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-emerald-200">
                    {t('scoreBreakdown.positiveReasons')}
                  </h3>
                  {renderSignals(explanation.positiveSignals, 'positive')}
                </div>
              )}
              {explanation.mixedSignals.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-amber-200">
                    {t('scoreBreakdown.mixedReasons')}
                  </h3>
                  {renderSignals(explanation.mixedSignals, 'mixed')}
                </div>
              )}
              {explanation.negativeSignals.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-rose-200">
                    {t('scoreBreakdown.negativeReasons')}
                  </h3>
                  {renderSignals(explanation.negativeSignals, 'negative')}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
