// Socket.io connection
const socket = io();

// World coordinates - fixed size for all players
const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1200;

// Game state
let currentPlayer = null;
let otherPlayers = new Map();
let keys = {};
let currentChatMode = 'global';
let currentRoom = 'lobby';
let furniture = [];
let animationFrame = 0;
let sidebarCollapsed = false;
let mouseX = 0;
let mouseY = 0;
let hoveredPlayer = null;
let targetPosition = null; // For click-to-move

// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Coordinate conversion functions
function worldToScreen(worldX, worldY) {
  const sidebarWidth = sidebarCollapsed ? 60 : 250;
  const gameWidth = canvas.width - sidebarWidth;
  const gameHeight = canvas.height;

  const scaleX = gameWidth / WORLD_WIDTH;
  const scaleY = gameHeight / WORLD_HEIGHT;

  // Use uniform scaling to maintain aspect ratio
  const scale = Math.min(scaleX, scaleY);

  return {
    x: worldX * scale,
    y: worldY * scale,
    scale: scale
  };
}

function screenToWorld(screenX, screenY) {
  const sidebarWidth = sidebarCollapsed ? 60 : 250;
  const gameWidth = canvas.width - sidebarWidth;
  const gameHeight = canvas.height;

  const scaleX = gameWidth / WORLD_WIDTH;
  const scaleY = gameHeight / WORLD_HEIGHT;
  const scale = Math.min(scaleX, scaleY);

  return {
    x: screenX / scale,
    y: screenY / scale
  };
}

// Resize canvas
function resizeCanvas() {
  const container = document.getElementById('game-container');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  console.log('📐 Canvas resized to:', canvas.width, 'x', canvas.height);
}

// Initial resize
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Force resize after a short delay to ensure DOM is ready
setTimeout(resizeCanvas, 100);
setTimeout(resizeCanvas, 500);

// DOM elements
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const usernameInput = document.getElementById('username-input');
const roomSelect = document.getElementById('room-select');
const joinBtn = document.getElementById('join-btn');
const chatInput = document.getElementById('chat-input');
const micBtn = document.getElementById('mic-btn');
const translateBtn = document.getElementById('translate-btn');
const historyBtn = document.getElementById('history-btn');
const roomListBtn = document.getElementById('room-list-btn');
const roomModal = document.getElementById('room-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const historyModal = document.getElementById('history-modal');
const closeHistoryBtn = document.getElementById('close-history-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const fontSizeSlider = document.getElementById('font-size-slider');
const fontSizeValue = document.getElementById('font-size-value');
const bubbleWidthSlider = document.getElementById('bubble-width-slider');
const bubbleWidthValue = document.getElementById('bubble-width-value');
const displayTimeSlider = document.getElementById('display-time-slider');
const displayTimeValue = document.getElementById('display-time-value');

// Chat history storage
let chatHistory = JSON.parse(localStorage.getItem('virtualOfficeChatHistory') || '[]');

// Chat bubble settings
let chatSettings = JSON.parse(localStorage.getItem('virtualOfficeChatSettings') || JSON.stringify({
  fontSize: 18,
  bubbleWidth: 250,
  displayTime: 5
}));

// Voice chat state
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

// Player class
class Player {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.x = data.x;
    this.y = data.y;
    this.color = data.color;
    this.room = data.room;
    this.direction = data.direction || 'down';
    this.width = 32;
    this.height = 48;
    this.speed = 2.5;
    this.isMoving = false;
    this.walkFrame = 0;
    this.chatMessage = null;
    this.chatTimeout = null;
  }

  showChatBubble(message) {
    this.chatMessage = message;

    // Clear existing timeout
    if (this.chatTimeout) {
      clearTimeout(this.chatTimeout);
    }

    // Hide after configured time
    this.chatTimeout = setTimeout(() => {
      this.chatMessage = null;
    }, chatSettings.displayTime * 1000);
  }

  drawCharacter(x, y, direction, isMoving, color, scale = 1) {
    const bodyWidth = 24 * scale;
    const bodyHeight = 30 * scale;
    const headSize = 14 * scale;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + bodyHeight + 5 * scale, bodyWidth * 0.7, 6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(x - bodyWidth/2, y, bodyWidth, bodyHeight);

    // Head
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(x, y - 5 * scale, headSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1 * scale;
    ctx.stroke();

    // Hair/Hat
    ctx.fillStyle = this.getHairColor(color);
    ctx.beginPath();
    ctx.arc(x, y - 8 * scale, headSize * 0.9, Math.PI, 2 * Math.PI);
    ctx.fill();

    // Face
    const faceY = y - 5 * scale;
    ctx.fillStyle = '#333';

    // Eyes based on direction
    if (direction === 'down' || direction === 'up') {
      ctx.fillRect(x - 5 * scale, faceY - 2 * scale, 3 * scale, 2 * scale);
      ctx.fillRect(x + 2 * scale, faceY - 2 * scale, 3 * scale, 2 * scale);
    } else if (direction === 'left') {
      ctx.fillRect(x - 3 * scale, faceY - 2 * scale, 2 * scale, 2 * scale);
      ctx.fillRect(x + 2 * scale, faceY - 2 * scale, 2 * scale, 2 * scale);
    } else if (direction === 'right') {
      ctx.fillRect(x - 4 * scale, faceY - 2 * scale, 2 * scale, 2 * scale);
      ctx.fillRect(x + 1 * scale, faceY - 2 * scale, 2 * scale, 2 * scale);
    }

    // Arms
    ctx.strokeStyle = color;
    ctx.lineWidth = 5 * scale;
    ctx.lineCap = 'round';

    const armOffset = isMoving ? Math.sin(this.walkFrame * 0.3) * 5 * scale : 0;

    // Left arm
    ctx.beginPath();
    ctx.moveTo(x - bodyWidth/2, y + 5 * scale);
    ctx.lineTo(x - bodyWidth/2 - 3 * scale, y + 15 * scale + armOffset);
    ctx.stroke();

    // Right arm
    ctx.beginPath();
    ctx.moveTo(x + bodyWidth/2, y + 5 * scale);
    ctx.lineTo(x + bodyWidth/2 + 3 * scale, y + 15 * scale - armOffset);
    ctx.stroke();

    // Legs
    ctx.lineWidth = 6 * scale;
    const legOffset = isMoving ? Math.sin(this.walkFrame * 0.3) * 6 * scale : 0;

    // Left leg
    ctx.beginPath();
    ctx.moveTo(x - 6 * scale, y + bodyHeight);
    ctx.lineTo(x - 6 * scale, y + bodyHeight + 10 * scale + legOffset);
    ctx.stroke();

    // Right leg
    ctx.beginPath();
    ctx.moveTo(x + 6 * scale, y + bodyHeight);
    ctx.lineTo(x + 6 * scale, y + bodyHeight + 10 * scale - legOffset);
    ctx.stroke();
  }

  getHairColor(bodyColor) {
    const colors = ['#2c1810', '#6b4423', '#8b6f47', '#3d2817', '#1a0f08'];
    let hash = 0;
    for (let i = 0; i < bodyColor.length; i++) {
      hash = bodyColor.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  draw(isCurrentPlayer = false, showUsername = false) {
    // Convert world coordinates to screen coordinates
    const screen = worldToScreen(this.x, this.y);
    const screenX = screen.x;
    const screenY = screen.y;
    const scale = Math.max(0.01, screen.scale); // Ensure scale is positive

    // Draw character
    this.drawCharacter(screenX, screenY - this.height/2 * scale, this.direction, this.isMoving, this.color, scale);

    // Draw selection indicator for current player
    if (isCurrentPlayer) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 25 * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw username only when hovered
    if (showUsername) {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      ctx.font = `bold ${13 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.strokeText(this.username, screenX, screenY + 20 * scale);
      ctx.fillText(this.username, screenX, screenY + 20 * scale);
    }

    // Draw chat bubble if there's a message
    if (this.chatMessage) {
      this.drawChatBubble(this.chatMessage, screenX, screenY, scale);
    }

    // Draw proximity chat indicator for current player
    if (isCurrentPlayer && currentChatMode === 'proximity') {
      ctx.strokeStyle = 'rgba(255, 165, 0, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(screenX, screenY, 200 * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  drawChatBubble(message, screenX, screenY, scale = 1) {
    const padding = 10 * scale;
    const maxWidth = chatSettings.bubbleWidth * scale;
    const fontSize = chatSettings.fontSize * scale;

    ctx.font = `${fontSize}px Arial`;

    // Wrap text
    const words = message.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth - padding * 2) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    const bubbleWidth = Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2;
    const bubbleHeight = lines.length * (fontSize + 4 * scale) + padding * 2;
    const bubbleX = screenX - bubbleWidth / 2;
    const bubbleY = screenY - 80 * scale - bubbleHeight;

    // Draw bubble background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2 * scale;

    // Rounded rectangle
    const radius = 10 * scale;
    ctx.beginPath();
    ctx.moveTo(bubbleX + radius, bubbleY);
    ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
    ctx.lineTo(bubbleX, bubbleY + radius);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw tail
    ctx.beginPath();
    ctx.moveTo(screenX - 10 * scale, bubbleY + bubbleHeight);
    ctx.lineTo(screenX, screenY - 65 * scale);
    ctx.lineTo(screenX + 10 * scale, bubbleY + bubbleHeight);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fill();
    ctx.stroke();

    // Draw text
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    lines.forEach((line, i) => {
      ctx.fillText(line, screenX, bubbleY + padding + i * (fontSize + 4 * scale));
    });
  }

  checkCollision(newX, newY) {
    const playerRadius = 12;

    for (let obj of furniture) {
      if (newX + playerRadius > obj.x &&
          newX - playerRadius < obj.x + obj.width &&
          newY + playerRadius > obj.y &&
          newY - playerRadius < obj.y + obj.height) {
        return true;
      }
    }
    return false;
  }

  update() {
    let moved = false;
    const oldX = this.x;
    const oldY = this.y;
    const oldDirection = this.direction;
    let newX = this.x;
    let newY = this.y;

    // Priority 1: Move to target position (click-to-move)
    if (targetPosition) {
      const dx = targetPosition.x - this.x;
      const dy = targetPosition.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        // Move towards target
        const moveX = (dx / distance) * this.speed;
        const moveY = (dy / distance) * this.speed;

        newX = this.x + moveX;
        newY = this.y + moveY;

        // Update direction based on movement
        if (Math.abs(dx) > Math.abs(dy)) {
          this.direction = dx > 0 ? 'right' : 'left';
        } else {
          this.direction = dy > 0 ? 'down' : 'up';
        }

        moved = true;
      } else {
        // Reached target
        targetPosition = null;
      }
    }
    // Priority 2: WASD controls (fallback)
    else {
      if (keys['w'] || keys['arrowup']) {
        newY -= this.speed;
        this.direction = 'up';
        moved = true;
      }
      if (keys['s'] || keys['arrowdown']) {
        newY += this.speed;
        this.direction = 'down';
        moved = true;
      }
      if (keys['a'] || keys['arrowleft']) {
        newX -= this.speed;
        this.direction = 'left';
        moved = true;
      }
      if (keys['d'] || keys['arrowright']) {
        newX += this.speed;
        this.direction = 'right';
        moved = true;
      }

      // Cancel target if WASD pressed
      if (moved) {
        targetPosition = null;
      }
    }

    // Check collisions
    if (!this.checkCollision(newX, this.y)) {
      this.x = newX;
    } else if (targetPosition) {
      // If collision while moving to target, cancel target
      targetPosition = null;
    }

    if (!this.checkCollision(this.x, newY)) {
      this.y = newY;
    } else if (targetPosition) {
      // If collision while moving to target, cancel target
      targetPosition = null;
    }

    // Keep player within world bounds
    this.x = Math.max(30, Math.min(WORLD_WIDTH - 30, this.x));
    this.y = Math.max(30, Math.min(WORLD_HEIGHT - 30, this.y));

    // Update animation
    this.isMoving = moved;
    if (this.isMoving) {
      this.walkFrame++;
    } else {
      this.walkFrame = 0;
    }

    // Emit position if moved or direction changed
    if (moved && (oldX !== this.x || oldY !== this.y || oldDirection !== this.direction)) {
      socket.emit('move', {
        x: this.x,
        y: this.y,
        direction: this.direction,
        isMoving: this.isMoving
      });
    }
  }
}

// Join game
joinBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  const room = roomSelect.value;

  if (username.length < 3) {
    alert('ชื่อต้องมีอย่างน้อย 3 ตัวอักษร');
    return;
  }

  // Save to localStorage
  localStorage.setItem('virtualOfficeUsername', username);
  localStorage.setItem('virtualOfficeRoom', room);

  // Get or create persistent userId
  const userId = getUserId();

  socket.emit('join', { username, room, userId });
});

// Generate or get persistent user ID
function getUserId() {
  let userId = localStorage.getItem('virtualOfficeUserId');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('virtualOfficeUserId', userId);
  }
  return userId;
}

// Check for saved login on page load
window.addEventListener('DOMContentLoaded', () => {
  const savedUsername = localStorage.getItem('virtualOfficeUsername');
  const savedRoom = localStorage.getItem('virtualOfficeRoom');

  if (savedUsername) {
    console.log('🔑 Auto-login as:', savedUsername);
    usernameInput.value = savedUsername;

    if (savedRoom) {
      roomSelect.value = savedRoom;
    }

    // Auto-login after a short delay with persistent userId
    setTimeout(() => {
      const userId = getUserId();
      socket.emit('join', {
        username: savedUsername,
        room: savedRoom || 'lobby',
        userId: userId
      });
    }, 500);
  }
});

// Allow enter key to join
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    joinBtn.click();
  }
});

// Socket events
socket.on('init', (data) => {
  console.log('🎮 Init received:', data);
  currentPlayer = new Player(data.player);
  currentRoom = data.player.room;
  console.log('👤 Current player created:', currentPlayer);

  // Add other players
  data.players.forEach(playerData => {
    if (playerData.id !== currentPlayer.id) {
      otherPlayers.set(playerData.id, new Player(playerData));
    }
  });
  console.log('👥 Other players:', otherPlayers.size);

  // Initialize furniture for this room
  initializeFurniture(currentRoom);
  console.log('🪑 Furniture initialized:', furniture.length, 'items');

  // Switch to game screen
  loginScreen.classList.remove('active');
  gameScreen.classList.add('active');

  // Force canvas resize when entering game
  setTimeout(() => {
    resizeCanvas();
  }, 50);

  console.log('✅ Game initialized successfully');
  console.log('Canvas size:', canvas.width, 'x', canvas.height);

  // Focus on canvas for keyboard input
  canvas.focus();
  canvas.tabIndex = 1;

  // Start game loop
  gameLoop();
});

socket.on('playerJoined', (playerData) => {
  if (playerData.id !== currentPlayer.id) {
    otherPlayers.set(playerData.id, new Player(playerData));
    console.log(`👋 ${playerData.username} joined the room`);
  }
});

socket.on('playerMoved', (data) => {
  const player = otherPlayers.get(data.id);
  if (player) {
    player.x = data.x;
    player.y = data.y;
    if (data.direction) player.direction = data.direction;
    if (data.isMoving !== undefined) player.isMoving = data.isMoving;
  }
});

socket.on('playerLeft', (playerId) => {
  const player = otherPlayers.get(playerId);
  if (player) {
    console.log(`👋 ${player.username} left the room`);
    otherPlayers.delete(playerId);
  }
});

socket.on('globalChat', (message) => {
  // Find the player who sent the message and show bubble
  otherPlayers.forEach(player => {
    if (player.username === message.username) {
      player.showChatBubble(message.message);
    }
  });
});

socket.on('proximityChat', (message) => {
  // Find the player who sent the message and show bubble
  otherPlayers.forEach(player => {
    if (player.username === message.username) {
      player.showChatBubble(message.message);
    }
  });
});

socket.on('voiceChat', (message) => {
  // Play the audio
  const audio = new Audio(message.audio);
  audio.play().catch(err => console.error('Failed to play audio:', err));

  // Show visual indicator on the player
  otherPlayers.forEach(player => {
    if (player.username === message.username) {
      player.showChatBubble('🎤 Voice message');
    }
  });

  console.log(`🔊 Playing voice message from ${message.username}`);
});

socket.on('roomChanged', (data) => {
  currentPlayer = new Player(data.player);
  currentRoom = data.player.room;

  // Clear other players
  otherPlayers.clear();

  // Add players in new room
  data.players.forEach(playerData => {
    if (playerData.id !== currentPlayer.id) {
      otherPlayers.set(playerData.id, new Player(playerData));
    }
  });

  // Initialize furniture for new room
  initializeFurniture(currentRoom);

  console.log(`📍 Moved to room: ${currentRoom}`);
});

socket.on('roomList', (rooms) => {
  displayRoomList(rooms);
});

// Keyboard controls
window.addEventListener('keydown', (e) => {
  // Don't capture keys if typing in chat
  if (document.activeElement === chatInput) {
    // Blur chat on Escape
    if (e.key === 'Escape') {
      chatInput.blur();
    }
    return;
  }

  const key = e.key.toLowerCase();
  keys[key] = true;

  // Log movement keys
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
    console.log('⌨️ Key pressed:', key);
  }

  // Focus chat on Enter
  if (e.key === 'Enter') {
    chatInput.focus();
    e.preventDefault();
  }

  // Open room list on R
  if (e.key === 'r' || e.key === 'R') {
    socket.emit('getRooms');
    roomModal.classList.add('active');
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  // Don't capture keys if typing in chat
  if (document.activeElement === chatInput) {
    return;
  }

  keys[e.key.toLowerCase()] = false;
});

// Chat functionality
// Language detection
function detectLanguage(text) {
  const thaiPattern = /[\u0E00-\u0E7F]/;
  return thaiPattern.test(text) ? 'th' : 'en';
}

// Translation/Correction function (using free Google Translate API)
async function translateOrCorrect(text) {
  const lang = detectLanguage(text);

  try {
    let url;
    if (lang === 'th') {
      // Translate Thai to English
      url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=th&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    } else {
      // For English, we'll just return a suggestion (no free grammar API available)
      // In production, you'd use OpenAI API or LanguageTool API
      return {
        original: text,
        result: text,
        suggestion: 'Grammar check requires API key. Original text returned.',
        lang: 'en'
      };
    }

    const response = await fetch(url);
    const data = await response.json();
    const translatedText = data[0]?.[0]?.[0] || text;

    return {
      original: text,
      result: translatedText,
      lang: lang,
      action: lang === 'th' ? 'translated' : 'checked'
    };
  } catch (error) {
    console.error('Translation error:', error);
    return {
      original: text,
      result: text,
      error: 'Translation failed',
      lang: lang
    };
  }
}

// Save chat to history
function saveChatHistory(message, translation = null) {
  const historyItem = {
    id: Date.now(),
    username: currentPlayer ? currentPlayer.username : 'Unknown',
    message: message,
    translation: translation,
    timestamp: new Date().toISOString(),
    room: currentRoom
  };

  chatHistory.unshift(historyItem);

  // Keep only last 100 messages
  if (chatHistory.length > 100) {
    chatHistory = chatHistory.slice(0, 100);
  }

  localStorage.setItem('virtualOfficeChatHistory', JSON.stringify(chatHistory));
}

function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  // Save to history
  saveChatHistory(message);

  // Always send as global chat (visible to everyone in room)
  socket.emit('globalChat', message);

  // Show on own character immediately
  if (currentPlayer) {
    currentPlayer.showChatBubble(message);
  }

  // Clear input and blur to allow WASD movement
  chatInput.value = '';
  chatInput.blur();
}

chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
    e.preventDefault();
  }
});

// Translate button
translateBtn.addEventListener('click', async () => {
  const text = chatInput.value.trim();
  if (!text) {
    alert('กรุณาพิมพ์ข้อความก่อน');
    return;
  }

  translateBtn.classList.add('active');
  translateBtn.textContent = '⏳';

  const result = await translateOrCorrect(text);

  translateBtn.classList.remove('active');
  translateBtn.textContent = '🌐';

  if (result.error) {
    alert('เกิดข้อผิดพลาด: ' + result.error);
    return;
  }

  // Show result
  const lang = result.lang === 'th' ? 'ไทย' : 'อังกฤษ';
  const action = result.action === 'translated' ? 'แปลเป็น' : 'ตรวจสอบ';

  if (result.lang === 'th') {
    const use = confirm(
      `ต้นฉบับ (${lang}): ${result.original}\n\n` +
      `${action}อังกฤษ: ${result.result}\n\n` +
      `ต้องการใช้ข้อความที่แปลแล้วหรือไม่?`
    );

    if (use) {
      chatInput.value = result.result;
      // Save with translation
      saveChatHistory(result.original, result.result);
    }
  } else {
    alert(
      `ต้นฉบับ: ${result.original}\n\n` +
      `หมายเหตุ: ${result.suggestion || 'ข้อความถูกต้องแล้ว'}`
    );
  }
});

// History button
historyBtn.addEventListener('click', () => {
  displayChatHistory();
  historyModal.classList.add('active');
});

closeHistoryBtn.addEventListener('click', () => {
  historyModal.classList.remove('active');
});

// Settings button
settingsBtn.addEventListener('click', () => {
  // Load current settings into sliders
  fontSizeSlider.value = chatSettings.fontSize;
  fontSizeValue.textContent = chatSettings.fontSize;
  bubbleWidthSlider.value = chatSettings.bubbleWidth;
  bubbleWidthValue.textContent = chatSettings.bubbleWidth;
  displayTimeSlider.value = chatSettings.displayTime;
  displayTimeValue.textContent = chatSettings.displayTime;

  settingsModal.classList.add('active');
});

closeSettingsBtn.addEventListener('click', () => {
  settingsModal.classList.remove('active');
});

// Settings sliders
fontSizeSlider.addEventListener('input', (e) => {
  const value = e.target.value;
  fontSizeValue.textContent = value;
  chatSettings.fontSize = parseInt(value);
  localStorage.setItem('virtualOfficeChatSettings', JSON.stringify(chatSettings));
});

bubbleWidthSlider.addEventListener('input', (e) => {
  const value = e.target.value;
  bubbleWidthValue.textContent = value;
  chatSettings.bubbleWidth = parseInt(value);
  localStorage.setItem('virtualOfficeChatSettings', JSON.stringify(chatSettings));
});

displayTimeSlider.addEventListener('input', (e) => {
  const value = e.target.value;
  displayTimeValue.textContent = value;
  chatSettings.displayTime = parseInt(value);
  localStorage.setItem('virtualOfficeChatSettings', JSON.stringify(chatSettings));
});

// Display chat history
function displayChatHistory() {
  const historyList = document.getElementById('history-list');
  historyList.innerHTML = '';

  if (chatHistory.length === 0) {
    historyList.innerHTML = '<p style="text-align:center;color:#999;">ยังไม่มีประวัติแชท</p>';
    return;
  }

  chatHistory.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';

    const time = new Date(item.timestamp).toLocaleString('th-TH');

    div.innerHTML = `
      <div class="history-time">${time}</div>
      <div class="history-user">${item.username} (${item.room})</div>
      <div class="history-message">${item.message}</div>
      ${item.translation ? `<div class="history-translation">📝 แปล: ${item.translation}</div>` : ''}
    `;

    historyList.appendChild(div);
  });
}

// Microphone functionality
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

      // Convert to base64 and send to server
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        const base64Audio = reader.result;
        socket.emit('voiceChat', {
          audio: base64Audio,
          duration: audioChunks.length
        });

        // Show visual indicator
        if (currentPlayer) {
          currentPlayer.showChatBubble('🎤 Voice message');
        }
      };

      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    micBtn.classList.add('active');
    console.log('🎤 Recording started');
  } catch (error) {
    console.error('❌ Microphone access denied:', error);
    alert('ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้งานไมโครโฟน');
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    micBtn.classList.remove('active');
    console.log('🎤 Recording stopped');
  }
}

// Mouse events for mic button (hold to speak)
micBtn.addEventListener('mousedown', () => {
  startRecording();
});

micBtn.addEventListener('mouseup', () => {
  stopRecording();
});

micBtn.addEventListener('mouseleave', () => {
  if (isRecording) {
    stopRecording();
  }
});

// Touch events for mobile
micBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  startRecording();
});

micBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  stopRecording();
});

// Canvas click detection
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Check if clicked on hamburger button
  if (canvas.hamburgerBounds) {
    const btn = canvas.hamburgerBounds;
    if (x >= btn.x && x <= btn.x + btn.width &&
        y >= btn.y && y <= btn.y + btn.height) {
      sidebarCollapsed = !sidebarCollapsed;
      console.log('🍔 Sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
      return;
    }
  }

  // Check if clicked on room button (only when expanded)
  if (!sidebarCollapsed && canvas.roomButtonBounds) {
    const btn = canvas.roomButtonBounds;
    if (x >= btn.x && x <= btn.x + btn.width &&
        y >= btn.y && y <= btn.y + btn.height) {
      socket.emit('getRooms');
      roomModal.classList.add('active');
      return;
    }
  }

  // Check if clicked on logout button (only when expanded)
  if (!sidebarCollapsed && canvas.logoutButtonBounds) {
    const btn = canvas.logoutButtonBounds;
    if (x >= btn.x && x <= btn.x + btn.width &&
        y >= btn.y && y <= btn.y + btn.height) {
      // Logout
      if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        // Emit logout event to server
        socket.emit('logout');

        // Clear all saved data
        localStorage.removeItem('virtualOfficeUsername');
        localStorage.removeItem('virtualOfficeRoom');
        localStorage.removeItem('virtualOfficeUserId');

        // Return to login screen
        gameScreen.classList.remove('active');
        loginScreen.classList.add('active');

        // Reset game state
        currentPlayer = null;
        otherPlayers.clear();
        keys = {};

        console.log('👋 Logged out successfully');
      }
      return;
    }
  }

  // Click-to-move: convert screen coordinates to world coordinates
  const sidebarWidth = sidebarCollapsed ? 60 : 250;

  // Check if click is in game area (not on sidebar)
  if (x < canvas.width - sidebarWidth && currentPlayer) {
    const worldPos = screenToWorld(x, y);
    targetPosition = {
      x: Math.max(30, Math.min(WORLD_WIDTH - 30, worldPos.x)),
      y: Math.max(30, Math.min(WORLD_HEIGHT - 30, worldPos.y))
    };
    console.log('🎯 Moving to:', targetPosition);
  }
});

// Mouse move for hover detection
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;

  // Convert to world coordinates for hover detection
  const worldPos = screenToWorld(mouseX, mouseY);

  // Check if hovering over any player
  hoveredPlayer = null;

  if (currentPlayer) {
    const dist = Math.sqrt(
      Math.pow(currentPlayer.x - worldPos.x, 2) +
      Math.pow(currentPlayer.y - worldPos.y, 2)
    );
    if (dist < 30) {
      hoveredPlayer = currentPlayer;
    }
  }

  if (!hoveredPlayer) {
    otherPlayers.forEach(player => {
      const dist = Math.sqrt(
        Math.pow(player.x - worldPos.x, 2) +
        Math.pow(player.y - worldPos.y, 2)
      );
      if (dist < 30) {
        hoveredPlayer = player;
      }
    });
  }
});

// Room management (keeping for compatibility but not used)
if (roomListBtn) {
  roomListBtn.addEventListener('click', () => {
    socket.emit('getRooms');
    roomModal.classList.add('active');
  });
}

closeModalBtn.addEventListener('click', () => {
  roomModal.classList.remove('active');
});

function displayRoomList(rooms) {
  const roomsList = document.getElementById('rooms-list');
  roomsList.innerHTML = '';

  rooms.forEach(room => {
    const roomEl = document.createElement('div');
    roomEl.className = 'room-item';
    roomEl.innerHTML = `
      <span class="room-name">${getRoomEmoji(room.name)} ${room.name}</span>
      <span class="room-count">${room.playerCount} คน</span>
    `;

    if (room.name !== currentRoom) {
      roomEl.addEventListener('click', () => {
        socket.emit('changeRoom', room.name);
        roomModal.classList.remove('active');
      });
    } else {
      roomEl.style.background = '#667eea';
      roomEl.style.color = 'white';
      roomEl.style.cursor = 'default';
    }

    roomsList.appendChild(roomEl);
  });
}

function getRoomEmoji(roomName) {
  const emojis = {
    'lobby': '🏠',
    'meeting-room': '🎯',
    'lounge': '☕'
  };
  return emojis[roomName] || '🚪';
}

// UI is now drawn on canvas - no need for DOM updates

// Initialize furniture based on room (using world coordinates 1600x1200)
function initializeFurniture(room) {
  furniture = [];

  if (room === 'lobby') {
    // Lobby furniture in world coordinates
    furniture.push(
      { x: 200, y: 200, width: 120, height: 60, type: 'desk', color: '#8B4513' },
      { x: 200, y: 260, width: 40, height: 40, type: 'chair', color: '#654321' },
      { x: 500, y: 300, width: 120, height: 60, type: 'desk', color: '#8B4513' },
      { x: 500, y: 360, width: 40, height: 40, type: 'chair', color: '#654321' },
      { x: 900, y: 200, width: 60, height: 60, type: 'plant', color: '#228B22' },
      { x: 100, y: 600, width: 60, height: 60, type: 'plant', color: '#228B22' },
      { x: 700, y: 500, width: 150, height: 80, type: 'table', color: '#A0522D' }
    );
  } else if (room === 'meeting-room') {
    // Meeting room furniture in world coordinates
    furniture.push(
      { x: 400, y: 400, width: 300, height: 150, type: 'conference-table', color: '#654321' },
      { x: 370, y: 360, width: 40, height: 40, type: 'chair', color: '#8B4513' },
      { x: 690, y: 360, width: 40, height: 40, type: 'chair', color: '#8B4513' },
      { x: 370, y: 540, width: 40, height: 40, type: 'chair', color: '#8B4513' },
      { x: 690, y: 540, width: 40, height: 40, type: 'chair', color: '#8B4513' },
      { x: 150, y: 200, width: 60, height: 60, type: 'plant', color: '#228B22' },
      { x: 900, y: 200, width: 60, height: 60, type: 'plant', color: '#228B22' }
    );
  } else if (room === 'lounge') {
    // Lounge furniture in world coordinates
    furniture.push(
      { x: 300, y: 300, width: 150, height: 120, type: 'sofa', color: '#4A4A4A' },
      { x: 650, y: 300, width: 150, height: 120, type: 'sofa', color: '#4A4A4A' },
      { x: 450, y: 500, width: 120, height: 120, type: 'coffee-table', color: '#8B4513' },
      { x: 100, y: 200, width: 60, height: 60, type: 'plant', color: '#228B22' },
      { x: 900, y: 600, width: 80, height: 80, type: 'vending-machine', color: '#C41E3A' }
    );
  }
}

// Draw furniture
function drawFurniture() {
  furniture.forEach(obj => {
    ctx.save();

    // Convert world coordinates to screen coordinates
    const screen = worldToScreen(obj.x, obj.y);
    const screenX = screen.x;
    const screenY = screen.y;
    const scale = Math.max(0.01, screen.scale);
    const screenWidth = Math.max(1, obj.width * scale);
    const screenHeight = Math.max(1, obj.height * scale);

    if (obj.type === 'desk' || obj.type === 'table' || obj.type === 'conference-table' || obj.type === 'coffee-table') {
      // Draw desk/table
      ctx.fillStyle = obj.color;
      ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);

      // Table surface highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(screenX + 5 * scale, screenY + 5 * scale, screenWidth - 10 * scale, screenHeight / 3);
    } else if (obj.type === 'chair') {
      // Draw chair
      ctx.fillStyle = obj.color;
      ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
      ctx.fillRect(screenX + 5 * scale, screenY - 10 * scale, screenWidth - 10 * scale, 10 * scale);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
    } else if (obj.type === 'plant') {
      // Draw plant
      const potWidth = Math.max(1, 16 * scale);
      const potHeight = Math.max(1, 15 * scale);
      const radius = Math.max(1, screenWidth/2);

      ctx.fillStyle = '#8B4513';
      ctx.fillRect(screenX + screenWidth/2 - 8 * scale, screenY + screenHeight - 15 * scale, potWidth, potHeight);
      ctx.fillStyle = obj.color;
      ctx.beginPath();
      ctx.arc(screenX + screenWidth/2, screenY + screenHeight/2, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a5f1a';
      ctx.lineWidth = Math.max(1, 2 * scale);
      ctx.stroke();
    } else if (obj.type === 'sofa') {
      // Draw sofa
      ctx.fillStyle = obj.color;
      ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
      ctx.fillRect(screenX - 10 * scale, screenY, 10 * scale, screenHeight);
      ctx.fillRect(screenX + screenWidth, screenY, 10 * scale, screenHeight);
      ctx.fillRect(screenX - 10 * scale, screenY - 10 * scale, screenWidth + 20 * scale, 10 * scale);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
    } else if (obj.type === 'vending-machine') {
      // Draw vending machine
      ctx.fillStyle = obj.color;
      ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
      ctx.fillStyle = '#333';
      ctx.fillRect(screenX + 10 * scale, screenY + 10 * scale, screenWidth - 20 * scale, screenHeight - 30 * scale);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
    }

    ctx.restore();
  });
}

// Draw UI overlay - Right sidebar
function drawUI() {
  const sidebarWidth = sidebarCollapsed ? 60 : 250;
  const sidebarX = canvas.width - sidebarWidth;

  // Draw sidebar background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillRect(sidebarX, 0, sidebarWidth, canvas.height);
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 3;
  ctx.strokeRect(sidebarX, 0, sidebarWidth, canvas.height);

  // Draw hamburger menu button
  const hamburgerSize = 40;
  const hamburgerX = sidebarX + 10;
  const hamburgerY = 10;

  // Button background
  ctx.fillStyle = '#667eea';
  ctx.fillRect(hamburgerX, hamburgerY, hamburgerSize, hamburgerSize);
  ctx.strokeStyle = '#5568d3';
  ctx.lineWidth = 2;
  ctx.strokeRect(hamburgerX, hamburgerY, hamburgerSize, hamburgerSize);

  // Hamburger icon (3 lines)
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const lineWidth = 24;
  const centerX = hamburgerX + hamburgerSize / 2;
  const centerY = hamburgerY + hamburgerSize / 2;

  ctx.beginPath();
  ctx.moveTo(centerX - lineWidth / 2, centerY - 8);
  ctx.lineTo(centerX + lineWidth / 2, centerY - 8);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - lineWidth / 2, centerY);
  ctx.lineTo(centerX + lineWidth / 2, centerY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - lineWidth / 2, centerY + 8);
  ctx.lineTo(centerX + lineWidth / 2, centerY + 8);
  ctx.stroke();

  // Store hamburger button bounds
  canvas.hamburgerBounds = { x: hamburgerX, y: hamburgerY, width: hamburgerSize, height: hamburgerSize };

  // If collapsed, only show hamburger
  if (sidebarCollapsed) {
    canvas.sidebarBounds = { x: sidebarX, width: sidebarWidth };
    return;
  }

  let yOffset = 30;

  // Room name section
  ctx.fillStyle = '#667eea';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('ห้อง', sidebarX + 20, yOffset);

  yOffset += 30;
  const roomEmoji = getRoomEmoji(currentRoom);
  ctx.fillStyle = '#333';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(`${roomEmoji} ${currentRoom}`, sidebarX + 20, yOffset);

  yOffset += 40;

  // Player count section
  ctx.fillStyle = '#667eea';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('ผู้เล่น', sidebarX + 20, yOffset);

  yOffset += 30;
  const playerCount = otherPlayers.size + 1;
  ctx.fillStyle = '#333';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(`👥 ${playerCount} คน`, sidebarX + 20, yOffset);

  yOffset += 50;

  // Controls section
  ctx.fillStyle = '#667eea';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('ควบคุม', sidebarX + 20, yOffset);

  yOffset += 30;
  ctx.fillStyle = '#555';
  ctx.font = '13px Arial';
  ctx.fillText('🎮 WASD - เดิน', sidebarX + 20, yOffset);
  yOffset += 25;
  ctx.fillText('💬 Enter - แชท', sidebarX + 20, yOffset);
  yOffset += 25;
  ctx.fillText('🎤 ไมค์ - พูด', sidebarX + 20, yOffset);
  yOffset += 25;
  ctx.fillText('🚪 R - เปลี่ยนห้อง', sidebarX + 20, yOffset);

  yOffset += 50;

  // Change room button
  const btnWidth = 200;
  const btnHeight = 45;
  const btnX = sidebarX + 25;
  const btnY = yOffset;

  // Button background
  ctx.fillStyle = '#667eea';
  ctx.fillRect(btnX, btnY, btnWidth, btnHeight);

  // Button border
  ctx.strokeStyle = '#5568d3';
  ctx.lineWidth = 3;
  ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);

  // Button text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🚪 เปลี่ยนห้อง', btnX + btnWidth / 2, btnY + btnHeight / 2);

  // Store button position
  canvas.roomButtonBounds = { x: btnX, y: btnY, width: btnWidth, height: btnHeight };

  yOffset += 70;

  // Logout button
  const logoutBtnY = yOffset;

  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(btnX, logoutBtnY, btnWidth, btnHeight);

  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 3;
  ctx.strokeRect(btnX, logoutBtnY, btnWidth, btnHeight);

  ctx.fillStyle = 'white';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🚪 ออกจากระบบ', btnX + btnWidth / 2, logoutBtnY + btnHeight / 2);

  // Store logout button position
  canvas.logoutButtonBounds = { x: btnX, y: logoutBtnY, width: btnWidth, height: btnHeight };

  // Store sidebar position
  canvas.sidebarBounds = { x: sidebarX, width: sidebarWidth };
}

// Game loop
let frameCount = 0;
function gameLoop() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw floor tiles
  drawFloor();

  // Draw furniture
  drawFurniture();

  // Update and draw current player
  if (currentPlayer) {
    currentPlayer.update();
    const showCurrentPlayerName = hoveredPlayer && hoveredPlayer.id === currentPlayer.id;
    currentPlayer.draw(true, showCurrentPlayerName);

    // Debug log every 60 frames (once per second at 60fps)
    if (frameCount % 60 === 0) {
      console.log('🎨 Drawing player at:', currentPlayer.x, currentPlayer.y, 'Direction:', currentPlayer.direction);
    }
  } else {
    if (frameCount % 60 === 0) {
      console.warn('⚠️ No current player to draw!');
    }
  }

  // Draw other players
  otherPlayers.forEach(player => {
    const showName = hoveredPlayer && hoveredPlayer.id === player.id;
    player.draw(false, showName);

    // Draw proximity indicator if in proximity chat mode
    if (currentChatMode === 'proximity' && currentPlayer) {
      const distance = Math.sqrt(
        Math.pow(currentPlayer.x - player.x, 2) +
        Math.pow(currentPlayer.y - player.y, 2)
      );

      if (distance <= 200) {
        const screen = worldToScreen(player.x, player.y);
        const scale = screen.scale;
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 200 * scale, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });

  // Draw target position indicator
  if (targetPosition) {
    const screen = worldToScreen(targetPosition.x, targetPosition.y);
    const scale = screen.scale;

    // Draw pulsing circle
    const pulseSize = 15 + Math.sin(frameCount * 0.1) * 5;
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, pulseSize * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Draw crosshair
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    const size = 10 * scale;
    ctx.beginPath();
    ctx.moveTo(screen.x - size, screen.y);
    ctx.lineTo(screen.x + size, screen.y);
    ctx.moveTo(screen.x, screen.y - size);
    ctx.lineTo(screen.x, screen.y + size);
    ctx.stroke();
  }

  // Draw UI overlay on top
  drawUI();

  frameCount++;
  requestAnimationFrame(gameLoop);
}

function drawFloor() {
  const worldTileSize = 50;
  const sidebarWidth = sidebarCollapsed ? 60 : 250;
  const gameWidth = canvas.width - sidebarWidth;
  const gameHeight = canvas.height;

  const scaleX = gameWidth / WORLD_WIDTH;
  const scaleY = gameHeight / WORLD_HEIGHT;
  const scale = Math.min(scaleX, scaleY);

  for (let x = 0; x < WORLD_WIDTH; x += worldTileSize) {
    for (let y = 0; y < WORLD_HEIGHT; y += worldTileSize) {
      const screenX = x * scale;
      const screenY = y * scale;
      const screenTileSize = worldTileSize * scale;

      // Alternate tile colors for checkerboard pattern
      const isLight = (Math.floor(x / worldTileSize) + Math.floor(y / worldTileSize)) % 2 === 0;
      ctx.fillStyle = isLight ? '#d4d4d4' : '#c4c4c4';
      ctx.fillRect(screenX, screenY, screenTileSize, screenTileSize);

      // Tile border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX, screenY, screenTileSize, screenTileSize);
    }
  }
}

// Handle disconnection
socket.on('disconnect', () => {
  console.warn('❌ Disconnected from server');
});

socket.on('connect', () => {
  if (currentPlayer) {
    console.log('✅ Reconnected to server');
  }
});
