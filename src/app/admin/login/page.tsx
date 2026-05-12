import { Bot, DatabaseZap, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";

import { LoginForm } from "@/components/admin/login-form";
import { ThemeToggle } from "@/components/admin/theme-toggle";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f4f4f5] px-5 py-8 text-[#1f2024] transition-colors dark:bg-[#101216] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(31,32,36,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(31,32,36,0.045)_1px,transparent_1px)] bg-[size:42px_42px] dark:bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-white to-transparent dark:from-[#171a20] dark:to-transparent" />

      <section className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-black/[0.06] bg-white shadow-[0_28px_80px_rgba(31,32,36,0.12)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none lg:grid-cols-[1fr_440px]">
        <div className="relative min-h-[520px] overflow-hidden bg-[#1f2329] p-8 text-white md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:40px_40px] opacity-35" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#2f7df6]/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-[#c7b6ff]/20 blur-3xl" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-[20px] bg-white text-[#1f2329] shadow-[0_18px_36px_rgba(0,0,0,0.18)]">
                <Sparkles className="h-6 w-6" />
              </span>
              <div>
                <div className="text-lg font-bold">Lopuo AI</div>
                <div className="mt-0.5 text-xs font-semibold text-white/55">Customer Service Console</div>
              </div>
            </div>

            <div className="my-auto max-w-lg py-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/75">
                <Bot className="h-4 w-4 text-[#9bdcff]" />
                AI 客服系统
              </div>
              <h1 className="mt-7 text-5xl font-bold leading-[1.05] md:text-6xl">
                登录后管理
                <span className="block text-white/60">你的智能客服</span>
              </h1>
              <p className="mt-6 max-w-md text-base font-medium leading-7 text-white/58">
                知识库、访客会话、线索留资和 Widget 样式都在控制台里统一管理。
              </p>
            </div>

            <div className="relative grid gap-3 sm:grid-cols-3">
              <FeaturePill icon={<DatabaseZap className="h-4 w-4" />} label="Knowledge" />
              <FeaturePill icon={<MessageSquareText className="h-4 w-4" />} label="Chat" />
              <FeaturePill icon={<ShieldCheck className="h-4 w-4" />} label="Isolated" />
            </div>
          </div>
        </div>

        <div className="p-7 md:p-9">
          <div className="mb-6 max-w-[260px]">
            <ThemeToggle />
          </div>
          <div className="mb-8">
            <div className="h-11 w-2 rounded-full bg-[#ffb48b]" />
            <h2 className="mt-5 text-3xl font-bold dark:text-white">登录客服控制台</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#777e89]">
              输入管理员账号进入后台。演示模式下可使用默认测试账号。
            </p>
          </div>

          <div className="rounded-[22px] bg-[#f6f6f7] p-4 dark:bg-white/8">
            <div className="text-xs font-bold uppercase text-[#9aa0aa]">Demo Access</div>
            <div className="mt-3 grid gap-2 font-mono text-xs font-semibold text-[#5d646f] dark:text-white/65">
              <div className="rounded-[14px] bg-white px-3 py-2 dark:bg-white/10">admin@example.com</div>
              <div className="rounded-[14px] bg-white px-3 py-2 dark:bg-white/10">change-me</div>
            </div>
          </div>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-[18px] bg-white/10 px-4 py-3 text-sm font-bold text-white/75 backdrop-blur">
      <span className="text-[#9bdcff]">{icon}</span>
      {label}
    </div>
  );
}
