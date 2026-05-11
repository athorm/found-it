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
      <body className="min-h-full flex flex-col">
        {/* GLOBAL FIXED BACKGROUND — radial orange glow at bottom on dark base */}
        <div 
          className="fixed inset-0 z-[-1] pointer-events-none" 
          style={{
            background: `
              radial-gradient(circle at center bottom, #c2410c11 0%, transparent 60%),
              linear-gradient(to bottom, #101010 0%, #141414 100%)
            `,
            backgroundColor: '#141414'
          }}
        />
        {/* Extra subtle orange glow — mobile only */}
        <div 
          className="md:hidden fixed inset-0 z-[-1] pointer-events-none" 
          style={{
            background: `radial-gradient(circle at center bottom, #c2410c22 0%, transparent 70%)`,
          }}
        />
        {/* ClientShell handles client-side providers and the notification bubble */}
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}