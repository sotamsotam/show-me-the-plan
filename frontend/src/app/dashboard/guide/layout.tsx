import GuideLayout from './GuideLayout';

export default function GuideRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <GuideLayout>{children}</GuideLayout>;
}
