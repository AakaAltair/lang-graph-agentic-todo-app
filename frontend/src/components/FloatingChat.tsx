"use client";

import React, { useState, useRef, useEffect, useCallback, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTodos } from '@/services/api';
import { Todo } from '@/types';
import { Bot, Send, Loader2, MessageSquare, Minus, RotateCcw } from 'lucide-react';

// === Type Definitions ===
interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}
interface Position {
  x: number;
  y: number;
}

const initialMessage: Message = {
  id: 1,
  text: "Hello! How can I assist you today? I can read, create, update, and delete your to-dos. I can also remember our conversation.",
  sender: 'ai'
};

const FloatingChat = () => {
  // === State Management & Refs ===
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [chatPosition, setChatPosition] = useState<Position>({ x: 0, y: 0 });
  const [bubblePosition, setBubblePosition] = useState<Position>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string>('');
  const chatRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageIdCounter = useRef(initialMessage.id + 1);

  const openSize = useRef({ width: 440, height: 700 });
  const bubbleSize = useRef({ width: 80, height: 80 });

  useEffect(() => {
    setThreadId(`thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  // === Fetch To-Dos for Context (can be used by the backend via API) ===
  useQuery<Todo[]>({
    queryKey: ['todos'],
    queryFn: getTodos,
    staleTime: 5 * 60 * 1000,
  });

  // === Hooks & Handlers ===
  const handleResetChat = useCallback(() => {
    setIsLoading(false);
    setMessages([initialMessage]);
    messageIdCounter.current = initialMessage.id + 1;
    setThreadId(`thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const initialPos = { x: window.innerWidth - bubbleSize.current.width - 24, y: window.innerHeight - bubbleSize.current.height - 24 };
    setChatPosition(initialPos);
    setBubblePosition(initialPos);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isLoading && isOpen) {
      textareaRef.current?.focus();
    }
  }, [isLoading, isOpen]);

  const toggleChat = useCallback(() => {
    setIsOpen(prevIsOpen => {
      const isOpening = !prevIsOpen;
      if (isOpening) {
        const idealX = bubblePosition.x + bubbleSize.current.width - openSize.current.width;
        const idealY = bubblePosition.y + bubbleSize.current.height - openSize.current.height;
        const constrainedX = Math.max(8, Math.min(idealX, window.innerWidth - openSize.current.width - 8));
        const constrainedY = Math.max(8, Math.min(idealY, window.innerHeight - openSize.current.height - 8));
        setChatPosition({ x: constrainedX, y: constrainedY });
        setTimeout(() => textareaRef.current?.focus(), 300);
      } else {
        setChatPosition(bubblePosition);
      }
      return isOpening;
    });
  }, [bubblePosition]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isOpen && dragHandleRef.current && !dragHandleRef.current.contains(e.target as Node)) return;
    if (chatRef.current) {
      setIsDragging(true);
      const chatRect = chatRef.current.getBoundingClientRect();
      setDragStart({ x: e.clientX - chatRect.left, y: e.clientY - chatRect.top });
      e.preventDefault();
    }
  }, [isOpen]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && chatRef.current) {
      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;
      const chatWidth = chatRef.current.offsetWidth;
      const chatHeight = chatRef.current.offsetHeight;
      newX = Math.max(0, Math.min(newX, window.innerWidth - chatWidth));
      newY = Math.max(0, Math.min(newY, window.innerHeight - chatHeight));
      const newPos = { x: newX, y: newY };
      setChatPosition(newPos);
      if (!isOpen) {
        setBubblePosition(newPos);
      }
    }
  }, [isDragging, dragStart, isOpen]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // === handleSubmit function with streaming and loading indicator support ===
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!textareaRef.current) return;
    const text = textareaRef.current.value.trim();
    if (!text || isLoading || !threadId) return;

    setIsLoading(true);

    const userMessage: Message = { id: messageIdCounter.current++, text, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);

    const aiMessageId = messageIdCounter.current++;
    setMessages(prev => [...prev, { id: aiMessageId, text: '', sender: 'ai' }]);

    textareaRef.current.value = '';
    textareaRef.current.style.height = 'auto';

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, thread_id: threadId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.statusText} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error("The response body is empty.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId ? { ...msg, text: msg.text + chunk } : msg
        ));
      }
    } catch (error) {
      console.error("Streaming API call error:", error);
      const errorMessage = "Sorry, something went wrong. Please try again later.";
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId
          ? { ...msg, text: (msg.text.length > 0 ? msg.text + "\n\n" : "") + errorMessage }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      textarea.form?.requestSubmit();
    }
    setTimeout(() => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }, 0);
  };

  // === JSX / Render ===
  return (
    <div
      ref={chatRef}
      className={`fixed z-[100] transition-all duration-300 ease-in-out ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{
        left: `${chatPosition.x}px`, top: `${chatPosition.y}px`,
        width: isOpen ? `${openSize.current.width}px` : `${bubbleSize.current.width}px`,
        height: isOpen ? `${openSize.current.height}px` : `${bubbleSize.current.height}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      {isOpen ? (
        <div className="relative w-full h-full">
          <div className="spinner-border absolute inset-0" style={{ borderRadius: 'var(--border-radius-card)' }}>
            <div className="spinner-content w-full h-full" style={{ borderRadius: 'calc(var(--border-radius-card) - var(--border-size))' }}></div>
          </div>
          <div
            className="absolute inset-0 flex flex-col p-[var(--border-size)] backdrop-blur-xl"
            style={{
              borderRadius: 'var(--border-radius-card)',
              background: 'radial-gradient(ellipse at top, rgba(22, 28, 40, 0.9), rgba(10, 12, 18, 0.95))'
            }}
          >
            <div ref={dragHandleRef} className="flex-shrink-0 flex items-center justify-between p-4 cursor-grab border-b border-white/10">
              <h3 className="font-semibold text-lg text-white/90">AI Assistant</h3>
              <div className="flex items-center gap-1">
                <button onClick={handleResetChat} className="p-2 text-white/60 hover:text-white transition-colors" aria-label="Reset chat"><RotateCcw size={18} /></button>
                <button onClick={toggleChat} className="p-2 text-white/60 hover:text-white transition-colors" aria-label="Minimize chat"><Minus size={20} /></button>
              </div>
            </div>

            <div className="flex-grow min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'self-end' : 'self-start'}`}>
                  {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center"><Bot size={20} className="text-amber-300" /></div>}
                  <div className={`whitespace-pre-wrap max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.sender === 'user' ? 'bg-blue-800 text-white rounded-br-none' : 'bg-slate-700/60 text-white/90 rounded-bl-none border border-white/10'}`}>
                    {/* --- UPDATED: Conditional loading indicator --- */}
                    {msg.sender === 'ai' && isLoading && msg.text.length === 0 ? (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce"></span>
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex-shrink-0 p-4 border-t border-white/10">
              <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                <textarea
                  ref={textareaRef} name="message" rows={1} onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-grow bg-black/40 border border-white/20 rounded-2xl py-2.5 px-4 text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[--text-accent] resize-none max-h-32 transition-all"
                  autoComplete="off" disabled={isLoading}
                />
                <button type="submit" className="btn spinner-border rounded-full !p-0.5 disabled:opacity-50 h-[48px] flex-shrink-0" disabled={isLoading}>
                  <span className="spinner-content !p-3 !rounded-full text-[--text-accent]">
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={toggleChat} className="w-full h-full" aria-label="Open chat">
          <div className="spinner-border w-full h-full" style={{ borderRadius: '9999px' }}>
            <div className="spinner-content w-full h-full flex items-center justify-center" style={{ borderRadius: 'calc(9999px - var(--border-size))' }}>
              <MessageSquare className="text-white w-9 h-9" />
            </div>
          </div>
        </button>
      )}
    </div>
  );
};

export default FloatingChat;