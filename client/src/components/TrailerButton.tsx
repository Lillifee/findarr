import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { searchService } from '../services/api';
import { Video } from '@findarr/shared';

interface TrailerButtonProps {
  id: number;
  type: 'movie' | 'tv';
  title: string;
}

export const TrailerButton: React.FC<TrailerButtonProps> = ({ id, type, title }) => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [trailer, setTrailer] = useState<Video | null>(null);

  const handleTrailerClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setLoading(true);

    try {
      const videos = await searchService.getVideos({ id, type });

      // Find the best trailer (prefer official trailers)
      const trailers = videos.results.filter(
        video => video.type.toLowerCase() === 'trailer' && video.site === 'YouTube'
      );

      const officialTrailer = trailers.find(t => t.official) || trailers[0];

      if (officialTrailer) {
        setTrailer(officialTrailer);
        setShowModal(true);
      } else {
        alert('No trailer available for this title');
      }
    } catch (error) {
      console.error('Failed to fetch trailer:', error);
      alert('Failed to load trailer');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(false);
    setTrailer(null);
  };

  return (
    <>
      <button
        onClick={handleTrailerClick}
        disabled={loading}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          padding: '0.5rem',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          cursor: loading ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          fontSize: '1.2rem',
          transition: 'all 0.2s',
          zIndex: 10,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title="Watch Trailer"
      >
        {loading ? '⏳' : '▶️'}
      </button>

      {/* Trailer Modal - Rendered as Portal to document.body for true full-screen */}
      {showModal &&
        trailer &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.98)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999999, // Extremely high z-index
              padding: '0',
              margin: '0',
            }}
            onClick={closeModal}
          >
            <div
              style={{
                backgroundColor: '#000',
                borderRadius: '0',
                overflow: 'hidden',
                width: '100vw',
                height: '100vh',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  padding: '20px 30px',
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  flexShrink: 0,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 1000000,
                }}
              >
                <div>
                  <h3
                    style={{ margin: '0', fontSize: '1.8rem', color: 'white', fontWeight: '600' }}
                  >
                    {trailer.name}
                  </h3>
                  <p style={{ margin: '8px 0 0 0', color: '#ccc', fontSize: '1.2rem' }}>
                    {title} • {trailer.type} • {trailer.official ? '✅ Official' : '👤 Fan-made'}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    fontSize: '3rem',
                    cursor: 'pointer',
                    padding: '20px',
                    borderRadius: '50%',
                    color: 'white',
                    width: '80px',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s',
                    fontWeight: 'bold',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ×
                </button>
              </div>

              {/* Video Container - Full screen */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  backgroundColor: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <iframe
                  src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0&modestbranding=1&fs=1&hd=1&iv_load_policy=3&controls=1`}
                  title={trailer.name}
                  style={{
                    width: '100vw',
                    height: '100vh',
                    border: 'none',
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
