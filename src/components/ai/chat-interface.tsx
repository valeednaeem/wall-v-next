"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Sparkles, Trash2, Loader2, Globe, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationState } from "@/lib/project-discovery";

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
}

const LANGUAGES = [
  { code: "en", label: "English", greeting: "How can I help you?" },
  { code: "es", label: "Español", greeting: "¿Cómo puedo ayudarte?" },
  { code: "fr", label: "Français", greeting: "Comment puis-je vous aider?" },
  { code: "de", label: "Deutsch", greeting: "Wie kann ich Ihnen helfen?" },
  { code: "ar", label: "العربية", greeting: "كيف يمكنني مساعدتك؟" },
  { code: "zh", label: "中文", greeting: "我能帮你什么？" },
  { code: "ja", label: "日本語", greeting: "どのようにお手伝いできますか？" },
  { code: "ko", label: "한국어", greeting: "어떻게 도와드릴까요?" },
  { code: "pt", label: "Português", greeting: "Como posso ajudá-lo?" },
  { code: "ru", label: "Русский", greeting: "Как я могу вам помочь?" },
  { code: "hi", label: "हिन्दी", greeting: "मैं आपकी कैसे मदद कर सकता हूँ?" },
  { code: "tr", label: "Türkçe", greeting: "Size nasıl yardımcı olabilirim?" },
  { code: "ur", label: "اردو", greeting: "میں آپ کی کیسے مدد کر سکتا ہوں؟" },
];

const AGENT_OPTIONS = [
  { value: "general", label: "General Assistant" },
  { value: "discovery", label: "Project Discovery" },
  { value: "sales", label: "Sales Agent" },
  { value: "support", label: "Support Agent" },
  { value: "content", label: "Content Writer" },
  { value: "technical", label: "Technical Assistant" },
];

function getLanguageFromTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes("Karachi") || tz.includes("Kolkata") || tz.includes("Dhaka")) return "ur";
    if (tz.includes("Shanghai") || tz.includes("Chongqing")) return "zh";
    if (tz.includes("Tokyo")) return "ja";
    if (tz.includes("Seoul")) return "ko";
    if (tz.includes("Paris") || tz.includes("Madrid") || tz.includes("Rome") || tz.includes("Lisbon")) return "es";
    if (tz.includes("Berlin") || tz.includes("Vienna") || tz.includes("Zurich")) return "de";
    if (tz.includes("Sao_Paulo") || tz.includes("Rio")) return "pt";
    if (tz.includes("Moscow")) return "ru";
    if (tz.includes("Dubai") || tz.includes("Riyadh") || tz.includes("Cairo")) return "ar";
    if (tz.includes("Istanbul")) return "tr";
    if (tz.includes("Kolkata") || tz.includes("Mumbai") || tz.includes("Delhi")) return "hi";
    return "en";
  } catch {
    return "en";
  }
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    const parts = line.split(/(\*\*.*?\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        part
      )
    );
    return (
      <span key={idx}>
        {parts}
        {idx < lines.length - 1 && <br />}
      </span>
    );
  });
}

export function AIChatInterface({ className }: { className?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [agentType, setAgentType] = useState("general");
  const [language, setLanguage] = useState("en");
  const [isLoading, setIsLoading] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const detected = getLanguageFromTimezone();
    setLanguage(detected);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const sendMessage = useCallback(async (overrideInput?: string) => {
    const textToUse = overrideInput || input;
    if (!textToUse.trim() || isLoading) return;
    const userMessage: Message = { role: "user", content: textToUse.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    // Use discovery endpoint when in discovery or sales mode
    const useDiscovery = agentType === "discovery" || agentType === "sales";

    try {
      if (useDiscovery) {
        const res = await fetch("/api/ai/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: textToUse.trim(),
            conversationState,
            language,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setMessages([...updatedMessages, {
            role: "assistant",
            content: data.data.message,
            suggestions: data.data.suggestions,
          }]);
          setConversationState(data.data.conversationState);
        } else {
          setMessages([...updatedMessages, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
        }
      } else {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedMessages, language, agentType }),
        });
        const data = await res.json();
        if (data.success) {
          setMessages([...updatedMessages, { role: "assistant", content: data.data.content }]);
        } else {
          setMessages([...updatedMessages, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
        }
      }
    } catch {
      setMessages([...updatedMessages, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, language, agentType, conversationState]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={cn("flex flex-col h-full border rounded-xl", className)}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            {agentType === "discovery" ? (
              <Compass className="h-4 w-4 text-primary" />
            ) : (
              <Sparkles className="h-4 w-4 text-primary" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold">Wall-V AI</h3>
            <p className="text-xs text-muted-foreground">
              {agentType === "discovery" ? "Project Discovery" : "AI-Powered Assistant"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="flex items-center gap-1.5 text-xs border rounded-lg px-2 py-1 hover:bg-accent transition-colors"
            >
              <Globe className="h-3 w-3" />
              {currentLang.code.toUpperCase()}
            </button>
            {langDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white border rounded-lg shadow-lg py-1 z-50 max-h-60 overflow-y-auto w-40">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setLangDropdownOpen(false); }}
                    className={cn(
                      "block w-full text-left px-3 py-1.5 text-xs hover:bg-accent",
                      language === lang.code && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <select value={agentType} onChange={(e) => { setAgentType(e.target.value); setConversationState(null); setMessages([]); }} className="text-xs border rounded-lg px-2 py-1">
            {AGENT_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <button onClick={() => { setMessages([]); setConversationState(null); }} className="p-1.5 hover:bg-muted rounded-lg">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              {agentType === "discovery" ? (
                <Compass className="h-8 w-8 text-primary" />
              ) : (
                <Bot className="h-8 w-8 text-primary" />
              )}
            </div>
            <h4 className="text-lg font-semibold mb-2">{currentLang.greeting}</h4>
            <p className="text-sm text-muted-foreground max-w-sm">
              {agentType === "discovery"
                ? "Tell me about your project idea and I'll help you figure out exactly what you need."
                : language === "en"
                ? "I can help with sales inquiries, project estimates, content creation, and more."
                : "I can assist you in your preferred language with sales, projects, and support."}
            </p>
            {agentType === "discovery" && (
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {["I need a website", "I need a web app", "I have an idea", "I need hosting"].map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-1.5 rounded-full border bg-white hover:bg-primary/5 hover:border-primary/30 transition-colors text-muted-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div className={cn("max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
              <div className="whitespace-pre-wrap break-words">{renderMarkdown(msg.content)}</div>
            </div>
            {msg.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {/* Suggestion Buttons */}
        {messages.length > 0 && !isLoading && messages[messages.length - 1].suggestions && (
          <div className="flex flex-wrap gap-2 ml-11">
            {messages[messages.length - 1].suggestions!.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => sendMessage(suggestion)}
                className="text-xs px-3 py-1.5 rounded-full border bg-white hover:bg-primary/5 hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              agentType === "discovery"
                ? "Describe your project idea..."
                : language === "en" ? "Type your message..." : "Type in any language..."
            }
            className="flex-1 min-h-[44px] max-h-[150px] resize-none rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            rows={1}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || isLoading} className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
