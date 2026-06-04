import { isDefined, type Media } from '@findarr/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AvailableMediaStrip } from '../components/AvailableMediaStrip';
import { SearchBar } from '../components/SearchBar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { searchService } from '../services/api';
import { asVoid } from '../utils/asyncHandlers';
import { buildCatalogSearchParams } from '../utils/catalogSearchParams';

function getHeroCopy(nextMedia: Media | null, heroError: string | null) {
  if (nextMedia) {
    return {
      eyebrow: 'Continue voting',
      title: nextMedia.name,
      description: isDefined(nextMedia.overview)
        ? nextMedia.overview
        : 'Your next voting pick is ready. Jump back into the stack and keep shaping what lands in your library.',
      posterLabel: 'Ready to vote',
      primaryAction: {
        label: 'Continue Voting',
        onClick: '/vote',
      },
      secondaryAction: {
        label: 'Explore Catalog',
        onClick: '/explore',
      },
    };
  }

  if (isDefined(heroError)) {
    return {
      eyebrow: 'Voting unavailable',
      title: 'Explore while voting catches up.',
      description: heroError,
      posterLabel: 'Explore catalog',
      primaryAction: {
        label: 'Explore Catalog',
        onClick: '/explore',
      },
      secondaryAction: {
        label: 'Try Voting Again',
        onClick: '/vote',
      },
    };
  }

  return {
    eyebrow: 'Voting complete',
    title: 'No more picks in the voting queue.',
    description:
      'You have already voted through the current stack. Browse the catalog to find something to watch while new voting candidates build up.',
    posterLabel: 'Queue complete',
    primaryAction: {
      label: 'Explore Catalog',
      onClick: '/explore',
    },
    secondaryAction: {
      label: 'Open Activity',
      onClick: '/activity',
    },
  };
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [nextMedia, setNextMedia] = useState<Media | null>(null);
  const [availableResults, setAvailableResults] = useState<Media[]>([]);
  const [availableHasMore, setAvailableHasMore] = useState(false);
  const [loadingHero, setLoadingHero] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [heroError, setHeroError] = useState<string | null>(null);
  const [availableError, setAvailableError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadDashboard = useCallback(async () => {
    const requestId = (requestIdRef.current += 1);

    setLoadingHero(true);
    setLoadingAvailable(true);
    setHeroError(null);
    setAvailableError(null);

    const [nextResult, availableResult] = await Promise.allSettled([
      searchService.getNextUnvotedMedia({ type: 'both', interaction: 'unvoted' }),
      searchService.getAvailableMedia({ page: 1, type: 'both' }),
    ]);

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (nextResult.status === 'fulfilled') {
      setNextMedia(nextResult.value.media);
      setHeroError(null);
    } else {
      console.error('Failed to load next voting candidate:', nextResult.reason);
      setNextMedia(null);
      setHeroError('Could not load your next voting pick right now.');
    }
    setLoadingHero(false);

    if (availableResult.status === 'fulfilled') {
      setAvailableResults(availableResult.value.results);
      setAvailableHasMore(availableResult.value.page < availableResult.value.totalPages);

      setAvailableError(null);
    } else {
      console.error('Failed to load newly available media:', availableResult.reason);
      setAvailableResults([]);
      setAvailableHasMore(false);
      setAvailableError('Newly available titles are unavailable right now.');
    }
    setLoadingAvailable(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleSelectItem = (item: Media) => {
    void navigate(`/${item.type}/${item.tmdbId}`);
  };

  const heroBackground = isDefined(nextMedia?.backdropPath)
    ? `linear-gradient(135deg, rgba(10, 10, 12, 0.92), rgba(17, 24, 39, 0.72)), url(https://image.tmdb.org/t/p/w1280${nextMedia.backdropPath})`
    : 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(17, 24, 39, 0.92), rgba(6, 78, 59, 0.36))';
  const heroCopy = getHeroCopy(nextMedia, heroError);

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-gray-700/50 bg-gray-800/90 shadow-2xl backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-8">
          <SearchBar
            onSearch={(query) =>
              void navigate(`/explore?${buildCatalogSearchParams({ q: query }).toString()}`)
            }
            loading={false}
          />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 pb-20 md:px-8 md:py-8 md:pb-20">
        <div className="space-y-8 md:space-y-10">
          <PageHeader
            title={`Welcome back${isDefined(user?.displayName) ? `, ${user.displayName}` : ''}`}
            description="Check out what's popular, vote on requests, and discover what's rising."
          />

          <Card
            variant="solid"
            padding="lg"
            className="relative overflow-hidden border-amber-400/20 bg-cover bg-center"
            style={{ backgroundImage: heroBackground }}
          >
            <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold tracking-[0.24em] text-amber-200/80 uppercase">
                  {heroCopy.eyebrow}
                </p>

                {loadingHero ? (
                  <div className="mt-4 space-y-3">
                    <div className="h-10 max-w-md animate-pulse rounded-lg bg-white/10" />
                    <div className="h-4 max-w-2xl animate-pulse rounded bg-white/10" />
                    <div className="h-4 max-w-xl animate-pulse rounded bg-white/10" />
                  </div>
                ) : (
                  <>
                    <h2 className="mt-4 text-3xl font-semibold text-white md:text-5xl">
                      {heroCopy.title}
                    </h2>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-200 md:text-base">
                      {heroCopy.description}
                    </p>
                  </>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={asVoid(async () => navigate(heroCopy.primaryAction.onClick))}>
                    {heroCopy.primaryAction.label}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={asVoid(async () => navigate(heroCopy.secondaryAction.onClick))}
                  >
                    {heroCopy.secondaryAction.label}
                  </Button>
                </div>
              </div>

              <div className="hidden lg:flex lg:justify-end">
                <div className="w-52 overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-2xl backdrop-blur-sm">
                  {isDefined(nextMedia?.posterPath) ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${nextMedia.posterPath}`}
                      alt={nextMedia.name}
                      className="aspect-2/3 w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-2/3 items-center justify-center bg-white/5 text-sm font-medium text-gray-300">
                      {heroCopy.posterLabel}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white md:text-2xl">Newly available</h2>
              </div>
            </div>

            {isDefined(availableError) && !loadingAvailable && (
              <Card className="mb-4 border border-red-500/30 text-sm text-red-200">
                {availableError}
              </Card>
            )}

            <AvailableMediaStrip
              hasMore={availableHasMore}
              loading={loadingAvailable}
              onSelectItem={handleSelectItem}
              results={availableResults}
            />
          </section>
        </div>
      </div>
    </>
  );
}
