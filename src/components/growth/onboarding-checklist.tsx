import { CheckCircle2, Circle } from "lucide-react";
import { Panel, LoadingRows, EmptyState } from "@/components/growth/ui";
import { useOnboardingChecklist } from "@/lib/checklist";
import { cn } from "@/lib/utils";

const STAGE_LABEL: Record<string, string> = {
  onboarding: "Onboarding",
  audit: "Audit",
  system_setup: "System setup",
  optimization: "Optimization",
};

export function OnboardingChecklist({ orgId }: { orgId?: string | undefined }) {
  const checklist = useOnboardingChecklist(orgId);

  if (checklist.isLoading) {
    return (
      <Panel title="Setup checklist" description="Auto-tracked from your real data">
        <LoadingRows rows={5} />
      </Panel>
    );
  }

  const data = checklist.data;
  if (!data || data.items.length === 0) {
    return (
      <Panel title="Setup checklist">
        <EmptyState
          title="Nothing to check yet"
          description="Start filling in your business to see progress here."
        />
      </Panel>
    );
  }

  return (
    <Panel
      title="Setup checklist"
      description={`${data.complete} of ${data.total} complete · updates automatically as you use the app`}
      actions={
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-primary" style={{ width: `${data.percent}%` }} />
          </div>
          <span className="num text-xs font-medium text-ink">{data.percent}%</span>
        </div>
      }
    >
      <ul className="space-y-1">
        {data.items.map((item) => (
          <li key={item.key} className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5">
            {item.complete ? (
              <CheckCircle2 className="size-4 shrink-0 text-success" />
            ) : (
              <Circle className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span
              className={cn(
                "text-xs",
                item.complete ? "text-muted-foreground line-through" : "text-ink",
              )}
            >
              {item.label}
            </span>
            <span className="ml-auto text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
              {STAGE_LABEL[item.stage] ?? item.stage}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
