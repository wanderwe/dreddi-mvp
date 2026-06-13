"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseOptional as supabase } from "@/lib/supabaseClient";
import { isMockAuthEnabled } from "@/lib/auth/getAuthState";

type UseAdminRpcResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useAdminRpc<T>(fn: string, args?: Record<string, unknown>): UseAdminRpcResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const argsKey = JSON.stringify(args ?? {});

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      if (isMockAuthEnabled()) {
        if (!cancelled) {
          setError("Admin panel is unavailable in mock auth mode.");
          setLoading(false);
        }
        return;
      }

      if (!supabase) {
        if (!cancelled) {
          setError("Supabase is not configured.");
          setLoading(false);
        }
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        if (!cancelled) {
          setError("You must be logged in.");
          setLoading(false);
        }
        return;
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc(fn, args ?? {});

      if (cancelled) return;

      if (rpcError) {
        setError(
          rpcError.message.includes("not authorized")
            ? "You do not have access to the admin panel."
            : rpcError.message
        );
        setLoading(false);
        return;
      }

      setData(rpcData as T);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn, argsKey, reloadToken]);

  return { data, loading, error, reload };
}
