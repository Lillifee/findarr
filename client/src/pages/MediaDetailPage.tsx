import type { MediaDetails } from '@findarr/shared';
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MediaView } from '../components/MediaView';
import { searchService, requestService } from '../services/api';

export function MediaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language] = useState<string>('de-DE');

  // Extract type from the path (/movie/:id or /tv/:id)
  const type = location.pathname.startsWith('/movie') ? 'movie' : 'tv';

  useEffect(() => {
    const loadDetails = async () => {
      if (!id) {
        setError('Invalid media ID');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const mediaDetails = await searchService.detailsMedia({
          id: Number.parseInt(id, 10),
          type,
          language,
        });
        setDetails(mediaDetails);
      } catch (error_) {
        console.error('Failed to fetch details:', error_);
        setError('Failed to load media details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [type, id, language]);

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8">
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-2 mb-4 md:mb-8 px-4 py-2.5 bg-gray-700 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-600 transition-all cursor-pointer text-sm md:text-base shadow-md hover:shadow-lg"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        <span>Back</span>
      </button>

      {loading && (
        <div className="text-center p-8 text-gray-400">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            <p>Loading details...</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="text-center p-8">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="w-16 h-16 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {details && !loading && (
        <MediaView
          media={details}
          onRequest={async () => {
            if (!details) return;

            try {
              await requestService.createRequest({
                mediaType: details.type,
                tmdbId: details.id,
                title: details.name || 'Unknown',
                posterPath: details.posterPath || null,
              });
              alert('Request submitted! Check "My Requests" to track its status.');
            } catch {
              alert('Failed to submit request. Please try again.');
            }
          }}
        />
      )}
    </div>
  );
}
