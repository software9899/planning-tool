import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export default function FloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get current page context
  const getCurrentPageContext = () => {
    const path = location.pathname;
    const pageContextMap: Record<string, string> = {
      '/': 'Home Dashboard',
      '/tasks': 'Tasks Board - Kanban view with tasks',
      '/backlog': 'Backlog - List of pending tasks',
      '/dashboard': 'Analytics Dashboard with charts',
      '/members': 'Team Members Management',
      '/settings': 'Application Settings',
      '/bookmarks': 'Browser Tabs & Bookmarks',
      '/system-flow': 'System Flow Diagram Editor',
      '/ai-agent': 'AI Agent page',
      '/training': 'Training & Learning resources'
    };

    return pageContextMap[path] || 'Unknown page';
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response (replace with actual AI integration)
    setTimeout(() => {
      const currentPage = getCurrentPageContext();
      let aiResponse = '';

      // Context-aware responses
      if (inputValue.toLowerCase().includes('page') || inputValue.toLowerCase().includes('where')) {
        aiResponse = `You are currently on the ${currentPage}. `;
      }

      // Generic responses based on keywords
      if (inputValue.toLowerCase().includes('task')) {
        aiResponse += 'You can manage tasks in the Tasks Board (/tasks) or create new ones in the Backlog (/backlog). ';
      } else if (inputValue.toLowerCase().includes('member') || inputValue.toLowerCase().includes('team')) {
        aiResponse += 'Team members can be managed in the Members page (/members) where you can view and edit team information. ';
      } else if (inputValue.toLowerCase().includes('dashboard') || inputValue.toLowerCase().includes('chart')) {
        aiResponse += 'Analytics and charts are available in the Dashboard (/dashboard) showing task statistics and burndown charts. ';
      } else if (inputValue.toLowerCase().includes('diagram') || inputValue.toLowerCase().includes('flow')) {
        aiResponse += 'You can create system flow diagrams in the System Flow page (/system-flow) with drag-and-drop shapes and Mermaid export. ';
      } else if (!aiResponse) {
        aiResponse = `I understand you're asking about "${inputValue}" on the ${currentPage}. How can I help you with this page?`;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse.trim(),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          right: isOpen ? '420px' : '0',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '56px',
          height: '56px',
          borderRadius: isOpen ? '50%' : '50% 0 0 50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
          cursor: 'pointer',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          transition: 'all 0.3s ease',
          color: 'white'
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.transform = 'translateY(-50%) translateX(-10px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.transform = 'translateY(-50%) translateX(0)';
          }
        }}
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            width: '400px',
            height: '100vh',
            background: 'white',
            boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
            zIndex: 9998,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideIn 0.3s ease'
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}
              >
                🤖
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>AI Assistant</h3>
                <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>Always here to help</p>
              </div>
            </div>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                marginTop: '12px'
              }}
            >
              📍 Current page: <strong>{getCurrentPageContext()}</strong>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              background: '#f9fafb'
            }}
          >
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👋</div>
                <h4 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Hello! How can I help you?</h4>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                  Ask me anything about this page or other features in the app.
                </p>
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => setInputValue('What can I do on this page?')}
                    style={{
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#667eea',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.background = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    💡 What can I do on this page?
                  </button>
                  <button
                    onClick={() => setInputValue('How do I create a new task?')}
                    style={{
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#667eea',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.background = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    ✨ How do I create a new task?
                  </button>
                  <button
                    onClick={() => setInputValue('Show me team analytics')}
                    style={{
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#667eea',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.background = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    📊 Show me team analytics
                  </button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      marginBottom: '16px',
                      display: 'flex',
                      justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '80%',
                        padding: '12px 16px',
                        borderRadius: message.type === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: message.type === 'user'
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'white',
                        color: message.type === 'user' ? 'white' : '#1f2937',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        border: message.type === 'ai' ? '1px solid #e5e7eb' : 'none'
                      }}
                    >
                      {message.content}
                      <div
                        style={{
                          fontSize: '11px',
                          marginTop: '6px',
                          opacity: 0.7,
                          textAlign: 'right'
                        }}
                      >
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <div
                      style={{
                        background: 'white',
                        padding: '12px 16px',
                        borderRadius: '16px 16px 16px 4px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <span style={{ animation: 'bounce 1s infinite', animationDelay: '0s' }}>●</span>
                        <span style={{ animation: 'bounce 1s infinite', animationDelay: '0.2s' }}>●</span>
                        <span style={{ animation: 'bounce 1s infinite', animationDelay: '0.4s' }}>●</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid #e5e7eb',
              background: 'white'
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '14px',
                  resize: 'none',
                  height: '60px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  background: inputValue.trim() && !isLoading
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#e5e7eb',
                  border: 'none',
                  color: 'white',
                  fontSize: '20px',
                  cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  if (inputValue.trim() && !isLoading) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </>
  );
}
