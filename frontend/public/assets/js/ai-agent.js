/**
 * AI Agent Workflow
 * Handles chat interface and AI interactions
 */

(function() {
    'use strict';

    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const emptyState = document.getElementById('emptyState');
    const suggestedPrompts = document.getElementById('suggestedPrompts');

    // Chat history
    let messages = [];

    // Initialize
    function init() {
        // Load chat history from localStorage
        loadChatHistory();

        // Event listeners
        sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keydown', handleKeyPress);
        chatInput.addEventListener('input', autoResize);

        // Suggested prompts
        const promptChips = suggestedPrompts.querySelectorAll('.prompt-chip');
        promptChips.forEach(chip => {
            chip.addEventListener('click', () => {
                chatInput.value = chip.textContent.trim();
                chatInput.focus();
                autoResize();
            });
        });
    }

    // Auto-resize textarea
    function autoResize() {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';

        // Enable/disable send button
        sendBtn.disabled = !chatInput.value.trim();
    }

    // Handle keyboard shortcuts
    function handleKeyPress(e) {
        // Send on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    // Send message
    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Hide empty state
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        // Add user message
        addMessage('user', text);

        // Clear input
        chatInput.value = '';
        autoResize();

        // Show typing indicator
        showTypingIndicator();

        // Show workflow popup
        if (typeof showWorkflow === 'function') {
            showWorkflow(text);
        }

        // Simulate AI processing (wait for workflow to complete)
        setTimeout(() => {
            hideTypingIndicator();
            processAIResponse(text);
        }, 7000); // Total workflow time ~7 seconds
    }

    // Add message to chat
    function addMessage(type, text, time = new Date()) {
        const message = {
            type,
            text,
            time: time.toISOString()
        };

        messages.push(message);
        saveChatHistory();
        renderMessage(message);
    }

    // Render a single message
    function renderMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.type}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = message.type === 'user' ? '👤' : '🤖';

        const content = document.createElement('div');
        content.className = 'message-content';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = message.text;

        const timeEl = document.createElement('div');
        timeEl.className = 'message-time';
        timeEl.textContent = formatTime(new Date(message.time));

        content.appendChild(bubble);
        content.appendChild(timeEl);

        messageEl.appendChild(avatar);
        messageEl.appendChild(content);

        // Insert before typing indicator if it exists
        const typingIndicator = chatMessages.querySelector('.typing-indicator');
        if (typingIndicator) {
            chatMessages.insertBefore(messageEl, typingIndicator);
        } else {
            chatMessages.appendChild(messageEl);
        }

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Show typing indicator
    function showTypingIndicator() {
        let indicator = chatMessages.querySelector('.typing-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'typing-indicator';
            indicator.innerHTML = `
                <div class="message-avatar" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">🤖</div>
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            `;
            chatMessages.appendChild(indicator);
        }
        indicator.classList.add('active');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Hide typing indicator
    function hideTypingIndicator() {
        const indicator = chatMessages.querySelector('.typing-indicator');
        if (indicator) {
            indicator.classList.remove('active');
        }
    }

    // Process AI response (Real Ollama Integration)
    async function processAIResponse(userMessage) {
        try {
            // Get tasks data for context
            const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');

            // Call backend API
            const response = await fetch('http://localhost:8001/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userMessage,
                    model: 'llama3.1', // Better Thai language support
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
                addMessage('ai', data.response);
            } else {
                throw new Error(data.error || 'Unknown error');
            }

        } catch (error) {
            console.error('AI API Error:', error);
            // Fallback to local analysis if API fails
            const fallbackResponse = getFallbackResponse(userMessage);
            addMessage('ai', `⚠️ ไม่สามารถเชื่อมต่อกับ AI ได้ กำลังใช้โหมดออฟไลน์...\n\n${fallbackResponse}`);
        }
    }

    // Fallback response when AI API is not available
    function getFallbackResponse(userMessage) {
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
    }

    // Analysis functions (simulate data analysis)
    function analyzeProjectStatistics() {
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const total = tasks.length;
        const done = tasks.filter(t => t.status === 'done').length;
        const inProgress = tasks.filter(t => t.status === 'in-progress').length;
        const todo = tasks.filter(t => t.status === 'to-do').length;
        const backlog = tasks.filter(t => t.status === 'backlog').length;

        return `📊 สถิติโปรเจคปัจจุบัน:\n\n✅ เสร็จสมบูรณ์: ${done} tasks (${Math.round(done/total*100)}%)\n🔄 กำลังดำเนินการ: ${inProgress} tasks\n📋 รอดำเนินการ: ${todo} tasks\n📦 Backlog: ${backlog} tasks\n\nรวมทั้งหมด ${total} tasks\n\nผลงานดีมากครับ! ${done > total/2 ? 'ทีมทำงานได้มากกว่าครึ่งแล้ว 🎉' : 'ยังมีงานอีกเยอะ ลุยกันต่อ! 💪'}`;
    }

    function findOverdueTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const now = new Date();
        const overdue = tasks.filter(t => {
            if (t.dueDate && t.status !== 'done') {
                return new Date(t.dueDate) < now;
            }
            return false;
        });

        if (overdue.length === 0) {
            return '🎉 ยินดีด้วย! ไม่มี task ที่เกินกำหนดเลยครับ';
        }

        let response = `⚠️ พบ ${overdue.length} tasks ที่เกินกำหนด:\n\n`;
        overdue.slice(0, 5).forEach((task, i) => {
            response += `${i+1}. ${task.title}\n   กำหนด: ${formatDate(task.dueDate)}\n`;
        });

        if (overdue.length > 5) {
            response += `\n...และอีก ${overdue.length - 5} tasks`;
        }

        return response;
    }

    function summarizeActivities() {
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const recentTasks = tasks.slice(-5).reverse();

        let response = '📝 กิจกรรมล่าสุด:\n\n';

        if (recentTasks.length === 0) {
            return 'ยังไม่มีกิจกรรมในระบบครับ เริ่มสร้าง task แรกกันเลย! 🚀';
        }

        recentTasks.forEach((task, i) => {
            const statusEmoji = {
                'backlog': '📦',
                'to-do': '📋',
                'in-progress': '🔄',
                'done': '✅'
            }[task.status] || '📌';

            response += `${i+1}. ${statusEmoji} ${task.title}\n`;
        });

        return response;
    }

    function suggestPriorities() {
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'done');

        if (highPriority.length === 0) {
            return '✨ คุณไม่มี task ที่มี priority สูงที่ค้างอยู่ครับ!\n\nแนะนำให้:\n1. ทบทวน backlog\n2. วางแผนงานสัปดาห์หน้า\n3. ปรับปรุงเอกสาร';
        }

        let response = '💡 แนะนำให้ทำงานเหล่านี้ก่อน:\n\n';
        highPriority.slice(0, 3).forEach((task, i) => {
            response += `${i+1}. 🔥 ${task.title}\n`;
        });

        return response;
    }

    // Format time
    function formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Format date
    function formatDate(dateStr) {
        if (!dateStr) return 'ไม่ระบุ';
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH');
    }

    // Save chat history
    function saveChatHistory() {
        localStorage.setItem('aiChatHistory', JSON.stringify(messages));
    }

    // Load chat history
    function loadChatHistory() {
        const saved = localStorage.getItem('aiChatHistory');
        if (saved) {
            messages = JSON.parse(saved);
            if (messages.length > 0) {
                emptyState.style.display = 'none';
                messages.forEach(msg => renderMessage(msg));
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
