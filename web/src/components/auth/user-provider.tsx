"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { AuthUser } from "@/lib/auth/types";

interface UserContextValue {
  user: AuthUser | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const response = await fetch("/api/agent/v1/auth/me");

    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }

    const data = await response.json();
    setUser(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (isLoading) {
    return (
      <main className="flex h-screen w-full az-aurora-bg text-foreground items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="az-orb az-orb-pulse" style={{ width: 28, height: 28 }} />
          <p
            className="text-sm"
            style={{
              color: "var(--gray-text)",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            Authenticating
          </p>
        </div>
      </main>
    );
  }

  return (
    <UserContext.Provider value={{ user, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
