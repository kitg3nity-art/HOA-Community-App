import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../components/AuthContext';
import { auth } from '../lib/firebase';
import { MessageSquare, Send, ShieldAlert, AlertCircle, Hash, Users, Sparkles, RefreshCw } from 'lucide-react';

interface ChatMessage {
  id: number;
  userId: number;
  channel: string;
  message: string;
  flagged: boolean;
  flagReason?: string;
  createdAt: string;
  userName: string;
  userRole: string;
  userImage: string;
  userBlockLot: string;
}

export default function Chat() {
  const { profile, token } = useAuth();
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channels = [
    { id: 'general', name: 'general', desc: 'Main community lounge & neighbor discussions' },
    { id: 'marketplace-chat', name: 'marketplace-chat', desc: 'Buy, sell, and trade conversation channel' },
    { id: 'announcements-discussion', name: 'announcements-discussion', desc: 'Feedback on HOA updates & community notices' },
    { id: 'phase1-neighbors', name: 'phase1-neighbors', desc: 'Phase 1 specific updates & news' },
    { id: 'phase2-neighbors', name: 'phase2-neighbors', desc: 'Phase 2 specific updates & news' }
  ];

  const fetchMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let currentToken = token;
      if (auth.currentUser) {
        currentToken = await auth.currentUser.getIdToken();
      }
      if (!currentToken) {
        setMessages([]);
        return;
      }
      const res = await fetch(`/api/chat/messages?channel=${activeChannel}`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      } else if (res.status === 401 && auth.currentUser) {
        const newToken = await auth.currentUser.getIdToken(true);
        const retryRes = await fetch(`/api/chat/messages?channel=${activeChannel}`, {
          headers: { Authorization: `Bearer ${newToken}` }
        });
        if (retryRes.ok) {
          const data = await retryRes.json();
          setMessages(Array.isArray(data) ? data : []);
        } else {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error("Failed to fetch messages", e);
      setMessages([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(false);
    const interval = setInterval(() => fetchMessages(true), 3000);
    return () => clearInterval(interval);
  }, [activeChannel, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    setErrorNotice(null);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          channel: activeChannel,
          message: inputText
        })
      });

      if (res.status === 403) {
        const err = await res.json();
        setErrorNotice(err.error || 'You are muted by an admin.');
      } else if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);
        setInputText('');
        if (newMsg.flagged) {
          setErrorNotice(`Message sent, but flagged by automated moderation: ${newMsg.flagReason}`);
        }
      }
    } catch (e) {
      console.error("Failed to post message", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-6rem)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
              Casa Mira Community Chat
              <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded-full text-xs font-semibold border border-teal-500/30">
                Moderated Live
              </span>
            </h1>
            <p className="text-xs text-slate-400"># {activeChannel} • Real-time neighbor discussion channel</p>
          </div>
        </div>

        <button onClick={() => fetchMessages(false)} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors" title="Refresh messages">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Body Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Channel Sidebar */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 shrink-0 hidden md:block">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Community Channels</h2>
          <div className="space-y-1">
            {channels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 transition-all ${
                  activeChannel === ch.id
                    ? 'bg-teal-600 text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Hash className={`w-4 h-4 shrink-0 ${activeChannel === ch.id ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-bold mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>Chat Rules</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Maintain neighborly respect. Offensive language, spam, or scams are automatically flagged for HOA Admin review.
            </p>
          </div>
        </div>

        {/* Right Chat Messages Container */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">
          {/* Mobile Channel Tabs */}
          <div className="md:hidden flex overflow-x-auto p-2 bg-slate-100 border-b border-slate-200 gap-1 shrink-0">
            {channels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
                  activeChannel === ch.id ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 border'
                }`}
              >
                #{ch.name}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Loading messages...
              </div>
            ) : (Array.isArray(messages) ? messages : []).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Users className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700 text-sm">No messages yet in #{activeChannel}</p>
                <p className="text-xs text-slate-500">Be the first to say hello to your neighbors!</p>
              </div>
            ) : (
              (Array.isArray(messages) ? messages : []).map(msg => (
                <div key={msg.id} className="flex gap-3 group">
                  <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-slate-700 shadow-sm border border-white">
                    {msg.userImage ? (
                      <img src={msg.userImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      msg.userName?.[0] || 'U'
                    )}
                  </div>

                  <div className="flex-1 max-w-2xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-xs text-slate-900">{msg.userName}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border font-medium">
                        {msg.userBlockLot}
                      </span>
                      {msg.userRole === 'ADMIN' || msg.userRole === 'SUPERADMIN' ? (
                        <span className="text-[10px] px-2 py-0.5 bg-teal-100 text-teal-800 rounded-md font-bold uppercase">
                          HOA Admin
                        </span>
                      ) : null}
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.flagged 
                        ? 'bg-amber-50 border border-amber-200 text-amber-900' 
                        : 'bg-white border border-slate-200/80 text-slate-800 shadow-xs'
                    }`}>
                      {msg.flagged && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 mb-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>[Flagged for Moderator Review: {msg.flagReason}]</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Warning Banner if flagged notice */}
          {errorNotice && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-amber-800 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                {errorNotice}
              </span>
              <button onClick={() => setErrorNotice(null)} className="text-amber-600 font-bold hover:underline">Dismiss</button>
            </div>
          )}

          {/* Input Box */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2 shrink-0">
            <input
              type="text"
              placeholder={`Message #${activeChannel}...`}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
