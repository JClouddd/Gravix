'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function GravixCopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Drag to resize state
  const [width, setWidth] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  
  const pathname = usePathname();
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      // Calculate new width based on window width minus mouse X position
      // because the panel is anchored to the right side of the screen.
      const newWidth = window.innerWidth - e.clientX;
      // Enforce min and max widths
      if (newWidth > 300 && newWidth < 800) {
        setWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Disable text selection while dragging
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = 'auto';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Send to our Genkit API route, injecting the current environment pathname
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: userMessage.content,
          context: `The user is currently viewing the following path in the application: ${pathname}. Provide context-aware assistance.`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to communicate with Copilot');
      }

      const data = await response.json();
      
      // Check if the AI returned a preview URL directive
      const previewMatch = data.response.match(/PREVIEW_READY:\s*(https:\/\/[^\s]+)/);
      if (previewMatch) {
        setPreviewUrl(previewMatch[1]);
        setMessages((prev) => [...prev, { role: 'assistant', content: data.response.replace(/PREVIEW_READY:\s*https:\/\/[^\s]+/, '').trim() + "\n\n🚀 Preview URL Ready! Opening GenTab..." }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (error) {
      console.error('Copilot Error:', error);
      setMessages((prev) => [...prev, { role: 'system', content: 'System Error: Failed to connect to Omni-Widget endpoint.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* GenTab Iframe Overlay (Phase 5) */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-[90vw] h-[90vh] bg-[#0a0c14] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/10">
              <div className="flex items-center space-x-4">
                <div className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-mono uppercase tracking-widest rounded-full border border-indigo-500/30">
                  Live Preview
                </div>
                <span className="text-gray-400 text-sm font-mono">{previewUrl}</span>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setPreviewUrl(null)}
                  className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm transition-colors border border-red-500/20"
                >
                  Reject & Tweak
                </button>
                <button 
                  onClick={() => {
                    alert("Merge triggered! Jules is merging the PR.");
                    setPreviewUrl(null);
                  }}
                  className="px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-sm font-medium transition-colors border border-emerald-500/30 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Approve & Merge</span>
                </button>
              </div>
            </div>
            {/* Iframe Sandbox */}
            <div className="flex-1 bg-white">
              <iframe src={previewUrl} className="w-full h-full border-none" title="Live Preview" />
            </div>
          </div>
        </div>
      )}

      {/* The Inline Header Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`btn btn-icon btn-ghost ${isOpen ? 'text-indigo-400 bg-white/5' : 'text-gray-400 hover:text-white'}`}
        title="Toggle Copilot"
        aria-label="Toggle Copilot"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>

      {/* The Glassmorphic Side Panel */}
      <div
        className={`fixed top-0 right-0 h-screen flex flex-col border-l border-white/10 shadow-2xl bg-[#0f111a]/95 backdrop-blur-3xl transition-transform duration-300 ease-in-out z-50
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: \`\${width}px\` }}
      >
        {/* Resize Handle */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/50 transition-colors z-50 group"
          onMouseDown={() => setIsDragging(true)}
        >
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-12 flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-0.5 h-1 bg-white/40 mb-0.5 rounded"></div>
            <div className="w-0.5 h-1 bg-white/40 mb-0.5 rounded"></div>
            <div className="w-0.5 h-1 bg-white/40 rounded"></div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">Gravix Omni-Widget</h3>
              <p className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">Gemma 4 // Active</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-md transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4 pb-24">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
              <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-sm text-gray-300 font-medium">I am synced with {pathname}.</p>
              <p className="text-xs text-gray-400">How can I assist you with this module?</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm
                  ${msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-sm' 
                    : msg.role === 'system'
                      ? 'bg-red-500/20 text-red-200 border border-red-500/30'
                      : 'bg-white/10 text-gray-200 border border-white/5 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/10 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex space-x-1 items-center h-10">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 bg-white/5 absolute bottom-0 left-0 w-full">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Command the system..."
              className="w-full bg-[#0a0c14]/50 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors backdrop-blur-md shadow-inner"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
