"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Sparkles, X, MessageSquare, Loader2, Globe, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  action?: string;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "ar", label: "العربية" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "hi", label: "हिन्दी" },
  { code: "tr", label: "Türkçe" },
  { code: "ur", label: "اردو" },
];

function getLanguageFromTimezone(): string {
  return "en";
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

export function SalesChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [inquirySaved, setInquirySaved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const hasGreeted = useRef(false);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

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

  // Greeting on first open
  useEffect(() => {
    if (isOpen && !hasGreeted.current) {
      hasGreeted.current = true;
      const greetings: Record<string, string> = {
        en: "Hey! I'm Wall-V AI — your project consultant.\n\nI can help you figure out exactly what you need, whether it's a website, web app, mobile app, AI solution, hosting, or anything digital.\n\nWhat are you looking to build?",
        es: "Hola! Soy Wall-V AI, tu consultor de proyectos.\n\nPuedo ayudarte a descubrir exactamente lo que necesitas — ya sea un sitio web, aplicación web, app móvil, solución de IA, hosting, o cualquier cosa digital.\n\nQué quieres crear?",
        ar: "!مرحباً، أنا Wall-V AI، مستشار المشاريع\n\nيمكنني مساعدتك في اكتشاف ما تحتاجه بالضبط\n\nما الذي تريد بناءه؟",
        ur: "!السلام علیکم، میں Wall-V AI ہوں\n\nمیں آپ کو دریافت کرنے میں مدد کر سکتا ہوں\n\nآپ کیا بنانا چاہتے ہیں؟",
        fr: "Bonjour! Je suis Wall-V AI, votre consultant.\n\nJe peux vous aider à découvrir ce dont vous avez besoin.\n\nQue cherchez-vous à créer?",
      };
      setMessages([{
        role: "assistant",
        content: greetings[language] || greetings.en,
        suggestions: ["I need a website", "I need a mobile app", "I need AI/automation", "I need hosting", "I have an idea"],
      }]);
    }
  }, [isOpen, language]);

  const sendMessage = useCallback(async (overrideInput?: string) => {
    const textToUse = overrideInput || input;
    if (!textToUse.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: textToUse.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    // Build conversation history for AI (only user/assistant messages, skip initial greeting)
    const conversationHistory = messages.slice(1).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      const res = await fetch("/api/ai/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToUse.trim(),
          conversationHistory,
          language,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const aiMessage: Message = {
          role: "assistant",
          content: data.data.message,
          suggestions: data.data.suggestions,
        };
        setMessages([...updatedMessages, aiMessage]);
      } else {
        setMessages([...updatedMessages, {
          role: "assistant",
          content: "I apologize, I encountered an error. Could you please try again?",
        }]);
      }
    } catch {
      setMessages([...updatedMessages, {
        role: "assistant",
        content: "I'm having trouble connecting. Please try again in a moment.",
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, language]);

  const handleSaveInquiry = useCallback(async () => {
    if (inquirySaved) return;
    setIsLoading(true);

    // Collect project info from conversation
    const projectInfo = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n");

    try {
      const res = await fetch("/api/ai/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: {
            title: "Chat Inquiry",
            projectType: "other",
            objective: projectInfo.slice(0, 500),
            features: [],
            estimatedBudget: "",
            desiredTimeline: "",
          },
          source: "ai-chatbot",
          language,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setInquirySaved(true);
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "I've saved your inquiry. Our team will review it and get back to you shortly. Is there anything else I can help with?",
          suggestions: ["Start a new topic", "Visit our services", "View pricing"],
        }]);
      } else {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "There was an issue saving. Please try again or contact us directly.",
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Failed to save. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, language, inquirySaved]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-110 flex items-center justify-center"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary text-primary-foreground px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Wall-V AI</h3>
                <p className="text-xs opacity-80">Project Consultant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={langMenuRef}>
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="flex items-center gap-1 text-xs bg-white/20 rounded-lg px-2 py-1 hover:bg-white/30 transition-colors"
                >
                  <Globe className="h-3 w-3" />
                  {currentLang.code.toUpperCase()}
                </button>
                {langDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-white text-foreground border rounded-lg shadow-lg py-1 z-50 max-h-48 overflow-y-auto w-32">
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
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <div className="whitespace-pre-wrap break-words">{renderMarkdown(msg.content)}</div>
                </div>
                {msg.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary mt-0.5">
                    <User className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* Suggestion Buttons */}
            {messages.length > 0 && !isLoading && messages[messages.length - 1].suggestions && (
              <div className="flex flex-wrap gap-2 ml-10">
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

            {/* Save Conversation */}
            {messages.length > 3 && !inquirySaved && (
              <div className="ml-10">
                <button
                  onClick={handleSaveInquiry}
                  disabled={isLoading}
                  className="flex items-center gap-2 text-xs px-4 py-2 rounded-full border bg-white hover:bg-primary/5 transition-colors disabled:opacity-50 text-muted-foreground"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Save this conversation
                </button>
              </div>
            )}

            {inquirySaved && (
              <div className="ml-10 flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                <CheckCircle className="h-3.5 w-3.5" />
                Saved — our team will follow up
              </div>
            )}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell me about your project..."
                className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={1}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
