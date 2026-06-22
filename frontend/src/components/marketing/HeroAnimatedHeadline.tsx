'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

const CHAR_DELAY_MS = 58;
const LINE2_START_DELAY_MS = 420;

type HeroAnimatedHeadlineProps = {
  text: string;
  accentLastLine?: boolean;
};

type Phase = 'pending' | 'animate' | 'static';

export default function HeroAnimatedHeadline({
  text,
  accentLastLine = true,
}: HeroAnimatedHeadlineProps) {
  const lines = useMemo(() => text.split('\n'), [text]);
  const [firstLine, ...restLines] = lines;
  const secondLine = restLines[0] ?? '';

  const [phase, setPhase] = useState<Phase>('pending');
  const [charIndex, setCharIndex] = useState(0);
  const [typingStarted, setTypingStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPhase(reduced || !secondLine ? 'static' : 'animate');
  }, [secondLine]);

  useEffect(() => {
    if (phase !== 'animate') return;

    setCharIndex(0);
    setTypingStarted(false);
    setIsComplete(false);

    const startTimer = window.setTimeout(() => setTypingStarted(true), LINE2_START_DELAY_MS);
    return () => window.clearTimeout(startTimer);
  }, [phase, secondLine]);

  useEffect(() => {
    if (phase !== 'animate' || !typingStarted) return;

    if (charIndex < secondLine.length) {
      const timer = window.setTimeout(() => setCharIndex((prev) => prev + 1), CHAR_DELAY_MS);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => setIsComplete(true), 180);
    return () => window.clearTimeout(timer);
  }, [charIndex, phase, secondLine, typingStarted]);

  if (phase === 'pending') {
    return (
      <span className="flex flex-col gap-2 sm:gap-3" aria-hidden>
        {firstLine ? <span className="block invisible">{firstLine}</span> : null}
        {secondLine ? <span className="block invisible">{secondLine}</span> : null}
        {restLines.slice(1).map((line, index) => (
          <span key={index} className="block invisible">
            {line}
          </span>
        ))}
      </span>
    );
  }

  if (phase === 'static') {
    return (
      <span className="flex flex-col gap-2 sm:gap-3">
        {firstLine ? <span className="block">{firstLine}</span> : null}
        {secondLine ? (
          <span className={`block ${accentLastLine ? 'mkt-hero-headline-accent' : ''}`}>
            {secondLine}
          </span>
        ) : null}
        {restLines.slice(1).map((line, index) => (
          <span key={index} className="block">
            {line}
          </span>
        ))}
      </span>
    );
  }

  const showCursor = typingStarted && !isComplete;
  const accentClass =
    accentLastLine && isComplete ? 'mkt-hero-headline-accent' : '';

  return (
    <span className="flex flex-col gap-2 sm:gap-3">
      {firstLine ? (
        <span className="block mkt-hero-headline-line-in">{firstLine}</span>
      ) : null}

      {secondLine ? (
        <span className="relative block">
          <span className="invisible" aria-hidden>
            {secondLine}
          </span>
          <span className={`absolute inset-x-0 top-0 ${accentClass}`}>
            {secondLine.slice(0, charIndex)}
            {showCursor ? (
              <span className="mkt-hero-headline-cursor" aria-hidden>
                |
              </span>
            ) : null}
          </span>
        </span>
      ) : null}

      {restLines.slice(1).map((line, index) => (
        <span key={index} className="block">
          {line}
        </span>
      ))}
    </span>
  );
}
