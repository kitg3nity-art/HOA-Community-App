import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { auth } from '../lib/firebase';
import { Bot, Send, Sparkles } from 'lucide-react';

export default function AIAssistant() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Hi there! I'm Mirai, your friendly Casa Mira South community companion! I can help you find local resident services, check upcoming events, look up HOA announcements, or answer questions about our neighborhood. How can I assist you today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePromptClick = (promptText: string) => {
    setInput(promptText);
  };

  const handlePromptSend = async (promptText: string) => {
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: promptText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ query: promptText })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.text || "I've received your request." }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an issue processing your request. Please try again." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error while trying to help you. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    handlePromptSend(input.trim());
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="bg-white p-6 shadow-sm rounded-t-2xl border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 text-white rounded-xl flex items-center justify-center font-bold shadow-sm mr-3">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Mirai
              <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full font-semibold">
                Community Companion
              </span>
            </h1>
            <p className="text-xs text-slate-500">Your warm & helpful Casa Mira South guide</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
              msg.role === 'user' 
                ? 'bg-teal-600 text-white' 
                : 'bg-white shadow-sm border border-slate-200 text-slate-800'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center mb-1">
                  <Sparkles className="w-4 h-4 text-teal-500 mr-1" />
                  <span className="text-xs font-bold text-teal-700">Mirai</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white shadow-sm border border-slate-200 rounded-2xl px-5 py-4 flex items-center space-x-2">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-4 shadow-sm rounded-b-2xl border border-slate-200 border-t-0">
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              "What are the upcoming events?",
              "When is the water interruption?",
              "Who are the verified plumbers and service providers?",
              "What are the monthly HOA dues rates?",
              "Emergency guardhouse phone number"
            ].map((q, i) => (
              <button 
                key={i} 
                type="button"
                onClick={() => handlePromptSend(q)}
                disabled={loading}
                className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-200/80 font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about events, services, or community rules..."
            className="flex-1 rounded-full border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 px-4 py-2 border outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center rounded-full w-10 h-10 bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
