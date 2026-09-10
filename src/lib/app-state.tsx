import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getCurrentUser, type User } from "@/api/mockClient";

interface AppState {
  user: User | null;
  rev: number;
  refresh: () => void;
}

const Ctx = createContext<AppState>({ user: null, rev: 0, refresh: () => {} });

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    let alive = true;
    getCurrentUser()
      .then((u) => alive && setUser(u))
      .catch(() => alive && setUser(null));
    return () => {
      alive = false;
    };
  }, [rev]);

  const refresh = useCallback(() => setRev((r) => r + 1), []);

  return <Ctx.Provider value={{ user, rev, refresh }}>{children}</Ctx.Provider>;
}


export const useApp = () => useContext(Ctx);

/** Read-only async resource that re-runs whenever the app revision bumps. */
export function useApi<T>(loader: () => Promise<T>, deps: unknown[]) {
  const { rev } = useApp();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loaderRef
      .current()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setData(null);
        setError(e instanceof Error ? e.message : "Something went wrong");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, rev]);

  return { data, error, loading };
}

/** Runs a mock-client mutation, surfaces API errors, and refreshes readers. */
export function useMutate() {
  const { refresh } = useApp();
  return useCallback(
    async <T,>(action: () => Promise<T>, successMessage?: string): Promise<T | null> => {
      try {
        const result = await action();
        if (successMessage) toast.success(successMessage);
        refresh();
        return result;
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
        refresh();
        return null;
      }
    },
    [refresh],
  );
}
