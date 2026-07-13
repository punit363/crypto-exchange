"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getActiveUser } from "../utils/httpClient";

/* STREAMING_CHUNK: Initializing state and dynamic client router... */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Centralized dynamic authorization evaluator
    const checkAuth = () => {
      const user = getActiveUser();
      
      if (!user) {
        setIsAuthenticated(false);
        // Instantly push back to home page (where LoginGate resides) on auth loss
        router.replace("/");
      } else {
        setIsAuthenticated(true);
      }
    };

    // Perform check immediately on mount
    checkAuth();

    /* STREAMING_CHUNK: Binding real-time event listeners... */
    // LISTEN FOR LOGOUT EVENTS IN REAL-TIME:
    // When the logout API fires, it dispatches "auth_change" globally.
    // This handler intercepts that event and instantly kicks the user out.
    window.addEventListener("auth_change", checkAuth);
    
    return () => {
      window.removeEventListener("auth_change", checkAuth);
    };
  }, [router]);

  /* STREAMING_CHUNK: Rendering protective fallback screen... */
  // Show a premium loading spinner while the auth state is being verified
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen w-full bg-[#0E1015] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00C278]/20 border-t-[#00C278] rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium tracking-wide">Syncing terminal...</span>
        </div>
      </div>
    );
  }

  // Only render protected layout trees if validation evaluates to true
  return isAuthenticated ? <>{children}</> : null;
}