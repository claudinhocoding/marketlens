"use client";

import { useEffect, useRef } from "react";
import { db } from "@/lib/db";

export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { isLoading, user, error } = db.useAuth();
  const hasAttemptedGuestSignIn = useRef(false);

  useEffect(() => {
    if (isLoading || user || error || hasAttemptedGuestSignIn.current) {
      return;
    }

    hasAttemptedGuestSignIn.current = true;
    db.auth.signInAsGuest().catch(() => {
      hasAttemptedGuestSignIn.current = false;
    });
  }, [isLoading, user, error]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-danger text-sm px-4 text-center">
        Failed to start secure session: {error.message}
      </div>
    );
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm">
        Initializing secure session…
      </div>
    );
  }

  return <>{children}</>;
}
