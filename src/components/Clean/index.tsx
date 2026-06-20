import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "../../lib/invoke";
import { useMoleStream } from "../../lib/useMoleStream";
import { AppPieChart } from "../charts";
import ProgressCard from "../common/ProgressCard";

interface CleanItem {
  name: string;
  size: string;
  skipped: boolean;
  checked: boolean;
}

interface CleanSection {
  name: string;
  items: CleanItem[];
}

interface CleanSummary {
  potentialSpace: string;
  items: number;
  categories: number;
}

interface ScanData {
  sections: CleanSection[];
  summary: CleanSummary | null;
  rawOutput: string;
}

// Types for clean-list.txt
interface CleanListPath {
  path: string;
  sizeHint: string;
}

interface CleanListSection {
  name: string;
  items: CleanListPath[];
}

interface CleanListData {
  sections: CleanListSection[];
}

export function parseCleanOutput(raw: string): ScanData {
  const sections: CleanSection[] = [];
  let currentSection: CleanSection | null = null;
  let summary: CleanSummary | null = null;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();

    // Section header: ➤ Section Name
    const sectionMatch = trimmed.match(/^➤\s+(.+)$/);
    if (sectionMatch) {
      currentSection = { name: sectionMatch[1], items: [] };
      sections.push(currentSection);
      continue;
    }

    // Item with count: ✓ item name N items, size
    const itemWithCount = trimmed.match(/^✓\s+(.+?)\s+\d+\s+items?,\s+(\d+(?:\.\d+)?[KMGT]?B)$/);
    if (itemWithCount && currentSection) {
      currentSection.items.push({
        name: itemWithCount[1].trim(),
        size: itemWithCount[2],
        skipped: false,
        checked: true,
      });
      continue;
    }

    // Cleanable item: ✓ item name size
    const itemMatch = trimmed.match(/^✓\s+(.+?)\s+(\d+(?:\.\d+)?[KMGT]?B)$/);
    if (itemMatch && currentSection) {
      currentSection.items.push({
        name: itemMatch[1].trim(),
        size: itemMatch[2],
        skipped: false,
        checked: true,
      });
      continue;
    }

    // Empty/skipped item: ✓ item · already empty (or similar)
    const emptyMatch = trimmed.match(/^✓\s+(.+?)·\s*(.+)$/);
    if (emptyMatch && currentSection) {
      currentSection.items.push({
        name: `${emptyMatch[1].trim()} - ${emptyMatch[2].trim()}`,
        size: "",
        skipped: true,
        checked: false,
      });
      continue;
    }

    // Dry-run item: → item name, size dry
    const dryRunMatch = trimmed.match(/^→\s+(.+?),\s+(\d+(?:\.\d+)?[KMGT]?B)\s+dry$/);
    if (dryRunMatch && currentSection) {
      currentSection.items.push({
        name: dryRunMatch[1].trim(),
        size: dryRunMatch[2],
        skipped: false,
        checked: true,
      });
      continue;
    }

    // Warning/skipped: ◎ description
    const warnMatch = trimmed.match(/^◎\s+(.+)$/);
    if (warnMatch && currentSection) {
      currentSection.items.push({
        name: warnMatch[1].trim(),
        size: "",
        skipped: true,
        checked: false,
      });
      continue;
    }

    // Summary: Potential space: X | Items: N | Categories: N
    const summaryMatch = trimmed.match(
      /^Potential space:\s*(\S+)\s*\|\s*Items:\s*(\d+)\s*\|\s*Categories:\s*(\d+)$/
    );
    if (summaryMatch) {
      summary = {
        potentialSpace: summaryMatch[1],
        items: parseInt(summaryMatch[2], 10),
        categories: parseInt(summaryMatch[3], 10),
      };
    }
  }

  return { sections, summary, rawOutput: raw };
}

export default function Clean() {
  const { t } = useTranslation(["clean", "common"]);
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [listData, setListData] = useState<CleanListData | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const { progressLines, isStreaming, start } = useMoleStream("clean");

  const handleScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    setResultMsg(null);
    try {
      // 先执行 clean_list_scan（快速，无阻塞）
      const listRes = await invoke<CleanListData>("clean_list_scan");
      setListData(listRes);
      const allPaths = new Set<string>();
      for (const section of listRes.sections) {
        for (const item of section.items) {
          allPaths.add(item.path);
        }
      }
      setSelectedPaths(allPaths);

      // 流式执行 clean_scan
      const rawOutput = await start("clean:scan_completed", "clean_scan");
      setScanData(parseCleanOutput(rawOutput));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }, [start]);

  const togglePath = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const toggleSection = useCallback((sectionItems: CleanListPath[]) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      const allSelected = sectionItems.every((item) => next.has(item.path));
      for (const item of sectionItems) {
        if (allSelected) {
          next.delete(item.path);
        } else {
          next.add(item.path);
        }
      }
      return next;
    });
  }, []);

  const handleExecuteSelected = useCallback(async () => {
    if (selectedPaths.size === 0) return;
    setExecuting(true);
    setError(null);
    setResultMsg(null);
    try {
      const res = await invoke<{ rawOutput: string }>("clean_execute_selected", {
        paths: Array.from(selectedPaths),
      });
      setResultMsg(res.rawOutput);
      // Refresh scan after cleaning
      const [scanRes, listRes] = await Promise.all([
        invoke<{ rawOutput: string }>("clean_scan"),
        invoke<CleanListData>("clean_list_scan"),
      ]);
      setScanData(parseCleanOutput(scanRes.rawOutput));
      setListData(listRes);
      setSelectedPaths(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExecuting(false);
    }
  }, [selectedPaths]);

  const handleExecuteAll = useCallback(async () => {
    setExecuting(true);
    setError(null);
    setResultMsg(null);
    try {
      const res = await invoke<{ rawOutput: string }>("clean_execute");
      setResultMsg("Cleanup completed successfully.");
      setScanData(parseCleanOutput(res.rawOutput));
      setListData(null);
      setSelectedPaths(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExecuting(false);
    }
  }, []);

  // 准备空间分布数据
  const spaceDistribution = scanData?.sections.map((section) => {
    const totalSize = section.items.reduce((sum, item) => {
      if (item.skipped) return sum;
      const sizeMatch = item.size.match(/^(\d+(?:\.\d+)?)([KMGT]?B)$/);
      if (!sizeMatch) return sum;
      const value = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2];
      const multipliers: Record<string, number> = {
        B: 1,
        KB: 1024,
        MB: 1024 * 1024,
        GB: 1024 * 1024 * 1024,
        TB: 1024 * 1024 * 1024 * 1024,
      };
      return sum + value * (multipliers[unit] || 1);
    }, 0);
    return {
      name: section.name,
      value: totalSize,
    };
  }) || [];

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <div className="flex gap-2">
          <button
            className="btn-ghost rounded-lg px-4 py-2"
            onClick={handleScan}
            disabled={scanning || executing}
          >
            {scanning ? t("common:scanning") : t("scan")}
          </button>
          {listData && (
            <button
              onClick={handleExecuteSelected}
              disabled={executing || scanning || selectedPaths.size === 0}
              className="btn-danger rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executing ? t("common:cleaning") : t("cleanSelected", { count: selectedPaths.size })}
            </button>
          )}
          {scanData && (
            <button
              onClick={handleExecuteAll}
              disabled={executing || scanning}
              className="btn-danger rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executing ? t("common:cleaning") : t("cleanAll")}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-danger">{error}</p>}
      {resultMsg && <p className="text-success">{resultMsg}</p>}

      {isStreaming && <ProgressCard lines={progressLines} label={t("common:scanning")} />}

      {/* Summary banner with icon */}
      {scanData?.summary && (
        <div className="info-banner bg-info-bg rounded-xl mb-6">
          <span className="text-lg">📊</span>
          <span>Potential space: <strong>{scanData.summary.potentialSpace}</strong></span>
          <span>Items: <strong>{scanData.summary.items}</strong></span>
          <span>Categories: <strong>{scanData.summary.categories}</strong></span>
        </div>
      )}

      {/* Chart grid with card style */}
      {scanData && (
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-6">
            {/* 空间分布饼图 */}
            <div className="card">
              <h3 className="card-header">{t("spaceDistribution")}</h3>
              <AppPieChart
                data={spaceDistribution}
                innerRadius={50}
                outerRadius={80}
                showPercent
                height={250}
              />
            </div>

            {/* 清理状态 */}
            <div className="card">
              <h3 className="card-header">{t("cleanProgress")}</h3>
              <div className="flex flex-col justify-center items-center py-4 gap-3">
                {executing ? (
                  <span className="inline-block w-10 h-10 border-[3px] border-[#ccc] border-t-accent rounded-full animate-spin" />
                ) : (
                  <span className="inline-block w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-text-secondary">
                    ✓
                  </span>
                )}
                <div className="text-sm text-text-secondary">
                  {executing ? t("common:cleaning") : t("ready")}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show clean-list.txt paths with checkboxes when available */}
      {listData?.sections.map((section) => (
        <div key={section.name} className="mb-6">
          <h2 className="font-semibold text-[0.95rem] m-0 mb-2 pb-2 border-b border-border/40 flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-accent scale-110 transition-transform checked:scale-125"
              checked={section.items.every((item) => selectedPaths.has(item.path))}
              onChange={() => toggleSection(section.items)}
            />
            {section.name}
          </h2>
          <ul className="list-none m-0 p-0">
            {section.items.map((item) => (
              <li key={item.path} className="flex items-center gap-2 py-[7px] text-sm hover:bg-bg-tertiary/40 transition-colors rounded px-2">
                <input
                  type="checkbox"
                  className="accent-accent scale-110 transition-transform checked:scale-125"
                  checked={selectedPaths.has(item.path)}
                  onChange={() => togglePath(item.path)}
                />
                <span className="flex-1">{item.path}</span>
                {item.sizeHint && <span className="font-medium text-text-secondary">{item.sizeHint}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Fallback: show dry-run items when clean-list not available */}
      {!listData && scanData?.sections.map((section, si) => (
        <div key={si} className="mb-6">
          <h2 className="font-semibold text-[0.95rem] m-0 mb-2 pb-2 border-b border-border/40">{section.name}</h2>
          <ul className="list-none m-0 p-0">
            {section.items.map((item, ii) => (
              <li key={ii} className={`flex items-center gap-2 py-[7px] text-sm hover:bg-bg-tertiary/40 transition-colors rounded px-2 ${item.skipped ? "text-text-secondary" : ""}`}>
                {!item.skipped ? (
                  <input
                    type="checkbox"
                    className="accent-accent scale-110 transition-transform checked:scale-125"
                    checked={item.checked}
                    onChange={() => {
                      setScanData((prev) => {
                        if (!prev) return prev;
                        const next = { ...prev, sections: prev.sections.map((s) => ({ ...s, items: [...s.items] })) };
                        next.sections[si].items[ii].checked = !next.sections[si].items[ii].checked;
                        return next;
                      });
                    }}
                  />
                ) : (
                  <span className="inline-block w-[1em] text-center">-</span>
                )}
                <span className="flex-1">{item.name}</span>
                {item.size && <span className="font-medium text-text-secondary">{item.size}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
