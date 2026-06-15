import { isDefined } from '@findarr/shared/utils';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import { DetailBackButton } from '../components/media/DetailBackButton';
import { MediaView } from '../components/media/MediaView';
import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/StateDisplay';
import { useMediaDetails } from '../hooks/useMediaDetails';

export function MediaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const type = location.pathname.startsWith('/movie') ? 'movie' : 'tv';
  const { details, loading, error } = useMediaDetails(type, id);

  const handleBack = () => {
    void navigate(-1);
  };

  return (
    <div className="pb-20 md:pb-8">
      <DetailBackButton onClick={handleBack} />

      {loading && <LoadingState title="Loading details..." />}

      {isDefined(error) && !loading && (
        <ErrorState
          message={error}
          action={
            <Button onClick={handleBack} variant="secondary">
              Go Back
            </Button>
          }
        />
      )}

      {details && !loading && <MediaView media={details} />}
    </div>
  );
}
