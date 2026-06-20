import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { isTauri } from "./env";

export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    console.warn(`[Dev Mode] Tauri command "${command}" called outside Tauri environment`);
    throw new Error(`Tauri not available: ${command}`);
  }
  return tauriInvoke<T>(command, args);
}
