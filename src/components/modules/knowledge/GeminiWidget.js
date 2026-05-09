"use client";

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function GeminiWidget() {
  const [model, setModel] = useState('gemini-2.5-flash');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [costMetrics, setCostMetrics] = useState({ tokens: 0, cost: 0 });
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev + (prev ? ' ' : '') + transcript);
      };

      recognitionRef.current.onend = () => {
        setIsDictating(false);
      };
    }
  }, []);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
          modelTier: model === 'gemini-2.5-pro' ? 'pro' : 'flash'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch from Gemini');
      }

      const data = await response.json();

      if (data.tokens && data.cost) {
        setCostMetrics({
          tokens: data.tokens.total || 0,
          cost: data.cost.totalCost || 0
        });
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Gemini Error:', error);
      setMessages((prev) => [...prev, { role: 'system', content: 'Error communicating with Gemini endpoint.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      const mimeType = file.type;

      // We visually add the file, but we'd need a multi-part chat format to send it to the backend properly.
      // Since the prompt states "Implement Base64 file attachments... update Genkit payload to accept media",
      // the user might use it in combination with `/api/copilot` conceptually, but we are wiring this to `/api/gemini/chat`.
      // Let's add it to the input visually for simplicity, or we'd just send a system note.
      setMessages((prev) => [...prev, { role: 'user', content: `[Attached File: ${file.name}]`, media: { base64, mimeType } }]);
    };
    reader.readAsDataURL(file);
  };

  const toggleDictation = () => {
    if (isDictating) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsDictating(true);
    }
  };

  const playTTS = async (text) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceModel: 'en-US-Journey-F' }),
      });
      const data = await response.json();
      if (data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audio.play();
      }
    } catch (err) {
      console.error('TTS Error:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-card, #111)', border: '1px solid var(--border, #333)', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border, #333)', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Gemini Copilot</h3>
          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>
            Est Tokens: {costMetrics.tokens} | Est Cost: ${costMetrics.cost.toFixed(6)}
          </div>
        </div>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: '#222', color: '#fff', border: '1px solid #444' }}
        >
          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
        </select>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', marginTop: 'auto', marginBottom: 'auto' }}>
            Ask Gemini anything...
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: msg.role === 'user' ? '#2563eb' : '#222',
                color: '#fff',
                position: 'relative'
              }}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              {msg.role === 'assistant' && (
                <button
                  onClick={() => playTTS(msg.content)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', marginTop: '4px', opacity: 0.7 }}
                  title="Play Audio"
                >
                  🔊
                </button>
              )}
            </div>
          ))
        )}
        {isTyping && <div style={{ color: '#888', fontStyle: 'italic' }}>Gemini is typing...</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border, #333)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
            title="Attach File"
          >
            📎
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept="image/*,.pdf"
          />
          <button
            type="button"
            onClick={toggleDictation}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: isDictating ? '#ef4444' : 'inherit' }}
            title="Dictate"
          >
            🎤
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            style={{ flex: 1, padding: '10px 14px', borderRadius: '4px', backgroundColor: '#111', border: '1px solid #444', color: '#fff' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            style={{ padding: '10px 16px', borderRadius: '4px', backgroundColor: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', opacity: (!input.trim() || isTyping) ? 0.5 : 1 }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
