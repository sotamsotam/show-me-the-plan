'use client';

import type { HeroImage } from '@/content/marketing/types';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const FADE_DURATION_MS = 700;
const ROTATE_INTERVAL_MS = 5000;

type HeroFadeImagesProps = {
  images: HeroImage[];
};

export default function HeroFadeImages({ images }: HeroFadeImagesProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, ROTATE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [images.length]);

  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div className="relative aspect-[4/3] w-full sm:aspect-[5/4]">
        {images.map((image, index) => (
          <Image
            key={image.src}
            src={image.src}
            alt={image.alt}
            fill
            priority={index === 0}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain object-bottom transition-opacity ease-in-out"
            style={{
              opacity: index === activeIndex ? 1 : 0,
              transitionDuration: `${FADE_DURATION_MS}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
