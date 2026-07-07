'use client';

import { useState, type ReactNode } from 'react';
import {
  EXAM_STUDY_MANUAL,
  type ManualCallout,
  type ManualCalloutType,
  type ManualListItem,
  type ManualPlanningStep,
  type ManualSubjectSection,
  type ManualTable,
  type ManualWeekGuide,
} from '@/content/guide/exam-study-manual';
import GuideYoutubeEmbed from './GuideYoutubeEmbed';

const CALLOUT_STYLES: Record<
  ManualCalloutType,
  { container: string; icon: string; label: string }
> = {
  tip: {
    container:
      'border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/30',
    icon: 'text-emerald-600 dark:text-emerald-400',
    label: 'TIP',
  },
  warning: {
    container: 'border-red-200/80 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/30',
    icon: 'text-red-600 dark:text-red-400',
    label: '주의',
  },
  mission: {
    container:
      'border-[#1b76e0]/30 bg-[#1b76e0]/5 dark:border-[#3b8eea]/40 dark:bg-[#1b76e0]/10',
    icon: 'text-[#1b76e0] dark:text-[#6eb0ff]',
    label: '미션',
  },
  key: {
    container:
      'border-amber-200/80 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/30',
    icon: 'text-amber-600 dark:text-amber-400',
    label: '핵심',
  },
};

function SectionBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-[#1b76e0]/10 px-2.5 py-1 text-[11px] font-bold tracking-[0.12em] text-[#1b76e0] dark:bg-[#1b76e0]/20 dark:text-[#6eb0ff]">
      {children}
    </span>
  );
}

function ManualCalloutCard({ callout }: { callout: ManualCallout }) {
  const style = CALLOUT_STYLES[callout.type];

  return (
    <div className={`rounded-xl border p-4 ${style.container}`}>
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 inline-flex shrink-0 rounded-md bg-white/70 px-2 py-0.5 text-[10px] font-bold tracking-wider dark:bg-black/20 ${style.icon}`}
        >
          {callout.title ?? style.label}
        </span>
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{callout.text}</p>
      </div>
    </div>
  );
}

function ManualBulletList({ items }: { items: ManualListItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={`${item.title ?? ''}-${index}`} className="flex gap-3">
          <span
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1b76e0]"
            aria-hidden
          />
          <div className="min-w-0">
            {item.title ? (
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {item.title}
              </p>
            ) : null}
            <p
              className={`text-sm leading-relaxed text-gray-600 dark:text-gray-400 ${
                item.title ? 'mt-0.5' : ''
              }`}
            >
              {item.text}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ManualDataTable({ table }: { table: ManualTable }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-700">
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-neutral-700 dark:bg-zinc-800/80">
            {table.headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-gray-100 last:border-0 dark:border-neutral-800"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-4 py-3 leading-relaxed text-gray-600 dark:text-gray-400 ${
                    cellIndex === 0 ? 'font-medium text-gray-900 dark:text-gray-200' : ''
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManualSubjectCard({ subject }: { subject: ManualSubjectSection }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-neutral-700 dark:bg-zinc-800/40 md:p-5">
      <div className="flex flex-wrap items-baseline gap-2">
        <h5 className="text-base font-bold text-gray-900 dark:text-gray-100">{subject.title}</h5>
        {subject.subtitle ? (
          <span className="text-sm font-medium text-[#1b76e0] dark:text-[#6eb0ff]">
            {subject.subtitle}
          </span>
        ) : null}
      </div>

      {subject.paragraphs && subject.paragraphs.length > 0 ? (
        <div className="mt-3 space-y-2">
          {subject.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="text-sm leading-relaxed text-gray-600 dark:text-gray-400"
            >
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {subject.bullets ? (
        <div className="mt-4">
          <ManualBulletList items={subject.bullets} />
        </div>
      ) : null}

      {subject.table ? (
        <div className="mt-4">
          <ManualDataTable table={subject.table} />
        </div>
      ) : null}

      {subject.callouts ? (
        <div className="mt-4 space-y-3">
          {subject.callouts.map((callout) => (
            <ManualCalloutCard key={callout.text} callout={callout} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WeekOverviewGrid() {
  const { weekOverview } = EXAM_STUDY_MANUAL;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {weekOverview.map((week, index) => (
        <div
          key={week.weekLabel}
          className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 shadow-sm dark:border-neutral-700 dark:from-zinc-900 dark:to-zinc-800/80"
        >
          <div
            className="absolute right-3 top-3 text-3xl font-black text-[#1b76e0]/10 dark:text-[#1b76e0]/20"
            aria-hidden
          >
            {index + 1}
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#1b76e0] dark:text-[#6eb0ff]">
            {week.weekLabel}
          </p>
          <p className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-100">{week.phase}</p>
          <ul className="mt-3 space-y-1.5">
            {week.goals.map((goal) => (
              <li
                key={goal}
                className="flex gap-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400"
              >
                <span className="text-[#1b76e0]" aria-hidden>
                  ✓
                </span>
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function WeekGuideAccordion({ week }: { week: ManualWeekGuide }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-zinc-900">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800/60 md:px-5"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#1b76e0] px-2 py-0.5 text-xs font-bold text-white">
              {week.weekLabel}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {week.tagline}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{week.goal}</p>
        </div>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-transform dark:border-neutral-600 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open ? (
        <div className="border-t border-gray-200 px-4 py-5 dark:border-neutral-700 md:px-5">
          <div className="space-y-2">
            {week.overview.map((paragraph) => (
              <p
                key={paragraph}
                className="text-sm leading-relaxed text-gray-600 dark:text-gray-400"
              >
                {paragraph}
              </p>
            ))}
          </div>

          {week.mission ? (
            <div className="mt-4">
              <ManualCalloutCard
                callout={{ type: 'mission', title: '금주의 미션', text: week.mission }}
              />
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {week.subjects.map((subject) => (
              <ManualSubjectCard key={`${week.id}-${subject.title}`} subject={subject} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailedWeekGuides() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mt-6">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg border border-[#1b76e0]/40 bg-[#1b76e0]/5 px-4 py-2.5 text-sm font-semibold text-[#1b76e0] transition-colors hover:bg-[#1b76e0]/10 dark:border-[#3b8eea]/50 dark:bg-[#1b76e0]/10 dark:text-[#6eb0ff] dark:hover:bg-[#1b76e0]/20"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span aria-hidden>{expanded ? '▾' : '▸'}</span>
        자세한 학습계획하는 방법 보기
      </button>

      {expanded ? (
        <div className="mt-5 space-y-3">
          <WeekOverviewGrid />
          <div className="mt-6 space-y-3">
            {EXAM_STUDY_MANUAL.weekGuides.map((week) => (
              <WeekGuideAccordion key={week.id} week={week} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PlanningFlowBar() {
  const { planningFlow } = EXAM_STUDY_MANUAL;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-zinc-900 md:p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 md:text-xl">
        {planningFlow.title}
      </h2>
      <div className="mt-5 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-1">
        {planningFlow.steps.map((step, index) => (
          <div key={step} className="flex items-center gap-1 md:contents">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-[#1b76e0]/5 px-3 py-2 dark:bg-[#1b76e0]/10">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1b76e0] text-xs font-bold text-white">
                {index + 1}
              </span>
              <span className="text-xs font-medium leading-snug text-gray-800 dark:text-gray-200 sm:text-sm">
                {step}
              </span>
            </div>
            {index < planningFlow.steps.length - 1 ? (
              <span
                className="hidden shrink-0 text-gray-300 dark:text-gray-600 md:inline"
                aria-hidden
              >
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanningStepCard({
  step,
  isLast,
}: {
  step: ManualPlanningStep;
  isLast: boolean;
}) {
  const stepLabel = String(step.step).padStart(2, '0');

  return (
    <li className="relative flex gap-4 md:gap-6">
      <div className="flex flex-col items-center">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1b76e0] text-sm font-bold text-white shadow-sm shadow-[#1b76e0]/25"
          aria-hidden
        >
          {step.step}
        </div>
        {!isLast ? (
          <div
            className="mt-2 w-px flex-1 bg-gradient-to-b from-[#1b76e0]/40 to-gray-200 dark:to-neutral-700"
            aria-hidden
          />
        ) : null}
      </div>

      <article className="min-w-0 flex-1 pb-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-zinc-900 md:p-6">
          <SectionBadge>STEP {stepLabel}</SectionBadge>
          <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-gray-100 md:text-xl">
            {step.title}
          </h3>

          {step.paragraphs.length > 0 ? (
            <div className="mt-3 space-y-2">
              {step.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 md:text-[15px]"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ) : null}

          {step.bullets ? (
            <div className="mt-4">
              <ManualBulletList items={step.bullets} />
            </div>
          ) : null}

          {step.callouts ? (
            <div className="mt-4 space-y-3">
              {step.callouts.map((callout) => (
                <ManualCalloutCard key={callout.text} callout={callout} />
              ))}
            </div>
          ) : null}

          {step.hasDetailedGuide ? <DetailedWeekGuides /> : null}

          {step.youtube ? (
            <GuideYoutubeEmbed {...step.youtube} fallbackTitle={step.title} />
          ) : null}
        </div>
      </article>
    </li>
  );
}

export default function ExamStudyManualGuide() {
  const { intro, principles, planningSteps, executionTips } = EXAM_STUDY_MANUAL;

  return (
    <div className="w-full pb-8">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6eb0ff]">
          Study Manual
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">{intro.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-300 md:text-[15px]">
          {intro.description}
        </p>
        <ul className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {intro.highlights.map((highlight) => (
            <li
              key={highlight}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-200"
            >
              <span className="text-[#6eb0ff]" aria-hidden>
                ●
              </span>
              {highlight}
            </li>
          ))}
        </ul>
      </header>

      <section className="mb-8" aria-labelledby="principles-heading">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-zinc-900 md:p-6">
          <h2
            id="principles-heading"
            className="text-lg font-bold text-gray-900 dark:text-gray-100 md:text-xl"
          >
            {principles.title}
          </h2>
          <div className="mt-5 space-y-5">
            {principles.items.map((item) => (
              <div
                key={item.number}
                className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-neutral-700 dark:bg-zinc-800/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <SectionBadge>{item.number}</SectionBadge>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {item.title}
                  </h3>
                </div>
                <div className="mt-3 space-y-2">
                  {item.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-sm leading-relaxed text-gray-600 dark:text-gray-400"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
                {item.bullets ? (
                  <ul className="mt-3 space-y-2">
                    {item.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex gap-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1b76e0]" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mb-8">
        <PlanningFlowBar />
      </div>

      <ol className="list-none">
        {planningSteps.map((step, index) => (
          <PlanningStepCard
            key={step.step}
            step={step}
            isLast={index === planningSteps.length - 1}
          />
        ))}
      </ol>

      <section className="flex gap-4 md:gap-6" aria-label="추가 팁">
        <div className="flex w-10 shrink-0 justify-center">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white shadow-sm shadow-amber-500/25"
            aria-hidden
          >
            !
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-amber-900/40 dark:bg-zinc-900 md:p-6">
            <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold tracking-[0.12em] text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              TIP!
            </span>
            <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-gray-100 md:text-xl">
              {executionTips.title}
            </h3>
            <div className="mt-3 space-y-2">
              {executionTips.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 md:text-[15px]"
                >
                  {paragraph}
                </p>
              ))}
            </div>
            {executionTips.youtube ? (
              <GuideYoutubeEmbed
                {...executionTips.youtube}
                fallbackTitle={executionTips.title}
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
