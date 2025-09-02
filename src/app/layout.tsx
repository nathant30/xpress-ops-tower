import type { Metadata } from 'next';
import { Inter, Poppins, JetBrains_Mono } from 'next/font/google';

import '@/styles/globals.css';
import AppLayout from '@/components/AppLayout';
import { ServiceTypeProvider } from '@/contexts/ServiceTypeContext';
import { EnhancedAuthProvider } from '@/hooks/useEnhancedAuth';
import { RBACProvider } from '@/hooks/useRBAC';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['300', '400', '500', '600', '700'],
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
  description: 'Xpress Ops Tower - Advanced operations management platform for dispatch, driver management, and passenger analytics',
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
    siteName: 'Xpress Ops Tower',
    title: 'Xpress Ops Tower',
    description: 'Real-time command center for dispatch, driver management, and passenger analytics in the Philippines',
    locale: 'en_PH',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xpress Ops Tower',
    description: 'Xpress Ops Tower - Advanced operations management platform for dispatch and analytics',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en-PH' className={`${inter.variable} ${poppins.variable} ${jetbrainsMono.variable}`}>
      <body className='font-sans antialiased'>
        <RBACProvider>
          <EnhancedAuthProvider>
            <ServiceTypeProvider>
              <AppLayout>
                {children}
              </AppLayout>
            </ServiceTypeProvider>
          </EnhancedAuthProvider>
        </RBACProvider>
      </body>
    </html>
  );
}