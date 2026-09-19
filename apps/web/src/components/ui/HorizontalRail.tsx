import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Icon } from './Icon';

interface HorizontalRailProps {
  children: ReactNode;
  ariaLabel: string;
  previousLabel: string;
  nextLabel: string;
  contentClassName?: string;
  className?: string;
}

interface ScrollPosition {
  atStart: boolean;
  atEnd: boolean;
}

const initialScrollPosition: ScrollPosition = { atStart: true, atEnd: true };

export function HorizontalRail({
  children,
  ariaLabel,
  previousLabel,
  nextLabel,
  contentClassName = '',
  className = '',
}: HorizontalRailProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(initialScrollPosition);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return () => {};
    }

    const updateScrollPosition = () => {
      const maximumScrollLeft = viewport.scrollWidth - viewport.clientWidth;
      setScrollPosition({
        atStart: viewport.scrollLeft <= 1,
        atEnd: maximumScrollLeft <= 1 || viewport.scrollLeft >= maximumScrollLeft - 1,
      });
    };

    updateScrollPosition();
    const resizeObserver = new ResizeObserver(updateScrollPosition);
    resizeObserver.observe(viewport);
    viewport.addEventListener('scroll', updateScrollPosition, { passive: true });
    return () => {
      resizeObserver.disconnect();
      viewport.removeEventListener('scroll', updateScrollPosition);
    };
  }, [children]);

  const scrollByPage = (direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    viewport.scrollBy({ behavior: 'smooth', left: direction * viewport.clientWidth * 0.8 });
  };

  const edgeMask = scrollPosition.atStart
    ? scrollPosition.atEnd
      ? undefined
      : 'linear-gradient(to right, black calc(100% - 4rem), transparent)'
    : scrollPosition.atEnd
      ? 'linear-gradient(to right, transparent, black 4rem)'
      : 'linear-gradient(to right, transparent, black 4rem, black calc(100% - 4rem), transparent)';

  return (
    <div className={`group/rail relative ${className}`} aria-label={ariaLabel}>
      <div
        ref={viewportRef}
        className="horizontal-rail-scrollbar overflow-x-auto overflow-y-hidden scroll-smooth md:pb-2"
        style={
          edgeMask
            ? {
                WebkitMaskImage: edgeMask,
                maskImage: edgeMask,
              }
            : undefined
        }
      >
        <div className={contentClassName}>{children}</div>
      </div>

      {!scrollPosition.atStart && (
        <button
          type="button"
          aria-label={previousLabel}
          className="absolute top-1/2 left-2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-950/90 text-zinc-100 opacity-0 shadow-lg transition-all group-focus-within/rail:opacity-100 group-hover/rail:opacity-100 hover:border-amber-500 hover:text-amber-300 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none md:flex"
          onClick={() => {
            scrollByPage(-1);
          }}
        >
          <Icon name="chevron_left" size="md" />
        </button>
      )}
      {!scrollPosition.atEnd && (
        <button
          type="button"
          aria-label={nextLabel}
          className="absolute top-1/2 right-2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-950/90 text-zinc-100 opacity-0 shadow-lg transition-all group-focus-within/rail:opacity-100 group-hover/rail:opacity-100 hover:border-amber-500 hover:text-amber-300 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none md:flex"
          onClick={() => {
            scrollByPage(1);
          }}
        >
          <Icon name="chevron_right" size="md" />
        </button>
      )}
    </div>
  );
}
