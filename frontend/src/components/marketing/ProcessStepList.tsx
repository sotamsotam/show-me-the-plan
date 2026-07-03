'use client';

import { MarketingIcon, PROCESS_STEP_ICONS } from '@/components/marketing/MarketingIcons';
import type { ProcessStep } from '@/content/marketing/types';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

export default function ProcessStepList({ steps }: { steps: ProcessStep[] }) {
  const containerRef = useRef<HTMLOListElement>(null);
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
    <ol
      ref={containerRef}
      className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6${inView ? ' mkt-process-steps-inview' : ''}`}
    >
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="mkt-process-step mkt-card-elevated relative flex flex-col p-6"
          style={{ '--mkt-stagger-index': index } as CSSProperties}
        >
          <div className="flex items-center gap-3">
            <span className="mkt-icon-badge mkt-icon-badge--primary shrink-0">
              <MarketingIcon
                name={PROCESS_STEP_ICONS[index % PROCESS_STEP_ICONS.length]}
                className="h-5 w-5"
              />
            </span>
            <p className="text-xs font-bold tracking-wider text-mkt-text-subtle">
              STEP {String(index + 1).padStart(2, '0')}
            </p>
          </div>
          <h3 className="mkt-h3 mt-4">{step.title}</h3>
          <p className="mkt-body mt-2 flex-1 text-sm">{step.description}</p>
          {index < steps.length - 1 ? (
            <span
              className="pointer-events-none absolute -right-3 top-1/2 hidden -translate-y-1/2 text-mkt-text-subtle lg:inline"
              aria-hidden
            >
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
