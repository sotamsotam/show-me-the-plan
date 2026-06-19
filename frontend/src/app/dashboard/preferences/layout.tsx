import PreferencesLayout from './PreferencesLayout';

export default function PreferencesRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PreferencesLayout>{children}</PreferencesLayout>;
}
