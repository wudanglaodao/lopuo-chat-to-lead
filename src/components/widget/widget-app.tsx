"use client";

import { Bell, Bot, Check, Copy, ExternalLink, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  WIDGET_UI_TEXT,
  buildBaseWidgetCopy,
  localizeDefaultWidgetCopy,
  resolveWidgetLocale,
} from "@/lib/widget-i18n";
import {
  DEFAULT_WIDGET_LOGO_TEXT,
  DEFAULT_WIDGET_LOGO_TYPE,
  DEFAULT_WIDGET_LOGO_URL,
  normalizeWidgetLogoText,
  normalizeWidgetLogoType,
  type WidgetLogoType,
} from "@/lib/widget-brand";
import {
  isLauncherPosition,
  normalizeLauncherBottomOffset,
  normalizeLauncherAnchorGap,
  normalizeLauncherAnchorSelector,
  normalizeLauncherHorizontalOffset,
  type LauncherPosition,
  normalizeLauncherPosition,
} from "@/lib/widget-launcher";

type WidgetConfig = {
  siteId: string;
  tenantId?: string | null;
  widgetName: string;
  widgetLogoType: WidgetLogoType;
  widgetLogoUrl?: string | null;
  widgetLogoText: string;
  launcherText: string;
  launcherStyle: "pill" | "vertical" | "mascot";
  launcherPosition: LauncherPosition;
  launcherBottomOffset: number;
  launcherHorizontalOffset: number;
  launcherAnchorSelector?: string | null;
  launcherAnchorGap: number;
  launcherImageUrl?: string | null;
  launcherBadgeText?: string | null;
  launcherAnimation: "none" | "pulse" | "bounce" | "float";
  widgetAdvancedEnabled: boolean;
  widgetCustomCss?: string | null;
  widgetCustomJs?: string | null;
  welcomeTitle: string;
  welcomeMessage: string;
  themeColor: string;
  suggestedQuestions: string[];
  showSources: boolean;
  collectLeadEnabled: boolean;
  multilingualEnabled: boolean;
  defaultLocale: string;
  enabledLocales: string[];
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
  requestedLocale,
  previewStyle,
  previewText,
  previewPosition,
  previewHorizontalOffset,
  previewBottomOffset,
  previewAnchorSelector,
  previewAnchorGap,
}: {
  siteId: string;
  tenantId?: string;
  requestedLocale?: string;
  previewStyle?: string;
  previewText?: string;
  previewPosition?: string;
  previewHorizontalOffset?: string;
  previewBottomOffset?: string;
  previewAnchorSelector?: string;
  previewAnchorGap?: string;
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
  const didRunReadyHook = useRef(false);
  const lastOpenHookState = useRef<boolean | null>(null);
  const previewLauncherStyle = normalizeLauncherStyle(previewStyle);
  const previewLauncherPosition = isLauncherPosition(previewPosition) ? previewPosition : "";
  const previewLauncherHorizontalOffset = hasExplicitValue(previewHorizontalOffset)
    ? normalizeLauncherHorizontalOffset(previewHorizontalOffset)
    : null;
  const previewLauncherBottomOffset = hasExplicitValue(previewBottomOffset)
    ? normalizeLauncherBottomOffset(previewBottomOffset)
    : null;
  const previewLauncherAnchorSelector = normalizeLauncherAnchorSelector(previewAnchorSelector);
  const previewLauncherAnchorGap = hasExplicitValue(previewAnchorGap) ? normalizeLauncherAnchorGap(previewAnchorGap) : null;
  const launcherStyle = previewLauncherStyle || config?.launcherStyle;
  const launcherPosition = previewLauncherPosition || normalizeLauncherPosition(config?.launcherPosition);
  const launcherHorizontalOffset = previewLauncherHorizontalOffset ?? normalizeLauncherHorizontalOffset(config?.launcherHorizontalOffset);
  const launcherBottomOffset = previewLauncherBottomOffset ?? normalizeLauncherBottomOffset(config?.launcherBottomOffset);
  const launcherAnchorSelector = previewLauncherAnchorSelector || normalizeLauncherAnchorSelector(config?.launcherAnchorSelector);
  const launcherAnchorGap = previewLauncherAnchorGap ?? normalizeLauncherAnchorGap(config?.launcherAnchorGap);

  const visitorId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const key = "lopuo_ai_visitor_id";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const next = crypto.randomUUID();
    window.localStorage.setItem(key, next);
    return next;
  }, []);

  const activeLocale = useMemo(() => {
    const browserLocales = typeof navigator === "undefined" ? [] : Array.from(navigator.languages || [navigator.language]);
    return resolveWidgetLocale({
      requestedLocale,
      browserLocales,
      multilingualEnabled: config?.multilingualEnabled,
      defaultLocale: config?.defaultLocale,
      enabledLocales: config?.enabledLocales,
    });
  }, [config?.defaultLocale, config?.enabledLocales, config?.multilingualEnabled, requestedLocale]);

  const uiText = WIDGET_UI_TEXT[activeLocale];
  const localizedCopy = useMemo(() => {
    const baseCopy = buildBaseWidgetCopy({
      widgetName: config?.widgetName,
      launcherText: config?.launcherText,
      welcomeTitle: config?.welcomeTitle,
      welcomeMessage: config?.welcomeMessage,
      suggestedQuestions: config?.suggestedQuestions,
    });

    return localizeDefaultWidgetCopy({ copy: baseCopy, locale: activeLocale });
  }, [
    activeLocale,
    config?.launcherText,
    config?.suggestedQuestions,
    config?.welcomeMessage,
    config?.welcomeTitle,
    config?.widgetName,
  ]);

  useEffect(() => {
    if (!launcherStyle && !isOpen) {
      return;
    }

    window.parent.postMessage(
      {
        type: "lopuo-ai-widget-resize",
        open: isOpen,
        launcherStyle: launcherStyle || "vertical",
        launcherPosition,
        launcherHorizontalOffset,
        launcherBottomOffset,
        launcherAnchorSelector,
        launcherAnchorGap,
      },
      "*",
    );
    runWidgetCustomJsHook(config, "onResize");
  }, [config, isOpen, launcherAnchorGap, launcherAnchorSelector, launcherBottomOffset, launcherHorizontalOffset, launcherPosition, launcherStyle]);

  useEffect(() => {
    if (!config?.widgetAdvancedEnabled || didRunReadyHook.current) {
      return;
    }

    didRunReadyHook.current = true;
    runWidgetCustomJsHook(config, "onReady");
  }, [config]);

  useEffect(() => {
    if (!config?.widgetAdvancedEnabled || lastOpenHookState.current === isOpen) {
      return;
    }

    lastOpenHookState.current = isOpen;
    runWidgetCustomJsHook(config, isOpen ? "onOpen" : "onClose");
  }, [config, isOpen]);

  useEffect(() => {
    if (!siteId) {
      return;
    }

    const params = new URLSearchParams({
      siteId,
      tenantId: tenantId || "",
      locale: requestedLocale || "",
      previewStyle: previewStyle || "",
      previewText: previewText || "",
      previewPosition: previewPosition || "",
      previewHorizontalOffset: previewHorizontalOffset || "",
      previewBottomOffset: previewBottomOffset || "",
      previewAnchorSelector: previewAnchorSelector || "",
      previewAnchorGap: previewAnchorGap || "",
    });

    fetch(`/api/widget/config?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error || uiText.configLoadFailed);
        return response.json();
      })
      .then(setConfig)
      .catch((err: Error) => setError(err.message));
  }, [
    siteId,
    tenantId,
    requestedLocale,
    previewStyle,
    previewText,
    previewPosition,
    previewHorizontalOffset,
    previewBottomOffset,
    previewAnchorSelector,
    previewAnchorGap,
    uiText.configLoadFailed,
  ]);

  const ensureConversation = useCallback(async () => {
    if (conversationId) {
      return conversationId;
    }

    const activeTenantId = config?.tenantId || tenantId || "default";
    const storageKey = `lopuo_ai_conversation_${siteId}_${activeTenantId}_${activeLocale}`;
    const stored = window.localStorage.getItem(storageKey) || undefined;
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId,
        tenantId: config?.tenantId || tenantId || undefined,
        visitorId,
        conversationId: stored,
        locale: activeLocale,
        pageUrl: document.referrer || window.location.href,
        referrer: document.referrer,
      }),
    });

    if (!response.ok) {
      throw new Error(uiText.createConversationFailed);
    }

    const data = (await response.json()) as { conversationId: string };
    window.localStorage.setItem(storageKey, data.conversationId);
    setConversationId(data.conversationId);
    return data.conversationId;
  }, [activeLocale, config?.tenantId, conversationId, siteId, tenantId, uiText.createConversationFailed, visitorId]);

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
      { id: assistantId, role: "assistant", content: `${uiText.thinking}${uiText.thinkingSuffix}` },
    ]);

    try {
      const activeConversationId = await ensureConversation();
      const response = await fetch(`/api/conversations/${activeConversationId}/messages`, {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ siteId, message: text, stream: true, locale: activeLocale }),
      });

      if (!response.ok) {
        throw new Error(uiText.answerFailed);
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream") && response.body) {
        await readMessageStream(response, uiText.answerFailed, {
          onStatus(message) {
            if (!assistantContent) {
              updateAssistant({ content: `${message}${uiText.thinkingSuffix}` });
            }
          },
          onDelta(content) {
            assistantContent += content;
            updateAssistant({ content: assistantContent || uiText.composing });
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
      const message = err instanceof Error ? err.message : uiText.sendFailed;
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
  const welcomeMessage = localizedCopy.welcomeMessage;
  const suggestedQuestions = localizedCopy.suggestedQuestions;
  const customCss = config?.widgetAdvancedEnabled ? config.widgetCustomCss || "" : "";

  if (!isOpen) {
    if (!launcherStyle) {
      return null;
    }

    return (
      <div className="lopuo-widget flex h-[100dvh] w-full items-center justify-center bg-transparent">
        {customCss ? <style data-lopuo-custom>{customCss}</style> : null}
        <LauncherButton
          config={config}
          launcherStyle={launcherStyle}
          copy={localizedCopy}
          uiText={uiText}
          onOpen={() => setIsOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="lopuo-widget flex h-[100dvh] w-full flex-col items-end justify-end bg-transparent text-[#17191d]">
      {customCss ? <style data-lopuo-custom>{customCss}</style> : null}
      <main
        className="lopuo-widget-panel mb-3 flex h-[calc(100dvh-68px)] min-h-0 w-full flex-col overflow-hidden rounded-[22px] border border-black/[0.08]"
        style={{
          background:
            "radial-gradient(circle at 14% 8%, rgba(255,107,74,0.10), transparent 28%), radial-gradient(circle at 92% 0%, rgba(47,125,246,0.10), transparent 24%), linear-gradient(180deg, #fbfcff 0%, #f5f8fb 52%, #eef4f7 100%)",
        }}
      >
        <header className="lopuo-widget-header relative border-b border-black/[0.06] bg-white/45 px-4 pb-3 pt-3 backdrop-blur">
          <div className="flex h-12 items-center justify-between">
            <div className="flex h-11 min-w-0 items-center">
              <WidgetHeaderBrand
                logoType={config?.widgetLogoType}
                logoUrl={config?.widgetLogoUrl}
                logoText={config?.widgetLogoText}
                fallbackText={localizedCopy.widgetName}
              />
            </div>
            <button
              type="button"
              aria-label={uiText.close}
              title={uiText.close}
              onClick={() => setIsOpen(false)}
              className="lopuo-widget-close grid h-8 w-8 place-items-center rounded-full text-stone-400 transition hover:bg-white hover:text-stone-700 hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)]"
            >
              <X className="h-4 w-4" />
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
              <span className="truncate">{uiText.banner}</span>
            </span>
            <span className="ml-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" />
          </div>
        </header>

        <section
          className="lopuo-widget-body min-h-0 flex-1 overflow-y-auto px-4 py-4"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.025) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        >
          <div className="space-y-4 pb-1">
            <div className="flex items-center gap-3 px-3 py-1 text-[11px] text-stone-400">
              <span className="h-px flex-1 bg-black/[0.08]" />
              <span>{new Date().toLocaleTimeString(activeLocale, { hour: "2-digit", minute: "2-digit" })}</span>
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
              <div className="max-w-[84%] rounded-2xl rounded-tl-sm border border-black/[0.07] bg-white px-4 py-3 text-sm text-stone-700 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
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
                      ? "max-w-[82%] rounded-2xl rounded-br-sm px-4 py-3 text-sm text-white shadow-[0_8px_18px_rgba(15,23,42,0.09)]"
                      : "max-w-[84%] rounded-2xl rounded-tl-sm border border-black/[0.07] bg-white px-4 py-3 text-sm text-stone-800 shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
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
                          {uiText.source}：{source.title || source.url}
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
                <div className="max-w-[86%] rounded-[18px] border border-black/10 bg-white px-4 py-3 text-sm text-stone-800 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                  <div className="whitespace-pre-wrap leading-6">
                    {uiText.leadPrompt}
                  </div>
                </div>
              </div>
            ) : null}
            {error || !siteId ? (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error || uiText.missingSiteId}
              </div>
            ) : null}
          </div>
        </section>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage(input);
          }}
          className="lopuo-widget-footer bg-white/35 px-4 pb-4 pt-2 backdrop-blur"
        >
          <div className="flex items-end gap-2 rounded-[18px] border border-black/[0.08] bg-white px-4 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition focus-within:border-stone-300">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={uiText.inputPlaceholder}
              rows={2}
              className="max-h-20 min-h-8 flex-1 resize-none bg-transparent px-1 py-1 text-sm leading-6 outline-none placeholder:text-stone-400"
            />
            <button
              type="submit"
              aria-label={uiText.sendMessage}
              disabled={!input.trim() || isLoading}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: themeColor }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </main>
      <button
        type="button"
        aria-label={uiText.close}
        title={uiText.close}
        onClick={() => setIsOpen(false)}
        className="relative grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-white text-white ring-1 ring-black/[0.06] transition hover:scale-[1.04]"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full" style={{ background: themeColor }}>
          <X className="h-5 w-5" />
        </span>
      </button>
    </div>
  );
}

async function readMessageStream(
  response: Response,
  fallbackErrorMessage: string,
  handlers: {
    onStatus: (message: string) => void;
    onDelta: (content: string) => void;
    onDone: (data: MessageResponse) => void;
    onError: (message: string) => void;
  },
) {
  if (!response.body) {
    throw new Error(fallbackErrorMessage);
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
  launcherStyle,
  copy,
  uiText,
  onOpen,
}: {
  config: WidgetConfig | null;
  launcherStyle: WidgetConfig["launcherStyle"];
  copy: ReturnType<typeof buildBaseWidgetCopy>;
  uiText: (typeof WIDGET_UI_TEXT)[keyof typeof WIDGET_UI_TEXT];
  onOpen: () => void;
}) {
  const style = launcherStyle;
  const themeColor = config?.themeColor || "#16a34a";
  const text = copy.launcherText;
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
        className={`lopuo-widget-launcher group relative flex h-16 w-[244px] items-center gap-3 overflow-hidden rounded-full border bg-white px-4 text-left text-stone-900 shadow-[0_5px_14px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-0.5 active:translate-y-0 ${animationClass}`}
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
          <span className="mt-0.5 block text-xs text-stone-500">{uiText.onlineConsult}</span>
        </span>
      </button>
    );
  }

  if (style === "mascot") {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`lopuo-widget-launcher relative grid h-[52px] w-[52px] place-items-center rounded-full border border-white/90 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition duration-200 hover:scale-[1.04] hover:shadow-[0_8px_20px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 ${animationClass}`}
      >
        <PulseRing enabled={animation === "pulse"} color={themeColor} rounded="999px" />
        <MascotAvatar imageUrl={config?.launcherImageUrl} color={themeColor} />
        {config?.launcherBadgeText ? (
          <span className="absolute -right-0.5 -top-1 grid h-[18px] min-w-[18px] place-items-center px-1 text-[10px] font-bold leading-none text-[#ff2f68] drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]">
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
      className={`lopuo-widget-launcher relative flex h-[154px] w-16 flex-col items-center justify-center gap-2.5 rounded-full border bg-white text-stone-900 shadow-[0_4px_10px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 ${animationClass}`}
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

function normalizeLauncherStyle(style?: string | null): WidgetConfig["launcherStyle"] | "" {
  return style === "pill" || style === "vertical" || style === "mascot" ? style : "";
}

function hasExplicitValue(value?: string | null) {
  return value !== undefined && value !== null && value.trim() !== "";
}

type WidgetCustomHook = "onReady" | "onOpen" | "onClose" | "onResize";

function runWidgetCustomJsHook(config: WidgetConfig | null, hook: WidgetCustomHook) {
  if (!config?.widgetAdvancedEnabled || !config.widgetCustomJs || typeof document === "undefined") {
    return;
  }

  const actions = config.widgetCustomJs
    .split(/\r?\n/)
    .map((line) => line.trim().match(/^(onReady|onOpen|onClose|onResize):\s*(track|class|data|cssVar)=([A-Za-z0-9_.:-]{1,80})$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .filter((match) => match[1] === hook);

  for (const action of actions) {
    applyWidgetCustomAction(hook, action[2], action[3]);
  }
}

function applyWidgetCustomAction(hook: WidgetCustomHook, action: string, value: string) {
  const root = document.documentElement;

  if (action === "track") {
    window.parent.postMessage({ type: "lopuo-ai-widget-hook", hook, value }, "*");
    return;
  }

  if (action === "class") {
    root.classList.add(`lopuo-${value.replace(/[^A-Za-z0-9_-]/g, "-")}`);
    return;
  }

  if (action === "data") {
    root.dataset.lopuoWidgetHook = value;
    return;
  }

  if (action === "cssVar") {
    root.style.setProperty(`--lopuo-widget-${hook.toLowerCase()}`, value);
  }
}

function WidgetHeaderBrand({
  logoType,
  logoUrl,
  logoText,
  fallbackText,
}: {
  logoType?: WidgetLogoType | string | null;
  logoUrl?: string | null;
  logoText?: string | null;
  fallbackText: string;
}) {
  const normalizedLogoType = normalizeWidgetLogoType(logoType || DEFAULT_WIDGET_LOGO_TYPE);
  const normalizedLogoUrl = (logoUrl || "").trim() || DEFAULT_WIDGET_LOGO_URL;
  const normalizedLogoText = normalizeWidgetLogoText(logoText || fallbackText || DEFAULT_WIDGET_LOGO_TEXT);
  const [failedLogoUrl, setFailedLogoUrl] = useState("");
  const logoFailed = failedLogoUrl === normalizedLogoUrl;

  if (normalizedLogoType === "image" && !logoFailed) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={normalizedLogoUrl}
          alt={normalizedLogoText}
          onError={() => setFailedLogoUrl(normalizedLogoUrl)}
          className="h-6 max-h-7 w-auto max-w-[150px] object-contain"
        />
      </>
    );
  }

  return (
    <span className="max-w-[180px] truncate text-xl font-bold leading-none text-[#17191d]">
      {normalizedLogoText}
    </span>
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
              <span>{renderInlineMarkdown(block.text, `${index}-heading`, themeColor)}</span>
            </div>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`${block.type}-${index}`} className="space-y-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`} className="flex gap-2 rounded-lg bg-stone-50/80 px-3 py-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: themeColor }} />
                  <span>{renderInlineMarkdown(item, `${index}-${itemIndex}`, themeColor)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`${block.type}-${index}`} className="text-stone-700">
            {renderInlineMarkdown(block.text, `${index}-paragraph`, themeColor)}
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

type ContactTokenMatch = {
  start: number;
  end: number;
  value: string;
  displayValue?: string;
  href?: string;
};

function renderInlineMarkdown(text: string, keyPrefix: string, themeColor: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const strong = part.match(/^\*\*(.+)\*\*$/);
    if (strong) {
      return (
        <strong key={`${keyPrefix}-strong-${index}`} className="font-semibold text-stone-950">
          {renderTextWithContactTokens(strong[1], `${keyPrefix}-strong-${index}`, themeColor)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-text-${index}`}>{renderTextWithContactTokens(stripMarkdown(part), `${keyPrefix}-text-${index}`, themeColor)}</span>;
  });
}

function renderTextWithContactTokens(text: string, keyPrefix: string, themeColor: string) {
  const matches = findContactTokenMatches(text);
  if (matches.length === 0) {
    return text;
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    if (match.start > cursor) {
      nodes.push(text.slice(cursor, match.start));
    }

    nodes.push(
      <ContactCopyToken
        key={`${keyPrefix}-contact-${index}-${match.start}-${match.value}`}
        value={match.value}
        displayValue={match.displayValue}
        href={match.href}
        themeColor={themeColor}
      />,
    );
    cursor = match.end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function findContactTokenMatches(text: string) {
  const matches: ContactTokenMatch[] = [];
  const addMatch = (
    start: number,
    end: number,
    value: string,
    options: { displayValue?: string; href?: string; label?: string; replaceFullMatch?: boolean } = {},
  ) => {
    const normalizedValue = trimInlineToken(value);
    const trimStartOffset = value.indexOf(normalizedValue);
    if (!normalizedValue || normalizedValue.length < 3) {
      return;
    }

    const normalizedStart = options.replaceFullMatch ? start : start + Math.max(0, trimStartOffset);
    const normalizedEnd = options.replaceFullMatch ? end : normalizedStart + normalizedValue.length;
    const href = options.href || getInteractiveHref(normalizedValue, options.label);

    matches.push({
      start: normalizedStart,
      end: normalizedEnd,
      value: normalizedValue,
      displayValue: options.displayValue,
      href,
    });
  };

  for (const match of text.matchAll(/\[([^\]]{1,160})\]\(((?:https?:\/\/|www\.)[^\s)]+)\)/gi)) {
    const label = stripMarkdown(match[1] || "").trim();
    const url = match[2] || "";
    addMatch(match.index ?? 0, (match.index ?? 0) + match[0].length, url, {
      displayValue: label || url,
      href: normalizeHref(url),
      replaceFullMatch: true,
    });
  }

  for (const match of text.matchAll(/\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi)) {
    const value = match[0] || "";
    addMatch(match.index ?? 0, (match.index ?? 0) + value.length, value, {
      href: normalizeHref(value),
    });
  }

  for (const match of text.matchAll(/(?<![@\w.-])(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"'`]*)?/gi)) {
    const value = match[0] || "";
    addMatch(match.index ?? 0, (match.index ?? 0) + value.length, value, {
      href: normalizeHref(value),
    });
  }

  const labeledContactPattern =
    /((?:WeChat\s*ID|WeChat|微信号|微信|WX|WhatsApp|Line|Email|E-mail|邮箱|电话|手机)\s*(?:账号|号码|号|ID)?\s*(?:is|为|是|:|：)?\s*)([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|[A-Z][-_A-Z0-9]{4,31}|\+?\d[\d\s().-]{6,}\d)/gi;
  for (const match of text.matchAll(labeledContactPattern)) {
    const prefix = match[1] || "";
    const value = match[2] || "";
    addMatch((match.index ?? 0) + prefix.length, (match.index ?? 0) + prefix.length + value.length, value, {
      label: prefix,
    });
  }

  for (const match of text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
    addMatch(match.index ?? 0, (match.index ?? 0) + match[0].length, match[0], {
      href: `mailto:${match[0]}`,
    });
  }

  for (const match of text.matchAll(/(?<![\w+])\+?\d[\d\s().-]{6,}\d(?!\w)/g)) {
    const digits = match[0].replace(/\D/g, "");
    if (digits.length >= 7) {
      addMatch(match.index ?? 0, (match.index ?? 0) + match[0].length, match[0], {
        href: `tel:${match[0].replace(/[^\d+]/g, "")}`,
      });
    }
  }

  return dedupeContactTokenMatches(matches);
}

function dedupeContactTokenMatches(matches: ContactTokenMatch[]) {
  const sorted = [...matches].sort((a, b) => a.start - b.start || b.end - a.end);
  const result: ContactTokenMatch[] = [];

  for (const match of sorted) {
    const overlaps = result.some((item) => match.start < item.end && match.end > item.start);
    if (!overlaps) {
      result.push(match);
    }
  }

  return result;
}

function ContactCopyToken({
  value,
  displayValue,
  href,
  themeColor,
}: {
  value: string;
  displayValue?: string;
  href?: string;
  themeColor: string;
}) {
  const [copied, setCopied] = useState(false);
  const label = displayValue || value;

  async function copyValue() {
    try {
      await copyToClipboard(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span
      className="mx-0.5 inline-flex max-w-full translate-y-[1px] items-center gap-1.5 rounded-full border bg-white px-2 py-0.5 align-baseline text-[12px] font-bold leading-5 shadow-[0_4px_12px_rgba(15,23,42,0.06)]"
      style={{
        borderColor: `color-mix(in srgb, ${themeColor} 24%, white)`,
        color: themeColor,
      }}
    >
      {href ? (
        <a
          href={href}
          target={shouldOpenInNewTab(href) ? "_blank" : undefined}
          rel={shouldOpenInNewTab(href) ? "noreferrer" : undefined}
          className="inline-flex min-w-0 max-w-[210px] items-center gap-1.5 rounded-full px-0.5 transition hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          <span className="min-w-0 truncate">{label}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      ) : (
        <span className="min-w-0 select-all truncate">{label}</span>
      )}
      <button
        type="button"
        aria-label={`复制 ${value}`}
        title={copied ? "已复制" : "复制"}
        onClick={(event) => {
          event.stopPropagation();
          void copyValue();
        }}
        className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-stone-200 hover:text-stone-800"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
    </span>
  );
}

function trimInlineToken(value: string) {
  return value.trim().replace(/[)\].,;，。；、!?！？]+$/g, "");
}

function normalizeHref(value: string) {
  const normalized = trimInlineToken(value);
  if (!normalized) return "";
  return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
}

function getInteractiveHref(value: string, label = "") {
  if (/^https?:\/\//i.test(value) || /^www\./i.test(value)) {
    return normalizeHref(value);
  }

  if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
    return `mailto:${value}`;
  }

  const digits = value.replace(/\D/g, "");
  if (digits.length >= 7) {
    if (/whatsapp/i.test(label)) {
      return `https://wa.me/${digits}`;
    }
    return `tel:${value.replace(/[^\d+]/g, "")}`;
  }

  return "";
}

function shouldOpenInNewTab(href: string) {
  return /^https?:\/\//i.test(href);
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
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
      <img src={imageUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
    );
  }

  return (
    <span className="relative block h-11 w-11 overflow-hidden rounded-full bg-white">
      <span
        className="absolute bottom-0.5 left-1/2 h-[36px] w-[31px] -translate-x-1/2 rounded-[16px_16px_13px_13px]"
        style={{ background: color }}
      />
      <span className="absolute left-1/2 top-1 h-3.5 w-1 -translate-x-1/2 rounded-full bg-emerald-950" />
      <span className="absolute left-[10px] top-[16px] h-4 w-2.5 -rotate-[18deg] rounded-full bg-white" />
      <span className="absolute left-1/2 top-[14px] h-[18px] w-[22px] -translate-x-1/2 rounded-full bg-[#111318]">
        <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white" />
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      <span className="absolute bottom-[8px] left-1/2 grid h-4 w-4 -translate-x-1/2 place-items-center rounded-[5px] bg-white text-emerald-500">
        <Sparkles className="h-2.5 w-2.5 fill-current" />
      </span>
    </span>
  );
}
