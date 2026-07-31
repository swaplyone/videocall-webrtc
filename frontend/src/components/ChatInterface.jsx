import React, { useState, useRef, useEffect } from 'react';
import { Send, Shield, ShieldAlert } from 'lucide-react';

export default function ChatInterface({ messages, onSendMessage }) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <Shield size={18} style={{ color: 'var(--color-primary)' }} />
        Secure Chat
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            No messages yet. Chat securely here.
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.sender === 'system_warning') {
              return (
                <div key={msg.id} className="chat-warning">
                  <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div className="chat-warning-text">{msg.error}</div>
                    {msg.originalText && (
                      <div className="chat-warning-original">
                        Blocked message: "{msg.originalText}"
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            const isMine = msg.isMine;
            return (
              <div
                key={msg.id}
                className={`chat-bubble ${isMine ? 'mine' : 'other'}`}
              >
                {!isMine && <div style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.15rem' }}>{msg.sender}</div>}
                <div>{msg.text}</div>
                <div className="chat-time">{msg.timestamp}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          placeholder="Type a safe message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          maxLength={500}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem' }}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
