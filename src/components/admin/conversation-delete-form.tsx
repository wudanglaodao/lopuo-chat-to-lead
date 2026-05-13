"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { deleteConversationAction } from "@/app/admin/actions";

const initialState = {
  status: "idle" as const,
  message: "",
};

export function ConversationDeleteForm({
  conversationId,
  returnTo,
  variant = "icon",
}: {
  conversationId: string;
  returnTo?: string;
  variant?: "icon" | "button";
}) {
  const [state, formAction, pending] = useActionState(deleteConversationAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success" && !returnTo) {
      router.refresh();
    }
  }, [returnTo, router, state.status]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("确定删除这条会话吗？关联消息和线索也会一起清理。")) {
          event.preventDefault();
        }
      }}
      className={variant === "button" ? "space-y-2" : "flex justify-end"}
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <button
        type="submit"
        disabled={pending}
        className={
          variant === "button"
            ? "inline-flex w-full items-center justify-center gap-2 rounded-[16px] border border-[#ffb4a8] bg-[#fff1ef] px-4 py-3 text-sm font-bold text-[#d92d20] transition hover:-translate-y-0.5 hover:border-[#ff6b4a] hover:bg-white disabled:cursor-wait disabled:translate-y-0 disabled:opacity-60 dark:border-[#ff6b4a]/35 dark:bg-[#ff6b4a]/12 dark:text-[#ffb4a3] dark:hover:bg-[#ff6b4a]/18"
            : "grid h-10 w-10 place-items-center rounded-full bg-[#fff1ef] text-[#d92d20] transition hover:bg-[#d92d20] hover:text-white disabled:cursor-wait disabled:opacity-60 dark:bg-[#ff6b4a]/12 dark:text-[#ffb4a3] dark:hover:bg-[#d92d20] dark:hover:text-white"
        }
        aria-label={pending ? "正在删除会话" : "删除会话"}
        title={pending ? "正在删除" : "删除会话"}
      >
        <Trash2 className={variant === "button" ? "h-4 w-4" : "h-5 w-5"} />
        {variant === "button" ? (pending ? "删除中..." : "删除会话") : null}
      </button>
      {variant === "button" && state.status === "error" && state.message ? (
        <p className="text-xs font-semibold leading-5 text-[#ff5a4f]" aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
