import type {
  GuideContent,
  GuideSection,
  GuideStep,
  GuideSubSection,
  GuideTip,
} from '@/content/guide/types';
import GuideScreenshotPlaceholder from './GuideScreenshotPlaceholder';
import GuideSectionIcon from './GuideSectionIcon';

function StepBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-[#1b76e0]/10 px-2.5 py-1 text-[11px] font-bold tracking-[0.12em] text-[#1b76e0] dark:bg-[#1b76e0]/20 dark:text-[#6eb0ff]">
      STEP {label}
    </span>
  );
}

function TipBadge() {
  return (
    <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold tracking-[0.12em] text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
      TIP!
    </span>
  );
}

function GuideTipSection({ tip, tipIndex }: { tip: GuideTip; tipIndex: number }) {
  return (
    <section className="flex gap-4 md:gap-6" aria-label={`추가 팁 ${tipIndex + 1}`}>
      <div className="flex w-10 shrink-0 justify-center">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white shadow-sm shadow-amber-500/25"
          aria-hidden
        >
          !
        </div>
      </div>

      <div className="min-w-0 flex-1 pb-10">
        <div className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-amber-900/40 dark:bg-zinc-900 md:p-6">
          <TipBadge />
          <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-gray-100 md:text-xl">
            {tip.title}
          </h3>
          <div className="mt-3 space-y-2">
            {tip.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 md:text-[15px]"
              >
                {paragraph}
              </p>
            ))}
          </div>
          <GuideScreenshotPlaceholder label={`화면 이미지 준비 중 (TIP ${tipIndex + 1})`} />
        </div>
      </div>
    </section>
  );
}

function GuideStepScreenshots({ label }: { label: string }) {
  return <GuideScreenshotPlaceholder label={label} />;
}

function GuideStepBlocks({
  blocks,
  stepLabel,
}: {
  blocks: NonNullable<GuideStep['blocks']>;
  stepLabel: string;
}) {
  return (
    <div className="mt-3 space-y-3">
      {blocks.map((block, index) =>
        block.type === 'text' ? (
          <p
            key={`${index}-${block.content}`}
            className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 md:text-[15px]"
          >
            {block.content}
          </p>
        ) : (
          <GuideScreenshotPlaceholder
            key={`${index}-screenshot`}
            label={block.label ?? `화면 이미지 준비 중 (STEP ${stepLabel})`}
          />
        ),
      )}
    </div>
  );
}

function GuideContentBody({
  title,
  paragraphs,
  blocks,
  links,
  subSections,
  screenshotLabel,
  blockScreenshotFallback,
  screenshotPlaceholderLabel,
  showTitle = true,
}: {
  title: string;
  paragraphs: string[];
  blocks?: GuideStep['blocks'];
  links?: GuideStep['links'];
  subSections?: GuideSubSection[];
  screenshotLabel: string;
  blockScreenshotFallback?: string;
  screenshotPlaceholderLabel: string;
  showTitle?: boolean;
}) {
  return (
    <>
      {showTitle ? (
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 md:text-xl">
          {title}
        </h3>
      ) : null}

      {blocks ? (
        <GuideStepBlocks
          blocks={blocks}
          stepLabel={blockScreenshotFallback ?? screenshotLabel}
        />
      ) : (
        <div className={showTitle ? 'mt-3 space-y-2' : 'space-y-2'}>
          {paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 md:text-[15px]"
            >
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {links && links.length > 0 ? (
        <div className="mt-4 space-y-2">
          {links.map((link) =>
            link.href && !link.pending ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1b76e0] hover:underline dark:text-[#6eb0ff]"
              >
                {link.label}
                <span aria-hidden>↗</span>
              </a>
            ) : (
              <p
                key={link.label}
                className="text-sm text-gray-500 dark:text-gray-400"
              >
                {link.label}: 유튜브 영상 준비 중
              </p>
            ),
          )}
        </div>
      ) : null}

      {subSections ? (
        <div className="mt-5 space-y-3">
          {subSections.map((section) => (
            <div key={section.stepLabel} className="space-y-3">
              <SubSectionCard section={section} />
              <GuideScreenshotPlaceholder
                label={`화면 이미지 준비 중 (STEP ${section.stepLabel})`}
              />
            </div>
          ))}
        </div>
      ) : blocks ? null : (
        <GuideStepScreenshots label={screenshotPlaceholderLabel} />
      )}
    </>
  );
}

function GuideContentCard({
  title,
  paragraphs,
  blocks,
  links,
  subSections,
  screenshotLabel,
  blockScreenshotFallback,
  screenshotPlaceholderLabel,
}: {
  title: string;
  paragraphs: string[];
  blocks?: GuideStep['blocks'];
  links?: GuideStep['links'];
  subSections?: GuideSubSection[];
  screenshotLabel: string;
  blockScreenshotFallback?: string;
  screenshotPlaceholderLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-zinc-900 md:p-6">
      <GuideContentBody
        title={title}
        paragraphs={paragraphs}
        blocks={blocks}
        links={links}
        subSections={subSections}
        screenshotLabel={screenshotLabel}
        blockScreenshotFallback={blockScreenshotFallback}
        screenshotPlaceholderLabel={screenshotPlaceholderLabel}
      />
    </div>
  );
}

function GuideSectionCard({
  section,
  isLast,
}: {
  section: GuideSection;
  isLast: boolean;
}) {
  return (
    <section className="flex gap-4 md:gap-6">
      <div className="flex flex-col items-center">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1b76e0] text-white shadow-sm shadow-[#1b76e0]/25"
          aria-hidden
        >
          <GuideSectionIcon name={section.icon} className="h-5 w-5" />
        </div>
        {!isLast ? (
          <div
            className="mt-2 w-px flex-1 bg-gradient-to-b from-[#1b76e0]/40 to-gray-200 dark:to-neutral-700"
            aria-hidden
          />
        ) : null}
      </div>

      <article className={`min-w-0 flex-1 ${isLast ? 'pb-8' : 'pb-10'}`}>
        <GuideContentCard
          title={section.title}
          paragraphs={section.paragraphs}
          blocks={section.blocks}
          links={section.links}
          screenshotLabel={section.title}
          blockScreenshotFallback={section.title}
          screenshotPlaceholderLabel="화면 이미지 준비 중"
        />
      </article>
    </section>
  );
}

function SubSectionCard({ section }: { section: GuideSubSection }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-neutral-700 dark:bg-zinc-800/50">
      <div className="flex flex-wrap items-center gap-2">
        <StepBadge label={section.stepLabel} />
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {section.title}
        </h4>
      </div>
      <ul className="mt-3 space-y-3">
        {section.items.map((item) => (
          <li key={item.title} className="flex gap-3">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1b76e0]"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {item.title}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuideStepCard({
  step,
  isLast,
}: {
  step: GuideStep;
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
          <StepBadge label={stepLabel} />
          <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-gray-100 md:text-xl">
            {step.title}
          </h3>
          <GuideContentBody
            title={step.title}
            paragraphs={step.paragraphs}
            blocks={step.blocks}
            links={step.links}
            subSections={step.subSections}
            screenshotLabel={stepLabel}
            blockScreenshotFallback={stepLabel}
            screenshotPlaceholderLabel={`화면 이미지 준비 중 (STEP ${stepLabel})`}
            showTitle={false}
          />
        </div>
      </article>
    </li>
  );
}

export default function GuideTimeline({ intro, steps, sections, tips }: GuideContent) {
  const hasTips = tips && tips.length > 0;
  const hasSections = sections && sections.length > 0;

  return (
    <div className="w-full pb-8">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6eb0ff]">
          Guide
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">
          {intro.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-300 md:text-[15px]">
          {intro.description}
        </p>
      </header>

      {steps.length > 0 ? (
        <ol className="list-none">
          {steps.map((step, index) => (
            <GuideStepCard
              key={step.step}
              step={step}
              isLast={!hasTips && !hasSections && index === steps.length - 1}
            />
          ))}
        </ol>
      ) : null}

      {sections?.map((section, index) => (
        <GuideSectionCard
          key={section.title}
          section={section}
          isLast={!hasTips && index === sections.length - 1}
        />
      ))}

      {tips?.map((tip, index) => (
        <GuideTipSection key={tip.title} tip={tip} tipIndex={index} />
      ))}
    </div>
  );
}
