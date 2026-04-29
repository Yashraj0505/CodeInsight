import React, { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const QuestionPanel = ({ activeFileId, projectId }) => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const userMessage = question.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setQuestion("");
    setIsLoading(true);

    try {
      const response = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage, contextFileId: activeFileId, projectId }),
      });

      const data = await response.json();
      const text = data.answer || data.error || "No response received.";
      setMessages(prev => [...prev, { role: 'ai', text }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: 'ai', text: "**Error:** Cannot connect to the Code Insight backend." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="question-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexShrink: 0, borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
        <Bot size={18} color="#c4b5fd" />
        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>AI Assistant</span>
      </div>
      <div className="chat-history">
        {messages.length === 0 && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem', marginTop: '8px' }}>
            <Bot size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p>Ask a question about the selected file or your project.</p>
            <p style={{ marginTop: '4px', fontSize: '0.8rem', opacity: 0.7 }}>
              Try: <em>"How does this work?"</em> · <em>"What does this function do?"</em> · <em>"Explain the imports"</em>
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            maxWidth: '900px',
            margin: '0 auto',
            width: '100%',
            padding: '0 4px'
          }}>
            {/* Avatar */}
            <div style={{
              flexShrink: 0,
              width: '32px', height: '32px',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: msg.role === 'user'
                ? 'rgba(59,130,246,0.2)'
                : 'rgba(139,92,246,0.2)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(59,130,246,0.4)' : 'rgba(139,92,246,0.4)'}`,
              marginTop: '2px'
            }}>
              {msg.role === 'user'
                ? <User size={16} color="#60a5fa" />
                : <Bot size={16} color="#c4b5fd" />
              }
            </div>

            {/* Message bubble */}
            <div style={{
              flex: 1,
              background: msg.role === 'user'
                ? 'rgba(59,130,246,0.08)'
                : 'rgba(139,92,246,0.08)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(59,130,246,0.15)' : 'rgba(139,92,246,0.15)'}`,
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '0.92rem',
              lineHeight: '1.7',
              color: '#e2e8f0'
            }}>
              {msg.role === 'user' ? (
                <span>{msg.text}</span>
              ) : (
                <div className="ai-markdown">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', maxWidth: '900px', margin: '0 auto', width: '100%', padding: '0 4px' }}>
            <div style={{
              flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)'
            }}>
              <Bot size={16} color="#c4b5fd" />
            </div>
            <div style={{
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)',
              borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <Loader2 size={16} className="lucide-spin" color="#c4b5fd" />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Analyzing...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <div className="chat-input-wrapper">
        <form onSubmit={handleAsk}>
          <input
            type="text"
            className="chat-input"
            placeholder="Ask AI about this code... (e.g. 'what does this function do?')"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="chat-btn" disabled={isLoading || !question.trim()}>
            {isLoading ? <Loader2 size={16} className="lucide-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default QuestionPanel;

