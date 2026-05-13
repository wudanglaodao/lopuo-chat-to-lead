import { BrandLogo } from "@/components/brand-mark";

export function AdminPageLoading({
  title,
  description,
  variant = "table",
}: {
  title: string;
  description: string;
  variant?: "dashboard" | "table" | "settings";
}) {
  return (
    <main className="min-h-screen bg-[#f4f4f5] text-[#1f2024] dark:bg-[#101216] dark:text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-[288px] border-r border-black/[0.06] bg-white/80 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-[#171a20]/88 md:block">
        <BrandLogo markClassName="h-12 w-12 rounded-[18px]" showTagline tagline="线索转化台" />
        <nav className="mt-14 space-y-3">
          {["总览", "知识库", "会话", "设置"].map((item) => (
            <div key={item} className="flex items-center gap-4 rounded-[18px] px-4 py-4">
              <span className="h-5 w-5 rounded-full bg-[#e2e5ea] dark:bg-white/12" />
              <span className="h-4 w-24 rounded-full bg-[#e2e5ea] dark:bg-white/12" />
            </div>
          ))}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 space-y-4">
          <div className="h-14 rounded-[18px] bg-[#eef0f3] dark:bg-white/8" />
          <div className="h-12 rounded-[18px] bg-[#eef0f3] dark:bg-white/8" />
        </div>
      </aside>

      <section className="md:pl-[288px]">
        <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-white/85 px-5 py-5 backdrop-blur-xl dark:border-white/10 dark:bg-[#171a20]/85 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="hidden h-12 min-w-[320px] rounded-[18px] bg-[#f3f3f4] dark:bg-white/8 md:block" />
            <div className="ml-auto flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-[#f3f3f4] dark:bg-white/8" />
              <div className="h-12 w-36 rounded-2xl bg-[#2f7df6]/25" />
            </div>
          </div>
        </header>

        <div className="px-5 py-8 md:px-8 lg:px-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#1f2024] dark:text-white md:text-5xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#777e89]">{description}</p>
          </div>
          {variant === "dashboard" ? <DashboardSkeleton /> : null}
          {variant === "table" ? <TableSkeleton /> : null}
          {variant === "settings" ? <SettingsSkeleton /> : null}
        </div>
      </section>
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-44 animate-pulse rounded-[24px] border border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#171a20]" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-[28px] border border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#171a20]" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <section className="rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
      <div className="mb-7 flex flex-wrap items-center gap-4">
        <div className="h-10 w-2 rounded-full bg-[#c7b6ff]" />
        <div className="h-8 w-44 rounded-full bg-[#eef0f3] dark:bg-white/10" />
        <div className="ml-auto h-12 w-36 rounded-[16px] bg-[#eef0f3] dark:bg-white/10" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[1.2fr_1fr_1.4fr_140px] gap-4 border-b border-black/[0.06] pb-4 last:border-0 dark:border-white/10">
            <div className="h-14 animate-pulse rounded-[18px] bg-[#f3f3f4] dark:bg-white/8" />
            <div className="h-14 animate-pulse rounded-[18px] bg-[#f3f3f4] dark:bg-white/8" />
            <div className="h-14 animate-pulse rounded-[18px] bg-[#f3f3f4] dark:bg-white/8" />
            <div className="h-14 animate-pulse rounded-[18px] bg-[#f3f3f4] dark:bg-white/8" />
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsSkeleton() {
  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex gap-2 overflow-hidden rounded-[24px] border border-black/[0.06] bg-white p-2 dark:border-white/10 dark:bg-[#171a20]">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-16 min-w-[160px] animate-pulse rounded-[18px] bg-[#f3f3f4] dark:bg-white/8" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="h-[520px] animate-pulse rounded-[28px] border border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#171a20]" />
        <div className="h-72 animate-pulse rounded-[24px] border border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#171a20]" />
      </div>
    </div>
  );
}
