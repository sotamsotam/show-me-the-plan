'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

const PAPER_PLANNER = {
  src: '/images/planer_note_sample.png',
  alt: '종이 플래너에 손으로 적은 공부 계획',
};

const MOBILE_SCREENS = [
  { src: '/images/mobile_sample_1.jpg', alt: '쇼미플 TODO 화면' },
  { src: '/images/mobile_sample_2.jpg', alt: '쇼미플 스터디 플랜 화면' },
  { src: '/images/mobile_sample_3.jpg', alt: '쇼미플 공부현황 화면' },
  { src: '/images/mobile_sample_4.jpg', alt: '쇼미플 공부통계 화면' },
] as const;

const SLIDE_INTERVAL_MS = 3500;

export default function PlannerVsShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -48px 0px' },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % MOBILE_SCREENS.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`mb-12 sm:mb-14 lg:mb-16${inView ? ' mkt-planner-vs-inview' : ''}`}
      aria-label="종이 플래너와 쇼미플 앱 화면 비교"
    >
      <div className="grid items-center gap-8 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-6 lg:gap-10">
        <div className="mkt-planner-vs-side mkt-planner-vs-from-left flex flex-col items-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-mkt-text-subtle sm:text-sm">
            종이 플래너
          </p>
          <div className="relative w-full max-w-[17.5rem] sm:max-w-xs lg:max-w-sm">
            <Image
              src={PAPER_PLANNER.src}
              alt={PAPER_PLANNER.alt}
              width={640}
              height={480}
              priority
              sizes="(max-width: 640px) 70vw, 320px"
              className="h-auto w-full object-cover drop-shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
            />
          </div>
        </div>

        <div className="flex justify-center sm:px-2">
          <div
            className="mkt-planner-vs-badge flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-mkt-primary to-mkt-accent text-lg font-extrabold tracking-tight text-white shadow-lg shadow-mkt-accent/25 ring-4 ring-white sm:h-16 sm:w-16 sm:text-xl"
            aria-hidden
          >
            VS
          </div>
        </div>

        <div className="mkt-planner-vs-side mkt-planner-vs-from-right flex flex-col items-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-mkt-accent sm:text-sm">
            쇼미플
          </p>
          <div className="relative w-full max-w-[15rem]">
            <div className="relative aspect-[9/19.5] overflow-hidden rounded-[1.5rem] bg-mkt-surface shadow-mkt-hover ring-[3px] ring-white sm:ring-4">
              {MOBILE_SCREENS.map((screen, index) => (
                <Image
                  key={screen.src}
                  src={screen.src}
                  alt={screen.alt}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 640px) 50vw, 240px"
                  className={`mkt-planner-phone-screen object-cover object-top transition-opacity duration-700 ease-in-out ${
                    index === activeIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1.5" aria-hidden>
            {MOBILE_SCREENS.map((screen, index) => (
              <span
                key={screen.src}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? 'w-5 bg-mkt-accent'
                    : 'w-1.5 bg-mkt-border'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
