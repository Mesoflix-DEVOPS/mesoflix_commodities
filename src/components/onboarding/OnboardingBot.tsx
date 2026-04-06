"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, X, Globe, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "model";
  text: string;
}

export default function OnboardingBot({ onClose }: { onClose?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "Welcome to the Mesoflix Institutional Terminal. I am your Onboarding AI. While we wait for a senior agent to Join your session, I can assist with any questions regarding Capital.com API configuration or commodity market fundamentals. How can I assist you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages.map(m => ({
            role: m.role,
            parts: m.text
          }))
        })
      });

      const data = await res.json();
      if (data.message) {
        setMessages(prev => [...prev, { role: "model", text: data.message }]);
      } else {
        setMessages(prev => [...prev, { role: "model", text: "I'm currently recalibrating my institutional data feeds. Please try again in a moment." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "model", text: "Connectivity to the AI core has been interrupted. An agent will be with you shortly." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A1622] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="p-5 border-b border-white/5 bg-[#0D1B2A] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal to-dark-blue flex items-center justify-center border border-white/10 shadow-lg shadow-teal/20">
            <Bot size={20} className="text-gold" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              Onboarding AI
              <Sparkles size={12} className="text-gold animate-pulse" />
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-teal shadow-[0_0_8px_#00BFA6]" />
              <span className="text-[10px] text-teal font-black uppercase tracking-widest">Active Core</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Info Status */}
      <div className="px-5 py-2 bg-teal/5 border-b border-teal/10 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
        <span className="text-gray-500 flex items-center gap-1"><Globe size={10} /> Market Latency: 0ms</span>
        <span className="text-teal flex items-center gap-1"><ShieldCheck size={10} /> Secure End-to-End</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-[url('/grid.svg')] bg-repeat">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", 
            msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-2xl p-4 shadow-xl", 
              msg.role === "user" 
                ? "bg-gradient-to-br from-teal to-[#008f7a] text-white rounded-br-none border border-white/10" 
                : "bg-white/5 backdrop-blur-xl border border-white/10 text-gray-200 rounded-bl-none")}>
              <div className="flex items-center gap-2 mb-2 opacity-50">
                {msg.role === "user" ? <User size={12} /> : <Bot size={12} />}
                <span className="text-[10px] font-black uppercase tracking-tighter">
                  {msg.role === "user" ? "You" : "Terminal AI"}
                </span>
              </div>
              <p className="text-sm leading-relaxed font-medium">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-3">
              <Loader2 size={16} className="text-teal animate-spin" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Generating Insight...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-[#0D1B2A] border-t border-white/10 shrink-0">
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask about API logic, markets, or help..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/50 transition-all font-medium"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3.5 bg-gradient-to-r from-teal to-[#008f7a] text-[#0A1622] rounded-xl font-bold hover:shadow-[0_0_20px_rgba(0,191,166,0.4)] disabled:opacity-50 transition-all flex items-center justify-center shrink-0 group"
          >
            <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </form>
        <p className="mt-3 text-[9px] text-center text-gray-600 font-bold uppercase tracking-[0.2em]">
          Mesoflix Institutional Bot — Powered by Gemini Pro
        </p>
      </div>
    </div>
  );
}
