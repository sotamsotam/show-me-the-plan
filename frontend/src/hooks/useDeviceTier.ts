'use client';

import { useEffect, useState } from 'react';

export type DeviceTier = 'phone' | 'tablet' | 'desktop';

const PHONE_MAX_WIDTH = 640;
const TABLET_MAX_WIDTH = 1024;

function resolveDeviceTier(width: number): DeviceTier {
  if (width <= PHONE_MAX_WIDTH) {
    return 'phone';
  }

  if (width <= TABLET_MAX_WIDTH) {
    return 'tablet';
  }

  return 'desktop';
}

function readDeviceTier(): DeviceTier {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  return resolveDeviceTier(window.innerWidth);
}

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>(readDeviceTier);

  useEffect(() => {
    const handleResize = () => {
      setTier(resolveDeviceTier(window.innerWidth));
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return tier;
}
