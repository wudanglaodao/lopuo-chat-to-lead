import {
  ArrowDown,
  ArrowUp,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  DatabaseZap,
  Home,
  Info,
  LogOut,
  MessageSquareText,
  MousePointerClick,
  Search,
  Settings2,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";

import { logoutAction } from "@/app/admin/actions";
import { BrandLogo } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/admin/theme-toggle";

const navItems = [
  { href: "/admin", label: "总览", icon: Home },
  { href: "/admin/knowledge", label: "知识库", icon: DatabaseZap },
  { href: "/admin/conversations", label: "会话", icon: MessageSquareText },
  { href: "/admin/settings", label: "设置", icon: Settings2 },
];

type TenantSwitcher = {
  activeTenantId?: string | null;
  hrefBase: string;
  tenants: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
  query?: Record<string, string | null | undefined>;
};

type SettingsSubnavItem = {
  href: string;
  label: string;
  description: string;
  active?: boolean;
};

type SettingsSubnavGroup = {
  label: string;
  description: string;
  items: SettingsSubnavItem[];
};

export function AdminShell({
  children,
  title,
  description,
  tenantSwitcher,
  settingsSubnav,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  tenantSwitcher?: TenantSwitcher;
  settingsSubnav?: SettingsSubnavGroup[];
}) {
  return (
    <main className="min-h-screen bg-[#f4f4f5] text-[#1f2024] transition-colors dark:bg-[#101216] dark:text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-[288px] border-r border-black/[0.06] bg-white/80 p-5 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-[#171a20]/88 md:block">
        <Link href="/admin" className="flex items-center">
          <BrandLogo markClassName="h-12 w-12 rounded-[18px]" showTagline tagline="线索转化台" />
        </Link>
        <nav className="mt-14 space-y-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.label === title;

            if (item.href === "/admin/settings" && settingsSubnav?.length) {
              return (
                <details key={item.href} className="group/settings" open={active}>
                  <summary
                    className={[
                      "group flex cursor-pointer list-none items-center gap-4 rounded-[18px] px-4 py-4 text-[15px] font-semibold transition duration-200 [&::-webkit-details-marker]:hidden",
                      active
                        ? "bg-[#f0f0f1] text-[#1f2024] shadow-[inset_0_-1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.05)] dark:bg-white/10 dark:text-white"
                        : "text-[#777e89] hover:bg-[#f6f6f7] hover:text-[#1f2024] dark:text-white/55 dark:hover:bg-white/[0.06] dark:hover:text-white",
                    ].join(" ")}
                  >
                    <Icon
                      className={
                        active
                          ? "h-5 w-5 text-[#1f2024] dark:text-white"
                          : "h-5 w-5 text-[#747b85] transition group-hover:text-[#1f2024] dark:text-white/45 dark:group-hover:text-white"
                      }
                    />
                    <span>设置</span>
                    <ChevronRight className="ml-auto h-4 w-4 text-[#9aa0aa] transition group-open/settings:rotate-90" />
                  </summary>
                  <div className="ml-8 mt-3 space-y-1.5 border-l border-black/[0.06] pl-4 dark:border-white/10">
                    {settingsSubnav.map((group) => (
                      <Link
                        key={group.label}
                        href={group.items[0]?.href || "/admin/settings"}
                        className={[
                          "block rounded-[14px] px-3 py-2.5 transition",
                          group.items.some((subItem) => subItem.active)
                            ? "bg-[#ff6b4a] text-white shadow-[0_10px_24px_rgba(255,107,74,0.18)] dark:bg-[#ff6b4a] dark:text-white"
                            : "text-[#777e89] hover:bg-[#f6f6f7] hover:text-[#1f2024] dark:text-white/45 dark:hover:bg-white/8 dark:hover:text-white",
                        ].join(" ")}
                      >
                        <span className="block text-sm font-bold">{group.label}</span>
                        <span className="mt-0.5 block truncate text-xs font-semibold opacity-65">{group.description}</span>
                      </Link>
                    ))}
                  </div>
                </details>
              );
            }

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    "group flex items-center gap-4 rounded-[18px] px-4 py-4 text-[15px] font-semibold transition duration-200",
                    active
                      ? "bg-[#f0f0f1] text-[#1f2024] shadow-[inset_0_-1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.05)] dark:bg-white/10 dark:text-white"
                      : "text-[#777e89] hover:bg-[#f6f6f7] hover:text-[#1f2024] dark:text-white/55 dark:hover:bg-white/[0.06] dark:hover:text-white",
                  ].join(" ")}
                >
                  <Icon
                    className={
                      active
                        ? "h-5 w-5 text-[#1f2024] dark:text-white"
                        : "h-5 w-5 text-[#747b85] transition group-hover:text-[#1f2024] dark:text-white/45 dark:group-hover:text-white"
                    }
                  />
                  {item.label}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="absolute bottom-5 left-5 right-5">
          <div className="mb-4 border-t border-black/[0.06] pt-5 dark:border-white/10">
            <div className="flex items-center justify-between rounded-[18px] px-4 py-3 text-[#777e89] dark:text-white/55">
              <span className="flex items-center gap-3 text-sm font-semibold">
                <CircleHelp className="h-5 w-5" />
                转化手册
              </span>
              <span className="rounded-lg bg-[#d8c7ff] px-2.5 py-1 text-sm font-bold text-[#31224f]">8</span>
            </div>
          </div>
          <div className="mb-4">
            <ThemeToggle />
          </div>
          <form action={logoutAction}>
            <button className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-black/[0.07] bg-white px-4 py-3 text-sm font-bold text-[#1f2024] transition hover:-translate-y-0.5 hover:border-[#2f7df6]/30 hover:text-[#2f7df6] hover:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-white/8 dark:text-white dark:hover:border-[#2f7df6]/50">
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </form>
        </div>
      </aside>

      <section className="md:pl-[288px]">
        <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-white/85 px-5 py-5 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-[#171a20]/85 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="hidden min-w-[320px] items-center gap-3 rounded-[18px] bg-[#f3f3f4] px-4 py-3 text-[#9aa0aa] dark:bg-white/8 dark:text-white/45 md:flex">
              <Search className="h-5 w-5" />
              <span className="text-sm font-semibold">搜索线索、会话或命令</span>
              <span className="ml-auto flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#1f2024] shadow-sm dark:bg-white/12 dark:text-white">
                <Command className="h-4 w-4" /> F
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:hidden">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full bg-[#eeeeef] px-3 py-2 text-sm font-semibold text-[#5d646f] dark:bg-white/10 dark:text-white/70"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                aria-label="通知"
                className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3f3f4] text-[#777e89] transition hover:bg-white hover:text-[#1f2024] hover:shadow-sm dark:bg-white/8 dark:text-white/55 dark:hover:bg-white/12 dark:hover:text-white"
              >
                <Bell className="h-5 w-5" />
              </button>
              {tenantSwitcher?.tenants.length ? (
                <TenantSwitcherControl {...tenantSwitcher} />
              ) : (
                <span className="rounded-2xl bg-[#2f7df6] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(47,125,246,0.24)]">
                  预览模式
                </span>
              )}
            </div>
          </div>
        </header>
        <div className="px-5 py-8 md:px-8 lg:px-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#1f2024] dark:text-white md:text-5xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#777e89]">{description}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

function TenantSwitcherControl({ activeTenantId, hrefBase, tenants, query }: TenantSwitcher) {
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId) || tenants[0];

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl bg-[#2f7df6] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(47,125,246,0.24)] transition hover:-translate-y-0.5 hover:bg-[#1d6ef0] [&::-webkit-details-marker]:hidden">
        <span className="grid h-7 w-7 place-items-center rounded-xl bg-white/18">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="max-w-[128px] truncate">{activeTenant?.name || "切换租户"}</span>
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 top-full z-30 mt-3 w-72 overflow-hidden rounded-[22px] border border-black/[0.06] bg-white p-2 shadow-[0_24px_60px_rgba(31,32,36,0.16)] dark:border-white/10 dark:bg-[#20242b]">
        <div className="px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#9aa0aa] dark:text-white/40">切换租户</div>
        <div className="space-y-1">
          {tenants.map((tenant) => {
            const active = tenant.id === activeTenant?.id;
            return (
              <Link
                key={tenant.id}
                href={buildTenantHref(hrefBase, tenant.id, query)}
                className={[
                  "flex items-start gap-3 rounded-[16px] px-3 py-3 text-sm transition",
                  active
                    ? "bg-[#f0f6ff] text-[#1f2024] dark:bg-white/10 dark:text-white"
                    : "text-[#5d646f] hover:bg-[#f6f6f7] hover:text-[#2f7df6] dark:text-white/60 dark:hover:bg-white/8 dark:hover:text-white",
                ].join(" ")}
              >
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#d9f2ff] text-[#1f2024] dark:bg-[#9bdcff]">
                  {active ? <Check className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{tenant.name}</span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-[#9aa0aa] dark:text-white/40">
                    {tenant.description || "独立知识库、会话与留资线索"}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </details>
  );
}

function buildTenantHref(hrefBase: string, tenantId: string, query?: Record<string, string | null | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
  }
  params.set("tenantId", tenantId);
  return `${hrefBase}?${params.toString()}`;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "blue",
  delta,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: "database" | "chat" | "click" | "lead";
  tone?: "blue" | "purple" | "green" | "orange";
  delta?: { value: string; direction: "up" | "down" };
}) {
  const toneClass = getStatTone(tone);
  const deltaClass =
    delta?.direction === "down"
      ? "bg-[#ffe8e5] text-[#ff5a4f] dark:bg-[#ff5a4f]/18 dark:text-[#ff9a92]"
      : "bg-[#edf8e8] text-[#6bb956] dark:bg-[#6bb956]/18 dark:text-[#a5dd95]";

  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-black/[0.06] bg-white p-6 shadow-[0_18px_42px_rgba(31,32,36,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(31,32,36,0.1)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
      <div className="flex min-h-[122px] items-start gap-4">
        <span className={`mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-full ${toneClass}`}>
          {getStatIcon(icon)}
        </span>
        <div className="min-w-0 pt-1">
          <div className="flex items-center gap-2 text-base font-bold text-[#777e89] dark:text-white/55">
            <span className="truncate">{label}</span>
            <Info className="h-4 w-4 shrink-0 fill-[#9aa0aa] text-white dark:fill-white/35 dark:text-[#171a20]" />
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <span className="text-5xl font-bold leading-none text-[#1f2024] dark:text-white">{value}</span>
            {delta ? (
              <span className={`mb-1 flex items-center gap-1 rounded-2xl px-3 py-1.5 text-sm font-bold ${deltaClass}`}>
                {delta.direction === "down" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                {delta.value}
              </span>
            ) : null}
          </div>
          {hint ? <div className="mt-3 text-xs font-semibold text-[#9aa0aa]">{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}

function getStatIcon(icon?: "database" | "chat" | "click" | "lead") {
  if (icon === "chat") return <MessageSquareText className="h-6 w-6 text-[#1f2024]" strokeWidth={2.4} />;
  if (icon === "click") return <MousePointerClick className="h-6 w-6 text-[#1f2024]" strokeWidth={2.4} />;
  if (icon === "lead") return <UserRoundCheck className="h-6 w-6 text-[#1f2024]" strokeWidth={2.4} />;
  return <DatabaseZap className="h-6 w-6 text-[#1f2024]" strokeWidth={2.4} />;
}

function getStatTone(tone: "blue" | "purple" | "green" | "orange") {
  if (tone === "purple") return "bg-[#c7b6ff]";
  if (tone === "green") return "bg-[#bdf2a0]";
  if (tone === "orange") return "bg-[#ffccb0]";
  return "bg-[#a7e3ff]";
}
