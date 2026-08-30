import type { Keyword } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

interface KeywordSearchResultsProps {
  keywords: Keyword[];
  onSelectKeyword: (keyword: Keyword) => void;
}

export function KeywordSearchResults({ keywords, onSelectKeyword }: KeywordSearchResultsProps) {
  const { t } = useTranslation();

  if (keywords.length === 0) {
    return null;
  }

  return (
    <section aria-label={t('catalog.keywordResults')}>
      <h2 className="mb-4 text-2xl font-semibold text-white drop-shadow-md">
        {t('catalog.keywordResults')}
      </h2>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword) => (
          <button
            key={keyword.id}
            type="button"
            onClick={() => {
              onSelectKeyword(keyword);
            }}
            className="rounded-full border border-zinc-800/80 bg-zinc-950/72 px-3 py-1 text-sm text-zinc-200 backdrop-blur-sm transition-colors hover:border-amber-500/60 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            {keyword.name}
          </button>
        ))}
      </div>
    </section>
  );
}
