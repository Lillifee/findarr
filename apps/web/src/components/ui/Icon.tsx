import type { CSSProperties, HTMLAttributes } from 'react';

export type IconName =
  | 'arrow_back'
  | 'bar_chart'
  | 'calendar_month'
  | 'check'
  | 'check_circle'
  | 'checklist'
  | 'close'
  | 'download'
  | 'error'
  | 'expand_more'
  | 'explore'
  | 'fact_check'
  | 'flag'
  | 'grid_view'
  | 'group'
  | 'home'
  | 'how_to_vote'
  | 'info'
  | 'language'
  | 'link'
  | 'logout'
  | 'more_vert'
  | 'movie'
  | 'notifications'
  | 'open_in_new'
  | 'person'
  | 'play_arrow'
  | 'public'
  | 'schedule'
  | 'search'
  | 'sell'
  | 'star'
  | 'theater_comedy'
  | 'thumb_down'
  | 'thumb_up'
  | 'tune'
  | 'tv'
  | 'warning';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'display';

export interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  name: IconName;
  filled?: boolean;
  size?: IconSize;
  weight?: 300 | 400 | 500 | 600 | 700;
}

const fontSizes: Record<IconSize, string> = {
  xs: '1rem',
  sm: '1.125rem',
  md: '1.25rem',
  lg: '1.5rem',
  xl: '2.25rem',
  xxl: '3.75rem',
  display: 'clamp(4.5rem, 9vw, 6rem)',
};

const opticalSize: Record<IconSize, number> = {
  xs: 20,
  sm: 20,
  md: 24,
  lg: 24,
  xl: 40,
  xxl: 48,
  display: 48,
};

export function Icon({
  name,
  filled = false,
  size = 'md',
  weight = 300,
  className = '',
  style,
  ...props
}: IconProps) {
  const variationStyle: CSSProperties = {
    fontSize: fontSizes[size],
    width: fontSizes[size],
    height: fontSizes[size],
    overflow: 'hidden',
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${opticalSize[size]}`,
    ...style,
  };

  return (
    <span
      aria-hidden="true"
      className={`material-symbols-rounded notranslate inline-flex shrink-0 items-center justify-center leading-none select-none ${className}`}
      style={variationStyle}
      {...props}
    >
      {name}
    </span>
  );
}
