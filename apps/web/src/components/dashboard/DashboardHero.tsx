import type { Media } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { useTranslation } from 'react-i18next';

import { asVoid } from '../../utils/asyncHandlers';
import { tmdbImage } from '../../utils/tmdb';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface HeroAction {
  label: string;
  to: string;
}

interface HeroCopy {
  eyebrow: string;
  title: string;
  description: string;
  posterLabel: string;
  primaryAction: HeroAction;
  secondaryAction: HeroAction;
}

function getHeroBackground(nextMedia: Media | undefined): string {
  return isDefined(nextMedia?.backdropPath)
    ? `linear-gradient(135deg, rgba(10, 10, 12, 0.92), rgba(17, 24, 39, 0.72)), url(${tmdbImage(nextMedia.backdropPath, 'w1280')})`
    : 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(17, 24, 39, 0.92), rgba(6, 78, 59, 0.36))';
}

interface DashboardHeroProps {
  nextMedia: Media | undefined;
  heroError: string | undefined;
  loading: boolean;
  onNavigate: (to: string) => void;
}

export function DashboardHero({ nextMedia, heroError, loading, onNavigate }: DashboardHeroProps) {
  const { t } = useTranslation();

  let copy: HeroCopy;
  if (nextMedia) {
    copy = {
      eyebrow: t('dashboard.hero.continueVoting.eyebrow'),
      title: nextMedia.name,
      description: isDefined(nextMedia.overview)
        ? nextMedia.overview
        : t('dashboard.hero.continueVoting.defaultDescription'),
      posterLabel: t('dashboard.hero.continueVoting.posterLabel'),
      primaryAction: { label: t('dashboard.hero.actions.continueVoting'), to: '/vote' },
      secondaryAction: {
        label: t('dashboard.hero.actions.exploreCatalog'),
        to: '/explore',
      },
    };
  } else if (isDefined(heroError)) {
    copy = {
      eyebrow: t('dashboard.hero.votingUnavailable.eyebrow'),
      title: t('dashboard.hero.votingUnavailable.title'),
      description: heroError,
      posterLabel: t('dashboard.hero.votingUnavailable.posterLabel'),
      primaryAction: { label: t('dashboard.hero.actions.exploreCatalog'), to: '/explore' },
      secondaryAction: {
        label: t('dashboard.hero.actions.tryVotingAgain'),
        to: '/vote',
      },
    };
  } else {
    copy = {
      eyebrow: t('dashboard.hero.votingComplete.eyebrow'),
      title: t('dashboard.hero.votingComplete.title'),
      description: t('dashboard.hero.votingComplete.description'),
      posterLabel: t('dashboard.hero.votingComplete.posterLabel'),
      primaryAction: { label: t('dashboard.hero.actions.exploreCatalog'), to: '/explore' },
      secondaryAction: {
        label: t('dashboard.hero.actions.openActivity'),
        to: '/activity',
      },
    };
  }

  return (
    <Card
      variant="solid"
      padding="lg"
      className="relative overflow-hidden border-amber-400/20 bg-cover bg-center"
      style={{ backgroundImage: getHeroBackground(nextMedia) }}
    >
      <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.24em] text-amber-200/80 uppercase">
            {copy.eyebrow}
          </p>

          {loading ? (
            <div className="mt-4 space-y-3">
              <div className="h-10 max-w-md animate-pulse rounded-lg bg-white/10" />
              <div className="h-4 max-w-2xl animate-pulse rounded bg-white/10" />
              <div className="h-4 max-w-xl animate-pulse rounded bg-white/10" />
            </div>
          ) : (
            <>
              <h2 className="mt-4 text-3xl font-semibold text-white md:text-5xl">{copy.title}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-200 md:text-base">
                {copy.description}
              </p>
            </>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={asVoid(async () => {
                onNavigate(copy.primaryAction.to);
              })}
            >
              {copy.primaryAction.label}
            </Button>
            <Button
              variant="secondary"
              onClick={asVoid(async () => {
                onNavigate(copy.secondaryAction.to);
              })}
            >
              {copy.secondaryAction.label}
            </Button>
          </div>
        </div>

        <div className="hidden lg:flex lg:justify-end">
          <div className="w-52 overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-2xl backdrop-blur-sm">
            {isDefined(nextMedia?.posterPath) ? (
              <img
                src={tmdbImage(nextMedia.posterPath, 'w500')}
                alt={nextMedia.name}
                className="aspect-2/3 w-full object-cover"
              />
            ) : (
              <div className="flex aspect-2/3 items-center justify-center bg-white/5 text-sm font-medium text-gray-300">
                {copy.posterLabel}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
