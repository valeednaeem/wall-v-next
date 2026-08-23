"use client";

import dynamic from "next/dynamic";

const AgentChatWidget = dynamic(() => import("./AgentChatWidget"), { ssr: false });

interface AgentWidgetEmbedProps {
  agentId: string;
  agentName?: string;
  primaryColor?: string;
  position?: "bottom-right" | "bottom-left";
  welcomeMessage?: string;
}

export default function AgentWidgetEmbed(props: AgentWidgetEmbedProps) {
  return <AgentChatWidget {...props} />;
}
