import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/growth/shell";
import { CrudPanel } from "@/components/growth/crud";
import { StatCard } from "@/components/growth/ui";
import { useActiveOrg, useRows } from "@/lib/growth";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Action plan & tasks — TrendZypher Growth OS" },
      {
        name: "description",
        content:
          "Turn growth insights into a weekly action plan with owners, priorities and due dates.",
      },
      { property: "og:title", content: "Action plan & tasks — TrendZypher Growth OS" },
      {
        property: "og:description",
        content: "A single execution list across presence, reach, conversion and revenue.",
      },
    ],
  }),
  component: TasksPage,
});

const MODULES = [
  "dashboard",
  "presence",
  "discovery",
  "reach",
  "conversion",
  "customers",
  "leads",
  "growth",
  "finance",
  "positioning",
];

function TasksPage() {
  const { orgId } = useActiveOrg();
  const { data } = useRows("tasks", orgId, { order: { column: "due_date", ascending: true } });
  const rows = data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const open = rows.filter((r) => r["status"] !== "done").length;
  const overdue = rows.filter(
    (r) => r["status"] !== "done" && r["due_date"] && String(r["due_date"]) < today,
  ).length;
  const done = rows.filter((r) => r["status"] === "done").length;

  return (
    <AppShell title="Action plan" subtitle="Every insight turned into a next step">
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open tasks" value={open} />
        <StatCard label="Overdue" value={overdue} tone={overdue > 0 ? "negative" : "default"} />
        <StatCard label="Completed" value={done} tone="positive" />
        <StatCard
          label="Completion rate"
          value={`${rows.length ? Math.round((done / rows.length) * 100) : 0}%`}
        />
      </div>

      <CrudPanel
        table="tasks"
        orgId={orgId}
        title="Tasks"
        description="Prioritise the work that moves presence, leads, conversion and profit."
        queryOpts={{ order: { column: "due_date", ascending: true } }}
        emptyTitle="No tasks yet"
        emptyDescription="Add the actions you want to complete this week."
        fields={[
          { name: "title", label: "Task", required: true },
          {
            name: "module",
            label: "Module",
            type: "select",
            options: MODULES.map((m) => ({ value: m, label: m })),
          },
          {
            name: "priority",
            label: "Priority",
            type: "select",
            options: [
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ],
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "todo", label: "To do" },
              { value: "in_progress", label: "In progress" },
              { value: "done", label: "Done" },
            ],
          },
          { name: "due_date", label: "Due date", type: "date" },
          { name: "notes", label: "Notes", type: "textarea", inTable: false },
        ]}
        defaults={{ status: "todo", priority: "medium", module: "dashboard" }}
      />
    </AppShell>
  );
}
