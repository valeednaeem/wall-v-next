"use client";

import dynamic from "next/dynamic";

const AgentChatWidget = dynamic(
  () => import("@/components/agents/AgentChatWidget"),
  { ssr: false }
);

export default function ChatWidgetLoader() {
  return <AgentChatWidget />;
}
