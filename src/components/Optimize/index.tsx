import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMoleStream } from "../../lib/useMoleStream";
import { AppBarChart } from "../charts";
import { useChartTheme } from "../../hooks/useChartTheme";
import ProgressCard from "../common/ProgressCard";

interface OptimizeAction {
  name: string;
}

interface OptimizeSection {
  name: string;
  actions: OptimizeAction[];
}

interface DiagnosisInfo {
  lines: string[];
}

interface ScanData {
  sections: OptimizeSection[];
  diagnosis: DiagnosisInfo | null;
  summary: string | null;
  isDryRun: boolean;
  rawOutput: string;
}

export function parseOptimizeOutput(raw: string): ScanData {
  const sections: OptimizeSection[] = [];
  const diagnosisLines: string[] = [];
  let currentSection: OptimizeSection | null = null;
  let summary: string | null = null;
  let isDryRun = false;
  let inDiagnosis = false;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();

    // Dry run banner
    if (/DRY RUN MODE/i.test(trimmed)) {
      isDryRun = true;
      continue;
    }

    // Diagnosis block starts with PERFORMANCE DIAGNOSIS
    if (/PERFORMANCE DIAGNOSIS/i.test(trimmed)) {
      inDiagnosis = true;
      continue;
    }

    // Diagnosis lines start with specific markers
    if (inDiagnosis && (trimmed.startsWith("◎") || trimmed.startsWith("☞"))) {
      diagnosisLines.push(trimmed);
      continue;
    }

    // A blank line or section header ends diagnosis
    if (inDiagnosis && (trimmed === "" || trimmed.startsWith("➤"))) {
      inDiagnosis = false;
    }

    // Section header: ➤ Section Name
    const sectionMatch = trimmed.match(/^➤\s+(.+)$/);
    if (sectionMatch) {
      currentSection = { name: sectionMatch[1], actions: [] };
      sections.push(currentSection);
      continue;
    }

    // Action: → action description
    const actionMatch = trimmed.match(/^→\s+(.+)$/);
    if (actionMatch && currentSection) {
      currentSection.actions.push({ name: actionMatch[1] });
      continue;
    }

    // Summary line: "Would apply N optimizations" or "Dry Run Complete"
    if (/Would apply \d+ optimizations/i.test(trimmed)) {
      summary = trimmed;
    }
  }

  return {
    sections,
    diagnosis: diagnosisLines.length > 0 ? { lines: diagnosisLines } : null,
    summary,
    isDryRun,
    rawOutput: raw,
  };
}

export default function Optimize() {
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const { progressLines, isStreaming, start } = useMoleStream("optimize");
  const { t } = useTranslation(["optimize", "common"]);
  const theme = useChartTheme();

  const handleScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    setResultMsg(null);
    try {
      const rawOutput = await start("optimize:scan_completed", "optimize_scan");
      setScanData(parseOptimizeOutput(rawOutput));
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
      const rawOutput = await start("optimize:execute_completed", "optimize_execute");
      setResultMsg("Optimizations applied successfully.");
      setScanData(parseOptimizeOutput(rawOutput));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExecuting(false);
    }
  }, [start]);

  const totalActions = scanData
    ? scanData.sections.reduce((sum, s) => sum + s.actions.length, 0)
    : 0;

  // 准备分类统计数据
  const categoryStats = scanData?.sections.map((section) => ({
    name: section.name.length > 10 ? section.name.substring(0, 10) + '...' : section.name,
    count: section.actions.length,
  })) || [];

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
              disabled={executing || scanning || totalActions === 0}
              className="bg-[var(--success-color)] text-white border-[var(--success-color)] hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executing ? t("common:applying") : t("applyOptimizations", { count: totalActions })}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-[var(--danger-color)]">{error}</p>}
      {resultMsg && <p className="text-[var(--success-color)]">{resultMsg}</p>}

      {isStreaming && <ProgressCard lines={progressLines} label={t("common:scanning")} />}

      {scanData?.isDryRun && (
        <div className="info-banner bg-[var(--info-bg)] rounded-xl mb-4 text-[0.9rem] text-[var(--accent-color)]">
          ℹ️ {t("dryRunMode")}
        </div>
      )}

      {scanData?.diagnosis && (
        <div className="py-3 px-4 bg-[var(--warning-bg)] rounded-xl mb-6 text-[0.95rem] leading-relaxed">
          <strong>⚠️ {t("performanceDiagnosis")}</strong>
          {scanData.diagnosis.lines.map((line, i) => (
            <p key={i} className="my-[0.15rem]">{line}</p>
          ))}
        </div>
      )}

      {scanData?.summary && (
        <div className="info-banner bg-[var(--success-bg)] rounded-xl mb-6 text-[0.95rem]">
          <span>✅ {scanData.summary}</span>
        </div>
      )}

      {scanData && (
        <div className="mb-6">
          {/* 分类统计 */}
          <div className="card">
            <div className="card-header">{t("categoryStats")}</div>
            <AppBarChart
              data={categoryStats}
              bars={[
                {
                  dataKey: 'count',
                  name: t('optimizationCount'),
                  color: theme.colors.primary,
                },
              ]}
              xAxisKey="name"
              height={250}
            />
          </div>
        </div>
      )}

      {scanData?.sections.map((section, si) => (
        <div key={si} className="mb-6">
          <h2 className="text-[1rem] m-0 mb-2 pb-1 border-b border-[var(--border-color)]">{section.name}</h2>
          <ul className="list-none m-0 p-0">
            {section.actions.map((action, ai) => (
              <li key={ai} className="flex items-center gap-2 py-[0.35rem] text-[0.9rem]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success-color)] shrink-0" />
                <span className="text-[var(--success-color)] font-bold">&rarr;</span>
                <span>{action.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
