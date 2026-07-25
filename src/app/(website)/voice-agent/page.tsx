import type { Metadata } from "next";
import { InlineVoicePanel } from "@/components/ai/inline-voice-panel";

export const metadata: Metadata = {
  title: "Voice Assistant",
  description: "Talk to Wall-V AI voice assistant. Get instant answers about our services, pricing, and project estimates.",
};

export default function VoiceAgentPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
            AI Voice Agent
          </span>
          <h1 className="text-4xl font-bold">Talk to Wall-V AI</h1>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Speak naturally with our AI assistant — ask about services, pricing,
            or get a project estimate. No forms, no waiting.
          </p>
        </div>

        <InlineVoicePanel
          title="Voice Project Consultant"
          subtitle="Tell me about your project idea and I'll help you define the requirements, recommend the right services, and prepare a project brief."
        />

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          <div className="rounded-xl border p-6 text-center">
            <div className="text-3xl mb-3">🎙️</div>
            <h3 className="font-semibold mb-1">Natural Conversation</h3>
            <p className="text-sm text-muted-foreground">
              Speak naturally — tell me your idea and I&apos;ll ask the right questions to understand what you need.
            </p>
          </div>
          <div className="rounded-xl border p-6 text-center">
            <div className="text-3xl mb-3">🧠</div>
            <h3 className="font-semibold mb-1">Project Discovery</h3>
            <p className="text-sm text-muted-foreground">
              I&apos;ll help you define requirements, features, budget, and timeline — then prepare a structured project brief.
            </p>
          </div>
          <div className="rounded-xl border p-6 text-center">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold mb-1">Instant Guidance</h3>
            <p className="text-sm text-muted-foreground">
              Get real-time recommendations on services, hosting, domains, and the best approach for your project.
            </p>
          </div>
        </div>

        <div className="mt-12 rounded-2xl bg-muted/30 p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Prefer to type?</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Use our text-based AI chatbot for a similar experience.
          </p>
          <p className="text-xs text-muted-foreground">
            Click the chat icon in the bottom-right corner to start a text conversation.
          </p>
        </div>
      </div>
    </div>
  );
}
