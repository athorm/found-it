import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased [--item-card-bg:#222] [--item-card-border:1px_solid_#333]`}
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