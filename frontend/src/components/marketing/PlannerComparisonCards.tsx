'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { PlannerComparisonItem } from '@/content/marketing/types';

export default function PlannerComparisonCards({ items }: { items: PlannerComparisonItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

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
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`grid gap-5 sm:grid-cols-2 lg:gap-6${inView ? ' mkt-comparison-cards-inview' : ''}`}
    >
      {items.map((item, index) => (
        <article
          key={item.title}
          className="mkt-comparison-card mkt-card-elevated flex h-full flex-col overflow-hidden"
          style={{ '--mkt-stagger-index': index } as CSSProperties}
        >
          <div className="flex items-center gap-3 border-b border-mkt-border bg-mkt-surface-alt px-5 py-4 sm:px-6">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mkt-accent text-xs font-extrabold text-white">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="text-sm font-extrabold text-mkt-text sm:text-base">{item.title}</h3>
          </div>

          <div className="grid flex-1 sm:grid-cols-2 sm:items-stretch">
            <div className="border-b border-mkt-border p-5 sm:border-b-0 sm:border-r sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-mkt-text-subtle">
                종이 플래너
              </p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-mkt-text-muted">{item.paper}</p>
            </div>
            <div className="relative p-5 sm:p-6">
              <div className="mkt-accent-surface pointer-events-none absolute inset-0" aria-hidden />
              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-wide text-mkt-accent">쇼미플</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-mkt-text">{item.smtp}</p>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
