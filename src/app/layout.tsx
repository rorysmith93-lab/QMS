import type { Metadata, Viewport } from "next";
import {
  IBM_Plex_Sans,
  Inter,
  Manrope,
  Source_Sans_3,
  Space_Grotesk,
  Work_Sans,
} from "next/font/google";
import Script from "next/script";
import { DEFAULT_BRAND_COLOR } from "@/lib/color";
import "./globals.css";

// The curated font set (src/lib/fonts.ts) — next/font requires static
// imports, so every option is loaded here once, each under its own CSS
// variable. Which one actually renders for a given company is decided by
// --font-sans (see globals.css + dashboard/layout.tsx), not by which of
// these classNames "wins" — all are just available.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin"] });
const sourceSans = Source_Sans_3({ variable: "--font-source-sans", subsets: ["latin"] });
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });

const FONT_VARIABLES = [
  inter.variable,
  manrope.variable,
  workSans.variable,
  sourceSans.variable,
  ibmPlexSans.variable,
  spaceGrotesk.variable,
].join(" ");

export const metadata: Metadata = {
  title: "QMS Rapid",
  description: "Quality Management System for small manufacturers",
  // Makes "Add to Home Screen" open full-screen with no Safari chrome,
  // instead of just being a bookmarked tab.
  appleWebApp: {
    capable: true,
    title: "QMS Rapid",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: DEFAULT_BRAND_COLOR,
  // Lets content draw into the notch/home-indicator safe areas on iPhone
  // instead of leaving a plain-colour bar there when running full-screen.
  viewportFit: "cover",
};

// Picks light/dark BEFORE the page paints, so there's no flash of the
// wrong theme while React hydrates. Runs on every page, logged in or not.
const THEME_INIT_SCRIPT = `
  (function () {
    try {
      var stored = localStorage.getItem('theme');
      var theme =
        stored === 'light' || stored === 'dark'
          ? stored
          : window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark';
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {}
  })();
`;

// Same idea, for the dashboard sidebar's collapsed/expanded state — see
// the .sidebar-aside rules in globals.css. Harmless on pages without a
// sidebar, so it's fine to run everywhere rather than only in the
// dashboard layout.
const SIDEBAR_INIT_SCRIPT = `
  (function () {
    try {
      var collapsed = localStorage.getItem('sidebarCollapsed') === '1';
      document.documentElement.setAttribute('data-sidebar', collapsed ? 'collapsed' : 'expanded');
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme-init script above sets
    // data-theme on this exact element before React hydrates. That's
    // expected and intentional, not a real mismatch — this tells React
    // not to warn about attributes on <html> specifically.
    <html lang="en" className={`${FONT_VARIABLES} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Google's icon library — every icon in the sidebar (icons.tsx)
            renders as a ligature from this font rather than hand-drawn
            SVG. display=block avoids a flash of literal words like
            "home" before the font loads — swap (the usual recommendation
            for text fonts) would show that flash, which is worse for an
            icon font specifically. This is the App Router (no pages/
            directory), where a <link> in the root layout is the
            documented way to load an external stylesheet like this. */}
        {/* eslint-disable-next-line @next/next/google-font-display, @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&display=block"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <Script id="sidebar-init" strategy="beforeInteractive">
          {SIDEBAR_INIT_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}
