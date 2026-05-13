"use client";

import { Bell, Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type WidgetConfig = {
  siteId: string;
  tenantId?: string | null;
  widgetName: string;
  launcherText: string;
  launcherStyle: "pill" | "vertical" | "mascot";
  launcherImageUrl?: string | null;
  launcherBadgeText?: string | null;
  launcherAnimation: "none" | "pulse" | "bounce" | "float";
  welcomeTitle: string;
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

type MessageResponse = {
  message: ChatMessage;
  leadSaved?: boolean;
  leadPrompt?: boolean;
};

type MessageStreamEvent =
  | { type: "status"; message: string }
  | { type: "delta"; content: string }
  | (MessageResponse & { type: "done" })
  | { type: "error"; message: string };

export function WidgetApp({
  siteId,
  tenantId,
  previewStyle,
  previewText,
}: {
  siteId: string;
  tenantId?: string;
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
  const [showLeadPrompt, setShowLeadPrompt] = useState(false);
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
      tenantId: tenantId || "",
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
  }, [siteId, tenantId, previewStyle, previewText]);

  const ensureConversation = useCallback(async () => {
    if (conversationId) {
      return conversationId;
    }

    const activeTenantId = config?.tenantId || tenantId || "default";
    const storageKey = `lopuo_ai_conversation_${siteId}_${activeTenantId}`;
    const stored = window.localStorage.getItem(storageKey) || undefined;
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId,
        tenantId: config?.tenantId || tenantId || undefined,
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
    window.localStorage.setItem(storageKey, data.conversationId);
    setConversationId(data.conversationId);
    return data.conversationId;
  }, [config?.tenantId, conversationId, siteId, tenantId, visitorId]);

  async function sendMessage(content: string) {
    const text = content.trim();
    if (!text || isLoading) return;

    setInput("");
    setError("");
    setIsLoading(true);
    const assistantId = crypto.randomUUID();
    let assistantContent = "";
    let assistantFinalized = false;

    const updateAssistant = (next: Partial<ChatMessage>) => {
      setMessages((items) =>
        items.map((item) => (item.id === assistantId ? { ...item, ...next } : item)),
      );
    };

    setMessages((items) => [
      ...items,
      { id: crypto.randomUUID(), role: "user", content: text },
      { id: assistantId, role: "assistant", content: "正在理解问题..." },
    ]);

    try {
      const activeConversationId = await ensureConversation();
      const response = await fetch(`/api/conversations/${activeConversationId}/messages`, {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ siteId, message: text, stream: true }),
      });

      if (!response.ok) {
        throw new Error("AI 回复失败，请稍后再试。");
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream") && response.body) {
        await readMessageStream(response, {
          onStatus(message) {
            if (!assistantContent) {
              updateAssistant({ content: `${message}...` });
            }
          },
          onDelta(content) {
            assistantContent += content;
            updateAssistant({ content: assistantContent || "正在整理回答..." });
          },
          onDone(data) {
            assistantFinalized = true;
            updateAssistant(data.message);
            updateLeadState(data);
          },
          onError(message) {
            throw new Error(message);
          },
        });
      } else {
        const data = (await response.json()) as MessageResponse;
        assistantFinalized = true;
        updateAssistant(data.message);
        updateLeadState(data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "发送失败";
      setError(message);
      if (!assistantFinalized) {
        updateAssistant({ content: message });
      }
    } finally {
      setIsLoading(false);
    }

    function updateLeadState(data: MessageResponse) {
      if (data.leadSaved) {
        setLeadSaved(true);
        setShowLeadPrompt(false);
      } else if (data.leadPrompt) {
        setShowLeadPrompt(true);
      }
    }
  }

  const themeColor = config?.themeColor || "#16a34a";
  const logoUrl = "https://www.lopuo.com/wp-content/themes/lopuo-theme/assets/img/lopuo-logo-black.svg?ver=0.8.14";
  const welcomeMessage = config?.welcomeMessage || "您好，请告诉我您想了解的问题。";
  const suggestedQuestions = config?.suggestedQuestions || [];

  if (!isOpen) {
    return <LauncherButton config={config} onOpen={() => setIsOpen(true)} />;
  }

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-[#f8fafc] text-[#17191d] shadow-[0_24px_80px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.08]">
      <header className="relative border-b border-black/[0.06] bg-[#f8fafc] px-4 pb-3 pt-3">
        <div className="flex h-12 items-center justify-between">
          <div className="flex h-11 min-w-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Lopuo" className="h-5 w-auto max-w-[120px] object-contain" />
          </div>
          <button
            type="button"
            aria-label="关闭客服窗口"
            title="关闭"
            onClick={() => setIsOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-full text-stone-400 transition hover:bg-white hover:text-stone-700"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div
          className="mt-3 flex h-8 items-center justify-between rounded-full px-3 text-xs"
          style={{
            background: `color-mix(in srgb, ${themeColor} 12%, white)`,
            color: themeColor,
          }}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <Bell className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">可以直接提问，也可以留下联系方式</span>
          </span>
          <span className="ml-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" />
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4 pb-1">
          <div className="flex items-center gap-3 px-3 py-1 text-[11px] text-stone-400">
            <span className="h-px flex-1 bg-black/[0.08]" />
            <span>{new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
            <span className="h-px flex-1 bg-black/[0.08]" />
          </div>
          <div className="flex items-start gap-2.5">
            <span
              className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)] ring-1"
              style={{
                color: themeColor,
                borderColor: `color-mix(in srgb, ${themeColor} 16%, transparent)`,
              }}
            >
              <Bot className="h-4 w-4" />
            </span>
            <div className="max-w-[84%] rounded-2xl rounded-tl-sm border border-black/[0.07] bg-white px-4 py-3 text-sm text-stone-700 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
              <p className="whitespace-pre-wrap leading-6">{welcomeMessage}</p>
            </div>
          </div>
          {suggestedQuestions.length > 0 ? (
            <div className="ml-9 flex flex-wrap gap-2">
              {suggestedQuestions.map((question) => (
                <button
                  type="button"
                  key={question}
                  onClick={() => sendMessage(question)}
                  className="rounded-full border border-black/[0.06] bg-white px-3 py-2 text-left text-xs font-medium leading-4 text-stone-600 shadow-[0_4px_14px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:text-stone-950"
                >
                  {question}
                </button>
              ))}
            </div>
          ) : null}
          {messages.map((message) => (
            <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex items-end gap-2"}>
              {message.role === "assistant" ? (
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)] ring-1"
                  style={{
                    color: themeColor,
                    borderColor: `color-mix(in srgb, ${themeColor} 16%, transparent)`,
                  }}
                >
                  <Bot className="h-3.5 w-3.5" />
                </span>
              ) : null}
              <div
                className={
                  message.role === "user"
                    ? "max-w-[82%] rounded-2xl rounded-br-sm px-4 py-3 text-sm text-white shadow-[0_8px_20px_rgba(15,23,42,0.1)]"
                    : "max-w-[84%] rounded-2xl rounded-tl-sm border border-black/[0.07] bg-white px-4 py-3 text-sm text-stone-800 shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
                }
                style={message.role === "user" ? { background: themeColor } : undefined}
              >
                <MessageContent content={message.content} role={message.role} themeColor={themeColor} />
                {config?.showSources && message.sources && message.sources.length > 0 ? (
                  <div className="mt-3 space-y-1 border-t border-stone-100 pt-2.5">
                    {message.sources.slice(0, 3).map((source) => (
                      <a
                        key={source.id}
                        href={source.url}
                        target="_blank"
                        className="block truncate text-xs font-medium"
                        style={{ color: themeColor }}
                      >
                        来源：{source.title || source.url}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {config?.collectLeadEnabled && showLeadPrompt && !leadSaved ? (
            <div className="flex items-end gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white ring-1 ring-black/10">
                <MessageCircle className="h-3.5 w-3.5" style={{ color: themeColor }} />
              </span>
              <div className="max-w-[86%] rounded-[18px] border border-black/10 bg-white px-4 py-3 text-sm text-stone-800 shadow-[0_10px_28px_rgba(15,23,42,0.07)]">
                <div className="whitespace-pre-wrap leading-6">
                  如果您希望顾问进一步沟通，也可以把联系方式和大致需求发给我。
                  {"\n"}不方便也没关系，我们可以先继续聊。
                </div>
              </div>
            </div>
          ) : null}
          {error || !siteId ? (
            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error || "缺少 siteId，请检查嵌入代码。"}
            </div>
          ) : null}
        </div>
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(input);
        }}
        className="bg-[#f8fafc] px-4 pb-4 pt-2"
      >
        <div className="flex items-end gap-2 rounded-[18px] border border-black/[0.08] bg-white px-4 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition focus-within:border-stone-300">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="说说你想了解的问题..."
            rows={2}
            className="max-h-20 min-h-8 flex-1 resize-none bg-transparent px-1 py-1 text-sm leading-6 outline-none placeholder:text-stone-400"
          />
          <button
            type="submit"
            aria-label="发送消息"
            disabled={!input.trim() || isLoading}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: themeColor }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </main>
  );
}

async function readMessageStream(
  response: Response,
  handlers: {
    onStatus: (message: string) => void;
    onDelta: (content: string) => void;
    onDone: (data: MessageResponse) => void;
    onError: (message: string) => void;
  },
) {
  if (!response.body) {
    throw new Error("AI 回复失败，请稍后再试。");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      handleMessageStreamEvent(event, handlers);
    }
  }

  if (buffer.trim()) {
    handleMessageStreamEvent(buffer, handlers);
  }
}

function handleMessageStreamEvent(
  event: string,
  handlers: {
    onStatus: (message: string) => void;
    onDelta: (content: string) => void;
    onDone: (data: MessageResponse) => void;
    onError: (message: string) => void;
  },
) {
  const data = event
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");

  if (!data) return;

  const payload = JSON.parse(data) as MessageStreamEvent;

  if (payload.type === "status") {
    handlers.onStatus(payload.message);
    return;
  }

  if (payload.type === "delta") {
    handlers.onDelta(payload.content);
    return;
  }

  if (payload.type === "done") {
    handlers.onDone(payload);
    return;
  }

  handlers.onError(payload.message);
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
  const text = config?.launcherText || "咨询方案";
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
        type="button"
        onClick={onOpen}
        className={`group fixed bottom-4 right-4 flex h-16 w-[244px] items-center gap-3 overflow-hidden rounded-full border bg-white px-4 text-left text-stone-900 shadow-[0_8px_18px_rgba(15,23,42,0.1)] transition duration-300 hover:-translate-y-0.5 active:translate-y-0 ${animationClass}`}
        style={{
          borderColor: `color-mix(in srgb, ${themeColor} 28%, white)`,
        }}
      >
        <PulseRing enabled={animation === "pulse"} color={themeColor} rounded="999px" />
        <span className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full text-white" style={{ background: themeColor }}>
          <MessageCircle className="h-5 w-5" />
        </span>
        <span className="relative z-10 min-w-0">
          <span className="block truncate text-base font-semibold">{text}</span>
          <span className="mt-0.5 block text-xs text-stone-500">在线咨询</span>
        </span>
      </button>
    );
  }

  if (style === "mascot") {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`fixed bottom-4 right-4 grid h-28 w-28 place-items-center rounded-full border border-white/80 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.1)] transition duration-200 hover:scale-[1.02] ${animationClass}`}
      >
        <PulseRing enabled={animation === "pulse"} color={themeColor} rounded="999px" />
        <MascotAvatar imageUrl={config?.launcherImageUrl} color={themeColor} />
        {config?.launcherBadgeText ? (
          <span className="absolute right-2 top-2 grid min-h-7 min-w-7 place-items-center rounded-full bg-rose-500 px-2 text-sm font-bold text-white">
            {config.launcherBadgeText}
          </span>
        ) : null}
        <span className="sr-only">{text}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`fixed bottom-4 right-4 flex h-[154px] w-16 flex-col items-center justify-center gap-2.5 rounded-full border bg-white text-stone-900 shadow-[0_5px_12px_rgba(15,23,42,0.07)] transition duration-200 hover:-translate-y-1 ${animationClass}`}
      style={{
        borderColor: `color-mix(in srgb, ${themeColor} 24%, transparent)`,
      }}
    >
      <PulseRing enabled={animation === "pulse"} color={themeColor} rounded="999px" />
      <span
        className="relative z-10 grid h-10 w-10 place-items-center rounded-full ring-1"
        style={{
          background: `color-mix(in srgb, ${themeColor} 8%, white)`,
          color: themeColor,
          borderColor: `color-mix(in srgb, ${themeColor} 16%, transparent)`,
        }}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full text-white" style={{ background: themeColor }}>
          <Bot className="h-4 w-4" />
        </span>
      </span>
      <span className="relative z-10 max-w-10 text-center text-[18px] font-semibold leading-[1.12]">
        {getVerticalLabelParts(text).map((char, index) => (
          <span key={`${char}-${index}`} className="block">
            {char}
          </span>
        ))}
      </span>
    </button>
  );
}

function MessageContent({
  content,
  role,
  themeColor,
}: {
  content: string;
  role: ChatMessage["role"];
  themeColor: string;
}) {
  if (role === "user") {
    return <div className="whitespace-pre-wrap leading-6">{content}</div>;
  }

  const blocks = parseAssistantMessage(content);

  return (
    <div className="space-y-3 text-[13px] leading-[1.75] text-stone-700">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <div key={`${block.type}-${index}`} className="flex items-center gap-2 pt-0.5 text-sm font-semibold text-stone-950">
              <span className="h-3.5 w-1 rounded-full" style={{ background: themeColor }} />
              <span>{renderInlineMarkdown(block.text, `${index}-heading`)}</span>
            </div>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`${block.type}-${index}`} className="space-y-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`} className="flex gap-2 rounded-lg bg-stone-50/80 px-3 py-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: themeColor }} />
                  <span>{renderInlineMarkdown(item, `${index}-${itemIndex}`)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`${block.type}-${index}`} className="text-stone-700">
            {renderInlineMarkdown(block.text, `${index}-paragraph`)}
          </p>
        );
      })}
    </div>
  );
}

type AssistantMessageBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function parseAssistantMessage(content: string): AssistantMessageBlock[] {
  const blocks: AssistantMessageBlock[] = [];
  const paragraph: string[] = [];
  const listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph.length = 0;
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: "list", items: [...listItems] });
      listItems.length = 0;
    }
  };

  for (const line of content.replace(/\r\n/g, "\n").split("\n")) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = trimmed.match(/^\*\*(.+?)\*\*[:：]?$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: stripMarkdown(heading[1]) });
      continue;
    }

    const bullet = trimmed.match(/^[-•]\s+(.+)$/) || trimmed.match(/^\d+[.)、]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      listItems.push(bullet[1]);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks.length > 0 ? blocks : [{ type: "paragraph", text: content }];
}

function renderInlineMarkdown(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const strong = part.match(/^\*\*(.+)\*\*$/);
    if (strong) {
      return (
        <strong key={`${keyPrefix}-strong-${index}`} className="font-semibold text-stone-950">
          {strong[1]}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-text-${index}`}>{stripMarkdown(part)}</span>;
  });
}

function stripMarkdown(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").trim();
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
      style={{ borderRadius: rounded, color, boxShadow: "0 0 0 0 currentColor" }}
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
    <span className="relative block h-24 w-24 overflow-hidden rounded-full bg-white">
      <span
        className="absolute bottom-1 left-1/2 h-[78px] w-[68px] -translate-x-1/2 rounded-[34px_34px_28px_28px]"
        style={{ background: color }}
      />
      <span className="absolute left-1/2 top-2 h-7 w-2 -translate-x-1/2 rounded-full bg-emerald-950" />
      <span className="absolute left-[22px] top-[35px] h-8 w-5 -rotate-[18deg] rounded-full bg-white" />
      <span className="absolute left-1/2 top-[30px] h-9 w-11 -translate-x-1/2 rounded-full bg-[#111318]">
        <span className="absolute left-2.5 top-3 h-2.5 w-2.5 rounded-full bg-white" />
        <span className="absolute right-2.5 top-3 h-2.5 w-2.5 rounded-full bg-white" />
      </span>
      <span className="absolute bottom-[18px] left-1/2 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-lg bg-white text-emerald-500">
        <Sparkles className="h-5 w-5 fill-current" />
      </span>
    </span>
  );
}
