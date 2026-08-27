import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { UserPlus, Users, CheckSquare } from "lucide-react";
import { useActiveOrg, useRows } from "@/lib/growth";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/**
 * ⌘K / Ctrl+K from anywhere in the app. Each table already has its own
 * local search — this is the one place that searches leads, customers and
 * tasks together, since nothing else does.
 */
export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { orgId } = useActiveOrg();
  const navigate = useNavigate();

  const { data: leads } = useRows("leads", orgId, { order: { column: "created_at" }, limit: 200 });
  const { data: customers } = useRows("customers", orgId, { order: { column: "created_at" }, limit: 200 });
  const { data: tasks } = useRows("tasks", orgId, { order: { column: "created_at" }, limit: 200 });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  function go(to: string) {
    onOpenChange(false);
    navigate({ to });
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search leads, customers, tasks…" />
      <CommandList>
        <CommandEmpty>Nothing matches.</CommandEmpty>
        <CommandGroup heading="Leads">
          {(leads ?? []).map((l) => (
            <CommandItem key={l["id"]} value={`lead ${l["name"]} ${l["phone"] ?? ""} ${l["email"] ?? ""}`} onSelect={() => go("/leads")}>
              <UserPlus /> {String(l["name"])}
              {l["status"] && <span className="ml-auto text-xs text-muted-foreground">{String(l["status"])}</span>}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Customers">
          {(customers ?? []).map((c) => (
            <CommandItem key={c["id"]} value={`customer ${c["name"]} ${c["phone"] ?? ""} ${c["email"] ?? ""}`} onSelect={() => go("/customers")}>
              <Users /> {String(c["name"])}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Tasks">
          {(tasks ?? []).map((t) => (
            <CommandItem key={t["id"]} value={`task ${t["title"]}`} onSelect={() => go("/tasks")}>
              <CheckSquare /> {String(t["title"])}
              {t["status"] && <span className="ml-auto text-xs text-muted-foreground">{String(t["status"])}</span>}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
