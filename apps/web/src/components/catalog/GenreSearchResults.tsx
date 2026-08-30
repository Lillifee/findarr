import type { Genre } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

interface GenreSearchResultsProps {
  genres: Genre[];
  onSelectGenre: (genre: Genre) => void;
}

export function GenreSearchResults({ genres, onSelectGenre }: GenreSearchResultsProps) {
  const { t } = useTranslation();

  if (genres.length === 0) {
    return null;
  }

  return (
    <section aria-label={t('catalog.genreResults')}>
      <h2 className="mb-4 text-2xl font-semibold text-white drop-shadow-md">
        {t('catalog.genreResults')}
      </h2>
      <div className="flex flex-wrap gap-2">
        {genres.map((genre) => (
          <button
            key={genre.id}
            type="button"
            onClick={() => {
              onSelectGenre(genre);
            }}
            className="rounded-full border border-zinc-800/80 bg-zinc-950/72 px-3 py-1 text-sm text-zinc-200 backdrop-blur-sm transition-colors hover:border-amber-500/60 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            {genre.name}
          </button>
        ))}
      </div>
    </section>
  );
}
