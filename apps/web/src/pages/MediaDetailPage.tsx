import { isDefined } from '@findarr/shared/utils';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import { DetailCloseButton } from '../components/media/DetailCloseButton';
import { MediaView } from '../components/media/MediaView';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/StateDisplay';
import { useMediaUpdates } from '../contexts/MediaUpdateContext';
import { useMediaDetails } from '../hooks/useMediaDetails';

export function MediaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const type = location.pathname.startsWith('/movie') ? 'movie' : 'tv';
  const { details, loading, error } = useMediaDetails(type, id);
  const mediaUpdates = useMediaUpdates();

  const handleClose = () => {
    void navigate(-1);
  };

  return (
    <div className="relative pb-20 md:pb-8">
      <DetailCloseButton onClick={handleClose} />

      {loading && <LoadingState />}

      {isDefined(error) && !loading && <ErrorState message={error} />}

      {details && !loading && (
        <MediaView
          media={details}
          {...(mediaUpdates ? { onMediaUpdate: mediaUpdates.publish } : {})}
        />
      )}
    </div>
  );
}
