// =============================================================================
//  FONT CONFIGURATION — layout.js
//  -----------------------------------------------------------------------
//  HOW TO CHANGE THE FONT:
//
//  1. Pick ONE font block from the options below and UNCOMMENT it.
//  2. COMMENT OUT all other font blocks (the ones you're not using).
//  3. Replace the `activeFontVariable` in the <html> className (line ~70)
//     with the variable name of the font you picked (shown in each block).
//  4. Save and the font will apply globally to the entire site.
//
//  ✅ CURRENTLY ACTIVE: Plus Jakarta Sans  (closest match to Google Sans)
// =============================================================================

// =============================================================================
//  FONT OPTIONS — Uncomment ONLY ONE block at a time
// =============================================================================

// ── OPTION 1: Plus Jakarta Sans ─────────────────────────────────────────────
//  Closest feel to Google Sans. Modern, rounded, humanist. ✅ ACTIVE
// import { Plus_Jakarta_Sans } from "next/font/google";
// const activeFont = Plus_Jakarta_Sans({
//   variable: "--font-active",   // ← Use "--font-active" in className below
//   subsets: ["latin"],
//   weight: ["300", "400", "500", "600", "700", "800"],
// });
// ─────────────────────────────────────────────────────────────────────────────

// ── OPTION 2: DM Sans ────────────────────────────────────────────────────────
//  Very clean & geometric. Great for UI. Also feels similar to Google Sans.
//  HOW TO USE: Uncomment below, comment out Option 1 above.
// import { DM_Sans } from "next/font/google";
// const activeFont = DM_Sans({
//   variable: "--font-active",
//   subsets: ["latin"],
//   weight: ["300", "400", "500", "600", "700"],
// });
// ─────────────────────────────────────────────────────────────────────────────

// ── OPTION 3: Inter ───────────────────────────────────────────────────────────
//  The industry standard. Used by Notion, Linear, GitHub. Extremely readable.
//  HOW TO USE: Uncomment below, comment out the active option above.
// import { Inter } from "next/font/google";
// const activeFont = Inter({
//   variable: "--font-active",
//   subsets: ["latin"],
//   weight: ["300", "400", "500", "600", "700", "800", "900"],
// });
// ─────────────────────────────────────────────────────────────────────────────

// ── OPTION 4: Outfit ─────────────────────────────────────────────────────────
//  Warm and modern. Slightly rounder than Inter. Great for mobile-first apps.
//  HOW TO USE: Uncomment below, comment out the active option above.
// import { Outfit } from "next/font/google";
// const activeFont = Outfit({
//   variable: "--font-active",
//   subsets: ["latin"],
//   weight: ["300", "400", "500", "600", "700", "800", "900"],
// });
// ─────────────────────────────────────────────────────────────────────────────

// ── OPTION 5: Nunito ─────────────────────────────────────────────────────────
//  Friendly, very rounded. Good for apps targeting students / younger audience.
//  HOW TO USE: Uncomment below, comment out the active option above.
// import { Nunito } from "next/font/google";
// const activeFont = Nunito({
//   variable: "--font-active",
//   subsets: ["latin"],
//   weight: ["300", "400", "500", "600", "700", "800", "900"],
// });
// ─────────────────────────────────────────────────────────────────────────────

// ── OPTION 6: Sora ───────────────────────────────────────────────────────────
//  Futuristic and techy. Narrow, sharp. Great for dark-themed apps.
//  HOW TO USE: Uncomment below, comment out the active option above.
// import { Sora } from "next/font/google";
// const activeFont = Sora({
//   variable: "--font-active",
//   subsets: ["latin"],
//   weight: ["300", "400", "500", "600", "700", "800"],
// });
// ─────────────────────────────────────────────────────────────────────────────

// ── OPTION 7: Geist (original — Next.js default) ─────────────────────────────
//  The font this project shipped with. Clean, modern, sharp.
//  HOW TO USE: Uncomment below, comment out the active option above.
import { Geist } from "next/font/google";
const activeFont = Geist({
  variable: "--font-active",
  subsets: ["latin"],
});
// ─────────────────────────────────────────────────────────────────────────────

import "./globals.css";
import ClientShell from "@/components/ClientShell";

export const metadata = {
  title: "FoundIt",
  description: "Lost and Found Items",
  icons: {
    icon: "/logo2.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      // ─────────────────────────────────────────────────────────────────────
      //  className note:
      //  - `${activeFont.variable}` injects the "--font-active" CSS variable.
      //  - "font-sans" (or `style={{ fontFamily: "var(--font-active)" }}`)
      //    applies it. Tailwind's `font-sans` uses the first sans-serif stack,
      //    but we override it via globals.css below.
      // ─────────────────────────────────────────────────────────────────────
      className={`${activeFont.variable} h-full antialiased [--item-card-bg:#222] [--item-card-border:1px_solid_#333]`}
    >
      {/* Set base body to a dark charcoal gray instead of pure black for a softer look */}
      <body className="min-h-full flex flex-col bg-[#141414] text-white">
        
        {/* GLOBAL FIXED BACKGROUND (HANDLES MOBILE AND DESKTOP)
            - inset-0 + fixed: stretches to full viewport and stays put.
            - Background: Simple subtle wash.
            - Use pointer-events-none ensures interaction is not affected.
        */}
        <div 
          className="fixed inset-0 z-[-1] pointer-events-none" 
          style={{
            // Layered subtle background for depth
            background: `
              radial-gradient(circle at center bottom, #c2410c11 0%, transparent 60%),
              linear-gradient(to bottom, #101010 0%, #141414 100%)
            `,
            backgroundColor: '#141414'
          }}
        />

        {/* This div applies specific mobile-only adjustments (center-bottom light) */}
        <div 
          className="md:hidden fixed inset-0 z-[-1] pointer-events-none" 
          style={{
            // Still central at the bottom, but the intensity is drastically reduced
            background: `radial-gradient(circle at center bottom, #c2410c22 0%, transparent 70%)`,
          }}
        />

        <ClientShell>
          <main className="flex-grow">
            {children}
          </main>
        </ClientShell>
      </body>
    </html>
  );
}