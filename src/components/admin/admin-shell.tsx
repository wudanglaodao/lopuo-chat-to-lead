import {
  ArrowDown,
  ArrowUp,
  Bell,
  CircleHelp,
  Command,
  DatabaseZap,
  Home,
  Info,
  LogOut,
  MessageSquareText,
  Search,
  Settings2,
  Sparkles,
  MousePointerClick,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";

import { logoutAction } from "@/app/admin/actions";
import { ThemeToggle } from "@/components/admin/theme-toggle";

const navItems = [
  { href: "/admin", label: "总览", icon: Home },
  { href: "/admin/knowledge", label: "知识库", icon: DatabaseZap },
  { href: "/admin/conversations", label: "会话", icon: MessageSquareText },
  { href: "/admin/settings", label: "设置", icon: Settings2 },
];

export function AdminShell({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <main className="min-h-screen bg-[#f4f4f5] text-[#1f2024] transition-colors dark:bg-[#101216] dark:text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-[288px] border-r border-black/[0.06] bg-white/80 p-5 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-[#171a20]/88 md:block">
        <Link href="/admin" className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-[18px] bg-[#1f2329] text-white shadow-[0_14px_30px_rgba(31,35,41,0.18)] dark:bg-white dark:text-[#1f2329]">
            <Sparkles className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-[#1f2024] dark:text-white">Lopuo AI</span>
            <span className="mt-0.5 block text-xs font-medium text-[#777e89]">客服控制台</span>
          </span>
        </Link>
        <nav className="mt-14 space-y-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.label === title;
            return (
              <Link
                key={item.href}
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
            );
          })}
        </nav>

        <div className="absolute bottom-5 left-5 right-5">
          <div className="mb-4 border-t border-black/[0.06] pt-5 dark:border-white/10">
            <div className="flex items-center justify-between rounded-[18px] px-4 py-3 text-[#777e89] dark:text-white/55">
              <span className="flex items-center gap-3 text-sm font-semibold">
                <CircleHelp className="h-5 w-5" />
                Help & support
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
              <span className="text-sm font-semibold">Search or type a command</span>
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
              <span className="rounded-2xl bg-[#2f7df6] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(47,125,246,0.24)]">
                Demo 模式
              </span>
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
