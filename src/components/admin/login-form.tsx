"use client";

import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    setIsLoading(false);

    if (!response.ok) {
      setError("邮箱或密码不正确。");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <label className="block">
        <span className="text-sm font-bold text-[#777e89] dark:text-white/60">邮箱</span>
        <span className="mt-2 flex items-center gap-3 rounded-[18px] border border-black/[0.06] bg-[#f5f5f6] px-4 py-3 transition focus-within:border-[#2f7df6]/40 focus-within:bg-white focus-within:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-white/8 dark:focus-within:border-[#2f7df6]/60 dark:focus-within:bg-white/12">
          <Mail className="h-5 w-5 text-[#9aa0aa]" />
          <input
            name="email"
            type="email"
            required
            placeholder="name@company.com"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#1f2024] outline-none placeholder:text-[#a8adb6] dark:text-white dark:placeholder:text-white/30"
          />
        </span>
      </label>
      <label className="block">
        <span className="text-sm font-bold text-[#777e89] dark:text-white/60">密码</span>
        <span className="mt-2 flex items-center gap-3 rounded-[18px] border border-black/[0.06] bg-[#f5f5f6] px-4 py-3 transition focus-within:border-[#2f7df6]/40 focus-within:bg-white focus-within:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-white/8 dark:focus-within:border-[#2f7df6]/60 dark:focus-within:bg-white/12">
          <LockKeyhole className="h-5 w-5 text-[#9aa0aa]" />
          <input
            name="password"
            type="password"
            required
            placeholder="请输入密码"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#1f2024] outline-none placeholder:text-[#a8adb6] dark:text-white dark:placeholder:text-white/30"
          />
        </span>
      </label>
      {error ? (
        <p className="rounded-[14px] bg-[#ffe8e5] px-4 py-3 text-sm font-semibold text-[#ff5a4f]">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={isLoading}
        className="group flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#2f7df6] px-4 py-4 text-[15px] font-bold text-white shadow-[0_16px_34px_rgba(47,125,246,0.28)] transition hover:-translate-y-0.5 hover:bg-[#1d6ef0] disabled:translate-y-0 disabled:opacity-60"
      >
        {isLoading ? "登录中..." : "进入控制台"}
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </button>
    </form>
  );
}
