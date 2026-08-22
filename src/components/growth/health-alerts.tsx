import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, LoadingRows, EmptyState } from "@/components/growth/ui";
import { useHealthEvents, useResolveHealthEvent } from "@/lib/health";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const SEVERITY_TONE: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  warning: "bg-warning/10 text-warning",
  error: "bg-destructive/10 text-destructive",
  critical: "bg-destructive/15 text-destructive",
};

export function HealthAlertsPanel() {
  const events = useHealthEvents(true);
  const resolve = useResolveHealthEvent();

  return (
    <Panel
      title="System health"
      description="Failed jobs, RLS errors and sync issues — auto-emailed to admins on error/critical"
    >
      {events.isLoading ? (
        <LoadingRows rows={3} />
      ) : !events.data || events.data.length === 0 ? (
        <EmptyState
          title="All clear"
          description="No unresolved system health events."
          action={<CheckCircle2 className="size-6 text-success" />}
        />
      ) : (
        <ul className="space-y-2">
          {events.data.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <AlertTriangle
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  e.severity === "critical" || e.severity === "error"
                    ? "text-destructive"
                    : "text-warning",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em]",
                      SEVERITY_TONE[e.severity],
                    )}
                  >
                    {e.severity}
                  </span>
                  <span className="text-xs font-medium text-ink">{e.source}</span>
                  <span className="text-[11px] text-muted-foreground">{e.event_type}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{e.message}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled={resolve.isPending}
                onClick={() => resolve.mutate(e.id)}
              >
                Resolve
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
