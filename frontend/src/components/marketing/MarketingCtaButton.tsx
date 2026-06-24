import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'inverse' | 'outline-light';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-mkt-accent text-white shadow-mkt-cta hover:bg-mkt-accent-hover hover:shadow-mkt-hover',
  secondary:
    'border-2 border-mkt-border bg-mkt-surface text-mkt-text hover:border-mkt-primary-light/30 hover:bg-mkt-surface-warm',
  inverse:
    'bg-white text-mkt-accent shadow-lg shadow-black/10 hover:bg-mkt-surface-warm',
  'outline-light':
    'border-2 border-white/40 bg-transparent text-white hover:bg-white/10',
};

type MarketingCtaButtonProps = {
  label: string;
  href?: string;
  variant?: ButtonVariant;
  className?: string;
  size?: 'md' | 'lg';
};

export default function MarketingCtaButton({
  label,
  href,
  variant = 'primary',
  className = '',
  size = 'md',
}: MarketingCtaButtonProps) {
  const sizeClasses =
    size === 'lg'
      ? 'rounded-full px-8 py-4 text-base font-bold'
      : 'rounded-full px-6 py-3 text-sm font-bold';

  const combinedClassName = `inline-flex items-center justify-center transition-all duration-200 ${sizeClasses} ${variantClasses[variant]} ${className}`;

  if (!href) {
    return <span className={combinedClassName}>{label}</span>;
  }

  return (
    <Link href={href} className={combinedClassName}>
      {label}
    </Link>
  );
}
