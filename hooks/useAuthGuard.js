// hooks/useAuthGuard.js
// Single source of truth for route protection.
// Now also checks verification_status — unverified users get redirected
// to /pending-verification instead of seeing protected content.
//
// Session caching: After the first successful auth check, the session
// result is cached in a module-level variable so subsequent page
// navigations return the user instantly (no skeleton flash).
// Auth state change events still clear and re-check the cache.
//
// Usage in any protected page:
//   const { user, authLoading } = useAuthGuard();
//   if (authLoading) return <Spinner />;

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Module-level session cache — shared across all useAuthGuard instances.
// Survives component unmount/remount (page navigation) but dies on
// full page reload or tab close — exactly the behavior we want.
let _cachedUser = null;
let _sessionChecked = false;

export function useAuthGuard() {
  const router = useRouter();
  const [user, setUser] = useState(_cachedUser);
  const [authLoading, setAuthLoading] = useState(!_sessionChecked);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      // If we already have a cached session, skip the network call
      if (_cachedUser && _sessionChecked) {
        if (mounted) {
          setUser(_cachedUser);
          setAuthLoading(false);
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!session) {
        _cachedUser = null;
        _sessionChecked = false;
        router.replace("/login");
        return;
      }

      // Check verification status
      const { data: profile } = await supabase
        .from("profiles")
        .select("verification_status, is_banned, ban_reason")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (profile && profile.verification_status !== 'approved') {
        _cachedUser = null;
        _sessionChecked = false;
        router.replace("/pending-verification");
        return;
      }

      if (profile?.is_banned) {
        _cachedUser = null;
        _sessionChecked = false;
        router.replace("/banned");
        return;
      }

      // Cache the successful session result
      _cachedUser = session.user;
      _sessionChecked = true;
      setUser(session.user);
      setAuthLoading(false);
    };

    checkSession();

    // Also react to auth state changes (e.g. logout in another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        _cachedUser = null;
        _sessionChecked = false;
        router.replace("/login");
      } else {
        // Re-check verification on auth change (clear cache first)
        _sessionChecked = false;
        supabase
          .from("profiles")
          .select("verification_status, is_banned")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (!mounted) return;
            if (profile?.is_banned) {
              _cachedUser = null;
              router.replace("/banned");
            } else if (profile && profile.verification_status !== 'approved') {
              _cachedUser = null;
              router.replace("/pending-verification");
            } else {
              _cachedUser = session.user;
              _sessionChecked = true;
              setUser(session.user);
              setAuthLoading(false);
            }
          });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return { user, authLoading };
}

