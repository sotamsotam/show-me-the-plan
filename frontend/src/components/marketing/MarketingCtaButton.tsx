import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'inverse' | 'outline-light';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:shadow-blue-700/30',
  secondary:
    'border-2 border-gray-200 bg-white text-gray-900 hover:border-blue-200 hover:bg-blue-50',
  inverse: 'bg-white text-blue-700 shadow-lg shadow-black/10 hover:bg-blue-50',
  'outline-light': 'border-2 border-white/40 bg-transparent text-white hover:bg-white/10',
};

type MarketingCtaButtonProps = {
  label: string;
  href: string;
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

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center transition-all duration-200 ${sizeClasses} ${variantClasses[variant]} ${className}`}
    >
      {label}
    </Link>
  );
}
