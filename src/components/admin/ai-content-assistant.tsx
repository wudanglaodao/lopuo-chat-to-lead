"use client";

import { Lightbulb, LoaderCircle, RefreshCw, Sparkles, WandSparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

type AssistAction = "generate" | "improve";
type AssistTarget = "all" | "welcome" | "questions";

type AssistResponse = {
  welcomeTitle?: string;
  welcomeMessage?: string;
  suggestedQuestions?: string[];
  suggestions?: string[];
  error?: string;
};

export function AiContentAssistant({
  defaultWelcomeTitle,
  defaultWelcomeMessage,
  defaultSuggestedQuestions,
  defaultAiTone,
  toneOptions,
  defaultToneKeywords,
  defaultBusinessFlow,
}: {
  defaultWelcomeTitle: string;
  defaultWelcomeMessage: string;
  defaultSuggestedQuestions: string[];
  defaultAiTone: string;
  toneOptions: Array<[string, string]>;
  defaultToneKeywords: string[];
  defaultBusinessFlow: string;
}) {
  const [welcomeTitle, setWelcomeTitle] = useState(defaultWelcomeTitle);
  const [welcomeMessage, setWelcomeMessage] = useState(defaultWelcomeMessage);
  const [suggestedQuestions, setSuggestedQuestions] = useState(defaultSuggestedQuestions.join("\n"));
  const [aiTone, setAiTone] = useState(defaultAiTone);
  const [toneKeywords, setToneKeywords] = useState(defaultToneKeywords.join("\n"));
  const [businessFlow, setBusinessFlow] = useState(defaultBusinessFlow);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function requestAssist(action: AssistAction, target: AssistTarget) {
    const actionKey = `${action}:${target}`;
    setPendingAction(actionKey);
    setStatus("");
    setError("");

    try {
      const response = await fetch("/api/admin/content-assist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          target,
          welcomeTitle,
          welcomeMessage,
          suggestedQuestions: splitLines(suggestedQuestions),
          aiTone,
          toneKeywords: splitLines(toneKeywords),
          businessFlow,
        }),
      });

      const data = (await response.json()) as AssistResponse;
      if (!response.ok) {
        throw new Error(data.error || "AI content assist failed.");
      }

      if ((target === "all" || target === "welcome") && data.welcomeMessage) {
        setWelcomeMessage(data.welcomeMessage);
      }
      if ((target === "all" || target === "welcome") && data.welcomeTitle) {
        setWelcomeTitle(data.welcomeTitle);
      }
      if ((target === "all" || target === "questions") && data.suggestedQuestions?.length) {
        setSuggestedQuestions(data.suggestedQuestions.join("\n"));
      }

      setSuggestions(data.suggestions || []);
      setStatus(action === "generate" ? "已生成一版，可以继续微调后保存。" : "已按当前内容优化，可以继续微调后保存。");
    } catch (assistError) {
      setError(assistError instanceof Error ? assistError.message : "AI 生成失败，请稍后再试。");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-black/[0.06] bg-[#fbfbfc] px-1 py-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[#f0f6ff] text-[#2f7df6] dark:bg-[#2f7df6]/15 dark:text-[#9bc4ff]">
            <Sparkles size={18} />
          </span>
          <div>
            <div className="text-sm font-bold text-[#1f2024] dark:text-white">AI 文案助手</div>
            <div className="mt-1 text-xs font-semibold text-[#8a929f] dark:text-white/45">基于当前语气和流程生成客服开场内容</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <AssistButton
            icon="sparkles"
            pending={pendingAction === "generate:all"}
            disabled={Boolean(pendingAction)}
            onClick={() => requestAssist("generate", "all")}
          >
            AI 生成
          </AssistButton>
          <AssistButton
            icon="refresh"
            pending={pendingAction === "improve:all"}
            disabled={Boolean(pendingAction)}
            onClick={() => requestAssist("improve", "all")}
          >
            优化当前
          </AssistButton>
        </div>
      </div>

      {status || error ? (
        <div
          className={[
            "rounded-[16px] px-4 py-3 text-sm font-semibold",
            error
              ? "bg-[#fff1f0] text-[#b42318] dark:bg-[#ff6b4a]/12 dark:text-[#ffb4a3]"
              : "bg-[#eefaf4] text-[#087443] dark:bg-[#17a15f]/12 dark:text-[#8de6b7]",
          ].join(" ")}
        >
          {error || status}
        </div>
      ) : null}

      <SmartTextArea
        label="欢迎标题"
        name="welcomeTitle"
        value={welcomeTitle}
        rows={2}
        pendingAction={pendingAction}
        onChange={setWelcomeTitle}
        actions={[
          { label: "生成", action: "generate", target: "welcome" },
          { label: "优化", action: "improve", target: "welcome" },
        ]}
        onAssist={requestAssist}
      />

      <SmartTextArea
        label="欢迎正文"
        name="welcomeMessage"
        value={welcomeMessage}
        rows={4}
        pendingAction={pendingAction}
        onChange={setWelcomeMessage}
        actions={[
          { label: "生成", action: "generate", target: "welcome" },
          { label: "优化", action: "improve", target: "welcome" },
        ]}
        onAssist={requestAssist}
      />

      <SmartTextArea
        label="推荐问题，每行一个"
        name="suggestedQuestions"
        value={suggestedQuestions}
        rows={6}
        pendingAction={pendingAction}
        onChange={setSuggestedQuestions}
        actions={[
          { label: "生成", action: "generate", target: "questions" },
          { label: "优化", action: "improve", target: "questions" },
        ]}
        onAssist={requestAssist}
      />

      {suggestions.length ? (
        <div className="space-y-2 border-l-2 border-[#9bc4ff] pl-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1f2024] dark:text-white">
            <Lightbulb size={16} />
            AI 优化建议
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {suggestions.map((suggestion) => (
              <div key={suggestion} className="rounded-[16px] bg-[#f6f8fb] px-4 py-3 text-sm font-semibold leading-6 text-[#5d646f] dark:bg-white/8 dark:text-white/65">
                {suggestion}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-[minmax(0,320px)_1fr]">
        <label className="block">
          <span className="text-sm font-bold text-[#777e89] dark:text-white/60">AI 语气</span>
          <select
            name="aiTone"
            value={aiTone}
            onChange={(event) => setAiTone(event.target.value)}
            className="mt-2 w-full rounded-[18px] border border-black/[0.06] bg-[#f5f5f6] px-4 py-3 text-sm font-semibold text-[#1f2024] outline-none transition focus:border-[#2f7df6]/40 focus:bg-white focus:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-white/8 dark:text-white dark:focus:border-[#2f7df6]/60 dark:focus:bg-white/12"
          >
            {toneOptions.map(([value, labelText]) => (
              <option key={value} value={value} className="bg-white text-[#1f2024] dark:bg-[#171a20] dark:text-white">
                {labelText}
              </option>
            ))}
          </select>
        </label>
        <PlainTextArea label="语气内置词，每行一个" name="toneKeywords" value={toneKeywords} rows={4} onChange={setToneKeywords} />
      </div>

      <PlainTextArea label="业务流程说明" name="businessFlow" value={businessFlow} rows={7} onChange={setBusinessFlow} />
    </div>
  );
}

function SmartTextArea({
  label,
  name,
  value,
  rows,
  pendingAction,
  actions,
  onChange,
  onAssist,
}: {
  label: string;
  name: string;
  value: string;
  rows: number;
  pendingAction: string | null;
  actions: Array<{ label: string; action: AssistAction; target: AssistTarget }>;
  onChange: (value: string) => void;
  onAssist: (action: AssistAction, target: AssistTarget) => void;
}) {
  return (
    <label className="block">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-[#777e89] dark:text-white/60">{label}</span>
        <span className="flex gap-2">
          {actions.map((item) => {
            const actionKey = `${item.action}:${item.target}`;
            return (
              <AssistButton
                key={actionKey}
                compact
                icon={item.action === "generate" ? "wand" : "refresh"}
                pending={pendingAction === actionKey}
                disabled={Boolean(pendingAction)}
                onClick={() => onAssist(item.action, item.target)}
              >
                {item.label}
              </AssistButton>
            );
          })}
        </span>
      </span>
      <textarea
        name={name}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-[18px] border border-black/[0.06] bg-[#f5f5f6] px-4 py-3 text-sm font-semibold leading-6 text-[#1f2024] outline-none transition focus:border-[#2f7df6]/40 focus:bg-white focus:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-white/8 dark:text-white dark:focus:border-[#2f7df6]/60 dark:focus:bg-white/12"
      />
    </label>
  );
}

function PlainTextArea({
  label,
  name,
  value,
  rows,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#777e89] dark:text-white/60">{label}</span>
      <textarea
        name={name}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-[18px] border border-black/[0.06] bg-[#f5f5f6] px-4 py-3 text-sm font-semibold leading-6 text-[#1f2024] outline-none transition focus:border-[#2f7df6]/40 focus:bg-white focus:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-white/8 dark:text-white dark:focus:border-[#2f7df6]/60 dark:focus:bg-white/12"
      />
    </label>
  );
}

function AssistButton({
  children,
  compact,
  disabled,
  pending,
  icon,
  onClick,
}: {
  children: ReactNode;
  compact?: boolean;
  disabled: boolean;
  pending: boolean;
  icon: "sparkles" | "wand" | "refresh";
  onClick: () => void;
}) {
  const Icon = pending ? LoaderCircle : icon === "sparkles" ? Sparkles : icon === "wand" ? WandSparkles : RefreshCw;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-[14px] border text-sm font-bold transition",
        compact ? "px-3 py-1.5" : "px-4 py-2.5",
        "border-[#dfe6f2] bg-white text-[#2f7df6] shadow-[0_10px_24px_rgba(47,125,246,0.08)] hover:-translate-y-0.5 hover:border-[#9bc4ff] hover:shadow-[0_14px_30px_rgba(47,125,246,0.16)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 dark:border-white/10 dark:bg-white/8 dark:text-[#9bc4ff] dark:hover:bg-white/12",
      ].join(" ")}
    >
      <Icon size={compact ? 14 : 16} className={pending ? "animate-spin" : ""} />
      {children}
    </button>
  );
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
