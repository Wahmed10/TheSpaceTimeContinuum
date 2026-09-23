import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Continuum — Space & Time, Connected',
  description:
    'An interactive window into our solar system. Explore worlds, follow their motion, and travel through time.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
