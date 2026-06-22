import SectionHeading from '@/components/marketing/SectionHeading';

export function MultilineText({
  text,
  className = '',
  stacked = false,
  lineGap = 'gap-2 sm:gap-3',
}: {
  text: string;
  className?: string;
  stacked?: boolean;
  lineGap?: string;
}) {
  const lines = text.split('\n');

  if (stacked && lines.length > 1) {
    return (
      <span className={`flex flex-col ${lineGap} ${className}`}>
        {lines.map((line, index) => (
          <span key={index} className="block">
            {line}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className={className}>
      {lines.map((line, index) => (
        <span key={index}>
          {line}
          {index < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </span>
  );
}

type MarketingSectionProps = {
  title?: string;
  eyebrow?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
  variant?: 'default' | 'alt' | 'warm' | 'accent-tint' | 'primary-tint' | 'accent-strong';
};

const variantClasses = {
  default: 'bg-mkt-surface',
  alt: 'bg-mkt-surface-alt',
  warm: 'bg-mkt-surface-warm',
  'accent-tint': 'mkt-section-accent-tint',
  'primary-tint': 'mkt-section-primary-tint',
  'accent-strong': 'mkt-section-accent-strong',
};

export function MarketingSection({
  title,
  eyebrow,
  description,
  children,
  className = '',
  id,
  variant = 'default',
}: MarketingSectionProps) {
  return (
    <section
      id={id}
      className={`py-16 sm:py-20 lg:py-24 ${variantClasses[variant]} ${className}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {title ? (
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            description={description}
          />
        ) : null}
        {children}
      </div>
    </section>
  );
}
