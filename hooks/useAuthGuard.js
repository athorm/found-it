// hooks/useAuthGuard.js
// Single source of truth for route protection.
// Usage in any protected page:
//   const { user, authLoading } = useAuthGuard();
//   if (authLoading) return <Spinner />;

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function useAuthGuard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!session) {
        router.replace("/login");
        return;
      }
      setUser(session.user);
      setAuthLoading(false);
    };

    checkSession();

    // Also react to auth state changes (e.g. logout in another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        router.replace("/login");
      } else {
        setUser(session.user);
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return { user, authLoading };
}
