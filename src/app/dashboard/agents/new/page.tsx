"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Save, Loader2 } from "lucide-react";

export default function NewAgentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "conversational",
    role: "custom",
    systemPrompt: "You are a helpful AI assistant for Wall-V, a digital agency specializing in web development, AI solutions, and digital marketing.",
    instructions: "",
    model: "gpt-4o",
    temperature: 0.7,
    maxTokens: 2048,
    isClientFacing: false,
    isMasterAgent: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          instructions: form.instructions
            .split("\n")
            .filter((l) => l.trim())
            .map((l) => l.trim()),
          personality: { tone: "professional", language: "en" },
          memory: { type: "conversation", maxItems: 50 },
          guardrails: { maxConversationLength: 100, contentFilter: true },
          channels: { website: true, dashboard: true },
          integrations: { crm: true, projects: true },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/agents/${data.agent._id}`);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create agent");
      }
    } catch {
      alert("Failed to create agent");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/agents" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Agent</h1>
          <p className="text-sm text-gray-500">Create a new AI agent</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="e.g. Sales Assistant"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              rows={2}
              placeholder="What does this agent do?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="conversational">Conversational</option>
                <option value="task">Task</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="sales">Sales</option>
                <option value="support">Support</option>
                <option value="technical">Technical</option>
                <option value="marketing">Marketing</option>
                <option value="operations">Operations</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt *</label>
            <textarea
              value={form.systemPrompt}
              onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
              rows={6}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions (one per line)</label>
            <textarea
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              rows={4}
              placeholder="Always be polite&#10;Never share internal pricing&#10;Escalate billing questions..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <select
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
              <input
                type="number"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                min="0"
                max="2"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
              <input
                type="number"
                value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                min="1"
                max="128000"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isClientFacing}
                onChange={(e) => setForm({ ...form, isClientFacing: e.target.checked })}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              Client-facing agent
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isMasterAgent}
                onChange={(e) => setForm({ ...form, isMasterAgent: e.target.checked })}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              Master agent
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/agents"
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Creating..." : "Create Agent"}
          </button>
        </div>
      </form>
    </div>
  );
}
