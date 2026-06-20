interface ProgressCardProps {
  lines: string[];
  label: string;
}

/**
 * 通用进度展示卡片 —— 显示转圈动画和实时输出行。
 * 用于 scan / execute 等长时间命令的进度反馈。
 */
export default function ProgressCard({ lines, label }: ProgressCardProps) {
  return (
    <div className="card mb-6 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary text-sm font-medium">
        <span className="inline-block w-[14px] h-[14px] border-2 border-[#ccc] border-t-accent rounded-full animate-spin" />
        <span>{lines.length > 0 ? `${label} (${lines.length})` : label}</span>
      </div>
      {lines.length > 0 && (
        <pre className="m-0 p-3 max-h-[300px] overflow-y-auto font-mono text-xs leading-relaxed bg-bg-tertiary text-text-primary whitespace-pre-wrap break-all rounded-xl mt-2">
          {lines.slice(-20).join("\n")}
        </pre>
      )}
    </div>
  );
}
