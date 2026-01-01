// Socket.io connection
const socket = io();

// World coordinates - fixed size for all players (3x3 grid of rooms)
const WORLD_WIDTH = 4800;  // 3 rooms wide (1600 * 3)
const WORLD_HEIGHT = 3600; // 3 rooms tall (1200 * 3)

// Removed grid system - using smooth movement instead

// Game state
let currentPlayer = null;
let otherPlayers = new Map();
let keys = {};
let currentChatMode = 'global';
let currentRoom = 'lobby';
let furniture = [];
let collectibles = []; // Cars and other collectible items
let animationFrame = 0;
let chatPanelOpen = false; // Track if chat panel is open
let chatPanelHeight = 400; // Chat panel height: 400, 600, 800, or 0 (hidden)
let bottomMenuExpanded = false; // Track if bottom gesture menu is expanded
let mouseX = 0;
let mouseY = 0;
let hoveredPlayer = null;
let targetPosition = null; // For click-to-move
let zoomLevel = 1.0; // Zoom level (1.0 = normal, > 1.0 = zoomed in, < 1.0 = zoomed out)
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
let cameraOffsetX = 0; // Camera offset for panning/zoom
let cameraOffsetY = 0;

// Pan/drag variables (pan is now default, auto-detected)
let isPanning = false;
let mouseDownX = 0;
let mouseDownY = 0;
let panStartX = 0;
let panStartY = 0;
let panStartOffsetX = 0;
let panStartOffsetY = 0;
let hasDragged = false;
const DRAG_THRESHOLD = 5; // pixels to distinguish drag from click

// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Coordinate conversion functions with camera offset
function worldToScreen(worldX, worldY) {
  const gameWidth = canvas.width;
  const gameHeight = canvas.height;

  const scaleX = gameWidth / WORLD_WIDTH;
  const scaleY = gameHeight / WORLD_HEIGHT;

  // Use uniform scaling to maintain aspect ratio, apply zoom
  const baseScale = Math.min(scaleX, scaleY);
  const scale = baseScale * zoomLevel;

  // Calculate offset to center the world + camera offset
  const scaledWorldWidth = WORLD_WIDTH * scale;
  const scaledWorldHeight = WORLD_HEIGHT * scale;
  const offsetX = (gameWidth - scaledWorldWidth) / 2 + cameraOffsetX;
  const offsetY = (gameHeight - scaledWorldHeight) / 2 + cameraOffsetY;

  return {
    x: worldX * scale + offsetX,
    y: worldY * scale + offsetY,
    scale: scale
  };
}

function screenToWorld(screenX, screenY) {
  const gameWidth = canvas.width;
  const gameHeight = canvas.height;

  const scaleX = gameWidth / WORLD_WIDTH;
  const scaleY = gameHeight / WORLD_HEIGHT;
  const baseScale = Math.min(scaleX, scaleY);
  const scale = baseScale * zoomLevel;

  // Calculate offset to center the world + camera offset
  const scaledWorldWidth = WORLD_WIDTH * scale;
  const scaledWorldHeight = WORLD_HEIGHT * scale;
  const offsetX = (gameWidth - scaledWorldWidth) / 2 + cameraOffsetX;
  const offsetY = (gameHeight - scaledWorldHeight) / 2 + cameraOffsetY;

  return {
    x: (screenX - offsetX) / scale,
    y: (screenY - offsetY) / scale
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
const historyBtn = document.getElementById('history-btn');
const roomListBtn = document.getElementById('room-list-btn');
const roomModal = document.getElementById('room-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const historyModal = document.getElementById('history-modal');
const closeHistoryBtn = document.getElementById('close-history-btn');
const fontSizeSlider = document.getElementById('font-size-slider');
const fontSizeValue = document.getElementById('font-size-value');
const bubbleWidthSlider = document.getElementById('bubble-width-slider');
const bubbleWidthValue = document.getElementById('bubble-width-value');
const displayTimeSlider = document.getElementById('display-time-slider');
const displayTimeValue = document.getElementById('display-time-value');

// Create chat overlay button and insert it after mic button
const chatOverlayBtn = document.createElement('button');
chatOverlayBtn.id = 'chat-overlay-btn';
chatOverlayBtn.title = 'เปิด/ปิดแชท';
chatOverlayBtn.textContent = '💬';
chatOverlayBtn.style.cssText = `
  width: 50px;
  height: 50px;
  font-size: 24px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  background: #9C27B0;
  color: white;
  transition: all 0.3s;
  margin: 0 5px;
`;
const chatContainer = document.getElementById('chat-container');
if (chatContainer && micBtn) {
  chatContainer.insertBefore(chatOverlayBtn, micBtn.nextSibling);
}

// Chat overlay button click handler
chatOverlayBtn.addEventListener('click', () => {
  // Cycle through heights: 400 → 600 → 800 → 0 (hidden) → 400
  if (chatPanelHeight === 0) {
    chatPanelHeight = 400;
    chatPanelOpen = true;
  } else if (chatPanelHeight === 400) {
    chatPanelHeight = 600;
  } else if (chatPanelHeight === 600) {
    chatPanelHeight = 800;
  } else if (chatPanelHeight === 800) {
    chatPanelHeight = 0;
    chatPanelOpen = false;
  }

  // Update button style
  if (chatPanelOpen && chatPanelHeight > 0) {
    chatOverlayBtn.style.background = '#667eea';
    chatOverlayBtn.style.boxShadow = '0 0 10px #FFD700';
  } else {
    chatOverlayBtn.style.background = '#9C27B0';
    chatOverlayBtn.style.boxShadow = 'none';
  }

  console.log('💬 Chat panel height:', chatPanelHeight);
});

// Chat history storage
let chatHistory = JSON.parse(localStorage.getItem('virtualOfficeChatHistory') || '[]');

// Chat bubble settings
let chatSettings = JSON.parse(localStorage.getItem('virtualOfficeChatSettings') || JSON.stringify({
  fontSize: 18,
  bubbleWidth: 250,
  displayTime: 5
}));

// Chat messages for sidebar (LINE-style)
let sidebarChatMessages = [];

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
    this.baseSpeed = 5.0;
    this.speed = 5.0; // Smooth movement
    this.hasSpeedBoost = false;
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

    // Draw speed boost indicator
    if (this.hasSpeedBoost) {
      ctx.fillStyle = '#FF4444';
      ctx.font = `${18 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const sparkleY = screenY - 60 * scale + Math.sin(Date.now() * 0.005) * 3 * scale;
      ctx.fillText('🚗💨', screenX, sparkleY);
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
        // Move towards target smoothly
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

    // Check for collectibles collision
    this.checkCollectibles();

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

  checkCollectibles() {
    const playerRadius = 20;

    for (let i = collectibles.length - 1; i >= 0; i--) {
      const item = collectibles[i];

      // Check distance to collectible
      const dx = this.x - (item.x + item.width / 2);
      const dy = this.y - (item.y + item.height / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < playerRadius + item.width / 2) {
        // Collect the item
        if (item.type === 'car' && !this.hasSpeedBoost) {
          this.hasSpeedBoost = true;
          this.speed = this.baseSpeed * 1.5;
          console.log('🚗 Collected car! Speed boost activated:', this.speed);

          // Remove the car from collectibles
          collectibles.splice(i, 1);
        }
      }
    }
  }
}

// Join game
joinBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  // Always join lobby (unified map)
  const room = 'lobby';

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
        room: 'lobby', // Always join lobby (unified map)
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
  // Only add to sidebar if it's NOT from current player (to avoid duplicate)
  if (currentPlayer && message.username !== currentPlayer.username) {
    sidebarChatMessages.push({
      username: message.username,
      message: message.message,
      timestamp: message.timestamp,
      isOwn: false
    });

    // Keep only last 50 messages
    if (sidebarChatMessages.length > 50) {
      sidebarChatMessages.shift();
    }
  }

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

  // Add to sidebar chat (own message)
  sidebarChatMessages.push({
    username: currentPlayer ? currentPlayer.username : 'You',
    message: message,
    timestamp: new Date(),
    isOwn: true
  });

  // Keep only last 50 messages
  if (sidebarChatMessages.length > 50) {
    sidebarChatMessages.shift();
  }

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
// History button
historyBtn.addEventListener('click', () => {
  displayChatHistory();
  historyModal.classList.add('active');
});

closeHistoryBtn.addEventListener('click', () => {
  historyModal.classList.remove('active');
});

// Settings sliders (still functional but hidden from UI)
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

// Mouse down - prepare for either pan or click-to-move
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) { // Left mouse button
    mouseDownX = e.clientX;
    mouseDownY = e.clientY;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panStartOffsetX = cameraOffsetX;
    panStartOffsetY = cameraOffsetY;
    hasDragged = false;
  } else if (e.button === 1) { // Middle mouse button - always pan
    e.preventDefault();
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panStartOffsetX = cameraOffsetX;
    panStartOffsetY = cameraOffsetY;
    canvas.style.cursor = 'grabbing';
  }
});

// Mouse move - detect drag for panning
canvas.addEventListener('mousemove', (e) => {
  if (e.buttons === 1 && !isPanning) { // Left button held
    const deltaX = Math.abs(e.clientX - mouseDownX);
    const deltaY = Math.abs(e.clientY - mouseDownY);

    // If moved more than threshold, start panning
    if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
      isPanning = true;
      hasDragged = true;
      canvas.style.cursor = 'grabbing';
    }
  }

  if (isPanning) {
    const deltaX = e.clientX - panStartX;
    const deltaY = e.clientY - panStartY;
    cameraOffsetX = panStartOffsetX + deltaX;
    cameraOffsetY = panStartOffsetY + deltaY;
  }
});

// Mouse up - end panning
canvas.addEventListener('mouseup', (e) => {
  if (isPanning) {
    isPanning = false;
    canvas.style.cursor = 'default';
  }
});

// Mouse leave - stop panning
canvas.addEventListener('mouseleave', () => {
  if (isPanning) {
    isPanning = false;
    canvas.style.cursor = 'default';
  }
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

  // Check if clicked on bottom gesture
  if (canvas.gestureBounds) {
    const btn = canvas.gestureBounds;
    if (x >= btn.x && x <= btn.x + btn.width &&
        y >= btn.y && y <= btn.y + btn.height) {
      bottomMenuExpanded = !bottomMenuExpanded;
      console.log('🎯 Bottom menu', bottomMenuExpanded ? 'expanded' : 'collapsed');
      return;
    }
  }


  // Check if clicked on room button (when bottom menu is expanded)
  if (canvas.roomButtonBounds) {
    const btn = canvas.roomButtonBounds;
    if (x >= btn.x && x <= btn.x + btn.width &&
        y >= btn.y && y <= btn.y + btn.height) {
      socket.emit('getRooms');
      roomModal.classList.add('active');
      return;
    }
  }

  // Click-to-move: only if didn't drag (drag = pan, click = move)
  if (currentPlayer && !hasDragged) {
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

// Mouse wheel for zoom (with Ctrl/Command key only, like diagram editor)
canvas.addEventListener('wheel', (e) => {
  // Only zoom if Ctrl (Windows/Linux) or Command (Mac) key is pressed
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();

    // Get mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate world position before zoom (using diagram editor formula)
    const gameWidth = canvas.width;
    const gameHeight = canvas.height;
    const scaleX = gameWidth / WORLD_WIDTH;
    const scaleY = gameHeight / WORLD_HEIGHT;
    const baseScale = Math.min(scaleX, scaleY);

    const scaledWorldWidth = WORLD_WIDTH * baseScale * zoomLevel;
    const scaledWorldHeight = WORLD_HEIGHT * baseScale * zoomLevel;
    const offsetX = (gameWidth - scaledWorldWidth) / 2 + cameraOffsetX;
    const offsetY = (gameHeight - scaledWorldHeight) / 2 + cameraOffsetY;

    const worldX = (mouseX - offsetX) / (baseScale * zoomLevel);
    const worldY = (mouseY - offsetY) / (baseScale * zoomLevel);

    // Update zoom level
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const oldZoom = zoomLevel;
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel + delta));

    // If zoom didn't change, stop
    if (zoomLevel === oldZoom) {
      return;
    }

    // Calculate new pan to keep same world position under mouse (diagram editor formula)
    const newScaledWorldWidth = WORLD_WIDTH * baseScale * zoomLevel;
    const newScaledWorldHeight = WORLD_HEIGHT * baseScale * zoomLevel;
    const newOffsetX = (gameWidth - newScaledWorldWidth) / 2;
    const newOffsetY = (gameHeight - newScaledWorldHeight) / 2;

    cameraOffsetX = mouseX - worldX * (baseScale * zoomLevel) - newOffsetX;
    cameraOffsetY = mouseY - worldY * (baseScale * zoomLevel) - newOffsetY;

    console.log('🔍 Zoom level:', zoomLevel.toFixed(2), 'at cursor position');
  }
  // No else clause - regular scroll does nothing (like diagram editor)
}, { passive: false });

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
    'workspace-1': '💼',
    'workspace-2': '💼',
    'meeting-room-1': '🎯',
    'meeting-room-2': '📊',
    'huddle-room': '🤝',
    'lounge': '☕',
    'kitchen': '🍕',
    'game-room': '🎮'
  };
  return emojis[roomName] || '🚪';
}

// UI is now drawn on canvas - no need for DOM updates

// Global car state - only ONE car in the entire game
let globalCarLocation = { room: 'lobby', x: 1400, y: 600 };
let globalCarCollected = false;

// Initialize furniture for unified 3x3 map (all 9 rooms on one map)
// Each room is 1600x1200, arranged in a 3x3 grid (4800x3600 total)
function initializeFurniture(room) {
  furniture = [];
  collectibles = [];

  // Room offsets for 3x3 grid
  // Row 1: Meeting-2 (0,0), Meeting-1 (1600,0), Huddle (3200,0)
  // Row 2: Workspace-1 (0,1200), Lobby (1600,1200), Workspace-2 (3200,1200)
  // Row 3: Lounge (0,2400), Kitchen (1600,2400), Game Room (3200,2400)

  // MEETING ROOM 2 (Top Left: 0, 0)
  const mr2X = 0, mr2Y = 0;
  furniture.push(
    { x: mr2X + 400, y: mr2Y + 450, width: 300, height: 150, type: 'conference-table', color: '#654321' },
    { x: mr2X + 350, y: mr2Y + 400, width: 40, height: 40, type: 'chair', color: '#8B4513' },
    { x: mr2X + 700, y: mr2Y + 400, width: 40, height: 40, type: 'chair', color: '#8B4513' },
    { x: mr2X + 350, y: mr2Y + 600, width: 40, height: 40, type: 'chair', color: '#8B4513' },
    { x: mr2X + 700, y: mr2Y + 600, width: 40, height: 40, type: 'chair', color: '#8B4513' },
    { x: mr2X + 900, y: mr2Y + 300, width: 60, height: 60, type: 'plant', color: '#228B22' }
  );

  // MEETING ROOM 1 (Top Center: 1600, 0)
  const mr1X = 1600, mr1Y = 0;
  furniture.push(
    { x: mr1X + 600, y: mr1Y + 400, width: 400, height: 200, type: 'conference-table', color: '#654321' },
    { x: mr1X + 550, y: mr1Y + 350, width: 40, height: 40, type: 'chair', color: '#8B4513' },
    { x: mr1X + 750, y: mr1Y + 350, width: 40, height: 40, type: 'chair', color: '#8B4513' },
    { x: mr1X + 950, y: mr1Y + 350, width: 40, height: 40, type: 'chair', color: '#8B4513' },
    { x: mr1X + 550, y: mr1Y + 600, width: 40, height: 40, type: 'chair', color: '#8B4513' },
    { x: mr1X + 750, y: mr1Y + 600, width: 40, height: 40, type: 'chair', color: '#8B4513' },
    { x: mr1X + 950, y: mr1Y + 600, width: 40, height: 40, type: 'chair', color: '#8B4513' },
    { x: mr1X + 200, y: mr1Y + 200, width: 60, height: 60, type: 'plant', color: '#228B22' },
    { x: mr1X + 1300, y: mr1Y + 200, width: 60, height: 60, type: 'plant', color: '#228B22' }
  );

  // HUDDLE ROOM (Top Right: 3200, 0)
  const hudX = 3200, hudY = 0;
  furniture.push(
    { x: hudX + 700, y: hudY + 450, width: 200, height: 120, type: 'table', color: '#A0522D' },
    { x: hudX + 650, y: hudY + 400, width: 40, height: 40, type: 'chair', color: '#654321' },
    { x: hudX + 900, y: hudY + 400, width: 40, height: 40, type: 'chair', color: '#654321' },
    { x: hudX + 650, y: hudY + 570, width: 40, height: 40, type: 'chair', color: '#654321' },
    { x: hudX + 900, y: hudY + 570, width: 40, height: 40, type: 'chair', color: '#654321' },
    { x: hudX + 1200, y: hudY + 300, width: 60, height: 60, type: 'plant', color: '#228B22' }
  );

  // WORKSPACE 1 (Middle Left: 0, 1200)
  const ws1X = 0, ws1Y = 1200;
  furniture.push(
    { x: ws1X + 200, y: ws1Y + 200, width: 120, height: 60, type: 'desk', color: '#8B4513' },
    { x: ws1X + 200, y: ws1Y + 260, width: 40, height: 40, type: 'chair', color: '#654321' },
    { x: ws1X + 500, y: ws1Y + 200, width: 120, height: 60, type: 'desk', color: '#8B4513' },
    { x: ws1X + 500, y: ws1Y + 260, width: 40, height: 40, type: 'chair', color: '#654321' },
    { x: ws1X + 200, y: ws1Y + 500, width: 120, height: 60, type: 'desk', color: '#8B4513' },
    { x: ws1X + 200, y: ws1Y + 560, width: 40, height: 40, type: 'chair', color: '#654321' },
    { x: ws1X + 500, y: ws1Y + 500, width: 120, height: 60, type: 'desk', color: '#8B4513' },
    { x: ws1X + 500, y: ws1Y + 560, width: 40, height: 40, type: 'chair', color: '#654321' },
    { x: ws1X + 900, y: ws1Y + 350, width: 60, height: 60, type: 'plant', color: '#228B22' }
  );

  // LOBBY (Middle Center: 1600, 1200) - SPAWN POINT
  const lobbyX = 1600, lobbyY = 1200;
  furniture.push(
    { x: lobbyX + 700, y: lobbyY + 300, width: 200, height: 80, type: 'desk', color: '#8B4513' },
    { x: lobbyX + 750, y: lobbyY + 380, width: 40, height: 40, type: 'chair', color: '#654321' },
    { x: lobbyX + 400, y: lobbyY + 500, width: 80, height: 60, type: 'sofa', color: '#4A4A4A' },
    { x: lobbyX + 600, y: lobbyY + 500, width: 80, height: 60, type: 'sofa', color: '#4A4A4A' },
    { x: lobbyX + 1000, y: lobbyY + 500, width: 80, height: 60, type: 'sofa', color: '#4A4A4A' },
    { x: lobbyX + 700, y: lobbyY + 600, width: 100, height: 100, type: 'coffee-table', color: '#A0522D' },
    { x: lobbyX + 200, y: lobbyY + 200, width: 60, height: 60, type: 'plant', color: '#228B22' },
    { x: lobbyX + 1300, y: lobbyY + 200, width: 60, height: 60, type: 'plant', color: '#228B22' },
    { x: lobbyX + 200, y: lobbyY + 900, width: 60, height: 60, type: 'plant', color: '#228B22' },
    { x: lobbyX + 1300, y: lobbyY + 900, width: 60, height: 60, type: 'plant', color: '#228B22' }
  );

  // Add car in Lobby if not collected
  if (!globalCarCollected) {
    collectibles.push({
      x: lobbyX + 1400,
      y: lobbyY + 600,
      width: 80,
      height: 50,
      type: 'car',
      collected: false
    });
  }

  // WORKSPACE 2 (Middle Right: 3200, 1200)
  const ws2X = 3200, ws2Y = 1200;
  furniture.push(
    { x: ws2X + 800, y: ws2Y + 200, width: 120, height: 60, type: 'desk', color: '#8B4513' },
    { x: ws2X + 800, y: ws2Y + 260, width: 40, height: 40, type: 'chair', color: '#654321' },
    { x: ws2X + 1100, y: ws2Y + 200, width: 120, height: 60, type: 'desk', color: '#8B4513' },
    { x: ws2X + 1100, y: ws2Y + 260, width: 40, height: 40, type: 'chair', color: '#654321' },
    { x: ws2X + 800, y: ws2Y + 500, width: 120, height: 60, type: 'desk', color: '#8B4513' },
    { x: ws2X + 800, y: ws2Y + 560, width: 40, height: 40, type: 'chair', color: '#654321' },
    { x: ws2X + 1100, y: ws2Y + 500, width: 120, height: 60, type: 'desk', color: '#8B4513' },
    { x: ws2X + 1100, y: ws2Y + 560, width: 40, height: 40, type: 'chair', color: '#654321' },
    { x: ws2X + 600, y: ws2Y + 350, width: 60, height: 60, type: 'plant', color: '#228B22' }
  );

  // LOUNGE (Bottom Left: 0, 2400)
  const loungeX = 0, loungeY = 2400;
  furniture.push(
    { x: loungeX + 300, y: loungeY + 400, width: 150, height: 120, type: 'sofa', color: '#4A4A4A' },
    { x: loungeX + 650, y: loungeY + 400, width: 150, height: 120, type: 'sofa', color: '#4A4A4A' },
    { x: loungeX + 450, y: loungeY + 600, width: 120, height: 120, type: 'coffee-table', color: '#8B4513' },
    { x: loungeX + 200, y: loungeY + 200, width: 60, height: 60, type: 'plant', color: '#228B22' },
    { x: loungeX + 900, y: loungeY + 800, width: 60, height: 60, type: 'plant', color: '#228B22' }
  );

  // KITCHEN (Bottom Center: 1600, 2400)
  const kitchenX = 1600, kitchenY = 2400;
  furniture.push(
    { x: kitchenX + 300, y: kitchenY + 300, width: 200, height: 80, type: 'table', color: '#8B4513' },
    { x: kitchenX + 700, y: kitchenY + 300, width: 200, height: 80, type: 'table', color: '#8B4513' },
    { x: kitchenX + 1100, y: kitchenY + 300, width: 200, height: 80, type: 'table', color: '#8B4513' },
    { x: kitchenX + 1200, y: kitchenY + 600, width: 80, height: 80, type: 'vending-machine', color: '#C41E3A' },
    { x: kitchenX + 1300, y: kitchenY + 600, width: 80, height: 80, type: 'vending-machine', color: '#4169E1' },
    { x: kitchenX + 200, y: kitchenY + 800, width: 60, height: 60, type: 'plant', color: '#228B22' }
  );

  // GAME ROOM (Bottom Right: 3200, 2400)
  const gameX = 3200, gameY = 2400;
  furniture.push(
    { x: gameX + 400, y: gameY + 400, width: 180, height: 100, type: 'table', color: '#228B22' },
    { x: gameX + 900, y: gameY + 400, width: 180, height: 100, type: 'table', color: '#654321' },
    { x: gameX + 600, y: gameY + 700, width: 100, height: 60, type: 'sofa', color: '#4A4A4A' },
    { x: gameX + 900, y: gameY + 700, width: 100, height: 60, type: 'sofa', color: '#4A4A4A' },
    { x: gameX + 1300, y: gameY + 300, width: 60, height: 60, type: 'plant', color: '#228B22' }
  );
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

// Draw collectibles (cars, etc.)
function drawCollectibles() {
  collectibles.forEach(item => {
    ctx.save();

    // Convert world coordinates to screen coordinates
    const screen = worldToScreen(item.x, item.y);
    const screenX = screen.x;
    const screenY = screen.y;
    const scale = Math.max(0.01, screen.scale);
    const screenWidth = Math.max(1, item.width * scale);
    const screenHeight = Math.max(1, item.height * scale);

    if (item.type === 'car') {
      // Draw car body
      ctx.fillStyle = '#FF4444';
      ctx.fillRect(screenX, screenY + 10 * scale, screenWidth, screenHeight - 10 * scale);

      // Draw car top (cabin)
      ctx.fillStyle = '#CC0000';
      ctx.fillRect(screenX + 15 * scale, screenY, screenWidth - 30 * scale, screenHeight - 15 * scale);

      // Draw windows
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(screenX + 20 * scale, screenY + 5 * scale, 15 * scale, 10 * scale);
      ctx.fillRect(screenX + screenWidth - 35 * scale, screenY + 5 * scale, 15 * scale, 10 * scale);

      // Draw wheels
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(screenX + 15 * scale, screenY + screenHeight - 5 * scale, 8 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(screenX + screenWidth - 15 * scale, screenY + screenHeight - 5 * scale, 8 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Draw outline
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(screenX, screenY + 10 * scale, screenWidth, screenHeight - 10 * scale);

      // Draw sparkle effect (bouncing animation)
      const sparkleOffset = Math.sin(frameCount * 0.1) * 5 * scale;
      ctx.fillStyle = '#FFD700';
      ctx.font = `${20 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', screenX + screenWidth / 2, screenY - 20 * scale + sparkleOffset);
    }

    ctx.restore();
  });
}

// Draw UI overlay - Floating bottom menu
function drawUI() {
  // Top-left floating info panel
  const infoPadding = 15;
  const infoX = 10;
  const infoY = 10;
  const infoWidth = 200;

  // Semi-transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(infoX, infoY, infoWidth, 110);
  ctx.strokeStyle = '#667eea';
  ctx.lineWidth = 2;
  ctx.strokeRect(infoX, infoY, infoWidth, 110);

  // Room name
  const roomEmoji = getRoomEmoji(currentRoom);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`${roomEmoji} ${currentRoom}`, infoX + infoPadding, infoY + infoPadding);

  // Player count
  const playerCount = otherPlayers.size + 1;
  ctx.fillStyle = '#cccccc';
  ctx.font = '14px Arial';
  ctx.fillText(`👥 ${playerCount} คน`, infoX + infoPadding, infoY + infoPadding + 25);

  // Zoom level
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '12px Arial';
  ctx.fillText(`🔍 Zoom: ${(zoomLevel * 100).toFixed(0)}%`, infoX + infoPadding, infoY + infoPadding + 48);

  // Controls
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '11px Arial';
  ctx.fillText('🎮 WASD  💬 Enter', infoX + infoPadding, infoY + infoPadding + 68);

  // Detect Mac for showing Cmd instead of Ctrl
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const zoomKey = isMac ? 'Cmd' : 'Ctrl';
  ctx.fillText(`🔍 ${zoomKey}+Scroll  🚪 R`, infoX + infoPadding, infoY + infoPadding + 85);

  // Top-right floating button (Settings only)
  const buttonSize = 50;
  const settingsBtnX = canvas.width - buttonSize - 15;
  const settingsBtnY = 15;
  ctx.fillStyle = 'rgba(255, 152, 0, 0.95)';
  ctx.fillRect(settingsBtnX, settingsBtnY, buttonSize, buttonSize);
  ctx.strokeStyle = '#F57C00';
  ctx.lineWidth = 3;
  ctx.strokeRect(settingsBtnX, settingsBtnY, buttonSize, buttonSize);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚙️', settingsBtnX + buttonSize / 2, settingsBtnY + buttonSize / 2);
  canvas.settingsIconBounds = { x: settingsBtnX, y: settingsBtnY, width: buttonSize, height: buttonSize };

  // Bottom center floating menu (only for room change now)
  const menuWidth = 200;
  const menuX = (canvas.width - menuWidth) / 2;
  const gestureHeight = 55;
  const gestureY = canvas.height - gestureHeight - 15;

  // Draw gesture bar
  ctx.fillStyle = 'rgba(102, 126, 234, 0.95)';
  ctx.fillRect(menuX, gestureY, menuWidth, gestureHeight);
  ctx.strokeStyle = '#5568d3';
  ctx.lineWidth = 3;
  ctx.strokeRect(menuX, gestureY, menuWidth, gestureHeight);

  // Draw gesture indicator with icons
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (bottomMenuExpanded) {
    ctx.fillText('▼ ปิดเมนู', menuX + menuWidth / 2, gestureY + gestureHeight / 2);
  } else {
    ctx.fillText('▲ คลิกเพื่อเปิดเมนู', menuX + menuWidth / 2, gestureY + gestureHeight / 2 - 8);
    ctx.font = '11px Arial';
    ctx.fillStyle = '#dddddd';
    ctx.fillText('(🚪 เปลี่ยนห้อง)', menuX + menuWidth / 2, gestureY + gestureHeight / 2 + 10);
  }

  // Store gesture bounds
  canvas.gestureBounds = { x: menuX, y: gestureY, width: menuWidth, height: gestureHeight };

  // Draw expanded menu icons
  if (bottomMenuExpanded) {
    const iconWidth = menuWidth - 20;
    const iconHeight = 50;
    const iconSpacing = 10;
    let iconY = gestureY - iconHeight - iconSpacing;

    // Room change button
    const roomBtnX = menuX + 10;
    ctx.fillStyle = 'rgba(102, 126, 234, 0.95)';
    ctx.fillRect(roomBtnX, iconY, iconWidth, iconHeight);
    ctx.strokeStyle = '#5568d3';
    ctx.lineWidth = 2;
    ctx.strokeRect(roomBtnX, iconY, iconWidth, iconHeight);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚪 เปลี่ยนห้อง', roomBtnX + iconWidth / 2, iconY + iconHeight / 2);
    canvas.roomButtonBounds = { x: roomBtnX, y: iconY, width: iconWidth, height: iconHeight };
  } else {
    canvas.roomButtonBounds = null;
  }

  // Floating chat panel (above bottom bar)
  if (chatPanelOpen && chatPanelHeight > 0) {
    // Match the width of the bottom chat bar
    const chatWidth = Math.min(800, canvas.width - 40); // Max 800px or full width minus padding
    const chatHeight = chatPanelHeight;
    const chatX = (canvas.width - chatWidth) / 2; // Center horizontally
    const chatY = canvas.height - chatHeight - 80; // 80px for bottom chat bar

    // Chat panel background
    ctx.fillStyle = 'rgba(245, 245, 245, 0.98)';
    ctx.fillRect(chatX, chatY, chatWidth, chatHeight);
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.strokeRect(chatX, chatY, chatWidth, chatHeight);

    // Chat header
    ctx.fillStyle = '#667eea';
    ctx.fillRect(chatX, chatY, chatWidth, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`💬 แชท (${chatHeight}px)`, chatX + chatWidth / 2, chatY + 20);

    // Chat messages area
    const chatAreaY = chatY + 45;
    const chatAreaHeight = chatHeight - 50;
    const chatAreaX = chatX + 20;
    const chatAreaWidth = chatWidth - 40;

    // Draw chat messages (new format: own on left, others on right with "username: message")
    ctx.save();
    ctx.beginPath();
    ctx.rect(chatAreaX, chatAreaY, chatAreaWidth, chatAreaHeight);
    ctx.clip();

    let messageY = chatAreaY + 10;
    const messagesToShow = sidebarChatMessages.slice(-20); // Show last 20 messages

    for (let i = 0; i < messagesToShow.length; i++) {
      const msg = messagesToShow[i];
      const isOwn = msg.isOwn;

      const fontSize = 14;
      const lineHeight = 22;
      ctx.font = `${fontSize}px Arial`;

      // Format message
      let displayText = isOwn ? msg.message : `${msg.username}: ${msg.message}`;

      // Word wrap
      const maxWidth = chatAreaWidth - 20;
      const words = displayText.split(' ');
      const lines = [];
      let currentLine = words[0] || '';

      for (let j = 1; j < words.length; j++) {
        const testLine = currentLine + ' ' + words[j];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {
          lines.push(currentLine);
          currentLine = words[j];
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      // Draw message lines
      ctx.textAlign = isOwn ? 'right' : 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isOwn ? '#0066cc' : '#333333';

      const textX = isOwn ? chatAreaX + chatAreaWidth - 10 : chatAreaX + 10;

      lines.forEach((line, idx) => {
        if (messageY + idx * lineHeight < chatAreaY + chatAreaHeight) {
          ctx.fillText(line, textX, messageY + idx * lineHeight);
        }
      });

      messageY += lines.length * lineHeight + 8;

      // Stop if we've filled the area
      if (messageY >= chatAreaY + chatAreaHeight) break;
    }

    ctx.restore();
  }

  // Logout button remains null (can add back if needed)
  canvas.logoutButtonBounds = null;
}

// Game loop
let frameCount = 0;
function gameLoop() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Always draw game map (no room selection mode)
  canvas.roomBounds = [];

  // Draw floor tiles
  drawFloor();

  // Draw furniture
  drawFurniture();

  // Draw collectibles (cars, etc.)
  drawCollectibles();

  // Update and draw current player
  if (currentPlayer) {
    currentPlayer.update();
    const showCurrentPlayerName = hoveredPlayer && hoveredPlayer.id === currentPlayer.id;
    currentPlayer.draw(true, showCurrentPlayerName);
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
  const gameWidth = canvas.width;
  const gameHeight = canvas.height;

  const scaleX = gameWidth / WORLD_WIDTH;
  const scaleY = gameHeight / WORLD_HEIGHT;
  const baseScale = Math.min(scaleX, scaleY);
  const scale = baseScale * zoomLevel;

  // Calculate offset to center the world
  const scaledWorldWidth = WORLD_WIDTH * scale;
  const scaledWorldHeight = WORLD_HEIGHT * scale;
  const offsetX = (gameWidth - scaledWorldWidth) / 2 + cameraOffsetX;
  const offsetY = (gameHeight - scaledWorldHeight) / 2 + cameraOffsetY;

  // Define zones: 3x3 grid, each zone is 1600x1200
  const zones = [
    // Row 1 (y=0): Meeting-2, Meeting-1, Huddle
    { x: 0, y: 0, w: 1600, h: 1200, color: '#e8f4e8' },      // Meeting Room 2 (light green)
    { x: 1600, y: 0, w: 1600, h: 1200, color: '#e8f4e8' },   // Meeting Room 1 (light green)
    { x: 3200, y: 0, w: 1600, h: 1200, color: '#fff5e8' },   // Huddle (peach)

    // Row 2 (y=1200): Workspace-1, Lobby, Workspace-2
    { x: 0, y: 1200, w: 1600, h: 1200, color: '#f5eedb' },   // Workspace 1 (beige)
    { x: 1600, y: 1200, w: 1600, h: 1200, color: '#e8f4f8' }, // Lobby (light blue)
    { x: 3200, y: 1200, w: 1600, h: 1200, color: '#f5eedb' }, // Workspace 2 (beige)

    // Row 3 (y=2400): Lounge, Kitchen, Game Room
    { x: 0, y: 2400, w: 1600, h: 1200, color: '#f0e8f5' },   // Lounge (lavender)
    { x: 1600, y: 2400, w: 1600, h: 1200, color: '#fffbe8' }, // Kitchen (light yellow)
    { x: 3200, y: 2400, w: 1600, h: 1200, color: '#ffe8e8' }  // Game Room (light pink)
  ];

  // Draw each zone as a solid color
  zones.forEach(zone => {
    const screenX = zone.x * scale + offsetX;
    const screenY = zone.y * scale + offsetY;
    const screenW = zone.w * scale;
    const screenH = zone.h * scale;

    ctx.fillStyle = zone.color;
    ctx.fillRect(screenX, screenY, screenW, screenH);

    // Optional: Add subtle border between zones
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX, screenY, screenW, screenH);
  });
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
