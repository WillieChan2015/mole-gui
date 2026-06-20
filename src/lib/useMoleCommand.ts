import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "./invoke";
import { safeListen } from "./safeListen";

export interface CommandState<T> {
  status: "idle" | "loading" | "success" | "error";
  data: T | null;
  error: string | null;
  progress?: string;
}

export function useMoleCommand<T>(command: string, args?: Record<string, unknown>) {
  const [state, setState] = useState<CommandState<T>>({
    status: "idle",
    data: null,
    error: null,
  });

  const cancelledRef = useRef(false);
  const unlistenRef = useRef<(() => void) | null>(null);
  // Track loading via ref so the concurrency guard always reads the latest
  // value. Reading `state.status` inside `execute` would capture a stale
  // value because `state` is not in the deps array.
  const loadingRef = useRef(false);

  useEffect(() => {
    return () => {
      unlistenRef.current?.();
    };
  }, []);

  const execute = useCallback(async () => {
    // Prevent concurrent calls — read from ref, not state, to avoid the
    // stale-closure trap.
    if (loadingRef.current) return;
    loadingRef.current = true;
    cancelledRef.current = false;
    // 保留旧数据，避免界面闪烁
    setState((prev) => ({ status: "loading", data: prev.data, error: null }));

    // Listen for progress events if the command emits them
    const progressEvent = `${command}:progress`;
    unlistenRef.current?.();
    unlistenRef.current = await safeListen<string>(progressEvent, (event) => {
      if (!cancelledRef.current) {
        setState((prev) => ({ ...prev, progress: event.payload }));
      }
    });

    try {
      const data = await invoke<T>(command, args);
      if (!cancelledRef.current) {
        setState({ status: "success", data, error: null });
      }
    } catch (err) {
      if (!cancelledRef.current) {
        setState({
          status: "error",
          data: null,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } finally {
      unlistenRef.current?.();
      unlistenRef.current = null;
      loadingRef.current = false;
    }
  }, [command, args]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    loadingRef.current = false;
    unlistenRef.current?.();
    unlistenRef.current = null;
    setState({ status: "idle", data: null, error: null });
  }, []);

  return { state, execute, cancel };
}
