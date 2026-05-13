"use client";

import dynamic from "next/dynamic";

import type { AiContentAssistantProps } from "@/components/admin/ai-content-assistant";

const AiContentAssistant = dynamic(
  () => import("@/components/admin/ai-content-assistant").then((mod) => mod.AiContentAssistant),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-[18px] bg-[#f3f3f4] dark:bg-white/8" />
        <div className="h-28 animate-pulse rounded-[18px] bg-[#f3f3f4] dark:bg-white/8" />
        <div className="h-40 animate-pulse rounded-[18px] bg-[#f3f3f4] dark:bg-white/8" />
      </div>
    ),
  },
);

export function LazyAiContentAssistant(props: AiContentAssistantProps) {
  return <AiContentAssistant {...props} />;
}
