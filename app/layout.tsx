import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeController from '@/components/ThemeController'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Answer Engine',
  description: 'ChatGPT-style interface for Snowflake Cortex Agents',
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var key='cortex_theme_preference';var pref=localStorage.getItem(key)||'system';var dark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=pref==='dark'||(pref==='system'&&dark)?'dark':'light';var root=document.documentElement;root.classList.toggle('dark',resolved==='dark');root.setAttribute('data-theme',resolved);}catch(_){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeController />
        {children}
      </body>
    </html>
  );
}
