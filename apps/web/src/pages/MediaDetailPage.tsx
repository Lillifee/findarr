import type { MediaDetails } from '@findarr/shared';
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import { MediaView } from '../components/MediaView';
import { Button } from '../components/ui/Button';
import { searchService } from '../services/api';

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
    // Scroll to top when page loads
    window.scrollTo(0, 0);

    const loadDetails = async () => {
      if (!id) {
        setError('Invalid media ID');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const mediaDetails = await searchService.getMediaDetails({
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

    void loadDetails();
  }, [type, id, language]);

  const handleBack = () => {
    void navigate(-1);
  };

  return (
    <div className="pb-20 md:pb-8">
      {/* Back button - Mobile: top-left, Desktop: aligned with content (accounting for sidebar) */}
      <div className="pointer-events-none fixed top-4 right-0 left-0 z-100 md:top-8 md:left-64">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <Button onClick={handleBack} variant="secondary" className="pointer-events-auto">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Back</span>
          </Button>
        </div>
      </div>

      {loading && (
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-32 text-center text-gray-400 md:px-8">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-amber-500"></div>
            <p>Loading details...</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-32 text-center md:px-8">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="h-16 w-16 text-red-500"
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
            <Button onClick={handleBack} variant="secondary">
              Go Back
            </Button>
          </div>
        </div>
      )}

      {details && !loading && <MediaView media={details} />}
    </div>
  );
}
