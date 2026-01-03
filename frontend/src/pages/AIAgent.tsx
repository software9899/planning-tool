import { useState, useRef, useEffect } from 'react';
import { DataManager, type Task } from '../services/api';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  time: string;
}

interface WorkflowStep {
  id: number;
  title: string;
  status: 'processing' | 'completed';
  messages: AgentMessage[];
}

interface AgentMessage {
  agent: 'researcher' | 'analyzer' | 'synthesizer';
  name: string;
  text: string;
}

export default function AIAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const typingIntervalRef = useRef<number | null>(null);

  const suggestedPrompts = [
    '📊 Show me project statistics',
    '🔍 Find tasks that are overdue',
    '📝 Summarize recent activities',
    '💡 Suggest task priorities'
  ];

  // Load tasks and chat history on mount
  useEffect(() => {
    loadTasks();
    loadChatHistory();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await DataManager.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadChatHistory = () => {
    const saved = localStorage.getItem('aiChatHistory');
    if (saved) {
      try {
        const history = JSON.parse(saved);
        setMessages(history);
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }
  };

  const saveChatHistory = (msgs: Message[]) => {
    localStorage.setItem('aiChatHistory', JSON.stringify(msgs));
  };

  // Q&A Cache functions
  const getQACache = (): Record<string, string> => {
    const saved = localStorage.getItem('aiQACache');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        return {};
      }
    }
    return {};
  };

  const saveToQACache = (question: string, answer: string) => {
    const cache = getQACache();
    // Normalize question (lowercase, trim)
    const normalizedQ = question.toLowerCase().trim();
    cache[normalizedQ] = answer;
    localStorage.setItem('aiQACache', JSON.stringify(cache));
  };

  const getCachedAnswer = (question: string): string | null => {
    const cache = getQACache();
    const normalizedQ = question.toLowerCase().trim();
    return cache[normalizedQ] || null;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      time: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    saveChatHistory(newMessages);
    const userQuestion = inputValue;
    setInputValue('');

    // Check cache first
    const cachedAnswer = getCachedAnswer(userQuestion);

    if (cachedAnswer) {
      // Found in cache - show typewriter effect immediately (no dots, no delay)
      setIsTyping(true);
      typewriterEffect(cachedAnswer, newMessages);
      return;
    }

    // Not in cache - show typing indicator and get new answer
    setIsTyping(true);

    // Show workflow popup for complex queries
    if (userQuestion.toLowerCase().includes('search') ||
        userQuestion.toLowerCase().includes('find') ||
        userQuestion.toLowerCase().includes('statistic') ||
        userQuestion.toLowerCase().includes('สถิติ')) {
      setShowWorkflow(true);
      simulateWorkflow();
    }

    // Process AI response
    setTimeout(async () => {
      const aiResponse = await processAIResponse(userQuestion);

      // Save to cache
      saveToQACache(userQuestion, aiResponse);

      // Start typewriter effect
      typewriterEffect(aiResponse, newMessages);
    }, 7000);
  };

  const processAIResponse = async (userMessage: string): Promise<string> => {
    try {
      // Try to call backend API
      const response = await fetch('http://localhost:8001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
          model: 'llama3.1',
          context: {
            tasks: tasks
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        return data.response;
      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (error) {
      console.error('AI API Error:', error);
      // Fallback to local analysis if API fails
      const fallbackResponse = getFallbackResponse(userMessage);
      return `⚠️ ไม่สามารถเชื่อมต่อกับ AI ได้ กำลังใช้โหมดออฟไลน์...\n\n${fallbackResponse}`;
    }
  };

  const getFallbackResponse = (userMessage: string): string => {
    const lowerMsg = userMessage.toLowerCase();

    if (lowerMsg.includes('statistic') || lowerMsg.includes('สถิติ')) {
      return analyzeProjectStatistics();
    } else if (lowerMsg.includes('overdue') || lowerMsg.includes('เกินกำหนด')) {
      return findOverdueTasks();
    } else if (lowerMsg.includes('summar') || lowerMsg.includes('สรุป')) {
      return summarizeActivities();
    } else if (lowerMsg.includes('priorit') || lowerMsg.includes('ลำดับ')) {
      return suggestPriorities();
    } else {
      return 'กรุณาตรวจสอบว่า AI Backend Server ทำงานอยู่หรือไม่ (http://localhost:8001)';
    }
  };

  const analyzeProjectStatistics = (): string => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const todo = tasks.filter(t => t.status === 'todo' || t.status === 'to-do').length;
    const backlog = tasks.filter(t => t.status === 'backlog' || t.status === 'Need More Details').length;

    return `📊 สถิติโปรเจคปัจจุบัน:\n\n✅ เสร็จสมบูรณ์: ${done} tasks (${Math.round(done/total*100)}%)\n🔄 กำลังดำเนินการ: ${inProgress} tasks\n📋 รอดำเนินการ: ${todo} tasks\n📦 Backlog: ${backlog} tasks\n\nรวมทั้งหมด ${total} tasks\n\nผลงานดีมากครับ! ${done > total/2 ? 'ทีมทำงานได้มากกว่าครึ่งแล้ว 🎉' : 'ยังมีงานอีกเยอะ ลุยกันต่อ! 💪'}`;
  };

  const findOverdueTasks = (): string => {
    const now = new Date();
    const overdue = tasks.filter(t => {
      if ((t.dueDate || t.due_date) && t.status !== 'done') {
        return new Date(t.dueDate || t.due_date || '') < now;
      }
      return false;
    });

    if (overdue.length === 0) {
      return '🎉 ยินดีด้วย! ไม่มี task ที่เกินกำหนดเลยครับ';
    }

    let response = `⚠️ พบ ${overdue.length} tasks ที่เกินกำหนด:\n\n`;
    overdue.slice(0, 5).forEach((task, i) => {
      response += `${i+1}. ${task.title || task.text}\n   กำหนด: ${formatDate(task.dueDate || task.due_date)}\n`;
    });

    if (overdue.length > 5) {
      response += `\n...และอีก ${overdue.length - 5} tasks`;
    }

    return response;
  };

  const summarizeActivities = (): string => {
    const recentTasks = tasks.slice(-5).reverse();

    let response = '📝 กิจกรรมล่าสุด:\n\n';

    if (recentTasks.length === 0) {
      return 'ยังไม่มีกิจกรรมในระบบครับ เริ่มสร้าง task แรกกันเลย! 🚀';
    }

    recentTasks.forEach((task, i) => {
      const statusEmoji: Record<string, string> = {
        'backlog': '📦',
        'to-do': '📋',
        'todo': '📋',
        'in-progress': '🔄',
        'done': '✅'
      };

      const emoji = statusEmoji[task.status || ''] || '📌';
      response += `${i+1}. ${emoji} ${task.title || task.text}\n`;
    });

    return response;
  };

  const suggestPriorities = (): string => {
    const highPriority = tasks.filter(t =>
      (t.priority === 'high' || t.priority === 'High') && t.status !== 'done'
    );

    if (highPriority.length === 0) {
      return '✨ คุณไม่มี task ที่มี priority สูงที่ค้างอยู่ครับ!\n\nแนะนำให้:\n1. ทบทวน backlog\n2. วางแผนงานสัปดาห์หน้า\n3. ปรับปรุงเอกสาร';
    }

    let response = '💡 แนะนำให้ทำงานเหล่านี้ก่อน:\n\n';
    highPriority.slice(0, 3).forEach((task, i) => {
      response += `${i+1}. 🔥 ${task.title || task.text}\n`;
    });

    return response;
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'ไม่ระบุ';
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH');
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const typewriterEffect = (fullText: string, previousMessages: Message[]) => {
    // Clear any existing typing interval
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }

    setIsTyping(true);
    setTypingText('');

    let currentIndex = 0;
    const typingSpeed = 30; // milliseconds per character

    typingIntervalRef.current = setInterval(() => {
      if (currentIndex < fullText.length) {
        setTypingText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
        scrollToBottom();
      } else {
        // Typing complete
        clearInterval(typingIntervalRef.current!);
        setIsTyping(false);
        setTypingText('');

        // Add complete message to history
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: fullText,
          time: new Date().toISOString()
        };
        const updatedMessages = [...previousMessages, aiMessage];
        setMessages(updatedMessages);
        saveChatHistory(updatedMessages);
      }
    }, typingSpeed);
  };

  const simulateWorkflow = () => {
    const steps: WorkflowStep[] = [
      {
        id: 1,
        title: 'Research Phase',
        status: 'processing',
        messages: [
          { agent: 'researcher', name: 'Research Agent', text: 'Analyzing your request and gathering relevant information...' }
        ]
      }
    ];

    setWorkflowSteps(steps);

    // Add analyzer after 2 seconds
    setTimeout(() => {
      setWorkflowSteps(prev => {
        const updated = [...prev];
        updated[0].status = 'completed';
        updated.push({
          id: 2,
          title: 'Analysis Phase',
          status: 'processing',
          messages: [
            { agent: 'analyzer', name: 'Analysis Agent', text: 'Processing data and identifying patterns...' }
          ]
        });
        return updated;
      });
    }, 2000);

    // Add synthesizer after 4 seconds
    setTimeout(() => {
      setWorkflowSteps(prev => {
        const updated = [...prev];
        updated[1].status = 'completed';
        updated.push({
          id: 3,
          title: 'Synthesis Phase',
          status: 'processing',
          messages: [
            { agent: 'synthesizer', name: 'Synthesis Agent', text: 'Compiling results and generating response...' }
          ]
        });
        return updated;
      });
    }, 4000);

    // Complete workflow after 6 seconds
    setTimeout(() => {
      setWorkflowSteps(prev => {
        const updated = [...prev];
        updated[2].status = 'completed';
        return updated;
      });
    }, 6000);
  };

  const handlePromptClick = (prompt: string) => {
    setInputValue(prompt.substring(2).trim()); // Remove emoji
    chatInputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getAgentEmoji = (agent: 'researcher' | 'analyzer' | 'synthesizer'): string => {
    switch (agent) {
      case 'researcher': return '🔍';
      case 'analyzer': return '📊';
      case 'synthesizer': return '✨';
    }
  };

  return (
    <>
      <div className="ai-container">
        <div className="chat-header">
          <h1>💬 Chat with AI Assistant</h1>
          <p>Ask me anything! I can search for information and help you with your tasks.</p>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="ai-icon">🤖</div>
              <h2>Welcome to AI Agent</h2>
              <p>Start a conversation by typing a message or selecting a suggested prompt below.</p>
            </div>
          ) : (
            messages.map(message => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className="message-avatar">
                  {message.type === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-content">
                  <div className="message-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </div>
                  <div className="message-time">{formatTime(message.time)}</div>
                </div>
              </div>
            ))
          )}

          {isTyping && (
            <div className="message ai">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                {typingText ? (
                  <div className="message-bubble typing-message" style={{ whiteSpace: 'pre-wrap' }}>
                    {typingText}
                    <span className="typing-cursor">|</span>
                  </div>
                ) : (
                  <div className="typing-indicator active">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <div className="suggested-prompts">
            {suggestedPrompts.map((prompt, index) => (
              <div
                key={index}
                className="prompt-chip"
                onClick={() => handlePromptClick(prompt)}
              >
                {prompt}
              </div>
            ))}
          </div>
          <div className="chat-input-wrapper">
            <textarea
              ref={chatInputRef}
              className="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              rows={1}
            />
            <button
              className="send-btn"
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              title="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Popup */}
      {showWorkflow && (
        <div className={`workflow-overlay ${showWorkflow ? 'active' : ''}`}>
          <div className="workflow-popup">
            <div className="workflow-header">
              <h2>🔄 AI Workflow Process</h2>
              <button className="workflow-close" onClick={() => setShowWorkflow(false)}>×</button>
            </div>
            <div className="workflow-content">
              {workflowSteps.map((step, stepIndex) => (
                <div
                  key={step.id}
                  className="workflow-step"
                  style={{ animationDelay: `${stepIndex * 0.1}s` }}
                >
                  <div className="step-header">
                    <div className="step-number">{step.id}</div>
                    <div className="step-title">{step.title}</div>
                    <span className={`step-status ${step.status}`}>
                      {step.status === 'processing' ? '⏳ Processing' : '✅ Completed'}
                    </span>
                  </div>
                  <div className="step-body">
                    <div className="agent-discussion">
                      {step.messages.map((msg, msgIndex) => (
                        <div
                          key={msgIndex}
                          className="agent-message"
                          style={{ animationDelay: `${msgIndex * 0.2}s` }}
                        >
                          <div className={`agent-avatar agent-${msg.agent}`}>
                            {getAgentEmoji(msg.agent)}
                          </div>
                          <div className="agent-content">
                            <div className="agent-name">{msg.name}</div>
                            <div className="agent-text">{msg.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {workflowSteps.length > 0 && workflowSteps[workflowSteps.length - 1].status === 'processing' && (
                <div className="workflow-progress">
                  <div className="progress-text">
                    🔄 Workflow in progress...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
