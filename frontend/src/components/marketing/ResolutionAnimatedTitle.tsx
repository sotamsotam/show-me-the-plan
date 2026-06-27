'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

const CHAR_DELAY_MS = 58;
const BACKSPACE_DELAY_MS = 42;
const PAUSE_BEFORE_DELETE_MS = 520;
const PAUSE_BEFORE_SECOND_MS = 300;

type ResolutionTitleSegments = {
  phaseOneEnd: string;
  backspaceEnd: string;
  phaseTwo: string;
  final: string;
  full: string;
};

function matchPartialQuotedWord(rest: string, word: '짐' | '무기'): string | null {
  const quoted = `'${word}'`;
  if (!rest.startsWith("'")) return null;
  if (word === '짐' && rest.startsWith("'무")) return null;
  if (word === '무기' && rest.startsWith("'짐")) return null;

  const slice = rest.slice(0, Math.min(rest.length, quoted.length));
  if (slice.length < 2 || !quoted.startsWith(slice)) return null;

  return slice;
}

function renderColoredDisplay(display: string, lead: string): ReactNode {
  if (!display) return null;

  const parts: ReactNode[] = [];
  let rest = display;
  let key = 0;

  if (display.startsWith(lead)) {
    parts.push(display.slice(0, lead.length));
    rest = display.slice(lead.length);
  }

  while (rest.length > 0) {
    const burden = matchPartialQuotedWord(rest, '짐');
    const weapon = matchPartialQuotedWord(rest, '무기');

    if (burden) {
      parts.push(
        <span key={key++} className="mkt-story-word-burden">
          {burden}
        </span>,
      );
      rest = rest.slice(burden.length);
      continue;
    }

    if (weapon) {
      parts.push(
        <span key={key++} className="mkt-story-word-weapon">
          {weapon}
        </span>,
      );
      rest = rest.slice(weapon.length);
      continue;
    }

    const nextQuote = rest.indexOf("'");
    const plainLen = nextQuote === -1 ? rest.length : nextQuote;
    const chunk = rest.slice(0, plainLen > 0 ? plainLen : 1);
    parts.push(<span key={key++}>{chunk}</span>);
    rest = rest.slice(chunk.length);
  }

  return parts;
}

function parseResolutionTitle(title: string): ResolutionTitleSegments | null {
  const match = title.match(/^(.+?)'(짐)'(이 아니라 )'(무기)'(가 되는 법)$/);
  if (!match) return null;

  const [, lead, , middle, weapon, ending] = match;

  return {
    phaseOneEnd: `${lead}'짐'${middle.trimEnd()}`,
    backspaceEnd: lead,
    phaseTwo: `'${weapon}'${ending}`,
    final: `${lead}'${weapon}'${ending}`,
    full: title,
  };
}

type ResolutionAnimatedTitleProps = {
  title: string;
  active: boolean;
  reducedMotion: boolean;
  onComplete?: () => void;
};

export default function ResolutionAnimatedTitle({
  title,
  active,
  reducedMotion,
  onComplete,
}: ResolutionAnimatedTitleProps) {
  const segments = useMemo(() => parseResolutionTitle(title), [title]);
  const [display, setDisplay] = useState('');
  const [showCursor, setShowCursor] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;

    if (reducedMotion || !segments) {
      setDisplay(segments?.final ?? title);
      setShowCursor(false);
      setDone(true);
      return;
    }

    const resolvedSegments = segments;

    let cancelled = false;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(() => {
          if (!cancelled) resolve();
        }, ms);
      });

    async function run() {
      setDisplay('');
      setDone(false);
      setShowCursor(true);

      for (let index = 0; index <= resolvedSegments.phaseOneEnd.length; index += 1) {
        if (cancelled) return;
        setDisplay(resolvedSegments.phaseOneEnd.slice(0, index));
        if (index < resolvedSegments.phaseOneEnd.length) {
          await wait(CHAR_DELAY_MS);
        }
      }

      await wait(PAUSE_BEFORE_DELETE_MS);
      if (cancelled) return;

      let current = resolvedSegments.phaseOneEnd;
      while (current.length > resolvedSegments.backspaceEnd.length) {
        if (cancelled) return;
        current = current.slice(0, -1);
        setDisplay(current);
        await wait(BACKSPACE_DELAY_MS);
      }

      await wait(PAUSE_BEFORE_SECOND_MS);
      if (cancelled) return;

      for (let index = 0; index <= resolvedSegments.phaseTwo.length; index += 1) {
        if (cancelled) return;
        setDisplay(resolvedSegments.backspaceEnd + resolvedSegments.phaseTwo.slice(0, index));
        if (index < resolvedSegments.phaseTwo.length) {
          await wait(CHAR_DELAY_MS);
        }
      }

      if (cancelled) return;
      setDisplay(resolvedSegments.final);
      setShowCursor(false);
      setDone(true);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [active, reducedMotion, segments, title]);

  useEffect(() => {
    if (done && active) {
      onComplete?.();
    }
  }, [active, done, onComplete]);

  const accessibleTitle = segments?.final ?? title;

  if (!segments) {
    return <h3 className="mkt-h2">{title}</h3>;
  }

  return (
    <h3 className="mkt-h2" aria-label={accessibleTitle}>
      <span className="relative inline-block max-w-full">
        <span className="invisible block whitespace-pre-wrap" aria-hidden>
          {segments.full}
        </span>
        <span className="absolute inset-x-0 top-0 block whitespace-pre-wrap">
          {renderColoredDisplay(display, segments.backspaceEnd)}
          {showCursor && !done ? (
            <span className="mkt-hero-headline-cursor" aria-hidden>
              |
            </span>
          ) : null}
        </span>
      </span>
    </h3>
  );
}
