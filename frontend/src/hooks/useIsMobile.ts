'use client';

import { useEffect, useState } from 'react';

/** Tailwind `md` breakpoint — mobile nav & overlays use this. */
export const MOBILE_NAV_MEDIA_QUERY = '(max-width: 767px)';

export function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);

    return () => {
      mediaQuery.removeEventListener('change', update);
    };
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMatchMedia(MOBILE_NAV_MEDIA_QUERY);
}
