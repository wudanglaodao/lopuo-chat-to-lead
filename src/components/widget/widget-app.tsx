"use client";

import { Bot, Maximize2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type WidgetConfig = {
  siteId: string;
  widgetName: string;
  launcherText: string;
  launcherStyle: "pill" | "vertical" | "mascot";
  launcherImageUrl?: string | null;
  launcherBadgeText?: string | null;
  launcherAnimation: "none" | "pulse" | "bounce" | "float";
  welcomeMessage: string;
  themeColor: string;
  suggestedQuestions: string[];
  showSources: boolean;
  collectLeadEnabled: boolean;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ id: string; url: string; title: string | null; score: number }>;
  isMiss?: boolean;
};

export function WidgetApp({
  siteId,
  previewStyle,
  previewText,
}: {
  siteId: string;
  previewStyle?: string;
  previewText?: string;
}) {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSaved, setLeadSaved] = useState(false);

  const visitorId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const key = "lopuo_ai_visitor_id";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const next = crypto.randomUUID();
    window.localStorage.setItem(key, next);
    return next;
  }, []);

  useEffect(() => {
    window.parent.postMessage(
      {
        type: "lopuo-ai-widget-resize",
        open: isOpen,
        launcherStyle: config?.launcherStyle || "vertical",
      },
      "*",
    );
  }, [isOpen, config?.launcherStyle]);

  useEffect(() => {
    if (!siteId) {
      return;
    }

    const params = new URLSearchParams({
      siteId,
      previewStyle: previewStyle || "",
      previewText: previewText || "",
    });

    fetch(`/api/widget/config?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error || "配置加载失败");
        return response.json();
      })
      .then(setConfig)
      .catch((err: Error) => setError(err.message));
  }, [siteId, previewStyle, previewText]);

  const ensureConversation = useCallback(async () => {
    if (conversationId) {
      return conversationId;
    }

    const stored = window.localStorage.getItem(`lopuo_ai_conversation_${siteId}`) || undefined;
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId,
        visitorId,
        conversationId: stored,
        pageUrl: document.referrer || window.location.href,
        referrer: document.referrer,
      }),
    });

    if (!response.ok) {
      throw new Error("会话创建失败");
    }

    const data = (await response.json()) as { conversationId: string };
    window.localStorage.setItem(`lopuo_ai_conversation_${siteId}`, data.conversationId);
    setConversationId(data.conversationId);
    return data.conversationId;
  }, [conversationId, siteId, visitorId]);

  async function sendMessage(content: string) {
    const text = content.trim();
    if (!text || isLoading) return;

    setInput("");
    setError("");
    setIsLoading(true);
    setMessages((items) => [...items, { id: crypto.randomUUID(), role: "user", content: text }]);

    try {
      const activeConversationId = await ensureConversation();
      const response = await fetch(`/api/conversations/${activeConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, message: text }),
      });

      if (!response.ok) {
        throw new Error("AI 回复失败，请稍后再试。");
      }

      const data = (await response.json()) as { message: ChatMessage };
      setMessages((items) => [...items, data.message]);
      if (data.message.isMiss) {
        setShowLeadForm(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      const activeConversationId = await ensureConversation();
      const formData = new FormData(event.currentTarget);
      const response = await fetch(`/api/conversations/${activeConversationId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          name: formData.get("name"),
          phone: formData.get("phone"),
          wechat: formData.get("wechat"),
          email: formData.get("email"),
          company: formData.get("company"),
          requirement: formData.get("requirement"),
        }),
      });

      if (!response.ok) {
        throw new Error("留资保存失败");
      }

      setLeadSaved(true);
      setShowLeadForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "留资失败");
    }
  }

  if (!isOpen) {
    return <LauncherButton config={config} onOpen={() => setIsOpen(true)} />;
  }

  return (
    <main className="flex h-screen flex-col bg-[#f7f8f7] text-stone-900 shadow-2xl sm:h-full sm:rounded-2xl sm:border sm:border-black/10">
      <header className="flex items-center justify-between border-b border-black/10 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: config?.themeColor || "#16a34a" }}>
            <Bot className="h-5 w-5 text-white" />
          </span>
          <div>
            <div className="font-semibold">{config?.widgetName || "AI 助理"}</div>
            <div className="text-xs text-stone-500">基于官网资料回答</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button title="放大" className="rounded-md p-2 text-stone-500 hover:bg-stone-100">
            <Maximize2 className="h-4 w-4" />
          </button>
          <button title="关闭" onClick={() => setIsOpen(false)} className="rounded-md p-2 text-stone-500 hover:bg-stone-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5" style={{ color: config?.themeColor || "#16a34a" }} />
            您好，我是 {config?.widgetName || "AI 助理"}
          </div>
          <p className="mt-2 text-sm leading-6 text-stone-600">{config?.welcomeMessage}</p>
          <div className="mt-4 space-y-2">
            {config?.suggestedQuestions.map((question) => (
              <button
                key={question}
                onClick={() => sendMessage(question)}
                className="flex w-full items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100"
              >
                <Sparkles className="h-4 w-4 text-blue-500" />
                {question}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {messages.map((message) => (
            <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={message.role === "user" ? "max-w-[82%] rounded-2xl bg-stone-900 px-4 py-3 text-sm text-white" : "max-w-[86%] rounded-2xl bg-white px-4 py-3 text-sm text-stone-800 shadow-sm"}>
                <div className="whitespace-pre-wrap leading-6">{message.content}</div>
                {config?.showSources && message.sources && message.sources.length > 0 ? (
                  <div className="mt-3 space-y-1 border-t border-stone-100 pt-2">
                    {message.sources.slice(0, 3).map((source) => (
                      <a key={source.id} href={source.url} target="_blank" className="block truncate text-xs text-emerald-700">
                        来源：{source.title || source.url}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {isLoading ? (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-stone-500 shadow-sm">正在整理回答...</div>
            </div>
          ) : null}
          {leadSaved ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              已记录您的信息，我们会尽快联系您。
            </div>
          ) : null}
          {error || !siteId ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error || "缺少 siteId，请检查嵌入代码。"}
            </div>
          ) : null}
        </div>

        {config?.collectLeadEnabled && showLeadForm ? (
          <form onSubmit={saveLead} className="mt-4 space-y-3 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 font-medium">
              <MessageCircle className="h-4 w-4" />
              留下联系方式
            </div>
            <input name="name" placeholder="姓名" className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
            <input name="phone" placeholder="手机号" className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
            <input name="wechat" placeholder="微信" className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
            <input name="email" placeholder="邮箱" className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
            <input name="company" placeholder="公司名称" className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
            <textarea name="requirement" placeholder="需求描述" rows={3} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
            <button className="w-full rounded-md px-4 py-2 text-sm font-medium text-white" style={{ background: config.themeColor }}>
              提交
            </button>
          </form>
        ) : null}
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(input);
        }}
        className="border-t border-black/10 bg-white p-3"
      >
        <div className="flex items-end gap-2 rounded-xl border border-stone-200 bg-white p-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="请输入您的问题..."
            rows={2}
            className="min-h-10 flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white disabled:opacity-40"
            style={{ background: config?.themeColor || "#16a34a" }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </main>
  );
}

function LauncherButton({
  config,
  onOpen,
}: {
  config: WidgetConfig | null;
  onOpen: () => void;
}) {
  const style = config?.launcherStyle || "vertical";
  const themeColor = config?.themeColor || "#16a34a";
  const text = config?.launcherText || "AI 助理";
  const animation = config?.launcherAnimation || "pulse";
  const animationClass =
    animation === "bounce"
      ? "animate-[launcherBounce_1.8s_ease-in-out_infinite]"
      : animation === "float"
        ? "animate-[launcherFloat_2.8s_ease-in-out_infinite]"
        : "";

  if (style === "pill") {
    return (
      <button
        onClick={onOpen}
        className={`group fixed bottom-5 right-5 flex h-20 w-[268px] items-center justify-center gap-5 overflow-hidden rounded-full bg-[#ffd2ea] px-8 text-2xl font-medium text-pink-600 transition duration-300 hover:-translate-y-1 hover:scale-[1.015] active:translate-y-0 active:scale-[0.99] ${animationClass}`}
        style={{
          border: `5px solid ${themeColor}`,
          boxShadow: `0 0 0 1px rgba(255,255,255,0.76) inset, 0 10px 26px ${themeColor}24`,
        }}
      >
        <PulseRing enabled={animation === "pulse"} color={themeColor} rounded="999px" />
        <span className="pointer-events-none absolute inset-x-8 top-2 h-5 rounded-full bg-white/45 blur-md" />
        <span className="pointer-events-none absolute -left-8 top-3 h-16 w-16 rounded-full bg-white/30 blur-xl transition duration-500 group-hover:left-8" />
        <MagicStarIcon />
        <span className="relative z-10 truncate tracking-normal">{text}</span>
      </button>
    );
  }

  if (style === "mascot") {
    return (
      <button
        onClick={onOpen}
        className={`fixed bottom-5 right-5 grid h-28 w-28 place-items-center rounded-full bg-white/90 shadow-2xl transition duration-200 hover:scale-105 ${animationClass}`}
      >
        <PulseRing enabled={animation === "pulse"} color={themeColor} rounded="999px" />
        <MascotAvatar imageUrl={config?.launcherImageUrl} color={themeColor} />
        {config?.launcherBadgeText ? (
          <span className="absolute right-2 top-2 grid min-h-7 min-w-7 place-items-center rounded-full bg-rose-500 px-2 text-sm font-bold text-white shadow-lg">
            {config.launcherBadgeText}
          </span>
        ) : null}
        <span className="sr-only">{text}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onOpen}
      className={`fixed bottom-4 right-4 flex h-[184px] w-20 flex-col items-center justify-center gap-3 rounded-full bg-white text-stone-900 shadow-2xl transition duration-200 hover:-translate-y-1 ${animationClass}`}
    >
      <PulseRing enabled={animation === "pulse"} color={themeColor} rounded="999px" />
      <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full bg-white shadow-inner">
        <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: themeColor }}>
          <Bot className="h-5 w-5 text-white" />
        </span>
      </span>
      <span className="relative z-10 max-w-12 text-center text-2xl font-bold leading-tight">
        {getVerticalLabelParts(text).map((char, index) => (
          <span key={`${char}-${index}`} className="block">
            {char}
          </span>
        ))}
      </span>
    </button>
  );
}

function MagicStarIcon() {
  return (
    <span className="relative z-10 grid h-12 w-12 place-items-center text-white transition duration-300 group-hover:rotate-6 group-hover:scale-110">
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="h-12 w-12 drop-shadow-[0_3px_4px_rgba(255,10,104,0.18)]"
      >
        <path
          d="M31.4 7.8c1.6 0 2.9 1.1 3.3 2.7l3.1 14.1 14.1 3.1c1.6.4 2.7 1.7 2.7 3.3s-1.1 2.9-2.7 3.3l-14.1 3.1-3.1 14.1c-.4 1.6-1.7 2.7-3.3 2.7s-2.9-1.1-3.3-2.7L25 37.4l-14.1-3.1c-1.6-.4-2.7-1.7-2.7-3.3s1.1-2.9 2.7-3.3L25 24.6l3.1-14.1c.4-1.6 1.7-2.7 3.3-2.7Z"
          fill="currentColor"
        />
        <circle cx="11" cy="45" r="6" fill="currentColor" opacity="0.95" />
        <path
          d="M48 10.5v10M43 15.5h10M54.5 22v7M51 25.5h7"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function PulseRing({
  enabled,
  color,
  rounded,
}: {
  enabled: boolean;
  color: string;
  rounded: string;
}) {
  if (!enabled) return null;

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 animate-[launcherPulse_1.8s_ease-out_infinite]"
      style={{ borderRadius: rounded, color, boxShadow: `0 0 0 0 ${color}55` }}
    />
  );
}

function getVerticalLabelParts(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");
  const match = normalized.match(/^([A-Za-z]{1,4})\s*(.*)$/);
  if (match && match[2]) {
    return [match[1], ...match[2].replace(/\s+/g, "").split("")];
  }
  return normalized.replace(/\s+/g, "").split("");
}

function MascotAvatar({
  imageUrl,
  color,
}: {
  imageUrl?: string | null;
  color: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" className="h-24 w-24 rounded-full object-cover" />
    );
  }

  return (
    <span className="relative block h-24 w-24">
      <span className="absolute inset-1 rounded-full bg-black" />
      <span className="absolute bottom-0 left-2 h-[86px] w-[74px] rounded-full" style={{ background: color }} />
      <span className="absolute left-7 top-0 h-6 w-2 rounded-full bg-emerald-950" />
      <span className="absolute left-2 top-8 h-9 w-5 -rotate-12 rounded-full bg-white" />
      <span className="absolute left-8 top-7 h-9 w-10 rounded-full bg-black">
        <span className="absolute left-2 top-3 h-2.5 w-2.5 rounded-full bg-white" />
        <span className="absolute right-2 top-3 h-2.5 w-2.5 rounded-full bg-white" />
      </span>
      <span className="absolute bottom-5 left-8 grid h-8 w-8 place-items-center rounded-md bg-white text-emerald-500">
        <Sparkles className="h-5 w-5 fill-current" />
      </span>
    </span>
  );
}
