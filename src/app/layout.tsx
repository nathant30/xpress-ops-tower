import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import '@/styles/globals.css';
import AppLayout from '@/components/AppLayout';
import { ServiceTypeProvider } from '@/contexts/ServiceTypeContext';
import { AuthProvider } from '@/hooks/useAuth';

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
    default: 'Xpress Ridesharing Operations',
    template: '%s | Xpress Ridesharing Operations',
  },
  description: 'Professional ridesharing operations dashboard - Real-time command center for dispatch, driver management, and passenger analytics',
  keywords: ['ridesharing', 'operations', 'dashboard', 'dispatch', 'driver management', 'passenger analytics', 'real-time', 'Philippines', 'transportation', 'mobility'],
  authors: [{ name: 'Xpress Operations Team' }],
  creator: 'Xpress Operations Team',
  publisher: 'Xpress Ridesharing',
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
    siteName: 'Xpress Ridesharing Operations',
    title: 'Professional Ridesharing Operations Dashboard',
    description: 'Real-time command center for dispatch, driver management, and passenger analytics in the Philippines',
    locale: 'en_PH',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xpress Ridesharing Operations',
    description: 'Professional ridesharing operations dashboard - Real-time command center for dispatch and analytics',
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
        <AuthProvider>
          <ServiceTypeProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </ServiceTypeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}