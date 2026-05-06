"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const AuthContext = createContext(null);

export function AuthProvider({ children, state }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Mark as initialized after first render
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    // Only handle redirects after initialization
    if (!isInitialized) return;

    const isAuthPage = pathname === "/auth";
    const isLandingPage = pathname === "/";
    const segments = pathname.split("/").filter(Boolean);
    const isPublicPage =
      isLandingPage ||
      isAuthPage ||
      ((segments.length === 1 || segments.length === 2) && !["dashboard", "auth"].includes(segments[0]));
    const isAuthenticated = !!(state.token && state.user);

    // Redirect to dashboard if authenticated and on auth/landing page
    if (isAuthenticated && (isAuthPage || isLandingPage)) {
      router.push("/dashboard");
    }
    // Redirect to auth if not authenticated and not on public pages
    else if (!isAuthenticated && !isPublicPage) {
      router.push("/auth");
    }
  }, [isInitialized, state.token, state.user, pathname, router]);

  return (
    <AuthContext.Provider value={{ isInitialized, isAuthenticated: !!(state.token && state.user) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
