import ManagerGuideAccessGuard from './ManagerGuideAccessGuard';
import ManagerGuideLayout from './ManagerGuideLayout';

export default function ManagerGuideRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ManagerGuideAccessGuard>
      <ManagerGuideLayout>{children}</ManagerGuideLayout>
    </ManagerGuideAccessGuard>
  );
}
