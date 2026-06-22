import { MarketingIcon, PROCESS_STEP_ICONS } from '@/components/marketing/MarketingIcons';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { ProcessStep } from '@/content/marketing/types';

export default function ProcessSection({
  title,
  eyebrow = '이용 방법',
  description,
  steps,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  steps: ProcessStep[];
}) {
  return (
    <MarketingSection title={title} eyebrow={eyebrow} description={description} variant="primary-tint">
      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="mkt-card-elevated relative flex flex-col p-6"
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
    </MarketingSection>
  );
}
