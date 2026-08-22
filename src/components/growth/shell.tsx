/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Globe,
  Users,
  UserPlus,
  Megaphone,
  Filter,
  TrendingUp,
  Wallet,
  Compass,
  CheckSquare,
  FileBarChart,
  Settings,
  Target,
  LogOut,
  Menu,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveOrg, useIsAdmin, useProfile, setStoredOrgId } from "@/lib/growth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/presence", label: "Presence", icon: Globe },
  { to: "/discovery", label: "Customer Discovery", icon: Target },
  { to: "/reach", label: "Offers & Campaigns", icon: Megaphone },
  { to: "/conversion", label: "Conversion", icon: Filter },
  { to: "/leads", label: "Leads", icon: UserPlus },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/growth", label: "Revenue Growth", icon: TrendingUp },
  { to: "/finance", label: "Finance", icon: Wallet },
  { to: "/positioning", label: "Positioning", icon: Compass },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { org, orgs } = useActiveOrg();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div className="grid size-8 place-items-center rounded-lg bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground">
            TZ
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold text-sidebar-accent-foreground">
              TrendZypher
            </div>
            <div className="text-[11px] tracking-wide text-sidebar-foreground/60 uppercase">
              Growth OS
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className={cn(
                "mt-2 flex items-center gap-2.5 rounded-lg border border-sidebar-border px-3 py-2 text-[13px] font-medium",
                pathname === "/admin"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60",
              )}
            >
              <ShieldCheck className="size-4" />
              Admin Console
            </Link>
          )}
        </nav>

        <div className="border-t border-sidebar-border px-3 py-3 text-[11px] text-sidebar-foreground/50">
          Growth OS · v1
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur-md sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="size-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[17px] font-semibold text-ink">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2">
            {actions}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Building2 className="size-4" />
                  <span className="hidden max-w-[140px] truncate sm:inline">
                    {org?.["name"] ?? "No business"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>Businesses</DropdownMenuLabel>
                {orgs.map((o: any) => (
                  <DropdownMenuItem
                    key={o.id}
                    onClick={() => {
                      setStoredOrgId(o.id);
                      qc.invalidateQueries();
                    }}
                  >
                    {o.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/onboarding" })}>
                  Add a business
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="grid size-9 place-items-center rounded-full bg-primary/10 font-display text-xs font-semibold text-primary">
                  {(profile?.["full_name"] || profile?.["email"] || "U")
                    .toString()
                    .slice(0, 2)
                    .toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="max-w-[220px] truncate text-xs font-normal text-muted-foreground">
                  {profile?.["email"]}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
