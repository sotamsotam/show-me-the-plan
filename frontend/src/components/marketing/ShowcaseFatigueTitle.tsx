'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const COUNTDOWN_FROM = 100;
const COUNTDOWN_MS = 1300;

const TITLE_CLASS =
  'mt-3 text-[1.625rem] font-bold leading-[1.35] tracking-[-0.02em] text-white sm:mt-4 sm:text-3xl lg:text-[2.125rem]';

function parseFatigueTitle(title: string) {
  const match = title.match(/^(.+?)(\d+%)(로 만듭니다)$/);
  if (!match) return null;

  const [, prefix, targetPercent, suffix] = match;
  const targetValue = Number.parseInt(targetPercent, 10);
  if (Number.isNaN(targetValue)) return null;

  return { prefix, suffix, targetValue };
}

export default function ShowcaseFatigueTitle({ title }: { title: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const parsed = useMemo(() => parseFatigueTitle(title), [title]);
  const [percent, setPercent] = useState(COUNTDOWN_FROM);

  useEffect(() => {
    if (!parsed) return;

    const element = headingRef.current?.closest('section') ?? headingRef.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setPercent(parsed.targetValue);
      return;
    }

    let cancelled = false;
    let frame = 0;
    let hasStarted = false;

    const runCountdown = () => {
      if (hasStarted || cancelled) return;
      hasStarted = true;

      setPercent(COUNTDOWN_FROM);
      const start = performance.now();

      const tick = (now: number) => {
        if (cancelled) return;

        const progress = Math.min((now - start) / COUNTDOWN_MS, 1);
        const eased = 1 - (1 - progress) ** 2.8;
        const value = Math.round(
          COUNTDOWN_FROM - (COUNTDOWN_FROM - parsed.targetValue) * eased,
        );
        setPercent(value);

        if (progress < 1) {
          frame = requestAnimationFrame(tick);
        } else {
          setPercent(parsed.targetValue);
        }
      };

      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          runCountdown();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -5% 0px' },
    );

    observer.observe(element);

    const rect = element.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    if (alreadyVisible) {
      observer.disconnect();
      runCountdown();
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [parsed]);

  if (!parsed) {
    return <h2 className={TITLE_CLASS}>{title}</h2>;
  }

  return (
    <h2 ref={headingRef} className={TITLE_CLASS}>
      {parsed.prefix}
      <span className="mkt-showcase-percent inline-block min-w-[3.25ch] tabular-nums">
        {percent}%
      </span>
      {parsed.suffix}
    </h2>
  );
}
