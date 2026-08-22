import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ONBOARDING_STAGES, STAGE_META, stageLabel } from "@/lib/niches";

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string | undefined;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <section className={cn("panel overflow-hidden", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div>
            {title && <h2 className="font-display text-sm font-semibold text-ink">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  trend,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string | undefined;
  trend?: number | undefined;
  tone?: "default" | "positive" | "negative" | undefined;
}) {
  return (
    <div className="panel px-4 py-3.5">
      <div className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </div>
      <div
        className={cn(
          "num mt-1.5 text-2xl font-semibold",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
          tone === "default" && "text-ink",
        )}
      >
        {value}
      </div>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
        {typeof trend === "number" && (
          <span
            className={cn(
              "num rounded px-1.5 py-0.5 font-medium",
              trend >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            {trend >= 0 ? "+" : ""}
            {trend.toFixed(1)}%
          </span>
        )}
        {hint}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string | undefined;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="dotfield flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Couldn't load this data",
  description,
  onRetry,
}: {
  title?: string;
  description?: string | undefined;
  onRetry?: (() => void) | undefined;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <AlertTriangle className="size-6 text-destructive" />
      <h3 className="mt-3 font-display text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-muted"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function ScoreDial({ score, label }: { score: number; label: string }) {
  const angle = Math.round((score / 100) * 360);
  return (
    <div className="flex items-center gap-4">
      <div
        className="grid size-24 place-items-center rounded-full"
        style={{
          background: `conic-gradient(var(--primary) ${angle}deg, var(--surface-3) ${angle}deg)`,
        }}
      >
        <div className="grid size-[76px] place-items-center rounded-full bg-card">
          <span className="num text-xl font-semibold text-ink">{score}</span>
        </div>
      </div>
      <div>
        <div className="font-display text-sm font-semibold text-ink">{label}</div>
        <div className="text-xs text-muted-foreground">out of 100</div>
      </div>
    </div>
  );
}

export function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="num font-medium text-ink">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function StatusPill({ value }: { value: string }) {
  const tone: Record<string, string> = {
    won: "bg-success/10 text-success",
    completed: "bg-success/10 text-success",
    done: "bg-success/10 text-success",
    active: "bg-success/10 text-success",
    lost: "bg-destructive/10 text-destructive",
    critical: "bg-destructive/10 text-destructive",
    high: "bg-destructive/10 text-destructive",
    in_progress: "bg-info/10 text-info",
    qualified: "bg-info/10 text-info",
    proposal: "bg-warning/10 text-warning",
    contacted: "bg-warning/10 text-warning",
    todo: "bg-muted text-muted-foreground",
    new: "bg-primary/10 text-primary",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium capitalize",
        tone[value] ?? "bg-muted text-muted-foreground",
      )}
    >
      {String(value).replace(/_/g, " ")}
    </span>
  );
}

export function StageTracker({ stage, compact = false }: { stage: string; compact?: boolean }) {
  const stages = ONBOARDING_STAGES;
  const idx = Math.max(0, stages.indexOf(stage as (typeof stages)[number]));
  const meta = STAGE_META[stages[idx] as keyof typeof STAGE_META];
  const progress = Math.round((idx / (stages.length - 1)) * 100);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {stages.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap",
                i === idx
                  ? "border-primary bg-primary text-primary-foreground"
                  : i < idx
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground",
              )}
            >
              <span className="num">{i + 1}</span> {stageLabel(s)}
            </div>
            {i < stages.length - 1 && <div className="h-px w-3 bg-border" />}
          </div>
        ))}
      </div>
      {!compact && (
        <>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {meta?.description} · {progress}% through rollout
          </p>
        </>
      )}
    </div>
  );
}
