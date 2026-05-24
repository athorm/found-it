"use client";
import { usePathname } from "next/navigation";
import NotificationListener from "@/app/notif/notif";
import { Toaster } from "react-hot-toast";
import { DataCacheProvider } from "@/lib/dataCache";

/**
 * ClientShell — thin client wrapper around the root layout.
 *
 * Responsibilities:
 *  - Reads the current pathname (requires "use client")
 *  - Mounts NotificationListener on every page EXCEPT /chat,
 *    because on /chat the user is already reading the conversation.
 *  - Mounts global Toaster for application-wide toast notifications.
 *  - Provides the DataCacheProvider for in-memory page caching.
 */
export default function ClientShell({ children }) {
  const pathname = usePathname();
  const showNotifBubble = !pathname?.startsWith("/chat");

  return (
    <DataCacheProvider>
      <Toaster position="bottom-center" toastOptions={{
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '1rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }
      }} />
      {showNotifBubble && <NotificationListener />}
      {children}
    </DataCacheProvider>
  );
}
