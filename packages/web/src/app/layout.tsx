import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, IBM_Plex_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import { Providers } from './providers';

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://swarmrecall.ai'),
  title: 'SwarmRecall — Memory for AI Agents',
  description:
    'Persistent memory, knowledge, learnings, and skills for AI agents. Your agents remember everything.',
  openGraph: {
    title: 'SwarmRecall',
    description:
      'Persistent memory, knowledge, learnings, and skills for AI agents',
    url: 'https://swarmrecall.ai',
    siteName: 'SwarmRecall',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SwarmRecall',
    description: 'Your agents remember everything.',
  },
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0A0A0A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${jetbrainsMono.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] antialiased font-body">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
