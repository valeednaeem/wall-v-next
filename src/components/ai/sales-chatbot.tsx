"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Sparkles, X, MessageSquare, Loader2, Globe, CheckCircle, Eye, CreditCard, UserCheck, Image as ImageIcon, Code } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  action?: string;
}

interface DiscoveryState {
  stage: string;
  intent: string;
  brief: Record<string, unknown>;
  askedQuestions: string[];
  lastQuestionCategory: string;
  language: string;
  turnCount: number;
}

interface ImageResult {
  imageUrl: string;
  revisedPrompt?: string;
}

interface GeneratedAsset {
  type: "image" | "code";
  imageUrl?: string;
  code?: string;
  filename?: string;
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
  const [sessionId, setSessionId] = useState("");
  const [conversationState, setConversationState] = useState<DiscoveryState | null>(null);
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [toolLoading, setToolLoading] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const hasGreeted = useRef(false);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  // Generate session ID on mount
  useEffect(() => {
    setSessionId(`chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
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

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom, generatedAssets]);

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
        suggestions: ["I need a website", "I need a mobile app", "I need AI/automation", "I need hosting", "Generate project", "I have an idea"],
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
          sessionId,
          incomingConversationState: conversationState,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Merge tool suggestions when in recommendation stage
        let suggestions = data.data.suggestions || [];
        const stage = data.data.stage;
        const action = data.data.action;

        if (stage === "recommend-solution" || stage === "identify-scope" || stage === "budget-timeline") {
          suggestions = [...suggestions, "Generate project", "Generate image", "Generate code", "Get a quote", "Check my account"];
        }
        if (action === "confirm") {
          suggestions = [...suggestions, "Generate project", "Generate image", "Generate code", "Get a quote"];
        }

        const aiMessage: Message = {
          role: "assistant",
          content: data.data.message,
          suggestions,
          action: data.data.action,
        };
        setMessages([...updatedMessages, aiMessage]);
        setConversationState(data.data.conversationState);
        setSessionId(data.data.sessionId);
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
  }, [input, isLoading, messages, language, sessionId, conversationState]);

  // Tool handlers
  const handleBilling = useCallback(async () => {
    if (!conversationState?.brief) return;
    setToolLoading("billing")
    try {
      const brief = conversationState.brief;
      const budgetStr = (brief.estimatedBudget as string) || "";
      const budgetNum = (() => {
        const raw = budgetStr.replace(/[^0-9.-]/g, "");
        const parts = raw.split("-").map(Number).filter((n) => !isNaN(n) && n > 0);
        if (parts.length >= 2) return Math.round((parts[0] + parts[1]) / 2);
        return parts[0] || 1000;
      })();
      const res = await fetch("/api/voice-agent/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_type: (brief.projectType as string) || "website",
          project_name: (brief.title as string) || "My Project",
          features: (brief.features as string[]) || [],
          client_name: (brief as unknown as Record<string, unknown>)._contactName as string || "Client",
          client_email: (brief as unknown as Record<string, unknown>)._contactEmail as string || "pending@wall-v.com",
          client_phone: (brief as unknown as Record<string, unknown>)._contactPhone as string || "",
          caller_name: (brief as unknown as Record<string, unknown>)._contactName as string || "Client",
          caller_phone: (brief as unknown as Record<string, unknown>)._contactPhone as string || "",
          total_budget: budgetNum,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const summary = data.agent_summary || `Total: $${data.invoice?.total || 0}`;
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: summary,
          suggestions: ["Generate project", "Looks good, save it", "I need changes"],
        }]);
      } else {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "I had trouble calculating the quote. Let me get more details about your project first.",
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Failed to calculate pricing. Please try again.",
      }]);
    } finally {
      setToolLoading(null);
    }
  }, [conversationState]);

  const handleCheckAccount = useCallback(async () => {
    if (!conversationState?.brief) return;
    const brief = conversationState.brief;
    const email = (brief as unknown as Record<string, unknown>)._contactEmail as string;
    const phone = (brief as unknown as Record<string, unknown>)._contactPhone as string;
    if (!email && !phone) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "I'd need your email or phone number to look up your account. Could you share one of those?",
      }]);
      return;
    }
    setToolLoading("check-account");
    try {
      const res = await fetch("/api/voice-agent/check-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || undefined,
          phone: phone || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.client) {
        const client = data.client;
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `Found your account! You have ${client.totalProjects || 0} project(s) with us. How can I help you today?`,
          suggestions: ["Generate project", "Get a quote", "Start a new project"],
        }]);
      } else {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "I don't see an existing account, but I've noted your details. Let's get started on your project!",
          suggestions: ["Generate project", "Get a quote", "I need a website"],
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Failed to check account. Please try again.",
      }]);
    } finally {
      setToolLoading(null);
    }
  }, [conversationState]);

  const handleGenerateImage = useCallback(async (prompt?: string) => {
    const imagePrompt = prompt || "A professional logo for a modern tech company";
    setToolLoading("image");
    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          size: "1024x1024",
          quality: "medium",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedAssets((prev) => [...prev, { type: "image", imageUrl: data.data.imageUrl }]);
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `Here's your generated image!`,
          suggestions: ["Generate another", "Generate code", "Looks great!"],
        }]);
      } else {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "I had trouble generating the image. Could you try describing what you want differently?",
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Failed to generate image. Please try again.",
      }]);
    } finally {
      setToolLoading(null);
    }
  }, []);

  const handleGenerateCode = useCallback(async (prompt?: string) => {
    const codePrompt = prompt || "Create a simple React component";
    setToolLoading("code");
    try {
      const res = await fetch("/api/ai/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: codePrompt,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedAssets((prev) => [...prev, { type: "code", code: data.data.code }]);
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `Here's your generated code!${data.data.explanation ? `\n\n${data.data.explanation}` : ""}`,
          suggestions: ["Generate image", "Generate another", "Looks good!"],
        }]);
      } else {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "I had trouble generating the code. Could you describe what you need differently?",
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Failed to generate code. Please try again.",
      }]);
    } finally {
      setToolLoading(null);
    }
  }, []);

  const handleGenerateProject = useCallback(async (prompt?: string) => {
    const projectPrompt = prompt || "Build a complete website with logo";
    setToolLoading("project");
    try {
      // Generate code
      const codeRes = await fetch("/api/ai/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: projectPrompt }),
      });
      const codeData = await codeRes.json();

      // Generate logo if mentioned
      const assets: GeneratedAsset[] = [];
      if (codeData.success) {
        assets.push({ type: "code", code: codeData.data.code });
      }

      if (projectPrompt.toLowerCase().includes("logo") || projectPrompt.toLowerCase().includes("brand")) {
        const imageRes = await fetch("/api/ai/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: `Logo for: ${projectPrompt}` }),
        });
        const imageData = await imageRes.json();
        if (imageData.success) {
          assets.push({ type: "image", imageUrl: imageData.data.imageUrl });
        }
      }

      setGeneratedAssets((prev) => [...prev, ...assets]);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `Here's your project! I generated ${assets.filter(a => a.type === "code").length} code file(s)${assets.some(a => a.type === "image") ? " and logo/images" : ""}.`,
        suggestions: ["Generate another", "Get a quote", "Looks great!"],
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Failed to generate project. Please try again.",
      }]);
    } finally {
      setToolLoading(null);
    }
  }, []);

  const handleSaveInquiry = useCallback(async () => {
    if (inquirySaved) return;
    setIsLoading(true);
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
            projectType: conversationState?.brief?.projectType || "other",
            objective: projectInfo.slice(0, 500),
            features: conversationState?.brief?.features || [],
            estimatedBudget: conversationState?.brief?.estimatedBudget || "",
            desiredTimeline: conversationState?.brief?.desiredTimeline || "",
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
  }, [messages, language, inquirySaved, conversationState]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle tool suggestion clicks
  const handleSuggestionClick = useCallback((suggestion: string) => {
    if (suggestion === "Get a quote" || suggestion === "Get a quote for this") {
      handleBilling();
      return;
    }
    if (suggestion === "Check my account") {
      handleCheckAccount();
      return;
    }
    if (suggestion === "Generate image") {
      handleGenerateImage();
      return;
    }
    if (suggestion === "Generate code") {
      handleGenerateCode();
      return;
    }
    if (suggestion === "Generate project" || suggestion === "Generate another") {
      handleGenerateProject();
      return;
    }
    if (suggestion === "I need changes" && generatedAssets.some(a => a.type === "image")) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "What would you like me to change about the image? Describe the new version you'd like.",
      }]);
      return;
    }
    if (suggestion === "I need changes" && generatedAssets.some(a => a.type === "code")) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "What would you like me to change about the code? Describe the modifications you need.",
      }]);
      return;
    }

    // Explicitly set the field in conversation state based on what was asked
    if (conversationState) {
      const category = conversationState.lastQuestionCategory;
      const brief = { ...conversationState.brief };
      const lower = suggestion.toLowerCase();

      // Determine category: if empty, infer from suggestion content
      const effectiveCategory = category || (() => {
        if (lower.includes("website") || lower.includes("web app") || lower.includes("mobile") || lower.includes("store") || lower.includes("hosting") || lower.includes("ai")) return "projectType";
        if (lower.includes("establish") || lower.includes("generate") || lower.includes("showcase") || lower.includes("sell") || lower.includes("streamline") || lower.includes("save time") || lower.includes("modernize")) return "objective";
        if (lower.includes("under $") || lower.includes("budget") || lower.includes("tight")) return "budget";
        if (lower.includes("asap") || lower.includes("week") || lower.includes("month") || lower.includes("rush")) return "timeline";
        return "";
      })();

      switch (effectiveCategory) {
        case "projectType": {
          const typeMap: Record<string, string> = {
            "website": "website", "web app": "web-application", "web application": "web-application",
            "mobile app": "mobile-app", "online store": "ecommerce", "ecommerce": "ecommerce",
            "ai": "ai-integration", "automation": "automation", "hosting": "hosting",
          };
          for (const [keyword, type] of Object.entries(typeMap)) {
            if (lower.includes(keyword)) { brief.projectType = type; break; }
          }
          if (!brief.projectType) brief.projectType = "other";
          break;
        }
        case "objective":
          brief.objective = suggestion;
          break;
        case "features": {
          const feats = (brief.features || []) as string[];
          const existing = new Set(feats.map((f: string) => f.toLowerCase()));
          if (!existing.has(lower)) brief.features = [...feats, suggestion];
          break;
        }
        case "budget":
          brief.estimatedBudget = suggestion;
          break;
        case "timeline":
          brief.desiredTimeline = suggestion;
          break;
        case "contactInfo": {
          if (lower.includes("share") || lower.includes("sure")) {
            // Don't set field — let user type their details
          } else if (lower.includes("prefer") || lower.includes("anonymous") || lower.includes("finish")) {
            // Skip contact info for now
          }
          break;
        }
        case "designPreferences":
          brief.designPreferences = suggestion;
          break;
        case "integrations": {
          const intMap: Record<string, string> = {
            "payment": "Payment Gateway", "analytics": "Google Analytics",
            "email": "Email Service", "social": "Social Media",
            "whatsapp": "WhatsApp", "crm": "CRM Integration", "maps": "Maps",
          };
          const ints = (brief.integrations || []) as string[];
          for (const [keyword, integration] of Object.entries(intMap)) {
            if (lower.includes(keyword) && !ints.includes(integration)) {
              ints.push(integration);
            }
          }
          brief.integrations = ints;
          break;
        }
        case "hostingDomain":
          if (lower.includes("hosting") || lower.includes("host")) brief.hostingRequired = true;
          if (lower.includes("domain")) brief.domainRequired = true;
          break;
        case "businessContext": {
          const industryMap: Record<string, { industry: string; description: string }> = {
            "technology": { industry: "Technology", description: "Technology company" },
            "saas": { industry: "Technology", description: "SaaS product" },
            "ecommerce": { industry: "E-commerce", description: "Online retail" },
            "retail": { industry: "Retail", description: "Retail business" },
            "healthcare": { industry: "Healthcare", description: "Healthcare organization" },
            "education": { industry: "Education", description: "Educational institution" },
            "finance": { industry: "Finance", description: "Financial services" },
            "food": { industry: "Food & Restaurant", description: "Restaurant business" },
            "restaurant": { industry: "Food & Restaurant", description: "Restaurant business" },
            "real estate": { industry: "Real Estate", description: "Real estate business" },
          };
          for (const [keyword, ctx] of Object.entries(industryMap)) {
            if (lower.includes(keyword)) { brief.businessContext = ctx; break; }
          }
          break;
        }
        case "targetAudience": {
          if (lower.includes("customer") || lower.includes("client")) brief.targetAudience = "Customers/Clients";
          else if (lower.includes("team") || lower.includes("internal")) brief.targetAudience = "Internal team/Employees";
          else if (lower.includes("student")) brief.targetAudience = "Students and educators";
          else if (lower.includes("patient")) brief.targetAudience = "Patients and medical staff";
          else brief.targetAudience = suggestion;
          break;
        }
        case "mobileApp":
          if (lower.includes("yes") || lower.includes("both")) brief.mobileAppRequired = true;
          break;
        case "aiFeatures":
          if (!lower.includes("no")) brief.aiFeaturesRequired = true;
          break;
      }

      // Update stage based on what we now know
      const feats = (brief.features || []) as string[];
      const bizCtx = brief.businessContext as Record<string, unknown> | undefined;
      const hasMissing = !brief.projectType || !brief.objective || feats.length === 0 || !brief.estimatedBudget || !brief.desiredTimeline || !brief.targetAudience || !bizCtx?.industry;
      if (!hasMissing) {
        conversationState.stage = "generate-brief";
      } else if (brief.projectType && brief.objective) {
        conversationState.stage = "discover-requirements";
      } else if (brief.projectType) {
        conversationState.stage = "understand-goal";
      }
      conversationState.brief = brief;
    }

    sendMessage(suggestion);
  }, [conversationState, handleBilling, handleCheckAccount, handleGenerateImage, handleGenerateCode, handleGenerateProject, sendMessage]);

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

            {/* Generated Assets */}
            {generatedAssets.map((asset, idx) => (
              <div key={idx} className="ml-10 border rounded-xl overflow-hidden bg-white shadow-sm">
                {asset.type === "image" && asset.imageUrl && (
                  <>
                    <div className="px-3 py-2 bg-muted/50 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        Generated Image
                      </span>
                      <a
                        href={asset.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Open full size
                      </a>
                    </div>
                    <img
                      src={asset.imageUrl}
                      alt="Generated image"
                      className="w-full h-auto"
                    />
                  </>
                )}
                {asset.type === "code" && asset.code && (
                  <>
                    <div className="px-3 py-2 bg-muted/50 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Code className="h-3 w-3" />
                        Generated Code
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(asset.code || "")}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        Copy code
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-sm bg-gray-900 text-gray-100 max-h-64 overflow-y-auto">
                      <code>{asset.code}</code>
                    </pre>
                  </>
                )}
              </div>
            ))}

            {/* Suggestion Buttons */}
            {messages.length > 0 && !isLoading && !toolLoading && messages[messages.length - 1].suggestions && (
              <div className="flex flex-wrap gap-2 ml-10">
                {messages[messages.length - 1].suggestions!.map((suggestion) => {
                  const isTool = ["Generate project", "Get a quote", "Get a quote for this", "Check my account", "Generate image", "Generate code", "Generate another"].includes(suggestion);
                  return (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border bg-white transition-colors",
                        isTool
                          ? "border-primary/30 text-primary hover:bg-primary/5 font-medium"
                          : "hover:bg-primary/5 hover:border-primary/30 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {suggestion === "Generate project" && <Code className="h-3 w-3 inline mr-1" />}
                      {suggestion === "Get a quote" && <CreditCard className="h-3 w-3 inline mr-1" />}
                      {suggestion === "Get a quote for this" && <CreditCard className="h-3 w-3 inline mr-1" />}
                      {suggestion === "Check my account" && <UserCheck className="h-3 w-3 inline mr-1" />}
                      {suggestion === "Generate image" && <ImageIcon className="h-3 w-3 inline mr-1" />}
                      {suggestion === "Generate code" && <Code className="h-3 w-3 inline mr-1" />}
                      {suggestion === "Generate another" && <ImageIcon className="h-3 w-3 inline mr-1" />}
                      {suggestion}
                    </button>
                  );
                })}
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

            {(isLoading || toolLoading) && (
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
