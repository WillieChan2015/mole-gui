import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMoleStream } from "../../lib/useMoleStream";
import { ProgressRing } from "../charts";
import { useChartTheme } from "../../hooks/useChartTheme";
import ProgressCard from "../common/ProgressCard";

interface PurgeSummary {
  wouldFree: string;
  items: number;
  free: string;
}

interface ScanData {
  summary: PurgeSummary | null;
  isDryRun: boolean;
  rawOutput: string;
}

export function parsePurgeOutput(raw: string): ScanData {
  let summary: PurgeSummary | null = null;
  let isDryRun = false;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();

    if (/DRY RUN MODE/i.test(trimmed)) {
      isDryRun = true;
      continue;
    }

    // Summary: Would free: X | Items: N | Free: Y
    const summaryMatch = trimmed.match(
      /^Would free:\s*(\S+)\s*\|\s*Items:\s*(\d+)\s*\|\s*Free:\s*(\S+)$/
    );
    if (summaryMatch) {
      summary = {
        wouldFree: summaryMatch[1],
        items: parseInt(summaryMatch[2], 10),
        free: summaryMatch[3],
      };
    }
  }

  return { summary, isDryRun, rawOutput: raw };
}

export default function Purge() {
  const { t } = useTranslation(["purge", "common"]);
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const { progressLines, isStreaming, start } = useMoleStream("purge");
  const theme = useChartTheme();

  const handleScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    setResultMsg(null);
    try {
      const rawOutput = await start("purge:scan_completed", "purge_scan");
      setScanData(parsePurgeOutput(rawOutput));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }, [start]);

  const handleExecute = useCallback(async () => {
    setExecuting(true);
    setError(null);
    setResultMsg(null);
    try {
      const rawOutput = await start("purge:execute_completed", "purge_execute");
      setResultMsg(t("purgeCompleted"));
      setScanData(parsePurgeOutput(rawOutput));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExecuting(false);
    }
  }, [start, t]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="m-0">{t("title")}</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={handleScan} disabled={scanning || executing}>
            {scanning ? t("common:scanning") : t("scan")}
          </button>
          {scanData && (
            <button
              onClick={handleExecute}
              disabled={executing || scanning}
              className="bg-[var(--danger-color)] text-white border-[var(--danger-color)] hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executing ? t("common:purging") : t("purge")}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-[var(--danger-color)]">{error}</p>}
      {resultMsg && <p className="text-[var(--success-color)]">{resultMsg}</p>}

      {isStreaming && <ProgressCard lines={progressLines} label={t("common:scanning")} />}

      {scanData?.isDryRun && (
        <div className="info-banner bg-[var(--info-bg)] rounded-xl mb-4 text-[0.9rem] text-[var(--accent-color)]">
          {t("dryRunMode")}
        </div>
      )}

      {scanData?.summary && (
        <div className="info-banner bg-[var(--info-bg)] rounded-xl mb-6 text-[0.95rem]">
          <span>{t("wouldFree")}: <strong>{scanData.summary.wouldFree}</strong></span>
          <span>{t("items")}: <strong>{scanData.summary.items}</strong></span>
          <span>{t("free")}: <strong>{scanData.summary.free}</strong></span>
        </div>
      )}

      {scanData?.summary && (
        <div className="mb-6">
          <div className="card">
            <h3 className="m-0 mb-4 text-base text-text-secondary text-center">{t("cleanableItems")}</h3>
            <div className="flex justify-center items-center py-4">
              <ProgressRing
                percent={100}
                size={150}
                strokeWidth={12}
                color={theme.colors.primary}
                centerContent={
                  <div className="text-center">
                    <div className="text-xl font-semibold">
                      {scanData.summary.items}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {t("itemCount")}
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
