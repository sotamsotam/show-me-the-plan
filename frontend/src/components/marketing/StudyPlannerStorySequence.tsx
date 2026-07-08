'use client';

import ResolutionAnimatedTitle from '@/components/marketing/ResolutionAnimatedTitle';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudyPlannerStoryContent } from '@/content/marketing/types';

const CHAR_DELAY_MS = 58;
const LEAD_ANIM_MS = 750;
const AFTER_LEAD_MS = 180;
const AFTER_TYPING_MS = 380;
const QUESTION_ANIM_MS = 650;
const BUBBLE_STAGGER_MS = 520;
const AFTER_BUBBLES_MS = 480;

function delay(ms: number, signal: { cancelled: boolean }) {
  return new Promise<void>((resolve) => {
    window.setTimeout(() => {
      if (!signal.cancelled) resolve();
    }, ms);
  });
}

export default function StudyPlannerStorySequence({
  hookLead,
  hookTitle,
  question,
  painPoints,
  resolutionTitle,
  resolutionBody,
}: StudyPlannerStoryContent) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const [showLead, setShowLead] = useState(false);
  const [typedChars, setTypedChars] = useState(0);
  const [typingDone, setTypingDone] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [visibleBubbles, setVisibleBubbles] = useState(0);
  const [showResolution, setShowResolution] = useState(false);
  const [showResolutionBody, setShowResolutionBody] = useState(false);

  const handleResolutionTitleComplete = useCallback(() => {
    setShowResolutionBody(true);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(prefersReducedMotion);

    if (prefersReducedMotion) {
      setStarted(true);
      setShowLead(true);
      setTypedChars(hookTitle.length);
      setTypingDone(true);
      setShowQuestion(true);
      setVisibleBubbles(painPoints.length);
      setShowResolution(true);
      setShowResolutionBody(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -48px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hookTitle.length, painPoints.length]);

  useEffect(() => {
    if (!started || reducedMotion) return;

    const signal = { cancelled: false };

    async function runSequence() {
      setShowLead(true);
      await delay(LEAD_ANIM_MS + AFTER_LEAD_MS, signal);
      if (signal.cancelled) return;

      for (let index = 0; index < hookTitle.length; index += 1) {
        setTypedChars(index + 1);
        await delay(CHAR_DELAY_MS, signal);
        if (signal.cancelled) return;
      }

      setTypingDone(true);
      await delay(AFTER_TYPING_MS, signal);
      if (signal.cancelled) return;

      setShowQuestion(true);
      await delay(QUESTION_ANIM_MS + 320, signal);
      if (signal.cancelled) return;

      for (let index = 0; index < painPoints.length; index += 1) {
        setVisibleBubbles(index + 1);
        await delay(BUBBLE_STAGGER_MS, signal);
        if (signal.cancelled) return;
      }

      await delay(AFTER_BUBBLES_MS, signal);
      if (signal.cancelled) return;

      setShowResolution(true);
    }

    runSequence();

    return () => {
      signal.cancelled = true;
    };
  }, [started, reducedMotion, hookTitle, painPoints.length]);

  const showCursor = showLead && !typingDone && typedChars < hookTitle.length;
  const headlineLabel = `${hookLead} ${hookTitle}`;

  return (
    <div ref={containerRef} className="mkt-story-sequence">
      <div className="mkt-story-sequence-headline mx-auto max-w-4xl">
        <h2
          className="mkt-h2 flex flex-wrap items-baseline justify-center gap-x-2 text-center"
          aria-label={headlineLabel}
        >
          <span
            className={`inline-block whitespace-nowrap${
              showLead ? ' mkt-story-hook-lead-in' : ' opacity-0 -translate-x-10'
            }`}
          >
            {hookLead}
          </span>

          <span className="relative inline-block whitespace-nowrap">
            <span className="invisible" aria-hidden>
              {hookTitle}
            </span>
            <span
              className={`absolute inset-y-0 left-0${typingDone ? ' mkt-hero-headline-accent' : ''}`}
            >
              {hookTitle.slice(0, typedChars)}
              {showCursor ? (
                <span className="mkt-hero-headline-cursor" aria-hidden>
                  |
                </span>
              ) : null}
            </span>
          </span>
        </h2>

        <p
          className={`mt-8 text-center text-lg font-bold leading-snug tracking-tight text-mkt-text sm:mt-10 sm:text-xl lg:text-2xl${
            showQuestion ? ' mkt-story-question-in' : ' mkt-story-question-pending'
          }`}
          aria-hidden={!showQuestion}
        >
          {question}
        </p>
      </div>

      <div className="mkt-story-sequence-bubbles mx-auto mt-4 flex max-w-lg flex-col items-start gap-3 sm:gap-3.5">
        {painPoints.map((item, index) => {
          const isVisible = index < visibleBubbles;

          return (
            <article
              key={item.quote}
              className={`mkt-chat-bubble${
                isVisible ? ' mkt-chat-bubble-in' : ' mkt-chat-bubble-pending'
              }`}
              aria-hidden={!isVisible}
            >
              <p className="text-sm font-bold leading-snug text-mkt-text sm:text-base">
                {item.quote}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-mkt-text-muted sm:text-sm">
                <span aria-hidden>– </span>
                {item.reason}
              </p>
            </article>
          );
        })}
      </div>

      <article
        className={`mkt-story-resolution-card mx-auto mt-12 max-w-3xl overflow-hidden rounded-2xl px-6 py-10 text-center sm:mt-14 sm:px-10 sm:py-12${
          showResolution ? ' mkt-story-resolution-slide-up' : ' mkt-story-resolution-pending'
        }`}
        aria-hidden={!showResolution}
      >
        <div className="mkt-accent-surface pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative">
          <ResolutionAnimatedTitle
            title={resolutionTitle}
            active={showResolution}
            reducedMotion={reducedMotion}
            onComplete={handleResolutionTitleComplete}
          />
          <p
            className={`mt-4 text-base font-semibold leading-snug tracking-tight text-mkt-accent sm:text-xl lg:text-2xl${
              showResolutionBody ? ' mkt-story-resolution-body-in' : ' mkt-story-resolution-body-pending'
            }`}
            aria-hidden={!showResolutionBody}
          >
            {resolutionBody}
          </p>
        </div>
      </article>
    </div>
  );
}
