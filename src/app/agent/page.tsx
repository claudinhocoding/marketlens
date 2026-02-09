"use client";

import ChatInterface from "@/components/ChatInterface";

export default function AgentPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Agent</h1>
        <p className="text-muted text-sm mt-1">Chat with the AI competitive intelligence agent</p>
      </div>
      <ChatInterface />
    </div>
  );
}
