import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "./invoke";
import { safeListen } from "./safeListen";

/**
 * 通用 Mole 流式命令 hook —— 封装 progress 事件监听、completed 事件监听、
 * listener 清理、progressLines 状态管理。
 *
 * 用法:
 *   const { progressLines, isStreaming, start } = useMoleStream("clean");
 *   const rawOutput = await start("clean:scan_completed", "clean_scan");
 *   const data = parseOutput(rawOutput);
 */
export function useMoleStream(module: string) {
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const unlistenRefs = useRef<(() => void)[]>([]);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      unlistenRefs.current.forEach((unlisten) => unlisten());
    };
  }, []);

  /**
   * 启动流式命令。
   *
   * @param completedEvent - 后端完成时 emit 的事件名（如 "clean:scan_completed"）
   * @param command        - Tauri invoke 命令名（如 "clean_scan"）
   * @param args           - invoke 参数（可选）
   * @returns invoke 命令的返回值（默认 string，可泛型指定）。
   *
   * 失败时抛出异常，调用方应 catch 并处理错误。
   * isStreaming 在 completed 事件到达或 invoke 失败时自动重置为 false。
   */
  const start = useCallback(
    async <T = string>(
      completedEvent: string,
      command: string,
      args?: Record<string, unknown>,
    ): Promise<T> => {
      setIsStreaming(true);
      setProgressLines([]);

      // Clean up previous listeners
      unlistenRefs.current.forEach((unlisten) => unlisten());
      unlistenRefs.current = [];

      // Set up progress listener
      const unlistenProgress = await safeListen<string>(
        `${module}:progress`,
        (event) => {
          setProgressLines((prev) => [...prev, event.payload]);
        },
      );
      unlistenRefs.current.push(unlistenProgress);

      // Set up completed listener — resets isStreaming when backend signals done
      const unlistenCompleted = await safeListen<void>(completedEvent, () => {
        setIsStreaming(false);
        unlistenRefs.current.forEach((unlisten) => unlisten());
        unlistenRefs.current = [];
      });
      unlistenRefs.current.push(unlistenCompleted);

      try {
        const result = await invoke<T>(command, args);
        return result;
      } catch (err) {
        // If invoke itself fails, reset streaming state immediately
        // (the completed event won't fire in this case)
        setIsStreaming(false);
        throw err;
      }
    },
    [module],
  );

  return { progressLines, isStreaming, start };
}
