import { Bot, DatabaseZap, MessageSquareText, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand-mark";
import { LoginForm } from "@/components/admin/login-form";
import { ThemeToggle } from "@/components/admin/theme-toggle";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#fbfff7] px-5 py-8 text-[#1f2024] transition-colors dark:bg-[#101216] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(31,32,36,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(31,32,36,0.05)_1px,transparent_1px)] bg-[size:42px_42px] dark:bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-[#bdf2a0]" />

      <section className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-black/[0.06] bg-white shadow-[0_28px_80px_rgba(31,32,36,0.12)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none lg:grid-cols-[1fr_440px]">
        <div className="relative min-h-[520px] overflow-hidden bg-[#f6fbff] p-8 text-[#111318] md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(31,32,36,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(31,32,36,0.045)_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="pointer-events-none absolute right-8 top-8 h-28 w-28 rounded-[28px] bg-[#9bdcff]/60" />
          <div className="pointer-events-none absolute bottom-10 left-10 h-24 w-44 rounded-[28px] bg-[#bdf2a0]/75" />
          <div className="pointer-events-none absolute right-12 bottom-14 h-20 w-36 rounded-[24px] bg-[#ffb48b]/60" />

          <div className="relative flex h-full flex-col">
            <BrandLogo markClassName="h-14 w-14 rounded-[20px]" showTagline tagline="营销客服控制台" />

            <div className="my-auto max-w-lg py-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#00a878]/20 bg-white px-4 py-2 text-sm font-bold text-[#007f5f] shadow-sm">
                <Bot className="h-4 w-4" />
                知识库营销客服
              </div>
              <h1 className="mt-7 text-5xl font-bold leading-[1.05] md:text-6xl">
                登录后管理
                <span className="block text-[#007f5f]">你的 AI 留咨助手</span>
              </h1>
              <p className="mt-6 max-w-md text-base font-medium leading-7 text-[#5d646f]">
                配置知识库、营销话术、推荐问题和留咨字段，让官网客服边回答边帮销售筛选客户。
              </p>
            </div>

            <div className="relative grid gap-3 sm:grid-cols-3">
              <FeaturePill icon={<DatabaseZap className="h-4 w-4" />} label="Knowledge" />
              <FeaturePill icon={<MessageSquareText className="h-4 w-4" />} label="Lead capture" />
              <FeaturePill icon={<ShieldCheck className="h-4 w-4" />} label="Sales handoff" />
            </div>
          </div>
        </div>

        <div className="p-7 md:p-9">
          <div className="mb-6 max-w-[260px]">
            <ThemeToggle />
          </div>
          <div className="mb-8">
            <div className="h-11 w-2 rounded-full bg-[#ffb48b]" />
            <h2 className="mt-5 text-3xl font-bold dark:text-white">登录营销客服控制台</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#777e89]">
              输入管理员账号，进入知识库客服与留咨转化后台。还没有账号时，请联系团队开通工作区。
            </p>
          </div>

          <LoginForm />
          <p className="mt-5 rounded-[18px] bg-[#f6f6f7] px-4 py-3 text-sm font-semibold leading-6 text-[#777e89] dark:bg-white/8 dark:text-white/55">
            新团队开通后，可配置官网脚本、知识库素材、AI 营销话术、留咨字段和销售跟进规则。
          </p>
        </div>
      </section>
    </main>
  );
}

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-[18px] border border-black/[0.06] bg-white px-4 py-3 text-sm font-bold text-[#5d646f] shadow-sm">
      <span className="text-[#2f7df6]">{icon}</span>
      {label}
    </div>
  );
}
