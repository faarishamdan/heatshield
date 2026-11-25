import React, { useState } from 'react';
import { AlertCircle, Bot, Loader2, Send, ShieldAlert } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export function AiAssistantScreen() {
  const { currentReading, readings, settings } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async (
    mode: 'explain' | 'summary' | 'patterns' | 'safety_tips',
    label: string
  ) => {
    setError(null);
    setLoading(true);
    const userMsgId = `u_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        text: label,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          currentReading,
          recentHistory: readings.slice(0, 40),
          thresholds: {
            cautionThresholdC: settings.cautionThresholdC,
            warningThresholdC: settings.warningThresholdC,
            dangerThresholdC: settings.dangerThresholdC,
          },
          workerContext: {
            workerName: settings.workerName,
            siteLocation: settings.siteLocation,
          },
        }),
      });

      const data = (await res.json()) as { analysis?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Server error (${res.status})`);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          text: data.analysis ?? 'No response returned.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach AI safety assistant.');
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    setQuestion('');
    setError(null);
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      {
        id: `u_${Date.now()}`,
        role: 'user',
        text: trimmed,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          currentReading,
          recentHistory: readings.slice(0, 30),
          thresholds: {
            cautionThresholdC: settings.cautionThresholdC,
            warningThresholdC: settings.warningThresholdC,
            dangerThresholdC: settings.dangerThresholdC,
          },
        }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Server error (${res.status})`);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          text: data.reply ?? 'No response returned.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send question.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Non-Medical Disclaimer */}
      <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-orange-700 shrink-0 mt-0.5" />
        <div className="text-xs text-orange-950 leading-relaxed">
          <strong>Safety Information Notice:</strong> AI outputs explain environmental sensor
          readings and general heat-safety practices. They are <strong>not</strong> medical
          diagnoses, clinical advice, or guaranteed predictions. If a worker feels dizzy, nauseated,
          or disoriented, stop work immediately and seek medical care.
        </div>
      </div>

      {/* Quick Analysis Controls */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
        <div>
          <h2 className="font-display font-semibold text-base text-slate-900">
            AI Telemetry Analysis Actions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analyzes your {currentReading ? 'latest reading and ' : ''}
            {readings.length} recorded history entries using Gemini on the server.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => void runAnalysis('explain', 'Explain current heat-exposure reading')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 text-left transition-colors min-h-[44px] disabled:opacity-50"
          >
            <div className="text-xs font-semibold text-slate-900">Explain Current Reading</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Break down °C, RH%, and Heat Index</div>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => void runAnalysis('summary', 'Summarize recorded environmental conditions')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 text-left transition-colors min-h-[44px] disabled:opacity-50"
          >
            <div className="text-xs font-semibold text-slate-900">Summarize Conditions</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Review shift highs, lows &amp; alerts</div>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => void runAnalysis('patterns', 'Identify patterns in historical sensor data')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 text-left transition-colors min-h-[44px] disabled:opacity-50"
          >
            <div className="text-xs font-semibold text-slate-900">Identify Data Patterns</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Spot thermal peaks &amp; motion overlap</div>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => void runAnalysis('safety_tips', 'Provide general heat-safety reminders')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 text-left transition-colors min-h-[44px] disabled:opacity-50"
          >
            <div className="text-xs font-semibold text-slate-900">Heat-Safety Reminders</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Hydration, rest &amp; buddy guidance</div>
          </button>
        </div>
      </div>

      {/* Conversation Feed */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Bot className="w-5 h-5 text-teal-700" />
          <h3 className="font-display font-semibold text-base text-slate-900">
            Safety Briefing &amp; Q&amp;A
          </h3>
        </div>

        <div className="space-y-3 min-h-[240px] max-h-[420px] overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Select an analysis action above or ask a question about heat index, rest schedules, or
              your recorded shift telemetry.
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`p-4 rounded-xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#0B1F3A] text-white ml-auto max-w-2xl'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 mr-auto max-w-3xl whitespace-pre-wrap'
                }`}
              >
                <div className="text-[11px] opacity-70 mb-1 font-mono">
                  {m.role === 'user' ? 'Worker / Supervisor' : 'HEATSHIELD AI'} · {m.timestamp}
                </div>
                <div>{m.text}</div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-600 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              <span>Analyzing telemetry with Gemini...</span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-900">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAsk} className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-100">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about current heat index, hydration intervals, or recent sensor trends..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 min-h-[44px]"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold min-h-[44px] whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            <span>Ask Assistant</span>
          </button>
        </form>
      </div>
    </div>
  );
}
