import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingHeader from '@/components/marketing/MarketingHeader';
import './marketing.css';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-site flex min-h-screen flex-col bg-mkt-surface text-mkt-text">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
