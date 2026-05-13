"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { syncKnowledgeSourceAction } from "@/app/admin/actions";

const initialState = {
  status: "idle" as const,
  message: "",
};

export function KnowledgeSyncForm({ sourceId }: { sourceId: string }) {
  const [state, formAction, pending] = useActionState(syncKnowledgeSourceAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.status !== "idle") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="sourceId" value={sourceId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-[14px] border border-black/[0.07] bg-white px-3 py-2 text-xs font-bold transition hover:border-[#2f7df6]/30 hover:text-[#2f7df6] hover:shadow-sm disabled:cursor-wait disabled:opacity-60 disabled:hover:border-black/[0.07] disabled:hover:text-inherit disabled:hover:shadow-none dark:border-white/10 dark:bg-white/8 dark:text-white dark:hover:border-[#2f7df6]/50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
        {pending ? "同步中..." : "同步"}
      </button>
      {state.status !== "idle" && state.message ? (
        <p
          aria-live="polite"
          className={[
            "max-w-32 text-xs font-semibold leading-5",
            state.status === "error" ? "text-[#ff5a4f]" : "text-[#6bb956]",
          ].join(" ")}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
