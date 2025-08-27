import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Xpress Ops Tower',
    template: '%s | Xpress Ops Tower',
  },
  description: 'Real-time operations command center with XPRESS Design System integration',
  keywords: ['operations', 'dashboard', 'real-time', 'monitoring', 'Philippines'],
  authors: [{ name: 'Xpress Ops Team' }],
  creator: 'Xpress Ops Team',
  publisher: 'Xpress Ops',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: process.env.NODE_ENV === 'production',
    follow: process.env.NODE_ENV === 'production',
    googleBot: {
      index: process.env.NODE_ENV === 'production',
      follow: process.env.NODE_ENV === 'production',
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'Xpress Ops Tower',
    title: 'Xpress Ops Tower - Real-time Operations Dashboard',
    description: 'Real-time operations command center with XPRESS Design System integration',
    locale: 'en_PH',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xpress Ops Tower',
    description: 'Real-time operations command center with XPRESS Design System integration',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en-PH' className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className='font-sans antialiased'>
        {children}
      </body>
    </html>
  );
}