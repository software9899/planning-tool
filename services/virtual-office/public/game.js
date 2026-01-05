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
let keyPressTime = {}; // Track how long each key has been pressed
let currentChatMode = 'global';
let currentRoom = 'lobby';
let furniture = [];
let tempFurniture = []; // Temporary furniture for editing mode
let isEditingObjects = false; // Track if in object editing mode
let hoveredObject = null; // Track which object is being hovered
let draggingObject = null; // Track which object is being dragged
let dragOffsetX = 0;
let dragOffsetY = 0;
let isDrawingPartition = false; // Track if drawing a partition
let partitionStartX = 0;
let partitionStartY = 0;
let justFinishedPartition = false; // Prevent click event after partition drawing
let customRoomColors = {}; // Store custom floor colors for rooms
let tempCustomRoomColors = {}; // Temporary custom room colors during editing
let selectedFloorColor = null; // Currently selected color for floor painting
let customRoomFloorTypes = {}; // Store floor types for rooms (grass, sand, etc.)
let tempCustomRoomFloorTypes = {}; // Temporary floor types during editing
let selectedFloorType = null; // Currently selected floor type
let floorMode = 'room'; // 'room' or 'tile' - determines if painting whole room or individual tiles
let customTileFloors = {}; // Store floor types for individual tiles {tileId: floorPattern}
let tempCustomTileFloors = {}; // Temporary tile floors during editing
const TILE_SIZE = 100; // Size of each floor tile in world coordinates
let hoveredFloor = null; // Track hovered floor for deletion {type: 'room'|'tile', id: string}
let customObjects = {}; // Store custom uploaded images for each category
let imageCache = {}; // Cache for loaded images
let aiApiKey = ''; // Store AI API key for translator
let translatorMode = false; // Track if translator mode is active
let collectibles = []; // Cars and other collectible items
let animationFrame = 0;
let bottomMenuExpanded = false; // Track if bottom gesture menu is expanded
let mouseX = 0;
let mouseY = 0;
let hoveredPlayer = null;
let targetPosition = null; // For click-to-move
let zoomLevel = 2.0; // Zoom level (1.0 = normal, > 1.0 = zoomed in, < 1.0 = zoomed out)
const MIN_ZOOM = 0.7;  // 70%
const MAX_ZOOM = 4.0;   // 400%
let cameraOffsetX = 0; // Camera offset for panning/zoom
let cameraOffsetY = 0;

// Pan variables
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartOffsetX = 0;
let panStartOffsetY = 0;
let clickedOnGrayArea = false;

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

// Clamp camera offset to prevent showing areas outside the game world
function clampCameraOffset() {
  const gameWidth = canvas.width;
  const gameHeight = canvas.height;
  const scaleX = gameWidth / WORLD_WIDTH;
  const scaleY = gameHeight / WORLD_HEIGHT;
  const baseScale = Math.min(scaleX, scaleY);
  const currentScale = baseScale * zoomLevel;

  const scaledWorldWidth = WORLD_WIDTH * currentScale;
  const scaledWorldHeight = WORLD_HEIGHT * currentScale;
  const baseOffsetX = (gameWidth - scaledWorldWidth) / 2;
  const baseOffsetY = (gameHeight - scaledWorldHeight) / 2;

  // Only clamp if world is larger than canvas (zoomed in)
  if (scaledWorldWidth > gameWidth) {
    const maxOffsetX = -baseOffsetX; // Left edge of world at left edge of screen
    const minOffsetX = gameWidth - baseOffsetX - scaledWorldWidth; // Right edge at right edge
    cameraOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, cameraOffsetX));
  } else {
    // If world is smaller than canvas, keep it centered
    cameraOffsetX = 0;
  }

  if (scaledWorldHeight > gameHeight) {
    const maxOffsetY = -baseOffsetY;
    const minOffsetY = gameHeight - baseOffsetY - scaledWorldHeight;
    cameraOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, cameraOffsetY));
  } else {
    cameraOffsetY = 0;
  }
}

// Resize canvas
function resizeCanvas() {
  const container = document.getElementById('game-container');

  // Save current visual scale before resize
  const oldWidth = canvas.width;
  const oldHeight = canvas.height;
  const oldScaleX = oldWidth / WORLD_WIDTH;
  const oldScaleY = oldHeight / WORLD_HEIGHT;
  const oldBaseScale = Math.min(oldScaleX, oldScaleY);
  const oldVisualScale = oldBaseScale * zoomLevel;

  // Resize canvas
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;

  // Calculate new base scale
  const newScaleX = canvas.width / WORLD_WIDTH;
  const newScaleY = canvas.height / WORLD_HEIGHT;
  const newBaseScale = Math.min(newScaleX, newScaleY);

  // Adjust zoomLevel to maintain the same visual scale
  if (newBaseScale > 0 && oldBaseScale > 0) {
    zoomLevel = oldVisualScale / newBaseScale;
  }

  console.log('📐 Canvas resized to:', canvas.width, 'x', canvas.height, '| Zoom adjusted to:', zoomLevel.toFixed(2));
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

// Chat history storage
let chatHistory = JSON.parse(localStorage.getItem('virtualOfficeChatHistory') || '[]');

// Chat bubble settings
let chatSettings = JSON.parse(localStorage.getItem('virtualOfficeChatSettings') || JSON.stringify({
  fontSize: 18,
  bubbleWidth: 250,
  displayTime: 5,
  showNames: false,
  showBubbles: true
}));

// Chat messages for sidebar (LINE-style)
let sidebarChatMessages = [];

// Render chat messages to overlay
function renderChatOverlay() {
  const overlay = document.getElementById('chat-messages-overlay');
  if (!overlay) {
    console.error('❌ Chat overlay element not found!');
    return;
  }

  console.log(`🔄 Rendering chat overlay with ${sidebarChatMessages.length} total messages`);

  overlay.innerHTML = '';

  // Show last 5 messages
  const messagesToShow = sidebarChatMessages.slice(-5);

  console.log(`📊 Showing ${messagesToShow.length} messages in overlay`);

  // Hide overlay if no messages
  if (messagesToShow.length === 0) {
    overlay.style.display = 'none';
    console.log('🙈 No messages - overlay hidden');
    return;
  }

  // Show overlay when there are messages
  overlay.style.display = 'flex';

  messagesToShow.forEach((msg, index) => {
    console.log(`  ${index + 1}. ${msg.isOwn ? 'Own' : msg.username}: ${msg.message}`);

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${msg.isOwn ? 'own' : 'other'}`;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';

    if (!msg.isOwn) {
      const username = document.createElement('div');
      username.className = 'chat-bubble-username';
      username.textContent = msg.username;
      bubble.appendChild(username);
    }

    const text = document.createElement('div');
    text.className = 'chat-bubble-text';
    text.textContent = msg.message;
    bubble.appendChild(text);

    messageDiv.appendChild(bubble);
    overlay.appendChild(messageDiv);
  });

  // Auto-scroll to bottom
  overlay.scrollTop = overlay.scrollHeight;

  console.log('✅ Chat overlay rendered successfully');
}

// Voice chat state (legacy)
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

// WebRTC Real-time Voice Chat
let localStream = null; // Local microphone stream
let peerConnections = new Map(); // Map of peerId -> RTCPeerConnection
let remoteAudioElements = new Map(); // Map of peerId -> HTMLAudioElement
let isMicEnabled = false; // Track if mic is on/off
const PROXIMITY_DISTANCE = 300; // 3 tiles * 100 pixels per tile = 300 pixels

// STUN/TURN servers for WebRTC
const iceServers = {
  iceServers: [
    // Google STUN servers (for discovering public IP)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:tech2b.fun:3478' },

    // Our own TURN server (running in Docker) - BEST for reliability!
    {
      urls: 'turn:tech2b.fun:3478',
      username: 'virtualoffice',
      credential: 'yourSecretPassword123'
    },
    {
      urls: 'turn:tech2b.fun:3478?transport=tcp',
      username: 'virtualoffice',
      credential: 'yourSecretPassword123'
    }
  ],
  // Try all methods (host, srflx, relay)
  // WebRTC will prefer direct connection but fallback to TURN if needed
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all'  // Try all candidate types
};

// Speech recognition (Speech-to-Text)
let recognition = null;
let isListening = false;

// Initialize Speech Recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true; // Keep listening continuously
  recognition.interimResults = true; // Show interim results while speaking
  recognition.lang = 'th-TH'; // Thai language, can change to 'en-US' for English
  recognition.maxAlternatives = 1;

  // Check protocol and warn user
  if (window.location.protocol === 'http:' && !window.location.hostname.includes('localhost')) {
    console.warn('⚠️ Speech Recognition works best with HTTPS. Permissions may not persist.');
  }

  recognition.onstart = () => {
    isListening = true;
    if (micBtn) {
      micBtn.style.background = '#f44336';
      micBtn.style.transform = 'scale(1.1)';
    }
    console.log('🎤 Speech recognition started');
  };

  recognition.onresult = async (event) => {
    // Get the latest result
    const lastResult = event.results[event.results.length - 1];
    const transcript = lastResult[0].transcript;
    const isFinal = lastResult.isFinal;

    console.log('📝 Recognized:', transcript, isFinal ? '(final)' : '(interim)');

    // Update chat input with transcript (show interim results)
    if (!isFinal) {
      chatInput.value = transcript;
    }

    // Only process final result
    if (isFinal) {
      // If translator mode is ON, translate and auto-send
      if (translatorMode && aiApiKey) {
        try {
          // Show translating indicator
          chatInput.value = '🤖 กำลังแปล...';
          chatInput.disabled = true;

          // Translate to English
          const translatedText = await correctGrammar(transcript);

          // Send translated message
          chatInput.value = translatedText;
          chatInput.disabled = false;

          // Auto-send
          await sendMessage();

          // Clear input for next utterance in continuous mode
          chatInput.value = '';

          console.log(`🗣️→🌐 "${transcript}" → "${translatedText}"`);
        } catch (error) {
          console.error('❌ Translation error:', error);
          // If translation fails, just show original
          chatInput.disabled = false;
          chatInput.value = transcript;
          chatInput.focus();
        }
      } else {
        // No translator mode - accumulate transcript in input field
        chatInput.value = transcript;
        chatInput.focus();
      }
    }
  };

  recognition.onerror = (event) => {
    console.error('❌ Speech recognition error:', event.error);

    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      const isHttps = window.location.protocol === 'https:';
      const isLocalhost = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1';

      let message = '⚠️ ไม่สามารถใช้ไมโครโฟนได้\n\n';

      if (!isHttps && !isLocalhost) {
        message += '❌ ต้องใช้ HTTPS เท่านั้น!\n\n';
        message += 'วิธีแก้:\n';
        message += '1. เปิดเว็บผ่าน https://\n';
        message += '2. หรือใช้ localhost แทน\n';
        message += '\nตอนนี้: ' + window.location.protocol + '//' + window.location.host;
      } else {
        message += 'กรุณาอนุญาตไมโครโฟน:\n\n';
        message += '1. คลิก 🔒 ข้างหน้า URL\n';
        message += '2. เลือก "อนุญาต" สำหรับไมโครโฟน\n';
        message += '3. รีเฟรชหน้าเว็บ (F5)';
      }

      alert(message);
    } else if (event.error === 'no-speech') {
      console.log('⚠️ ไม่ได้ยินเสียง กรุณาพูดใหม่');
    } else if (event.error === 'aborted') {
      console.log('⚠️ Speech recognition aborted');
    } else if (event.error === 'network') {
      alert('⚠️ เกิดข้อผิดพลาดเครือข่าย กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
    }
  };

  recognition.onend = () => {
    isListening = false;
    console.log('🎤 Speech recognition ended');

    // Auto-restart if voice-to-text button is still active (continuous mode)
    const voiceBtn = document.getElementById('voice-to-text-btn');
    if (voiceBtn && voiceBtn.classList.contains('active')) {
      console.log('🔄 Auto-restarting speech recognition...');
      setTimeout(() => {
        try {
          recognition.start();
        } catch (error) {
          console.error('❌ Failed to restart recognition:', error);
        }
      }, 100);
    }
  };
} else {
  console.warn('⚠️ Speech Recognition not supported in this browser');
}

// Player class
class Player {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.x = data.x;
    this.y = data.y;
    this.color = data.color;
    this.room = data.room;
    this.status = data.status || '';
    this.direction = data.direction || 'down';
    this.width = 32;
    this.height = 48;
    this.baseSpeed = 5.0;
    this.speed = 5.0; // Smooth movement
    this.hasSpeedBoost = false;
    this.isMoving = false;
    this.isRunning = false; // Running state (2+ seconds key hold)
    this.runningLevel = 0; // 0=walk, 1=run1, 2=run2, 3=run3 (every 2 seconds)
    this.walkFrame = 0;
    this.chatMessage = null;
    this.chatTimeout = null;
    // Jump variables
    this.isJumping = false;
    this.jumpProgress = 0;
    this.jumpStartX = 0;
    this.jumpStartY = 0;
    this.jumpTargetX = 0;
    this.jumpTargetY = 0;
    this.jumpHeight = 0;
    // Smoke trail particles
    this.smokeParticles = [];
    this.lastSmokeTime = 0;
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

  startJump() {
    if (this.isJumping) return;

    this.isJumping = true;
    this.jumpProgress = 0;
    this.jumpStartX = this.x;
    this.jumpStartY = this.y;

    // Calculate target position based on movement state
    let targetX = this.x;
    let targetY = this.y;

    // Jump distance and height arrays
    const jumpDistances = [100, 150, 200, 250]; // Level 0-3
    const jumpHeights = [40, 60, 80, 100]; // Level 0-3

    // Only move forward if currently moving (WASD pressed)
    if (this.isMoving) {
      // Calculate jump distance based on running level
      const jumpDistance = jumpDistances[this.runningLevel];

      // Calculate jump direction based on currently pressed keys (supports diagonal)
      let dx = 0;
      let dy = 0;

      if (keys['w']) dy -= 1;
      if (keys['s']) dy += 1;
      if (keys['a']) dx -= 1;
      if (keys['d']) dx += 1;

      console.log('🔍 Jump keys: W=' + keys['w'] + ' A=' + keys['a'] + ' S=' + keys['s'] + ' D=' + keys['d'] + ' → dx=' + dx + ' dy=' + dy);

      // Normalize diagonal movement (so diagonal jumps aren't longer)
      if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
        console.log('↗️ Diagonal jump - normalized dx:', dx.toFixed(2), 'dy:', dy.toFixed(2));
      }

      // Apply jump distance
      targetX += dx * jumpDistance;
      targetY += dy * jumpDistance;

      console.log('🎯 Jump target calculated - from:', this.x.toFixed(0), this.y.toFixed(0), 'to:', targetX.toFixed(0), targetY.toFixed(0));

      // Keep target within bounds
      targetX = Math.max(30, Math.min(WORLD_WIDTH - 30, targetX));
      targetY = Math.max(30, Math.min(WORLD_HEIGHT - 30, targetY));
    }
    // If not moving, jump in place (targetX and targetY stay the same as current position)

    this.jumpTargetX = targetX;
    this.jumpTargetY = targetY;
    this.jumpHeight = jumpHeights[this.runningLevel];

    const jumpType = this.isMoving ? 'forward' : 'in place';
    const levelEmojis = ['🚶', '🏃', '🏃‍♂️💨', '⚡'];
    console.log(`🦘 Jump started! ${levelEmojis[this.runningLevel]} Level ${this.runningLevel} (${jumpType})`, this.direction, 'Distance:', jumpDistances[this.runningLevel], 'Height:', this.jumpHeight);
  }

  updateJump() {
    if (!this.isJumping) return;

    // Jump animation duration (0 to 1)
    const jumpSpeed = 0.08; // Faster = shorter jump duration
    this.jumpProgress += jumpSpeed;

    if (this.jumpProgress >= 1) {
      // Jump complete - check final position for collision
      if (this.checkCollision(this.jumpTargetX, this.jumpTargetY)) {
        // Hit obstacle at landing - cancel jump and return to start
        console.log('🦘 Jump cancelled - obstacle at landing position');
        this.x = this.jumpStartX;
        this.y = this.jumpStartY;
      } else {
        // Safe landing
        this.x = this.jumpTargetX;
        this.y = this.jumpTargetY;
        console.log('🦘 Jump complete!');
      }
      this.jumpProgress = 1;
      this.isJumping = false;
    } else {
      // Interpolate position during jump (no collision check mid-air - you're flying!)
      const newX = this.jumpStartX + (this.jumpTargetX - this.jumpStartX) * this.jumpProgress;
      const newY = this.jumpStartY + (this.jumpTargetY - this.jumpStartY) * this.jumpProgress;

      // Update position without collision check (jumping over obstacles)
      this.x = newX;
      this.y = newY;
    }
  }

  getJumpOffset() {
    if (!this.isJumping) return 0;

    // Create arc (parabola): height at 0% = 0, at 50% = max, at 100% = 0
    // Using sine wave for smooth arc
    const arcProgress = Math.sin(this.jumpProgress * Math.PI);
    return -this.jumpHeight * arcProgress; // Negative to jump upward
  }

  respawn() {
    // Respawn at lobby center (Lobby is at x: 0-1600, y: 0-1200)
    const spawnX = 800;  // Center of lobby X (0 + 800)
    const spawnY = 600;  // Center of lobby Y (0 + 600)

    console.log('🏠 Respawning to lobby center - resetting all states...');

    // Reset ALL jump-related states
    this.isJumping = false;
    this.jumpProgress = 0;
    this.jumpStartX = 0;
    this.jumpStartY = 0;
    this.jumpTargetX = 0;
    this.jumpTargetY = 0;
    this.jumpHeight = 0;

    // Reset movement states
    this.isMoving = false;
    this.walkFrame = 0;

    // Reset position
    this.x = spawnX;
    this.y = spawnY;
    this.direction = 'down';

    // Safety check: verify no collision at spawn point
    if (this.checkCollision(spawnX, spawnY)) {
      console.error('❌ SPAWN POINT HAS COLLISION! Moving to emergency position...');
      // Emergency fallback position (top-left of lobby, definitely safe)
      this.x = 1600 + 200;
      this.y = 1200 + 200;
    } else {
      console.log('✅ Spawn position is safe, no collision detected');
    }

    // Reset speed (keep speed boost if exists)
    // this.speed is already set, no need to change

    // Cancel click-to-move target
    targetPosition = null;

    // Clear all key presses (important!)
    keys = {};

    console.log('🏠 Respawned at lobby!', this.x, this.y, 'All states reset.');

    // Center camera on player at new position
    this.centerCameraOnPlayer();

    // Emit position update
    socket.emit('move', {
      x: this.x,
      y: this.y,
      direction: this.direction,
      isMoving: false,
      isJumping: false
    });
  }

  centerCameraOnPlayer() {
    // Center camera on player position
    const gameWidth = canvas.width;
    const gameHeight = canvas.height;
    const scaleX = gameWidth / WORLD_WIDTH;
    const scaleY = gameHeight / WORLD_HEIGHT;
    const baseScale = Math.min(scaleX, scaleY);
    const currentScale = baseScale * zoomLevel;

    const scaledWorldWidth = WORLD_WIDTH * currentScale;
    const scaledWorldHeight = WORLD_HEIGHT * currentScale;
    const baseOffsetX = (gameWidth - scaledWorldWidth) / 2;
    const baseOffsetY = (gameHeight - scaledWorldHeight) / 2;

    // Calculate where player currently is on screen (without camera offset)
    const playerScreenX = this.x * currentScale + baseOffsetX;
    const playerScreenY = this.y * currentScale + baseOffsetY;

    // Calculate where we want player to be (center of screen)
    const targetScreenX = gameWidth / 2;
    const targetScreenY = gameHeight / 2;

    // Set camera offset to center player
    cameraOffsetX = targetScreenX - playerScreenX;
    cameraOffsetY = targetScreenY - playerScreenY;

    // Clamp to prevent showing gray areas
    clampCameraOffset();

    console.log('📷 Camera centered on player at', this.x.toFixed(2), this.y.toFixed(2));
  }

  drawCharacter(x, y, direction, isMoving, color, scale = 1) {
    const bodyWidth = 24 * scale;
    const bodyHeight = 30 * scale;
    const headSize = 22 * scale;

    // Save context for transformations
    ctx.save();

    // Apply tilt/rotation based on direction (like version 6.6)
    if (direction === 'left') {
      ctx.translate(x, y + bodyHeight/2);
      ctx.rotate(-0.15); // Tilt left
      ctx.translate(-x, -(y + bodyHeight/2));
    } else if (direction === 'right') {
      ctx.translate(x, y + bodyHeight/2);
      ctx.rotate(0.15); // Tilt right
      ctx.translate(-x, -(y + bodyHeight/2));
    }

    // Body (full width - like version 6.6)
    ctx.fillStyle = color;
    ctx.fillRect(x - bodyWidth/2, y, bodyWidth, bodyHeight);

    // Arms (draw BEFORE head so head appears on top)
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

    // Head
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(x, y - 5 * scale, headSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1 * scale;
    ctx.stroke();

    // Hair/Hat - different for each direction
    ctx.fillStyle = this.getHairColor(color);

    if (direction === 'up') {
      // Full hair visible from behind
      ctx.beginPath();
      ctx.arc(x, y - 5 * scale, headSize * 0.95, 0, Math.PI * 2);
      ctx.fill();
    } else if (direction === 'left') {
      // Hair on top
      ctx.beginPath();
      ctx.arc(x, y - 8 * scale, headSize * 0.9, Math.PI, 2 * Math.PI);
      ctx.fill();
      // Hair on back of head (right side)
      ctx.beginPath();
      ctx.arc(x, y - 5 * scale, headSize * 0.95, -Math.PI/2, Math.PI/2);
      ctx.fill();
    } else if (direction === 'right') {
      // Hair on top
      ctx.beginPath();
      ctx.arc(x, y - 8 * scale, headSize * 0.9, Math.PI, 2 * Math.PI);
      ctx.fill();
      // Hair on back of head (left side)
      ctx.beginPath();
      ctx.arc(x, y - 5 * scale, headSize * 0.95, Math.PI/2, Math.PI * 1.5);
      ctx.fill();
    } else {
      // Front view (down) - Hair on top only
      ctx.beginPath();
      ctx.arc(x, y - 8 * scale, headSize * 0.9, Math.PI, 2 * Math.PI);
      ctx.fill();
    }

    // Face - improved side profile (scaled up for bigger head)
    const faceY = y - 5 * scale;
    ctx.fillStyle = '#333';

    if (direction !== 'up') {
      if (direction === 'down') {
        // Front view - two eyes (bigger, moved down)
        ctx.fillRect(x - 7 * scale, faceY + 0 * scale, 5 * scale, 3 * scale);
        ctx.fillRect(x + 2 * scale, faceY + 0 * scale, 5 * scale, 3 * scale);
      } else if (direction === 'left') {
        // Side profile - left (shifted left)
        // One eye (bigger, moved down and left)
        ctx.fillRect(x - 12 * scale, faceY + 0 * scale, 5 * scale, 3 * scale);

        // Nose (profile pointing left) - sharper and more prominent
        ctx.beginPath();
        ctx.moveTo(x - 14 * scale, faceY + 2 * scale);
        ctx.lineTo(x - 18 * scale, faceY + 4 * scale);
        ctx.lineTo(x - 14 * scale, faceY + 6 * scale);
        ctx.fillStyle = '#ffdbac';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1 * scale;
        ctx.stroke();

        // Mouth (side) - bigger and shifted left
        ctx.fillStyle = '#333';
        ctx.fillRect(x - 16 * scale, faceY + 10 * scale, 5 * scale, 2 * scale);
      } else if (direction === 'right') {
        // Side profile - right (shifted right)
        // One eye (bigger, moved down and right)
        ctx.fillRect(x + 7 * scale, faceY + 0 * scale, 5 * scale, 3 * scale);

        // Nose (profile pointing right) - sharper and more prominent
        ctx.beginPath();
        ctx.moveTo(x + 14 * scale, faceY + 2 * scale);
        ctx.lineTo(x + 18 * scale, faceY + 4 * scale);
        ctx.lineTo(x + 14 * scale, faceY + 6 * scale);
        ctx.fillStyle = '#ffdbac';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1 * scale;
        ctx.stroke();

        // Mouth (side) - bigger and shifted right
        ctx.fillStyle = '#333';
        ctx.fillRect(x + 11 * scale, faceY + 10 * scale, 5 * scale, 2 * scale);
      }

      // Mouth for front view only (bigger, moved down)
      if (direction === 'down') {
        ctx.fillRect(x - 3 * scale, faceY + 8 * scale, 6 * scale, 2 * scale);
      }
    }

    // Legs (same color as body/shirt)
    ctx.strokeStyle = color;
    ctx.lineWidth = 6 * scale;

    // Animation speed and leg swing based on running level
    // Level 0: 0.3 speed, 6 swing
    // Level 1: 0.45 speed, 8 swing
    // Level 2: 0.6 speed, 10 swing
    // Level 3: 0.75 speed, 12 swing
    const animSpeeds = [0.3, 0.45, 0.6, 0.75];
    const legSwings = [6, 8, 10, 12];
    const animSpeed = animSpeeds[this.runningLevel];
    const legSwing = legSwings[this.runningLevel];
    const legOffset = isMoving ? Math.sin(this.walkFrame * animSpeed) * legSwing * scale : 0;

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

    // Restore context
    ctx.restore();
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

    // Apply jump offset to Y position
    const jumpOffset = this.getJumpOffset() * scale;

    // Draw smoke particles (behind player)
    this.smokeParticles.forEach(particle => {
      const particleScreen = worldToScreen(particle.x, particle.y);
      const particleScale = particleScreen.scale;

      // Convert color (HEX or HSL) to RGB
      let r, g, b;
      if (particle.color.startsWith('#')) {
        // HEX format
        const hex = particle.color.replace('#', '');
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      } else if (particle.color.startsWith('hsl')) {
        // HSL format - convert to RGB
        const tempDiv = document.createElement('div');
        tempDiv.style.color = particle.color;
        document.body.appendChild(tempDiv);
        const computedColor = getComputedStyle(tempDiv).color;
        document.body.removeChild(tempDiv);

        const rgbMatch = computedColor.match(/\d+/g);
        r = parseInt(rgbMatch[0]);
        g = parseInt(rgbMatch[1]);
        b = parseInt(rgbMatch[2]);
      } else {
        // Default gray
        r = g = b = 200;
      }

      // Apply brightness variation
      r = Math.min(255, Math.floor(r * particle.brightness));
      g = Math.min(255, Math.floor(g * particle.brightness));
      b = Math.min(255, Math.floor(b * particle.brightness));

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${particle.opacity})`;
      ctx.beginPath();
      ctx.arc(particleScreen.x, particleScreen.y, particle.size * particleScale, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw shadow at feet (fades when jumping)
    const feetY = screenY + (this.height/2 - 6) * scale;
    let shadowOpacity = 0.2; // Normal opacity

    if (this.isJumping) {
      // Shadow fades based on jump height
      shadowOpacity = Math.max(0.05, 0.2 - (Math.abs(jumpOffset) / (this.jumpHeight * scale)) * 0.15);
    }

    ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
    ctx.beginPath();
    ctx.ellipse(screenX, feetY, 16 * scale, 4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw jump sparkles/motion effect
    if (this.isJumping) {
      ctx.fillStyle = '#FFD700';
      ctx.font = `${16 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Sparkles appear at different positions during jump
      if (this.jumpProgress < 0.5) {
        // Rising sparkles
        ctx.fillText('✨', screenX - 20 * scale, screenY + jumpOffset + 20 * scale);
        ctx.fillText('✨', screenX + 20 * scale, screenY + jumpOffset + 20 * scale);
      } else {
        // Falling sparkles
        ctx.fillText('💫', screenX - 15 * scale, screenY + jumpOffset + 25 * scale);
        ctx.fillText('💫', screenX + 15 * scale, screenY + jumpOffset + 25 * scale);
      }
    }

    // Draw character with jump offset
    this.drawCharacter(screenX, screenY - this.height/2 * scale + jumpOffset, this.direction, this.isMoving, this.color, scale);

    // Draw speed boost indicator (adjust position for jump)
    if (this.hasSpeedBoost) {
      ctx.fillStyle = '#FF4444';
      ctx.font = `${18 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const sparkleY = screenY - 60 * scale + Math.sin(Date.now() * 0.005) * 3 * scale + jumpOffset;
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

    // Draw chat bubble if there's a message (adjust position for jump)
    if (this.chatMessage) {
      this.drawChatBubble(this.chatMessage, screenX, screenY + jumpOffset, scale);
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
      // Skip non-blocking objects (background decorations)
      if (obj.isBlocking === false) {
        continue;
      }

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
    // Update jump animation if jumping
    if (this.isJumping) {
      // Safety check: if jumpProgress is stuck at 1, force reset
      if (this.jumpProgress >= 1) {
        console.warn('⚠️ Jump stuck at 100% - force resetting!');
        this.isJumping = false;
        this.jumpProgress = 0;
      } else {
        this.updateJump();
        // Emit position update during jump
        socket.emit('move', {
          x: this.x,
          y: this.y,
          direction: this.direction,
          isMoving: false,
          isJumping: this.isJumping,
          jumpProgress: this.jumpProgress,
          jumpHeight: this.jumpHeight,
          runningLevel: this.runningLevel
        });
        return; // Skip regular movement while jumping
      }
    }

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

      console.log('🎯 Click-to-move active! Current:', this.x, this.y, 'Target:', targetPosition.x, targetPosition.y, 'Distance:', distance.toFixed(2));

      if (distance > 5) {
        // Move towards target smoothly
        const moveX = (dx / distance) * this.speed;
        const moveY = (dy / distance) * this.speed;

        newX = this.x + moveX;
        newY = this.y + moveY;

        console.log('🚶 Moving to:', newX.toFixed(2), newY.toFixed(2), 'Speed:', this.speed);

        // Update direction based on movement
        if (Math.abs(dx) > Math.abs(dy)) {
          this.direction = dx > 0 ? 'right' : 'left';
        } else {
          this.direction = dy > 0 ? 'down' : 'up';
        }

        moved = true;
      } else {
        // Reached target
        console.log('✅ Reached target!');
        targetPosition = null;
      }
    }
    // Priority 2: WASD controls (fallback)
    else {
      // Check running level based on key hold duration (every 2 seconds)
      const currentTime = Date.now();
      const movementKeys = ['w', 'a', 's', 'd'];
      let maxHoldDuration = 0;

      for (const key of movementKeys) {
        if (keys[key] && keyPressTime[key]) {
          const holdDuration = (currentTime - keyPressTime[key]) / 1000; // in seconds
          maxHoldDuration = Math.max(maxHoldDuration, holdDuration);
        }
      }

      // Calculate running level (every 2 seconds)
      const newRunningLevel = Math.min(3, Math.floor(maxHoldDuration / 2));

      if (newRunningLevel !== this.runningLevel) {
        this.runningLevel = newRunningLevel;

        // Update speed based on level
        // Level 0: 1x, Level 1: 1.5x, Level 2: 2x, Level 3: 2.5x
        const speedMultipliers = [1.0, 1.5, 2.0, 2.5];
        this.speed = this.baseSpeed * speedMultipliers[this.runningLevel];

        this.isRunning = this.runningLevel > 0;

        const levelEmojis = ['🚶', '🏃', '🏃‍♂️💨', '⚡'];
        console.log(`${levelEmojis[this.runningLevel]} Running Level ${this.runningLevel}! Speed: ${this.speed.toFixed(1)}x`);
      }

      if (keys['w']) {
        newY -= this.speed;
        this.direction = 'up';
        moved = true;
      }
      if (keys['s']) {
        newY += this.speed;
        this.direction = 'down';
        moved = true;
      }
      if (keys['a']) {
        newX -= this.speed;
        this.direction = 'left';
        moved = true;
      }
      if (keys['d']) {
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
    const collisionX = this.checkCollision(newX, this.y);
    const collisionY = this.checkCollision(this.x, newY);

    // Removed spammy collision log

    if (!collisionX) {
      this.x = newX;
    } else if (targetPosition) {
      // If collision while moving to target, cancel target
      targetPosition = null;
    }

    if (!collisionY) {
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

    // Hide/show chat input based on movement (only for current player)
    if (this === currentPlayer) {
      const chatContainer = document.getElementById('chat-container');
      if (chatContainer) {
        if (this.isMoving) {
          // Collapse to show only icons
          chatContainer.classList.add('collapsed');
        } else {
          // Expand to show chat input
          chatContainer.classList.remove('collapsed');
        }
      }

      // Hide/show chat overlay based on movement
      const chatMessagesOverlay = document.getElementById('chat-messages-overlay');
      if (chatMessagesOverlay) {
        if (this.isMoving) {
          chatMessagesOverlay.classList.add('hidden-while-walking');
        } else {
          chatMessagesOverlay.classList.remove('hidden-while-walking');
        }
      }
    }

    // Emit position if moved or direction changed
    if (moved && (oldX !== this.x || oldY !== this.y || oldDirection !== this.direction)) {
      socket.emit('move', {
        x: this.x,
        y: this.y,
        direction: this.direction,
        isMoving: this.isMoving,
        isJumping: this.isJumping,
        jumpProgress: this.jumpProgress,
        jumpHeight: this.jumpHeight,
        runningLevel: this.runningLevel
      });
    }

    // Update smoke particles
    this.updateSmokeParticles();

    // Spawn smoke particles when running
    if (this.isMoving && this.runningLevel > 0) {
      this.spawnSmokeParticle();
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

  spawnSmokeParticle() {
    const currentTime = Date.now();
    // Spawn rate based on running level (faster = more smoke)
    const spawnRates = [200, 100, 50, 30]; // ms between particles for each level
    const spawnRate = spawnRates[this.runningLevel];

    if (currentTime - this.lastSmokeTime < spawnRate) return;

    this.lastSmokeTime = currentTime;

    // Calculate position behind player
    let offsetX = 0;
    let offsetY = 0;
    const behindDistance = 10;

    if (this.direction === 'up') offsetY = behindDistance;
    else if (this.direction === 'down') offsetY = -behindDistance;
    else if (this.direction === 'left') offsetX = behindDistance;
    else if (this.direction === 'right') offsetX = -behindDistance;

    // Base size increases with running level (bigger for higher levels!)
    const baseSizes = [8, 12, 24, 36];
    const baseSize = baseSizes[this.runningLevel];

    // Spread area increases with running level
    const spreads = [10, 15, 20, 25];
    const spread = spreads[this.runningLevel];

    this.smokeParticles.push({
      x: this.x + offsetX + (Math.random() - 0.5) * spread,
      y: this.y + offsetY + (Math.random() - 0.5) * spread,
      size: baseSize,
      opacity: 0.5 + Math.random() * 0.4, // Random opacity between 0.5-0.9
      life: 1.0,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      color: this.color, // Use player's color
      brightness: 0.6 + Math.random() * 0.8 // Random brightness 0.6-1.4
    });
  }

  updateSmokeParticles() {
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const particle = this.smokeParticles[i];

      // Update particle
      particle.life -= 0.02;
      particle.opacity = particle.life * 0.6;
      particle.size += 1.2; // Grow faster over time
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Remove dead particles
      if (particle.life <= 0) {
        this.smokeParticles.splice(i, 1);
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
  let userId;
  const isGuest = sessionStorage.getItem('isGuest') === 'true';
  const guestId = sessionStorage.getItem('guestId');

  if (isGuest && guestId) {
    // Use guest ID for guests
    userId = 'guest_' + guestId;
  } else {
    // Use normal user ID for regular users
    userId = getUserId();
  }

  socket.emit('join', { username, room, userId, status: userStatus });
});

// Planning Tool Login
const planningToolLoginBtn = document.getElementById('planning-tool-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfoDiv = document.getElementById('user-info');
const loggedInUsernameSpan = document.getElementById('logged-in-username');

// Check if user is already logged in from Planning Tool
function checkPlanningToolAuth() {
  const token = localStorage.getItem('planningToolToken');
  const userData = localStorage.getItem('planningToolUser');

  if (token && userData) {
    try {
      const user = JSON.parse(userData);
      showLoggedInState(user);
      return true;
    } catch (e) {
      console.error('Error parsing user data:', e);
      clearPlanningToolAuth();
    }
  }
  return false;
}

function showLoggedInState(user) {
  loggedInUsernameSpan.textContent = user.name || user.email;
  userInfoDiv.style.display = 'block';
  usernameInput.style.display = 'none';
  joinBtn.textContent = 'เข้าร่วม Virtual Office';
  planningToolLoginBtn.style.display = 'none';

  // Pre-fill username
  usernameInput.value = user.name || user.email.split('@')[0];
}

function clearPlanningToolAuth() {
  localStorage.removeItem('planningToolToken');
  localStorage.removeItem('planningToolUser');
  userInfoDiv.style.display = 'none';
  usernameInput.style.display = 'block';
  planningToolLoginBtn.style.display = 'block';
  joinBtn.textContent = 'เข้าร่วมแบบ Guest';
}

// Check on page load
if (checkPlanningToolAuth()) {
  console.log('✅ Already logged in with Planning Tool');
}

// Handle OAuth callback
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const userName = urlParams.get('name');
const userEmail = urlParams.get('email');

if (token && (userName || userEmail)) {
  // Save to localStorage
  localStorage.setItem('planningToolToken', token);
  const userData = {
    name: userName,
    email: userEmail,
    token: token
  };
  localStorage.setItem('planningToolUser', JSON.stringify(userData));

  // Clean URL
  window.history.replaceState({}, document.title, window.location.pathname);

  // Show logged in state
  showLoggedInState(userData);

  console.log('✅ Logged in with Planning Tool:', userData);
}

// Planning Tool Login Button
if (planningToolLoginBtn) {
  planningToolLoginBtn.addEventListener('click', () => {
    // Get Planning Tool URL
    const backendUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:80'
      : `${window.location.protocol}//${window.location.hostname}`;

    // Callback URL (where to return after login)
    const callbackUrl = window.location.origin + window.location.pathname;

    // Redirect to Planning Tool login with callback
    const loginUrl = `${backendUrl}/login?redirect=${encodeURIComponent(callbackUrl)}&source=virtual-office`;

    console.log('🔐 Redirecting to Planning Tool login:', loginUrl);
    window.location.href = loginUrl;
  });
}

// Logout Button
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    if (confirm('ต้องการ Logout จาก Planning Tool?')) {
      clearPlanningToolAuth();
      alert('Logout สำเร็จ!');
    }
  });
}

// Guest Link Button
const guestLinkBtn = document.getElementById('guest-link-btn');
if (guestLinkBtn) {
  guestLinkBtn.addEventListener('click', () => {
    // Generate unique guest ID
    const guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
    const guestUrl = `${window.location.origin}${window.location.pathname}?guest=${guestId}`;

    // Copy to clipboard
    navigator.clipboard.writeText(guestUrl).then(() => {
      alert('✅ Guest Link copied to clipboard!\n\n' + guestUrl + '\n\nShare this link with anyone to let them join without login.');
      console.log('🔗 Guest link generated:', guestUrl);
    }).catch(err => {
      // Fallback if clipboard API fails
      prompt('📋 Copy this Guest Link:', guestUrl);
    });
  });
}

// Generate or get persistent user ID
function getUserId() {
  let userId = localStorage.getItem('virtualOfficeUserId');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('virtualOfficeUserId', userId);
  }
  return userId;
}

// Load saved furniture and room colors from localStorage
function loadSavedDecorations() {
  try {
    const savedFurniture = localStorage.getItem('virtualOfficeFurniture');
    const savedColors = localStorage.getItem('virtualOfficeRoomColors');
    const savedCustomObjects = localStorage.getItem('virtualOfficeCustomObjects');
    const savedFloorTypes = localStorage.getItem('virtualOfficeFloorTypes');
    const savedTileFloors = localStorage.getItem('virtualOfficeTileFloors');

    console.log('📂 Loading decorations from localStorage...');

    if (savedFurniture) {
      furniture = JSON.parse(savedFurniture);
      console.log('🛋️ Loaded', furniture.length, 'saved objects');
    } else {
      console.log('🛋️ No saved furniture found');
    }

    if (savedColors) {
      customRoomColors = JSON.parse(savedColors);
      console.log('🎨 Loaded', Object.keys(customRoomColors).length, 'room colors');
    } else {
      console.log('🎨 No saved room colors found');
    }

    if (savedCustomObjects) {
      customObjects = JSON.parse(savedCustomObjects);
      console.log('📸 Loaded', Object.keys(customObjects).length, 'custom object categories');
    } else {
      console.log('📸 No saved custom objects found');
    }

    if (savedFloorTypes) {
      customRoomFloorTypes = JSON.parse(savedFloorTypes);
      console.log('🟫 Loaded', Object.keys(customRoomFloorTypes).length, 'room floor types');
    } else {
      console.log('🟫 No saved floor types found');
    }

    if (savedTileFloors) {
      customTileFloors = JSON.parse(savedTileFloors);
      console.log('🔲 Loaded', Object.keys(customTileFloors).length, 'tile floors');
    } else {
      console.log('🔲 No saved tile floors found');
    }
  } catch (error) {
    console.error('❌ Error loading saved decorations:', error);
  }
}

// Preload custom images into cache
function preloadCustomImages() {
  let imageCount = 0;
  let loadedCount = 0;

  // Preload from furniture
  furniture.forEach(obj => {
    if (obj.isCustomImage && obj.imageData && obj.customId) {
      if (!imageCache[obj.customId]) {
        imageCount++;
        const img = new Image();
        img.onload = () => {
          loadedCount++;
          console.log(`🖼️ Loaded custom image (${loadedCount}/${imageCount}):`, obj.name);
        };
        img.onerror = () => {
          console.error('❌ Failed to load custom image:', obj.name);
        };
        img.src = obj.imageData;
        imageCache[obj.customId] = img;
      }
    }
  });

  // Preload from customObjects
  Object.keys(customObjects).forEach(categoryId => {
    customObjects[categoryId].forEach(customItem => {
      if (customItem.imageData && customItem.customId) {
        if (!imageCache[customItem.customId]) {
          imageCount++;
          const img = new Image();
          img.onload = () => {
            loadedCount++;
            console.log(`🖼️ Loaded custom image (${loadedCount}/${imageCount}):`, customItem.name);
          };
          img.onerror = () => {
            console.error('❌ Failed to load custom image:', customItem.name);
          };
          img.src = customItem.imageData;
          imageCache[customItem.customId] = img;
        }
      }
    });
  });

  if (imageCount > 0) {
    console.log(`📸 Preloading ${imageCount} custom images...`);
  }
}

// Save furniture and room colors to SERVER (sync for everyone)
function saveDecorations() {
  try {
    const decorationData = {
      room: currentRoom,
      furniture: furniture,
      customRoomColors: customRoomColors,
      customRoomFloorTypes: customRoomFloorTypes,
      customTileFloors: customTileFloors,
      customObjects: customObjects
    };

    // Send to server for sync
    socket.emit('saveDecorations', decorationData);

    console.log('💾 Saving decorations to server (will sync to everyone):');
    console.log('  - Furniture:', furniture.length, 'items');
    console.log('  - Room colors:', Object.keys(customRoomColors).length, 'rooms');
    console.log('  - Floor types:', Object.keys(customRoomFloorTypes).length, 'rooms');
    console.log('  - Tile floors:', Object.keys(customTileFloors).length, 'tiles');
    console.log('  - Custom objects:', Object.keys(customObjects).length, 'categories');
  } catch (error) {
    console.error('❌ Error saving decorations:', error);
  }
}

// Check for saved login on page load
window.addEventListener('DOMContentLoaded', () => {
  // Load saved decorations first
  loadSavedDecorations();

  // Check for guest link parameter
  const urlParams = new URLSearchParams(window.location.search);
  const guestId = urlParams.get('guest');

  if (guestId) {
    // Guest must enter a name (don't auto-join)
    console.log('👤 Guest link detected - user must enter name');

    // Store guest ID for later use (THIS SESSION ONLY)
    sessionStorage.setItem('isGuest', 'true');
    sessionStorage.setItem('guestId', guestId);

    // Hide guest link button for guests
    if (guestLinkBtn) {
      guestLinkBtn.style.display = 'none';
    }

    // Change "Favorite" tab to "Guest" tab
    const favoriteSection = document.querySelector('.chat-section .section-header span:not(.expand-icon)');
    if (favoriteSection && favoriteSection.textContent === 'Favorite') {
      favoriteSection.textContent = 'Guest';
      console.log('🏷️ Changed Favorite tab to Guest tab');
    }

    // Pre-fill username input with placeholder
    usernameInput.placeholder = 'ใส่ชื่อของคุณ (Guest)';

    // Don't auto-join - let them enter their name
    return;
  } else {
    // Clear guest status if not accessing via guest link
    sessionStorage.removeItem('isGuest');
    sessionStorage.removeItem('guestId');
  }

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
        userId: userId,
        status: userStatus
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
socket.on('joinError', (data) => {
  alert(data.message);

  // Show login screen again
  document.getElementById('game-screen').classList.remove('active');
  document.getElementById('login-screen').classList.add('active');

  // Focus on username input
  usernameInput.focus();
  usernameInput.select();
});

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
  updateOnlinePlayersList();

  // Request decorations from server (synced for everyone)
  socket.emit('getDecorations', currentRoom);
  console.log('📡 Requesting decorations from server...');

  // Request chat history from server
  socket.emit('getChatHistory', { room: currentRoom, limit: 100 });
  console.log('📜 Requesting chat history from server...');

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

  // Center camera on player initially
  setTimeout(() => {
    if (currentPlayer) {
      const gameWidth = canvas.width;
      const gameHeight = canvas.height;
      const scaleX = gameWidth / WORLD_WIDTH;
      const scaleY = gameHeight / WORLD_HEIGHT;
      const baseScale = Math.min(scaleX, scaleY);
      const currentScale = baseScale * zoomLevel;

      const scaledWorldWidth = WORLD_WIDTH * currentScale;
      const scaledWorldHeight = WORLD_HEIGHT * currentScale;
      const baseOffsetX = (gameWidth - scaledWorldWidth) / 2;
      const baseOffsetY = (gameHeight - scaledWorldHeight) / 2;

      // Calculate where player currently is on screen (without camera offset)
      const playerScreenX = currentPlayer.x * currentScale + baseOffsetX;
      const playerScreenY = currentPlayer.y * currentScale + baseOffsetY;

      // Calculate where we want player to be (center of screen)
      const targetScreenX = gameWidth / 2;
      const targetScreenY = gameHeight / 2;

      // Set camera offset to center player
      cameraOffsetX = targetScreenX - playerScreenX;
      cameraOffsetY = targetScreenY - playerScreenY;

      // Clamp to prevent showing gray areas
      clampCameraOffset();

      console.log('📷 Camera centered on player');
    }
  }, 100);

  // Start game loop
  gameLoop();
});

socket.on('playerJoined', (playerData) => {
  if (playerData.id !== currentPlayer.id) {
    otherPlayers.set(playerData.id, new Player(playerData));
    console.log(`👋 ${playerData.username} joined the room`);
    updateOnlinePlayersList();
  }
});

socket.on('playerMoved', (data) => {
  const player = otherPlayers.get(data.id);
  if (player) {
    player.x = data.x;
    player.y = data.y;
    if (data.direction) player.direction = data.direction;
    if (data.isMoving !== undefined) player.isMoving = data.isMoving;
    if (data.runningLevel !== undefined) player.runningLevel = data.runningLevel;
    if (data.isJumping !== undefined) {
      player.isJumping = data.isJumping;
      if (data.jumpProgress !== undefined) {
        player.jumpProgress = data.jumpProgress;
      }
      if (data.jumpHeight !== undefined) {
        player.jumpHeight = data.jumpHeight;
      }
    }
  }
});

socket.on('playerStatusUpdated', (data) => {
  console.log('📥 Received playerStatusUpdated:', data);
  const player = otherPlayers.get(data.id);
  if (player) {
    player.status = data.status;
    console.log(`💬 ${player.username} updated status: "${data.status}"`);
    updateOnlinePlayersList();
  } else {
    console.warn('⚠️ Player not found in otherPlayers:', data.id);
  }
});

socket.on('playerColorUpdated', (data) => {
  console.log('📥 Received playerColorUpdated:', data);

  // Update current player if it's them
  if (currentPlayer && currentPlayer.id === data.id) {
    currentPlayer.color = data.color;
    console.log(`🎨 Updated own color: ${data.color}`);
  }

  // Update other player
  const player = otherPlayers.get(data.id);
  if (player) {
    player.color = data.color;
    console.log(`🎨 ${player.username} updated color: ${data.color}`);
    updateOnlinePlayersList();
  }
});

socket.on('playerLeft', (playerId) => {
  const player = otherPlayers.get(playerId);
  if (player) {
    console.log(`👋 ${player.username} left the room`);
    otherPlayers.delete(playerId);
    updateOnlinePlayersList();

    // Close WebRTC connection if exists
    closePeerConnection(playerId);
  }
});

socket.on('globalChat', (message) => {
  // Only add to sidebar if it's NOT from current player (to avoid duplicate)
  if (currentPlayer && message.playerId !== currentPlayer.id) {
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

    // Render to overlay
    renderChatOverlay();
  }

  // Show chat bubble above character if enabled
  if (chatSettings.showBubbles) {
    otherPlayers.forEach(player => {
      if (player.username === message.username) {
        player.showChatBubble(message.message);
      }
    });
  }
});

socket.on('proximityChat', (message) => {
  // Show chat bubble above character if enabled
  if (chatSettings.showBubbles) {
    otherPlayers.forEach(player => {
      if (player.username === message.username) {
        player.showChatBubble(message.message);
      }
    });
  }
});

socket.on('voiceChat', (message) => {
  // Play the audio
  const audio = new Audio(message.audio);
  audio.play().catch(err => console.error('Failed to play audio:', err));

  // Chat bubbles disabled - messages show in overlay only
  // otherPlayers.forEach(player => {
  //   if (player.username === message.username) {
  //     player.showChatBubble('🎤 Voice message');
  //   }
  // });

  console.log(`🔊 Playing voice message from ${message.username}`);
});

// ============ WebRTC Real-time Voice Chat Events ============

// Receive WebRTC offer from another player
socket.on('webrtc-offer', async ({ fromId, fromUsername, offer }) => {
  console.log(`📞 Received WebRTC offer from ${fromUsername} (${fromId})`);

  // CRITICAL: Never accept offer from yourself
  if (fromId === socket.id) {
    console.error(`⚠️ Received offer from self! Ignoring.`);
    return;
  }

  try {
    // Make sure we have local stream before accepting connection
    if (isMicEnabled && !localStream) {
      console.log('⚠️ Mic enabled but no local stream, initializing...');
      await initMicrophone();
    }

    // Close existing connection if any and create fresh one
    if (peerConnections.has(fromId)) {
      console.log(`🔄 Recreating connection with ${fromId}`);
      closePeerConnection(fromId);
    }

    // Create new peer connection
    const peerConnection = await createPeerConnection(fromId, fromUsername);

    // Set remote description
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // Make sure we add our audio track if mic is enabled
    if (isMicEnabled && localStream) {
      const senders = peerConnection.getSenders();
      const hasAudioSender = senders.some(sender => sender.track?.kind === 'audio');

      if (!hasAudioSender) {
        console.log(`➕ Adding audio track to answer for ${fromId}`);
        localStream.getAudioTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });
      }
    }

    // Create answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    // Send answer back
    socket.emit('webrtc-answer', {
      targetId: fromId,
      answer: answer
    });

    console.log(`📞 Sent WebRTC answer to ${fromUsername}`);
  } catch (error) {
    console.error('❌ Error handling WebRTC offer:', error);
  }
});

// Receive WebRTC answer from another player
socket.on('webrtc-answer', async ({ fromId, answer }) => {
  console.log(`📞 Received WebRTC answer from ${fromId}`);

  try {
    const peerConnection = peerConnections.get(fromId);
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`✅ WebRTC connection established with ${fromId}`);
    }
  } catch (error) {
    console.error('❌ Error handling WebRTC answer:', error);
  }
});

// Receive ICE candidate from another player
socket.on('webrtc-ice-candidate', async ({ fromId, candidate }) => {
  try {
    const peerConnection = peerConnections.get(fromId);
    if (peerConnection && candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  } catch (error) {
    console.error('❌ Error adding ICE candidate:', error);
  }
});

// ============ Screen Share WebRTC Events ============

// Someone started screen sharing
socket.on('user-started-screen-share', ({ userId, username }) => {
  console.log(`🖥️ ${username} started screen sharing`);
});

// Someone stopped screen sharing
socket.on('user-stopped-screen-share', ({ userId }) => {
  console.log(`🖥️ User ${userId} stopped screen sharing`);
  // Close modal if viewing this user's screen
  const screenShareModal = document.getElementById('screen-share-modal');
  if (screenShareModal && screenShareModal.classList.contains('active')) {
    screenShareModal.classList.remove('active');
  }
});

// Receive screen share offer
socket.on('screen-share-offer', async ({ fromId, fromUsername, offer }) => {
  console.log(`🖥️ Received screen share offer from ${fromUsername}`);

  try {
    const peerConnection = new RTCPeerConnection(iceServers);

    // Handle incoming screen track
    peerConnection.ontrack = (event) => {
      console.log(`📺 Received screen track from ${fromUsername}`);
      const stream = event.streams[0];

      // Display the screen share
      screenShareVideo.srcObject = stream;
      screenSharerName.textContent = fromUsername;
      screenShareModal.classList.add('active');
    };

    // ICE candidate handling
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('screen-share-ice-candidate', {
          targetId: fromId,
          candidate: event.candidate
        });
      }
    };

    // Set remote description and create answer
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    // Send answer back
    socket.emit('screen-share-answer', {
      targetId: fromId,
      answer: answer
    });

    // Store peer connection
    screenPeerConnections.set(fromId, peerConnection);

    console.log(`✅ Screen share connection established with ${fromUsername}`);
  } catch (error) {
    console.error('❌ Error handling screen share offer:', error);
  }
});

// Receive screen share answer
socket.on('screen-share-answer', async ({ fromId, answer }) => {
  console.log(`🖥️ Received screen share answer from ${fromId}`);

  try {
    const peerConnection = screenPeerConnections.get(fromId);
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`✅ Screen share connection established with ${fromId}`);
    }
  } catch (error) {
    console.error('❌ Error handling screen share answer:', error);
  }
});

// Receive screen share ICE candidate
socket.on('screen-share-ice-candidate', async ({ fromId, candidate }) => {
  try {
    const peerConnection = screenPeerConnections.get(fromId);
    if (peerConnection && candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  } catch (error) {
    console.error('❌ Error adding screen share ICE candidate:', error);
  }
});

// ============ WebRTC Functions ============

// Initialize microphone stream
async function initMicrophone() {
  try {
    if (!localStream) {
      console.log('🎤 Requesting microphone access...');
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log('✅ Microphone access granted!');
    }
    return localStream;
  } catch (error) {
    console.error('❌ Failed to access microphone:', error);
    throw error;
  }
}

// Create peer connection with another player
async function createPeerConnection(peerId, peerUsername) {
  console.log(`🔗 Creating peer connection with ${peerUsername} (${peerId})`);

  const peerConnection = new RTCPeerConnection(iceServers);

  // Add local audio track if mic is enabled
  if (localStream && isMicEnabled) {
    localStream.getAudioTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
      console.log(`🎵 Added local audio track to peer ${peerId}`);
    });
  }

  // Handle incoming audio tracks
  peerConnection.ontrack = (event) => {
    console.log(`🎵 Received remote audio track from ${peerId}`);

    // CRITICAL: Make sure this is not our own track somehow
    if (event.streams[0] === localStream) {
      console.error(`⚠️ Received own stream back! This should not happen!`);
      return;
    }

    // Log stream info for debugging
    const stream = event.streams[0];
    const audioTracks = stream.getAudioTracks();
    console.log(`   Stream ID: ${stream.id}`);
    console.log(`   Audio tracks: ${audioTracks.length}`);
    audioTracks.forEach((track, idx) => {
      console.log(`   Track ${idx}: ${track.label}, enabled: ${track.enabled}`);
    });

    // Create or get audio element for this peer
    let audioElement = remoteAudioElements.get(peerId);
    if (!audioElement) {
      audioElement = new Audio();
      audioElement.autoplay = true;
      audioElement.volume = 1.0;
      // IMPORTANT: Don't mute - we want to hear remote audio
      audioElement.muted = false;
      remoteAudioElements.set(peerId, audioElement);
    }

    audioElement.srcObject = stream;

    // Try to play and log any errors
    audioElement.play()
      .then(() => {
        console.log(`✅ Playing audio from ${peerId} (volume: ${audioElement.volume}, muted: ${audioElement.muted})`);
      })
      .catch(err => {
        console.error(`❌ Failed to play audio from ${peerId}:`, err);
        // Retry on user interaction
        document.addEventListener('click', () => {
          audioElement.play().catch(e => console.error('Retry failed:', e));
        }, { once: true });
      });
  };

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log(`🧊 Sending ICE candidate to ${peerId}: ${event.candidate.type} (${event.candidate.protocol})`);
      socket.emit('webrtc-ice-candidate', {
        targetId: peerId,
        candidate: event.candidate
      });
    } else {
      console.log(`✅ ICE gathering complete for ${peerId}`);
    }
  };

  // Handle ICE gathering state
  peerConnection.onicegatheringstatechange = () => {
    console.log(`📡 ICE gathering state with ${peerId}: ${peerConnection.iceGatheringState}`);
  };

  // Handle ICE connection state changes
  peerConnection.oniceconnectionstatechange = () => {
    console.log(`🧊 ICE connection state with ${peerId}: ${peerConnection.iceConnectionState}`);
  };

  // Handle connection state changes
  peerConnection.onconnectionstatechange = () => {
    console.log(`🔗 Connection state with ${peerId}: ${peerConnection.connectionState}`);

    if (peerConnection.connectionState === 'failed') {
      console.error(`❌ Connection failed with ${peerId} - will retry...`);
      // Don't close immediately on failed, let it retry
      setTimeout(() => {
        if (peerConnection.connectionState === 'failed') {
          closePeerConnection(peerId);
        }
      }, 2000);
    } else if (peerConnection.connectionState === 'disconnected' ||
               peerConnection.connectionState === 'closed') {
      closePeerConnection(peerId);
    } else if (peerConnection.connectionState === 'connected') {
      console.log(`✅ Successfully connected to ${peerId}`);
    }
  };

  peerConnections.set(peerId, peerConnection);
  return peerConnection;
}

// Close peer connection
function closePeerConnection(peerId) {
  console.log(`🔌 Closing peer connection with ${peerId}`);

  const peerConnection = peerConnections.get(peerId);
  if (peerConnection) {
    peerConnection.close();
    peerConnections.delete(peerId);
  }

  const audioElement = remoteAudioElements.get(peerId);
  if (audioElement) {
    audioElement.srcObject = null;
    remoteAudioElements.delete(peerId);
  }
}

// Check if two players are within proximity (3 tiles = 300 pixels)
function isWithinProximity(player1, player2) {
  if (!player1 || !player2) return false;

  const dx = player1.x - player2.x;
  const dy = player1.y - player2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance <= PROXIMITY_DISTANCE;
}

// Update WebRTC connections based on proximity
async function updateProximityConnections() {
  if (!currentPlayer) return;

  // Get all other players in the room
  otherPlayers.forEach(async (otherPlayer, playerId) => {
    // CRITICAL: Never connect to yourself!
    if (playerId === socket.id) {
      console.warn('⚠️ Prevented connection to self!');
      return;
    }

    const isNearby = isWithinProximity(currentPlayer, otherPlayer);
    const hasConnection = peerConnections.has(playerId);

    if (isNearby && !hasConnection) {
      // Only create connection if we should be the initiator
      // Rule: Player with lower socket ID initiates the connection
      const shouldInitiate = socket.id < playerId;

      if (shouldInitiate) {
        // Player is nearby but no connection - create one
        console.log(`👥 ${otherPlayer.username} entered proximity - initiating connection (mic: ${isMicEnabled ? 'ON' : 'OFF'})...`);
        try {
          // Initialize microphone ONLY if mic is enabled
          if (isMicEnabled && !localStream) {
            console.log('⚠️ Initializing microphone for connection...');
            await initMicrophone();
          }

          const peerConnection = await createPeerConnection(playerId, otherPlayer.username);

          // Verify audio track is added (only if mic is enabled)
          const senders = peerConnection.getSenders();
          const hasAudioSender = senders.some(sender => sender.track?.kind === 'audio');
          console.log(`🎵 Audio track in offer: ${hasAudioSender ? 'Yes (mic ON)' : 'No (mic OFF - receive only)'}`);

          // Create and send offer
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);

          socket.emit('webrtc-offer', {
            targetId: playerId,
            offer: offer
          });

          console.log(`📤 Sent offer to ${otherPlayer.username}`);
        } catch (error) {
          console.error(`❌ Failed to connect to ${otherPlayer.username}:`, error);
        }
      } else {
        console.log(`⏳ Waiting for ${otherPlayer.username} to initiate connection...`);
      }
    } else if (!isNearby && hasConnection) {
      // Player left proximity - disconnect
      console.log(`👋 ${otherPlayer.username} left proximity - disconnecting...`);
      closePeerConnection(playerId);
    }
  });
}

// Debug function - Show current WebRTC connections
function debugConnections() {
  console.log('=== WebRTC Connection Status ===');
  console.log(`Mic enabled: ${isMicEnabled}`);
  console.log(`Local stream: ${localStream ? 'Yes' : 'No'}`);
  console.log(`Peer connections: ${peerConnections.size}`);

  peerConnections.forEach((pc, peerId) => {
    const player = otherPlayers.get(peerId);
    const username = player ? player.username : 'Unknown';
    console.log(`  - ${username} (${peerId}): ${pc.connectionState}`);
  });

  console.log(`Remote audio elements: ${remoteAudioElements.size}`);
  console.log('================================');
}

// Make it available globally for debugging
window.debugVoiceChat = debugConnections;

// Enable/Disable microphone
async function toggleMicrophone(enable) {
  try {
    if (enable) {
      // Initialize microphone
      await initMicrophone();
      isMicEnabled = true;

      // Enable audio tracks
      localStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });

      // Add tracks to existing peer connections and renegotiate
      for (const [peerId, peerConnection] of peerConnections) {
        const senders = peerConnection.getSenders();
        const audioSender = senders.find(sender => sender.track?.kind === 'audio');

        if (!audioSender && localStream) {
          // Add track
          localStream.getAudioTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
            console.log(`➕ Added audio track to connection with ${peerId}`);
          });

          // Renegotiate - create and send new offer
          try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('webrtc-offer', {
              targetId: peerId,
              offer: offer
            });
            console.log(`🔄 Sent renegotiation offer to ${peerId}`);
          } catch (err) {
            console.error(`❌ Failed to renegotiate with ${peerId}:`, err);
          }
        }
      }

      // Update proximity connections
      await updateProximityConnections();

      console.log('✅ Microphone enabled');
    } else {
      // Disable audio tracks (just mute, don't remove)
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
      }
      isMicEnabled = false;

      console.log('🔇 Microphone muted (still receiving audio from others)');
    }
  } catch (error) {
    console.error('❌ Error toggling microphone:', error);
    alert('ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้งานในเบราว์เซอร์');
  }
}

// Decoration sync events
socket.on('decorationsLoaded', (data) => {
  console.log('📦 Decorations loaded from server:', data);

  // Apply decorations from server
  furniture = data.furniture || [];
  customRoomColors = data.customRoomColors || {};
  customRoomFloorTypes = data.customRoomFloorTypes || {};
  customTileFloors = data.customTileFloors || {};
  customObjects = data.customObjects || {};

  console.log('✅ Applied decorations:');
  console.log('  - Furniture:', furniture.length, 'items');
  console.log('  - Room colors:', Object.keys(customRoomColors).length, 'rooms');
  console.log('  - Floor types:', Object.keys(customRoomFloorTypes).length, 'rooms');
  console.log('  - Tile floors:', Object.keys(customTileFloors).length, 'tiles');
  console.log('  - Custom objects:', Object.keys(customObjects).length, 'categories');

  // Preload custom images
  preloadCustomImages();

  // ❌ REMOVED: Auto-initialization of default furniture
  // Map will now start completely empty
  // if (furniture.length === 0) {
  //   initializeFurniture(currentRoom);
  //   console.log('🪑 Initialized default furniture');
  // }
});

// Chat history loaded from database
socket.on('chatHistoryLoaded', (data) => {
  console.log('📜 Chat history loaded from server:', data.length, 'messages');

  // Replace local chatHistory with server data
  chatHistory = data;

  // Also save to localStorage as backup
  localStorage.setItem('virtualOfficeChatHistory', JSON.stringify(chatHistory));

  console.log('✅ Chat history synced from database');
});

socket.on('decorationsUpdated', (data) => {
  console.log('🔄 Decorations updated by:', data.updatedBy);

  // Apply updated decorations
  furniture = data.furniture || [];
  customRoomColors = data.customRoomColors || {};
  customRoomFloorTypes = data.customRoomFloorTypes || {};
  customTileFloors = data.customTileFloors || {};
  customObjects = data.customObjects || {};

  console.log('✅ Map updated! Everyone can see it now.');
  console.log('  - Updated by:', data.updatedBy);
  console.log('  - Furniture:', furniture.length, 'items');

  // Preload any new custom images
  preloadCustomImages();
});

socket.on('decorationsError', (error) => {
  console.error('❌ Decoration sync error:', error.message);
  alert('⚠️ Failed to sync decorations: ' + error.message);
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

  // Don't reinitialize furniture when switching rooms on unified map
  // Furniture is persistent across all rooms

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

  // Map arrow keys to WASD
  let mappedKey = key;
  if (key === 'arrowup') mappedKey = 'w';
  else if (key === 'arrowdown') mappedKey = 's';
  else if (key === 'arrowleft') mappedKey = 'a';
  else if (key === 'arrowright') mappedKey = 'd';

  // Track key press time for running mechanic
  if (!keys[mappedKey]) {
    keys[mappedKey] = true;
    keyPressTime[mappedKey] = Date.now();
  }

  // Log movement keys
  if (['w', 'a', 's', 'd'].includes(mappedKey)) {
    console.log('⌨️ Key pressed:', mappedKey, key !== mappedKey ? `(from ${key})` : '');
  }

  // Prevent default browser behavior for arrow keys
  if (key.startsWith('arrow')) {
    e.preventDefault();
  }

  // Focus chat on Enter
  if (e.key === 'Enter') {
    chatInput.focus();
    e.preventDefault();
  }

  // Jump on Space bar or Shift key
  if (e.key === ' ' || e.key === 'Shift') {
    console.log('🚀 Jump key pressed!', e.key, 'currentPlayer:', !!currentPlayer, 'isJumping:', currentPlayer?.isJumping, 'isMoving:', currentPlayer?.isMoving);
    if (currentPlayer && !currentPlayer.isJumping) {
      currentPlayer.startJump();
      e.preventDefault();
    }
  }

  // Respawn on Cmd/Ctrl + H (Home)
  if ((e.key === 'h' || e.key === 'H') && (e.metaKey || e.ctrlKey) && currentPlayer) {
    currentPlayer.respawn();
    console.log('🏠 Cmd/Ctrl+H: Teleporting to spawn point');
    e.preventDefault();
  }

  // Emergency reset on Escape key (cancel jump, reset states)
  if (e.key === 'Escape' && currentPlayer) {
    console.log('🆘 Emergency reset triggered!');

    // Reset ALL states completely
    currentPlayer.isJumping = false;
    currentPlayer.jumpProgress = 0;
    currentPlayer.jumpStartX = 0;
    currentPlayer.jumpStartY = 0;
    currentPlayer.jumpTargetX = 0;
    currentPlayer.jumpTargetY = 0;
    currentPlayer.jumpHeight = 0;
    currentPlayer.isMoving = false;
    currentPlayer.walkFrame = 0;

    // Clear targets and keys
    targetPosition = null;
    keys = {};

    console.log('🆘 All states reset! You can move now.');
    e.preventDefault();
  }

  // Open room selector on Cmd/Ctrl + R
  if ((e.key === 'r' || e.key === 'R') && (e.metaKey || e.ctrlKey)) {
    showRoomSelector();
    console.log('🚪 Cmd/Ctrl+R: Opening room selector');
    e.preventDefault();
  }
  // Remove object/floor on R (in edit mode only, without Cmd/Ctrl)
  else if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) {
    // If in edit mode and hovering over an object, remove it
    if (isEditingObjects && hoveredObject) {
      const index = tempFurniture.indexOf(hoveredObject);
      if (index > -1) {
        const removedObj = tempFurniture.splice(index, 1)[0];
        const objName = removedObj.name || removedObj.type || 'Custom Object';
        console.log('🗑️ Removed object:', objName, '- Remember to Save!');
        hoveredObject = null;
      }
      e.preventDefault();
    }
    // If in edit mode and hovering over a floor, remove it
    else if (isEditingObjects && hoveredFloor) {
      if (hoveredFloor.type === 'tile') {
        delete tempCustomTileFloors[hoveredFloor.id];
        console.log('🗑️ Removed tile floor:', hoveredFloor.id, '- Remember to Save!');
      } else if (hoveredFloor.type === 'room') {
        delete tempCustomRoomFloorTypes[hoveredFloor.id];
        delete tempCustomRoomColors[hoveredFloor.id];
        console.log('🗑️ Removed room floor:', hoveredFloor.id, '- Remember to Save!');
      }
      hoveredFloor = null;
      e.preventDefault();
    }
  }

  // Toggle blocking mode on B (in edit mode)
  if ((e.key === 'b' || e.key === 'B') && isEditingObjects && selectedObject) {
    // Don't toggle for partitions (always blocking)
    if (selectedObject.isPartition) {
      console.log('🧱 Walls/Partitions are always blocking');
      return;
    }

    // Toggle blocking state
    selectedObject.isBlocking = !selectedObject.isBlocking;

    const mode = selectedObject.isBlocking ? '🔴 BLOCKING' : '🟢 BACKGROUND';
    console.log(`🔄 Toggled to ${mode} mode`);
    console.log(`   - Objects will ${selectedObject.isBlocking ? 'BLOCK movement' : 'be WALKABLE (background)'}`);

    e.preventDefault();
  }

  // Toggle tile/room floor mode on F (in edit mode)
  if ((e.key === 'f' || e.key === 'F') && isEditingObjects && selectedFloorType) {
    floorMode = floorMode === 'room' ? 'tile' : 'room';
    console.log('🔄 Floor mode:', floorMode === 'room' ? '🏠 Room (whole room)' : '🔲 Tile (individual tiles)');
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  // Don't capture keys if typing in chat
  if (document.activeElement === chatInput) {
    return;
  }

  const key = e.key.toLowerCase();

  // Map arrow keys to WASD
  let mappedKey = key;
  if (key === 'arrowup') mappedKey = 'w';
  else if (key === 'arrowdown') mappedKey = 's';
  else if (key === 'arrowleft') mappedKey = 'a';
  else if (key === 'arrowright') mappedKey = 'd';

  keys[mappedKey] = false;
  delete keyPressTime[mappedKey]; // Reset key press time

  // Reset running state when releasing movement keys
  if (['w', 'a', 's', 'd'].includes(mappedKey)) {
    if (currentPlayer) {
      currentPlayer.isRunning = false;
      currentPlayer.runningLevel = 0;
      currentPlayer.speed = currentPlayer.baseSpeed;
    }
  }
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
    userId: getUserId(),
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

  // Save to database via socket
  if (socket && socket.connected) {
    socket.emit('saveChatMessage', historyItem);
  }

  // Also keep in localStorage as backup
  localStorage.setItem('virtualOfficeChatHistory', JSON.stringify(chatHistory));
}

async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  let finalMessage = message;

  // If translator mode is ON, translate and correct grammar with AI
  if (translatorMode && aiApiKey) {
    try {
      // Show loading indicator
      chatInput.value = '🤖 กำลังแปลและแก้ไวยากรณ์...';
      chatInput.disabled = true;

      // Translate and correct grammar to English
      finalMessage = await correctGrammar(message);

      // Re-enable input
      chatInput.disabled = false;
    } catch (error) {
      console.error('❌ AI translation error:', error);
      chatInput.disabled = false;
      // Continue with original message if translation fails
      finalMessage = message;
    }
  }

  // Save to history (save ORIGINAL message with translation if translator mode was used)
  if (translatorMode && aiApiKey && finalMessage !== message) {
    saveChatHistory(message, finalMessage); // Save original with translation
  } else {
    saveChatHistory(message); // Save original message only
  }

  // Add to sidebar chat (own message)
  sidebarChatMessages.push({
    username: currentPlayer ? currentPlayer.username : 'You',
    message: finalMessage,
    timestamp: new Date(),
    isOwn: true
  });

  // Keep only last 50 messages
  if (sidebarChatMessages.length > 50) {
    sidebarChatMessages.shift();
  }

  // Render to overlay
  renderChatOverlay();

  // Always send as global chat (visible to everyone in room)
  socket.emit('globalChat', finalMessage);

  // Show chat bubble above character if enabled
  if (currentPlayer && chatSettings.showBubbles) {
    currentPlayer.showChatBubble(finalMessage);
  }

  // Clear input and keep focus for quick consecutive messages
  chatInput.value = '';
  chatInput.focus();
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
  // Remove active from all sidebar items
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.remove('active');
  });

  // Add active to history button
  historyBtn.classList.add('active');

  displayChatHistory();
  historyModal.classList.add('active');
});

closeHistoryBtn.addEventListener('click', () => {
  // Remove active from history button
  historyBtn.classList.remove('active');
  historyModal.classList.remove('active');
});

// Settings modal close button
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
if (closeSettingsBtn && settingsModal) {
  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('active');
    // Save AI API key when closing settings
    const aiKeyInput = document.getElementById('ai-api-key-input');
    if (aiKeyInput && aiKeyInput.value) {
      aiApiKey = aiKeyInput.value;
      localStorage.setItem('virtualOfficeAiApiKey', aiApiKey);
      console.log('✅ AI API Key saved');
    }
  });
}

// Load AI API key on page load
const savedAiKey = localStorage.getItem('virtualOfficeAiApiKey');
if (savedAiKey) {
  aiApiKey = savedAiKey;
  const aiKeyInput = document.getElementById('ai-api-key-input');
  if (aiKeyInput) {
    aiKeyInput.value = savedAiKey;
  }
  console.log('🔑 AI API Key loaded');
}

// Status message functionality
let userStatus = '';

// Load status from localStorage (but NOT for guests)
const isGuest = sessionStorage.getItem('isGuest') === 'true';
if (!isGuest) {
  const savedStatus = localStorage.getItem('virtualOfficeStatus');
  if (savedStatus) {
    userStatus = savedStatus;
    const statusInput = document.getElementById('status-input');
    if (statusInput) {
      statusInput.value = savedStatus;
    }
    console.log('💬 Status loaded:', userStatus);
  }
} else {
  console.log('👤 Guest user - no status loaded');
}

// Save status when closing settings
const statusInput = document.getElementById('status-input');
if (statusInput) {
  // Save on blur (when user clicks outside)
  statusInput.addEventListener('blur', () => {
    userStatus = statusInput.value.trim();
    localStorage.setItem('virtualOfficeStatus', userStatus);

    // Update current player's status
    if (currentPlayer) {
      currentPlayer.status = userStatus;
    }

    // Broadcast status update to server if connected
    if (socket && socket.connected && currentPlayer) {
      socket.emit('updateStatus', { status: userStatus });
      console.log('💬 Status updated and sent to server:', userStatus);
    }
  });

  // Also save on Enter key
  statusInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      statusInput.blur(); // Trigger blur event
    }
  });
}

// Helper function to convert HSL to HEX
function hslToHex(hsl) {
  // Parse HSL string like "hsl(120, 70%, 60%)"
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return '#000000';

  const h = parseInt(match[1]);
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (n) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Helper function to convert HEX to HSL
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

// Profile Modal functionality
const profileBtn = document.getElementById('profile-btn');
const profileModal = document.getElementById('profile-modal');
const closeProfileBtn = document.getElementById('close-profile-btn');
const saveProfileBtn = document.getElementById('save-profile-btn');
const profileUsername = document.getElementById('profile-username');
const profileStatusInput = document.getElementById('profile-status-input');
const colorPicker = document.getElementById('color-picker');
const currentColorDisplay = document.getElementById('current-color-display');
let selectedPlayerColor = null;

// Get hair color based on body color (standalone function)
function getHairColorPreview(bodyColor) {
  const colors = ['#2c1810', '#6b4423', '#8b6f47', '#3d2817', '#1a0f08'];
  let hash = 0;
  for (let i = 0; i < bodyColor.length; i++) {
    hash = bodyColor.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Draw full character preview on canvas (same as in-game)
function drawCharacterPreview(canvas, direction, color) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  const x = width / 2;
  const y = height / 2 + 10;
  const scale = 0.8;

  const bodyWidth = 24 * scale;
  const bodyHeight = 30 * scale;
  const headSize = 22 * scale;

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(x - bodyWidth/2, y, bodyWidth, bodyHeight);

  // Arms
  ctx.strokeStyle = color;
  ctx.lineWidth = 5 * scale;
  ctx.lineCap = 'round';

  // Left arm
  ctx.beginPath();
  ctx.moveTo(x - bodyWidth/2, y + 5 * scale);
  ctx.lineTo(x - bodyWidth/2 - 3 * scale, y + 15 * scale);
  ctx.stroke();

  // Right arm
  ctx.beginPath();
  ctx.moveTo(x + bodyWidth/2, y + 5 * scale);
  ctx.lineTo(x + bodyWidth/2 + 3 * scale, y + 15 * scale);
  ctx.stroke();

  // Head
  ctx.fillStyle = '#ffdbac';
  ctx.beginPath();
  ctx.arc(x, y - 5 * scale, headSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  // Hair
  ctx.fillStyle = getHairColorPreview(color);

  if (direction === 'up') {
    // Full hair visible from behind
    ctx.beginPath();
    ctx.arc(x, y - 5 * scale, headSize * 0.95, 0, Math.PI * 2);
    ctx.fill();
  } else if (direction === 'left') {
    // Hair on top
    ctx.beginPath();
    ctx.arc(x, y - 8 * scale, headSize * 0.9, Math.PI, 2 * Math.PI);
    ctx.fill();
    // Hair on back of head (right side)
    ctx.beginPath();
    ctx.arc(x, y - 5 * scale, headSize * 0.95, -Math.PI/2, Math.PI/2);
    ctx.fill();
  } else if (direction === 'right') {
    // Hair on top
    ctx.beginPath();
    ctx.arc(x, y - 8 * scale, headSize * 0.9, Math.PI, 2 * Math.PI);
    ctx.fill();
    // Hair on back of head (left side)
    ctx.beginPath();
    ctx.arc(x, y - 5 * scale, headSize * 0.95, Math.PI/2, Math.PI * 1.5);
    ctx.fill();
  } else {
    // Front view (down) - Hair on top only
    ctx.beginPath();
    ctx.arc(x, y - 8 * scale, headSize * 0.9, Math.PI, 2 * Math.PI);
    ctx.fill();
  }

  // Face
  const faceY = y - 5 * scale;
  ctx.fillStyle = '#333';

  if (direction !== 'up') {
    if (direction === 'down') {
      // Front view - two eyes
      ctx.fillRect(x - 7 * scale, faceY + 0 * scale, 5 * scale, 3 * scale);
      ctx.fillRect(x + 2 * scale, faceY + 0 * scale, 5 * scale, 3 * scale);
    } else if (direction === 'left') {
      // Side profile - left
      ctx.fillRect(x - 12 * scale, faceY + 0 * scale, 5 * scale, 3 * scale);

      // Nose (profile pointing left)
      ctx.beginPath();
      ctx.moveTo(x - 14 * scale, faceY + 2 * scale);
      ctx.lineTo(x - 18 * scale, faceY + 4 * scale);
      ctx.lineTo(x - 14 * scale, faceY + 6 * scale);
      ctx.fillStyle = '#ffdbac';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1 * scale;
      ctx.stroke();

      // Mouth (side)
      ctx.fillStyle = '#333';
      ctx.fillRect(x - 16 * scale, faceY + 10 * scale, 5 * scale, 2 * scale);
    } else if (direction === 'right') {
      // Side profile - right
      ctx.fillRect(x + 7 * scale, faceY + 0 * scale, 5 * scale, 3 * scale);

      // Nose (profile pointing right)
      ctx.beginPath();
      ctx.moveTo(x + 14 * scale, faceY + 2 * scale);
      ctx.lineTo(x + 18 * scale, faceY + 4 * scale);
      ctx.lineTo(x + 14 * scale, faceY + 6 * scale);
      ctx.fillStyle = '#ffdbac';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1 * scale;
      ctx.stroke();

      // Mouth (side)
      ctx.fillStyle = '#333';
      ctx.fillRect(x + 11 * scale, faceY + 10 * scale, 5 * scale, 2 * scale);
    }
  }
}

// Update all character previews
function updateCharacterPreviews(color) {
  drawCharacterPreview(document.getElementById('preview-front'), 'down', color);
  drawCharacterPreview(document.getElementById('preview-back'), 'up', color);
  drawCharacterPreview(document.getElementById('preview-left'), 'left', color);
  drawCharacterPreview(document.getElementById('preview-right'), 'right', color);
}

// Open profile modal
if (profileBtn && profileModal) {
  profileBtn.addEventListener('click', () => {
    // Remove active from all sidebar items
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.classList.remove('active');
    });

    // Add active to profile button
    profileBtn.classList.add('active');

    // Load current player data
    if (currentPlayer) {
      profileUsername.textContent = currentPlayer.username;
      selectedPlayerColor = currentPlayer.color;

      // Load status
      profileStatusInput.value = userStatus;

      // Update color display and picker
      currentColorDisplay.style.background = currentPlayer.color;
      colorPicker.value = hslToHex(currentPlayer.color);

      // Initialize temp preview color
      tempPreviewColor = currentPlayer.color;

      // Update character previews
      updateCharacterPreviews(currentPlayer.color);
    }

    profileModal.classList.add('active');
  });
}

// Close profile modal
if (closeProfileBtn && profileModal) {
  closeProfileBtn.addEventListener('click', () => {
    profileBtn.classList.remove('active');
    profileModal.classList.remove('active');
  });
}

// Temporary color for preview (before confirmation)
let tempPreviewColor = null;

// Color picker change handler - only updates preview
if (colorPicker) {
  colorPicker.addEventListener('input', (e) => {
    const hexColor = e.target.value;
    const hslColor = hexToHsl(hexColor);

    // Store temporary color
    tempPreviewColor = hslColor;

    // Update character previews only (not the actual color)
    updateCharacterPreviews(hslColor);

    console.log('🎨 Preview color:', hslColor);
  });
}

// Confirm color button handler
const confirmColorBtn = document.getElementById('confirm-color-btn');
if (confirmColorBtn && currentColorDisplay) {
  confirmColorBtn.addEventListener('click', () => {
    if (tempPreviewColor) {
      // Update actual color
      selectedPlayerColor = tempPreviewColor;
      currentColorDisplay.style.background = tempPreviewColor;

      console.log('✓ Color confirmed:', selectedPlayerColor);

      // Show feedback
      confirmColorBtn.textContent = '✓ ยืนยันแล้ว!';
      confirmColorBtn.style.background = '#4caf50';

      setTimeout(() => {
        confirmColorBtn.textContent = '✓ ยืนยันสี';
        confirmColorBtn.style.background = '#667eea';
      }, 1000);
    }
  });
}

// Allow clicking on the color display to open picker
if (currentColorDisplay && colorPicker) {
  currentColorDisplay.addEventListener('click', () => {
    colorPicker.click();
  });
}

// Save profile button
if (saveProfileBtn) {
  saveProfileBtn.addEventListener('click', () => {
    // Update status
    const newStatus = profileStatusInput.value.trim();
    if (newStatus !== userStatus) {
      userStatus = newStatus;
      localStorage.setItem('virtualOfficeStatus', userStatus);

      // Update current player's status
      if (currentPlayer) {
        currentPlayer.status = userStatus;
      }

      // Also update the settings modal status input
      const settingsStatusInput = document.getElementById('status-input');
      if (settingsStatusInput) {
        settingsStatusInput.value = userStatus;
      }

      // Broadcast status update to server
      if (socket && socket.connected && currentPlayer) {
        socket.emit('updateStatus', { status: userStatus });
        console.log('💬 Status updated from profile:', userStatus);
        console.log('📍 Current room:', currentPlayer.room);
        console.log('👥 Other players in room:', otherPlayers.size);
      }
    }

    // Update color if changed
    if (selectedPlayerColor && currentPlayer && selectedPlayerColor !== currentPlayer.color) {
      currentPlayer.color = selectedPlayerColor;

      // Broadcast color update to server
      if (socket && socket.connected) {
        socket.emit('updateColor', { color: selectedPlayerColor });
        console.log('🎨 Color updated and sent to server:', selectedPlayerColor);
        console.log('📍 Current room:', currentPlayer.room);
        console.log('👥 Other players in room:', otherPlayers.size);
      }

      // Update the online players list to show new color
      updateOnlinePlayersList();
    }

    // Close modal
    profileBtn.classList.remove('active');
    profileModal.classList.remove('active');
  });
}

// Show names checkbox
const showNamesCheckbox = document.getElementById('show-names-checkbox');
if (showNamesCheckbox) {
  // Load saved setting
  showNamesCheckbox.checked = chatSettings.showNames || false;

  // Save when changed
  showNamesCheckbox.addEventListener('change', (e) => {
    chatSettings.showNames = e.target.checked;
    localStorage.setItem('virtualOfficeChatSettings', JSON.stringify(chatSettings));
    console.log('👤 Show names:', chatSettings.showNames ? 'ON' : 'OFF');
  });
}

// AI Grammar Correction Function
async function correctGrammar(text) {
  if (!aiApiKey) {
    console.error('❌ No AI API key set');
    return text;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a translation and grammar correction assistant. Translate the input text to English and correct the grammar. If the input is already in English, just correct the grammar. Return ONLY the corrected English text without any explanation or additional comments.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const correctedText = data.choices[0].message.content.trim();
    console.log('✅ Translated to English:', text, '→', correctedText);
    return correctedText;
  } catch (error) {
    console.error('❌ Translation failed:', error);
    alert('⚠️ ไม่สามารถแปลและแก้ไวยากรณ์ได้ กรุณาตรวจสอบ API Key');
    return text; // Return original text if translation fails
  }
}

// Correct English function for history items
async function correctEnglish(text) {
  if (!aiApiKey) {
    throw new Error('กรุณาตั้งค่า AI API Key ในเมนู Settings ก่อน (เปิดด้วยปุ่ม ⚙️)');
  }
  return await correctGrammar(text);
}

// Translator mode toggle button
const translatorBtn = document.getElementById('translator-btn');
if (translatorBtn) {
  translatorBtn.addEventListener('click', () => {
    translatorMode = !translatorMode;
    if (translatorMode) {
      translatorBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      translatorBtn.style.color = 'white';
      console.log('🤖 Translator mode: ON');

      // Check if API key is set
      if (!aiApiKey) {
        alert('⚠️ กรุณาตั้งค่า AI API Key ในเมนู Settings ก่อน');
        translatorMode = false;
        translatorBtn.style.background = '';
        translatorBtn.style.color = '';
      }
    } else {
      translatorBtn.style.background = '';
      translatorBtn.style.color = '';
      console.log('🤖 Translator mode: OFF');
    }
  });
}

// Settings sliders
fontSizeSlider.addEventListener('input', (e) => {
  const value = e.target.value;
  fontSizeValue.textContent = value;
  chatSettings.fontSize = parseInt(value);
  localStorage.setItem('virtualOfficeChatSettings', JSON.stringify(chatSettings));
});

// Zoom slider
const zoomSlider = document.getElementById('zoom-slider');
const zoomValue = document.getElementById('zoom-value');
if (zoomSlider && zoomValue) {
  // Load saved zoom level
  const savedZoom = localStorage.getItem('virtualOfficeZoomLevel');
  if (savedZoom) {
    zoomLevel = parseFloat(savedZoom);
    zoomSlider.value = Math.round(zoomLevel * 100);
    zoomValue.textContent = Math.round(zoomLevel * 100);
  }

  zoomSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    zoomValue.textContent = value;
    zoomLevel = value / 100; // Convert 100% to 1.0
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel));
    localStorage.setItem('virtualOfficeZoomLevel', zoomLevel.toString());
    clampCameraOffset(); // Adjust camera if needed
    console.log('🔍 Zoom set to:', value + '%', 'zoomLevel:', zoomLevel);
  });
}

displayTimeSlider.addEventListener('input', (e) => {
  const value = e.target.value;
  displayTimeValue.textContent = value;
  chatSettings.displayTime = parseInt(value);
  localStorage.setItem('virtualOfficeChatSettings', JSON.stringify(chatSettings));
});

// Show Chat Bubbles Checkbox
const showChatBubblesCheckbox = document.getElementById('show-chat-bubbles-checkbox');
if (showChatBubblesCheckbox) {
  // Set initial state from settings
  showChatBubblesCheckbox.checked = chatSettings.showBubbles;

  showChatBubblesCheckbox.addEventListener('change', (e) => {
    chatSettings.showBubbles = e.target.checked;
    localStorage.setItem('virtualOfficeChatSettings', JSON.stringify(chatSettings));
    console.log('💬 Chat bubbles:', chatSettings.showBubbles ? 'ENABLED' : 'DISABLED');
  });
}

// Mouse down - prepare for either pan or click-to-move
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) { // Left mouse button
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on UI buttons first (to prevent panning/click-to-move)
    let clickedOnUI = false;

    // Check respawn button
    if (canvas.respawnBtnBounds) {
      const btn = canvas.respawnBtnBounds;
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        clickedOnUI = true;
      }
    }

    // Check room list button
    if (canvas.roomListBtnBounds && !clickedOnUI) {
      const btn = canvas.roomListBtnBounds;
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        clickedOnUI = true;
      }
    }

    // Check object button
    if (canvas.objectBtnBounds && !clickedOnUI) {
      const btn = canvas.objectBtnBounds;
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        clickedOnUI = true;
      }
    }

    // Check settings button
    if (canvas.settingsIconBounds && !clickedOnUI) {
      const btn = canvas.settingsIconBounds;
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        clickedOnUI = true;
      }
    }

    // Check bottom menu buttons
    if (canvas.gestureBounds && !clickedOnUI) {
      const btn = canvas.gestureBounds;
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        clickedOnUI = true;
      }
    }

    if (canvas.roomButtonBounds && !clickedOnUI) {
      const btn = canvas.roomButtonBounds;
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        clickedOnUI = true;
      }
    }

    // If clicked on UI, don't do panning or click-to-move
    if (clickedOnUI) {
      return;
    }

    const worldPos = screenToWorld(x, y);

    // Check if clicked on gray area (outside game world)
    if (worldPos.x < 0 || worldPos.x > WORLD_WIDTH ||
        worldPos.y < 0 || worldPos.y > WORLD_HEIGHT) {
      // Clicked on gray area - start panning immediately
      clickedOnGrayArea = true;
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      panStartOffsetX = cameraOffsetX;
      panStartOffsetY = cameraOffsetY;
      canvas.style.cursor = 'grabbing';
    } else {
      // Clicked on game world - prepare for click-to-move
      clickedOnGrayArea = false;
    }
  } else if (e.button === 1) { // Middle mouse button - pan only
    e.preventDefault();
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panStartOffsetX = cameraOffsetX;
    panStartOffsetY = cameraOffsetY;
    canvas.style.cursor = 'grabbing';
  }
});

// Mouse move - panning
canvas.addEventListener('mousemove', (e) => {
  if (isPanning && (e.buttons === 1 || e.buttons === 4)) { // Left or middle button
    const deltaX = e.clientX - panStartX;
    const deltaY = e.clientY - panStartY;
    cameraOffsetX = panStartOffsetX + deltaX;
    cameraOffsetY = panStartOffsetY + deltaY;
    clampCameraOffset(); // Prevent showing gray areas
  }
});

// Mouse up - end panning
canvas.addEventListener('mouseup', (e) => {
  if ((e.button === 0 || e.button === 1) && isPanning) {
    isPanning = false;
    clickedOnGrayArea = false;
    canvas.style.cursor = 'default';
  }
});

// Mouse leave - stop panning
canvas.addEventListener('mouseleave', () => {
  if (isPanning) {
    isPanning = false;
    clickedOnGrayArea = false;
    canvas.style.cursor = 'default';
  }
});

// Helper function to classify message type
function getMessageType(text) {
  // Check if message contains any letters (Thai, English, or other alphabets)
  const hasLetters = /[a-zA-Z\u0E00-\u0E7F\u0080-\uFFFF]/.test(text);

  if (!hasLetters) {
    return 'numbers-special'; // Only numbers and special characters (no letters at all)
  }
  return 'text'; // Normal text message (Thai, English, or mixed)
}

// Helper function to extract words from text
function extractWords(text) {
  return text.split(/\s+/).filter(word => word.length > 0);
}

// Display chat history
function displayChatHistory() {
  const historyList = document.getElementById('history-list');
  historyList.innerHTML = '';

  if (chatHistory.length === 0) {
    historyList.innerHTML = '<p style="text-align:center;color:#999;">ยังไม่มีประวัติแชท</p>';
    return;
  }

  // Classify all messages by type
  const messagesByType = {
    text: [],
    'numbers-special': []
  };

  chatHistory.forEach(item => {
    const type = getMessageType(item.message);
    messagesByType[type].push(item);
  });

  // Create filter UI at top
  const filterDiv = document.createElement('div');
  filterDiv.style.cssText = 'background: #f0f0f0; padding: 15px; border-radius: 8px; margin-bottom: 20px;';
  filterDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h3 style="margin: 0; color: #667eea;">🔍 กรองชนิดข้อความ</h3>
      <button id="translate-all-btn" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
        🌐 แปลทั้งหมด
      </button>
    </div>
    <div style="display: flex; gap: 15px; margin-bottom: 10px; flex-wrap: wrap;">
      <label style="display: flex; align-items: center; cursor: pointer; padding: 8px 12px; background: white; border-radius: 6px;">
        <input type="checkbox" class="type-filter" value="text" checked style="margin-right: 8px; width: 18px; height: 18px;">
        <span style="font-size: 14px;">💬 ข้อความ (ไทย/EN) - ${messagesByType.text.length} ข้อความ</span>
      </label>
      <label style="display: flex; align-items: center; cursor: pointer; padding: 8px 12px; background: white; border-radius: 6px;">
        <input type="checkbox" class="type-filter" value="numbers-special" style="margin-right: 8px; width: 18px; height: 18px;">
        <span style="font-size: 14px;">🔢 ตัวเลข/อักขระพิเศษ - ${messagesByType['numbers-special'].length} ข้อความ</span>
      </label>
    </div>
    <div style="font-size: 12px; color: #666;">
      📊 แสดง: <span id="visible-count">${messagesByType.text.length}</span> / ${chatHistory.length} ข้อความ
    </div>
  `;

  historyList.appendChild(filterDiv);

  // Container for messages
  const messagesContainer = document.createElement('div');
  messagesContainer.id = 'messages-container';
  messagesContainer.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
  historyList.appendChild(messagesContainer);

  // Function to render messages based on filters
  function renderMessages() {
    const checkedTypes = Array.from(document.querySelectorAll('.type-filter:checked')).map(cb => cb.value);
    messagesContainer.innerHTML = '';

    let visibleCount = 0;

    chatHistory.forEach((item, index) => {
      const type = getMessageType(item.message);

      // Skip if type is not selected
      if (!checkedTypes.includes(type)) return;

      visibleCount++;

      const div = document.createElement('div');
      div.className = 'history-item';
      div.style.cssText = 'background: white; border-radius: 8px; border-left: 4px solid #667eea; overflow: hidden;';
      div.dataset.type = type;

      const time = new Date(item.timestamp).toLocaleString('th-TH');
      const hasTranslation = item.translation && item.translation !== item.message;

      div.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; min-height: 45px;">
          <!-- Left Column: Original Message -->
          <div style="padding: 8px 12px; border-right: 2px solid #e0e0e0; position: relative;">
            <button class="correct-btn" data-id="${item.id}" style="position: absolute; top: 6px; right: 8px; padding: 4px 8px; background: ${hasTranslation ? '#4caf50' : '#667eea'}; color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer;">
              ${hasTranslation ? '✅' : '✏️'}
            </button>
            <div style="font-size: 10px; color: #999; margin-bottom: 3px;">${time}</div>
            <div style="color: #333; font-size: 14px; line-height: 1.4; padding-right: 40px;">${item.message}</div>
          </div>
          <!-- Right Column: Translation -->
          <div style="padding: 8px 12px; background: ${hasTranslation ? '#f0f9ff' : '#f9f9f9'}; display: flex; align-items: center; position: relative;">
            ${hasTranslation ? `
              <div style="width: 100%;">
                <div style="font-size: 10px; color: #4caf50; font-weight: bold; margin-bottom: 3px;">
                  ✅ TRANSLATION
                  ${item.isNewTranslation ? '<span style="background: #ff5722; color: white; padding: 2px 6px; border-radius: 10px; font-size: 9px; margin-left: 6px;">🆕 NEW</span>' : ''}
                </div>
                <div style="font-size: 14px; color: #333; line-height: 1.4;">${item.translation}</div>
              </div>
            ` : `
              <div style="text-align: center; color: #999; font-size: 12px; width: 100%;">—</div>
            `}
          </div>
        </div>
      `;

      messagesContainer.appendChild(div);
    });

    // Update visible count
    document.getElementById('visible-count').textContent = visibleCount;

    // Check if all visible messages are translated
    const untranslatedCount = chatHistory.filter(item => {
      const type = getMessageType(item.message);
      return checkedTypes.includes(type) && !item.translation;
    }).length;

    // Update Translate All button state
    const translateAllBtn = document.getElementById('translate-all-btn');
    if (translateAllBtn) {
      if (untranslatedCount === 0) {
        translateAllBtn.disabled = true;
        translateAllBtn.style.opacity = '0.5';
        translateAllBtn.style.cursor = 'not-allowed';
        translateAllBtn.textContent = '✅ แปลครบแล้ว';
      } else {
        translateAllBtn.disabled = false;
        translateAllBtn.style.opacity = '1';
        translateAllBtn.style.cursor = 'pointer';
        translateAllBtn.textContent = `🌐 แปลทั้งหมด (${untranslatedCount})`;
      }
    }

    // Add event listeners for correct buttons
    document.querySelectorAll('.correct-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const button = e.target;
        const itemId = parseInt(button.dataset.id);

        // Find the item in chatHistory
        const historyIndex = chatHistory.findIndex(h => h.id === itemId);
        if (historyIndex === -1) {
          alert('❌ ไม่พบข้อความในประวัติ');
          return;
        }

        const item = chatHistory[historyIndex];

        // Disable button during translation
        button.disabled = true;
        const originalText = button.innerHTML;
        button.innerHTML = '⏳';

        try {
          const corrected = await correctEnglish(item.message);

          // Update chatHistory with the translation
          chatHistory[historyIndex].translation = corrected;
          chatHistory[historyIndex].isNewTranslation = true;
          localStorage.setItem('virtualOfficeChatHistory', JSON.stringify(chatHistory));

          // Update translation in database
          if (socket && socket.connected) {
            socket.emit('updateTranslation', {
              messageId: item.id,
              translation: corrected,
              isNewTranslation: true
            });
          }

          console.log('✅ Updated translation for:', item.message, '→', corrected);

          // Re-render to update Column 2
          renderMessages();
        } catch (error) {
          console.error('❌ Translation error:', error);
          alert('❌ เกิดข้อผิดพลาด: ' + error.message);
          button.disabled = false;
          button.innerHTML = originalText;
        }
      });
    });
  }

  // Initial render
  renderMessages();

  // Update when filters change
  document.querySelectorAll('.type-filter').forEach(checkbox => {
    checkbox.addEventListener('change', renderMessages);
  });

  // Translate all button
  const translateAllBtn = document.getElementById('translate-all-btn');
  let isTranslating = false;

  translateAllBtn.addEventListener('click', async () => {
    // Prevent multiple clicks
    if (isTranslating) {
      return;
    }

    const checkedTypes = Array.from(document.querySelectorAll('.type-filter:checked')).map(cb => cb.value);

    // Filter only messages that are visible AND have NOT been translated yet
    const untranslatedMessages = chatHistory.filter(item =>
      checkedTypes.includes(getMessageType(item.message)) &&
      !item.translation // Only messages without any translation
    );

    if (untranslatedMessages.length === 0) {
      alert('ไม่มีข้อความที่ยังไม่ได้แปล ข้อความทั้งหมดถูกแปลแล้ว');
      return;
    }

    isTranslating = true;
    translateAllBtn.disabled = true;

    let successCount = 0;
    let failCount = 0;

    // Translate each message individually
    for (let i = 0; i < untranslatedMessages.length; i++) {
      const item = untranslatedMessages[i];
      translateAllBtn.textContent = `⏳ กำลังแปล ${i + 1}/${untranslatedMessages.length}...`;

      try {
        const translated = await correctEnglish(item.message);

        // Find the item in chatHistory and update it
        const historyIndex = chatHistory.findIndex(h => h.id === item.id);
        if (historyIndex !== -1) {
          chatHistory[historyIndex].translation = translated;
          chatHistory[historyIndex].isNewTranslation = true; // Mark as new

          // Update translation in database
          if (socket && socket.connected) {
            socket.emit('updateTranslation', {
              messageId: item.id,
              translation: translated,
              isNewTranslation: true
            });
          }
        }

        successCount++;
      } catch (error) {
        console.error(`Failed to translate message ${i + 1}:`, error);
        failCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Save updated chatHistory to localStorage
    localStorage.setItem('virtualOfficeChatHistory', JSON.stringify(chatHistory));

    // Re-render messages to show new translations
    renderMessages();

    // Show completion message
    translateAllBtn.textContent = `✅ แปลเสร็จ: ${successCount} สำเร็จ${failCount > 0 ? `, ${failCount} ล้มเหลว` : ''}`;
    setTimeout(() => {
      translateAllBtn.disabled = false;
      translateAllBtn.textContent = '🌐 แปลทั้งหมด';
      isTranslating = false;
    }, 3000);
  });
}

// Microphone functionality - Voice Recording
async function startRecording() {
  try {
    console.log('🎤 Requesting microphone access...');
    console.log('📍 URL:', window.location.href);
    console.log('🌐 Protocol:', window.location.protocol);
    console.log('🖥️ Browser:', navigator.userAgent);
    console.log('🔍 Checking APIs:');
    console.log('  - navigator exists:', typeof navigator !== 'undefined');
    console.log('  - navigator.mediaDevices exists:', typeof navigator.mediaDevices !== 'undefined');
    console.log('  - navigator.mediaDevices value:', navigator.mediaDevices);
    console.log('  - getUserMedia exists:', navigator.mediaDevices ? typeof navigator.mediaDevices.getUserMedia !== 'undefined' : 'N/A');
    console.log('  - getUserMedia value:', navigator.mediaDevices ? navigator.mediaDevices.getUserMedia : 'N/A');

    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('⚠️ getUserMedia NOT available - Microphone disabled');
      console.warn('  - Requires HTTPS or localhost');
      console.warn('  - navigator.mediaDevices:', navigator.mediaDevices);
      console.warn('  - getUserMedia:', navigator.mediaDevices?.getUserMedia);

      // Show a non-intrusive notification instead of blocking alert
      const isHttps = window.location.protocol === 'https:';
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      if (!isHttps && !isLocalhost) {
        console.warn('💡 Microphone requires HTTPS connection');
        console.warn('📝 Current URL:', window.location.href);
        console.warn('🔧 To enable microphone:');
        console.warn('   1. Set up HTTPS/SSL on your server');
        console.warn('   2. Or use for testing: http://localhost:3000');
      }

      // Disable mic button visually
      if (micBtn) {
        micBtn.disabled = true;
        micBtn.style.opacity = '0.5';
        micBtn.style.cursor = 'not-allowed';
        micBtn.title = 'ไมโครโฟนต้องใช้ HTTPS';
      }

      return; // Exit gracefully without recording
    }

    console.log('✅ getUserMedia is available, requesting permission...');

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

        // Chat bubbles disabled - messages show in overlay only
        // if (currentPlayer) {
        //   currentPlayer.showChatBubble('🎤 Voice message');
        // }
        console.log('📤 Voice message sent!');
      };

      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    if (micBtn) {
      micBtn.classList.add('active');
      micBtn.style.background = '#f44336';
      micBtn.style.transform = 'scale(1.1)';
    }
    console.log('✅ Recording... Hold the button and speak!');
  } catch (error) {
    console.error('❌ Microphone error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Full error:', error);

    let errorMsg = '⚠️ ไม่สามารถเข้าถึงไมโครโฟนได้\n\n';
    errorMsg += '🔧 Error: ' + error.name + '\n';
    errorMsg += '📝 Message: ' + error.message + '\n\n';

    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMsg += '💡 วิธีแก้:\n\n';
      errorMsg += '1. คลิก 🔒 ข้าง URL\n';
      errorMsg += '2. "ตั้งค่าไซต์" → Microphone\n';
      errorMsg += '3. เปลี่ยนเป็น "อนุญาต"\n';
      errorMsg += '4. Refresh (F5) แล้วกดค้าง 🎤 อีกครั้ง\n\n';
      errorMsg += 'หรือลอง:\n';
      errorMsg += '• ปิดแอปอื่นที่ใช้ไมค์ (Zoom, Teams)\n';
      errorMsg += '• เปลี่ยนไมค์เริ่มต้นในระบบ';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMsg += '❌ ไม่พบไมโครโฟน!\n\n';
      errorMsg += 'ตรวจสอบ:\n';
      errorMsg += '• ไมค์เสียบอยู่?\n';
      errorMsg += '• ไมค์ทำงานในแอปอื่นได้?\n';
      errorMsg += '• ลองเปลี่ยนพอร์ต USB';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMsg += '⚠️ ไมค์ถูกใช้งานอยู่!\n\n';
      errorMsg += 'กรุณา:\n';
      errorMsg += '• ปิดแท็บอื่นที่ใช้ไมค์\n';
      errorMsg += '• ปิด Zoom, Teams, Discord\n';
      errorMsg += '• รีสตาร์ทเบราว์เซอร์';
    } else {
      errorMsg += '💡 ลองทำ:\n';
      errorMsg += '• Refresh (F5)\n';
      errorMsg += '• รีสตาร์ทเบราว์เซอร์\n';
      errorMsg += '• ตรวจสอบ Console (F12)';
    }

    // Log to console instead of showing blocking alert
    console.warn(errorMsg);

    // Disable mic button
    if (micBtn) {
      micBtn.disabled = true;
      micBtn.style.opacity = '0.5';
      micBtn.style.cursor = 'not-allowed';
      micBtn.title = 'ไมโครโฟนไม่พร้อมใช้งาน - ดู Console (F12)';
    }
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    if (micBtn) {
      micBtn.classList.remove('active');
      micBtn.style.background = '';
      micBtn.style.transform = '';
    }
    console.log('⏹️ Recording stopped');
  }
}

// Test microphone permissions first
async function testMicrophoneAccess() {
  // First check if getUserMedia is available
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('⚠️ เบราว์เซอร์ไม่รองรับการใช้ไมโครโฟน\nกรุณาใช้ Chrome, Edge, หรือ Safari เวอร์ชันล่าสุด');
    return false;
  }

  try {
    console.log('🎤 Requesting microphone access...');
    console.log('📍 Current URL:', window.location.href);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    console.log('✅ Microphone access granted!');
    return true;
  } catch (error) {
    console.error('❌ Microphone access denied:', error);
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);

    let message = '⚠️ ไม่สามารถเข้าถึงไมโครโฟนได้\n\n';

    // Check protocol
    const isHttps = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    message += '📍 URL: ' + window.location.href + '\n';
    message += '🔧 Error: ' + (error.name || error.message) + '\n\n';

    if (!isHttps && !isLocalhost) {
      message += '❌ ปัญหา: ไม่ใช่ HTTPS!\n\n';
      message += 'วิธีแก้:\n';
      message += '1. เปลี่ยนเป็น https://...\n';
      message += '2. หรือใช้ http://localhost แทน IP\n';
    } else {
      message += '💡 วิธีแก้:\n\n';
      message += '1️⃣ ตรวจสอบ Address Bar:\n';
      message += '   • มี popup ขออนุญาต? → กด "อนุญาต"\n';
      message += '   • คลิก 🔒 → Microphone → "อนุญาต"\n\n';

      message += '2️⃣ ตั้งค่าเบราว์เซอร์:\n';
      message += '   Chrome/Edge:\n';
      message += '   • พิมพ์: chrome://settings/content/microphone\n';
      message += '   • เพิ่ม http://localhost ใน "อนุญาต"\n\n';

      message += '3️⃣ ตรวจสอบระบบ:\n';
      message += '   • ไมค์เสียบอยู่?\n';
      message += '   • ไมค์ทำงานในแอปอื่นได้?\n';
      message += '   • ลองปิดแอปอื่นที่ใช้ไมค์\n\n';

      message += '4️⃣ หลังจากแก้:\n';
      message += '   • Refresh (F5)\n';
      message += '   • คลิก 🎤 อีกครั้ง';
    }

    alert(message);
    return false;
  }
}

// Controller buttons toggle
const controllerBtns = document.getElementById('controller-btns');
const settingsToggleBtn = document.getElementById('settings-toggle-btn');

// Settings button - Toggle between single button and 4 buttons
if (settingsToggleBtn && controllerBtns) {
  settingsToggleBtn.addEventListener('click', (e) => {
    // Hide settings button, show 4 controller buttons
    settingsToggleBtn.classList.add('hidden');
    controllerBtns.classList.remove('collapsed');
    console.log('⚙️ Settings expanded to 4 buttons');
    e.stopPropagation();
  });
}

// Click outside controller to collapse back to settings button
if (controllerBtns && settingsToggleBtn) {
  document.addEventListener('click', (e) => {
    const clickedInsideController = controllerBtns.contains(e.target);
    const clickedSettings = e.target === settingsToggleBtn;

    if (!clickedInsideController && !clickedSettings && !controllerBtns.classList.contains('collapsed')) {
      // Show settings button, hide 4 controller buttons
      controllerBtns.classList.add('collapsed');
      settingsToggleBtn.classList.remove('hidden');
      console.log('⚙️ Controller collapsed to settings button');
    }
  });
}

// Mic button - Click to toggle microphone on/off
let isMicOn = false;

if (micBtn) {
  micBtn.addEventListener('click', async (e) => {
    // Normal mic toggle (only works when expanded)
    if (isMicOn) {
      // Turn mic off
      await toggleMicrophone(false);
      isMicOn = false;
      micBtn.classList.remove('active');
      micBtn.title = 'คลิกเพื่อเปิดไมค์ (Real-time Voice Chat)';
      console.log('🎤 Microphone turned OFF');
    } else {
      // Turn mic on
      await toggleMicrophone(true);
      isMicOn = true;
      micBtn.classList.add('active');
      micBtn.title = 'คลิกเพื่อปิดไมค์ (Real-time Voice Chat)';
      console.log('🎤 Microphone turned ON');
    }
    e.stopPropagation();
  });
}

// Screen Share Feature
let screenStream = null;
let screenPeerConnections = new Map(); // Separate peer connections for screen sharing
let isScreenSharing = false;

const screenShareBtn = document.getElementById('screen-share-btn');
const screenShareModal = document.getElementById('screen-share-modal');
const screenShareVideo = document.getElementById('screen-share-video');
const closeScreenShareBtn = document.getElementById('close-screen-share-btn');
const screenSharerName = document.getElementById('screen-sharer-name');

// Start screen sharing
async function startScreenShare() {
  try {
    // Capture screen
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always',
        displaySurface: 'monitor'
      },
      audio: false
    });

    isScreenSharing = true;
    screenShareBtn.classList.add('active');
    screenShareBtn.title = 'หยุดแชร์หน้าจอ';

    console.log('🖥️ Screen sharing started');

    // Notify server that we're sharing screen
    socket.emit('start-screen-share');

    // Handle when user stops sharing via browser UI
    screenStream.getVideoTracks()[0].addEventListener('ended', () => {
      stopScreenShare();
    });

    // Send screen to all connected peers
    otherPlayers.forEach((player, peerId) => {
      createScreenSharePeerConnection(peerId);
    });

  } catch (error) {
    console.error('❌ Screen share error:', error);
    alert('ไม่สามารถแชร์หน้าจอได้ กรุณาอนุญาตการเข้าถึงหน้าจอ');
    isScreenSharing = false;
    screenShareBtn.classList.remove('active');
  }
}

// Stop screen sharing
function stopScreenShare() {
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;
  }

  // Close all screen share peer connections
  screenPeerConnections.forEach((pc) => {
    pc.close();
  });
  screenPeerConnections.clear();

  isScreenSharing = false;
  screenShareBtn.classList.remove('active');
  screenShareBtn.title = 'แชร์หน้าจอ';

  // Notify server
  socket.emit('stop-screen-share');

  console.log('🖥️ Screen sharing stopped');
}

// Create peer connection for screen sharing
async function createScreenSharePeerConnection(peerId) {
  if (!screenStream) return;

  const peerConnection = new RTCPeerConnection(iceServers);
  screenPeerConnections.set(peerId, peerConnection);

  // Add screen track to peer connection
  screenStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, screenStream);
    console.log(`📡 Added screen track to peer ${peerId}`);
  });

  // ICE candidate handling
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('screen-share-ice-candidate', {
        targetId: peerId,
        candidate: event.candidate
      });
    }
  };

  // Create and send offer
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('screen-share-offer', {
      targetId: peerId,
      offer: offer
    });
    console.log(`📤 Sent screen share offer to ${peerId}`);
  } catch (error) {
    console.error('Error creating screen share offer:', error);
  }
}

// Screen share button click handler
if (screenShareBtn) {
  screenShareBtn.addEventListener('click', async (e) => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      await startScreenShare();
    }
    e.stopPropagation();
  });
}

// Close screen share modal
if (closeScreenShareBtn) {
  closeScreenShareBtn.addEventListener('click', () => {
    screenShareModal.classList.remove('active');
    if (screenShareVideo.srcObject) {
      screenShareVideo.srcObject.getTracks().forEach(track => track.stop());
      screenShareVideo.srcObject = null;
    }
  });
}

// Voice-to-Text button - Click to start/stop speech recognition
const voiceToTextBtn = document.getElementById('voice-to-text-btn');

if (voiceToTextBtn && recognition) {
  voiceToTextBtn.addEventListener('click', (e) => {
    if (isListening) {
      // Stop listening
      recognition.stop();
      voiceToTextBtn.classList.remove('active');
      voiceToTextBtn.title = 'พูดเพื่อพิมพ์';
      console.log('🎙️ Voice-to-text stopped');
    } else {
      // Start listening
      try {
        recognition.start();
        voiceToTextBtn.classList.add('active');
        voiceToTextBtn.title = 'กำลังฟัง... (คลิกอีกครั้งเพื่อหยุด)';
        console.log('🎙️ Voice-to-text started');

        // Show hint if translator mode is on
        if (translatorMode && aiApiKey) {
          console.log('🌐 Translator mode ON: Speech will be auto-translated and sent');
        }
      } catch (error) {
        console.error('❌ Failed to start voice recognition:', error);
        voiceToTextBtn.classList.remove('active');
      }
    }
    e.stopPropagation();
  });

  // Update button state when recognition starts/stops
  if (recognition) {
    recognition.addEventListener('start', () => {
      voiceToTextBtn.classList.add('active');
    });

    recognition.addEventListener('end', () => {
      voiceToTextBtn.classList.remove('active');
      voiceToTextBtn.title = 'พูดเพื่อพิมพ์';
    });
  }
}

// Show warning if Speech Recognition not supported
if (!recognition && voiceToTextBtn) {
  voiceToTextBtn.disabled = true;
  voiceToTextBtn.style.opacity = '0.5';
  voiceToTextBtn.title = 'Browser นี้ไม่รองรับ Speech Recognition';
}

// Chat expand button logic - cycle through steps 0→1→2→3→0
const chatExpandBtn = document.getElementById('chat-expand-btn');
const chatMessagesOverlay = document.getElementById('chat-messages-overlay');
let currentStep = 0;

if (chatExpandBtn && chatMessagesOverlay) {
  chatExpandBtn.addEventListener('click', () => {
    // Remove current step class
    chatMessagesOverlay.classList.remove(`step-${currentStep}`);

    // Cycle to next step: 0 → 1 → 2 → 3 → 0
    currentStep = (currentStep + 1) % 4;

    // Add new step class
    chatMessagesOverlay.classList.add(`step-${currentStep}`);

    // Update button icon based on state
    if (currentStep === 0) {
      chatExpandBtn.textContent = '💬';
      chatExpandBtn.title = 'ขยาย Chat';
    } else {
      chatExpandBtn.textContent = '📊';
      chatExpandBtn.title = 'ย่อ Chat (Step ' + currentStep + '/3)';
    }

    console.log(`💬 Chat overlay expanded to step ${currentStep}`);
  });
}

// Chat resize handle - drag to resize overlay height
const chatResizeHandle = document.getElementById('chat-resize-handle');
let isResizingChat = false;
let resizeStartY = 0;
let resizeStartHeight = 0;

// Function to update resize handle position
function updateResizeHandlePosition() {
  if (!chatResizeHandle || !chatMessagesOverlay) return;

  const overlayHeight = chatMessagesOverlay.offsetHeight;
  const bottomOffset = 50; // bottom: 50px from CSS

  // Position handle at top of overlay
  chatResizeHandle.style.bottom = (bottomOffset + overlayHeight - 5) + 'px';

  // Show/hide handle based on overlay visibility
  if (overlayHeight > 0 && chatMessagesOverlay.children.length > 0) {
    chatResizeHandle.style.display = 'flex';
  } else {
    chatResizeHandle.style.display = 'none';
  }
}

if (chatResizeHandle && chatMessagesOverlay) {
  // Update position initially and on resize
  updateResizeHandlePosition();
  setInterval(updateResizeHandlePosition, 100); // Update position every 100ms

  chatResizeHandle.addEventListener('mousedown', (e) => {
    isResizingChat = true;
    resizeStartY = e.clientY;
    resizeStartHeight = chatMessagesOverlay.offsetHeight;
    e.preventDefault();
    console.log('📏 Started resizing chat overlay');
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizingChat) return;

    // Calculate new height (dragging up increases height, dragging down decreases)
    const deltaY = resizeStartY - e.clientY;
    const newHeight = Math.max(100, resizeStartHeight + deltaY);

    // Calculate maximum allowed height (window height - bottom position - 20px)
    const windowHeight = window.innerHeight;
    const bottomOffset = 50; // bottom: 50px from CSS
    const maxHeight = windowHeight - bottomOffset - 20; // +20px from bottom edge limit

    // Constrain height
    const constrainedHeight = Math.min(newHeight, maxHeight);

    // Apply new height
    chatMessagesOverlay.style.maxHeight = constrainedHeight + 'px';

    // Update handle position
    updateResizeHandlePosition();
  });

  document.addEventListener('mouseup', () => {
    if (isResizingChat) {
      isResizingChat = false;
      console.log('📏 Finished resizing chat overlay');
    }
  });

  // Close button - clear all messages and hide overlay
  const chatOverlayCloseBtn = document.getElementById('chat-overlay-close-btn');
  if (chatOverlayCloseBtn) {
    chatOverlayCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering resize
      sidebarChatMessages = []; // Clear message array
      chatMessagesOverlay.innerHTML = ''; // Clear all messages
      chatMessagesOverlay.style.display = 'none'; // Completely hide
      chatMessagesOverlay.style.maxHeight = '0px';
      updateResizeHandlePosition();
      console.log('✕ Chat overlay closed and hidden');
    });
  }
}

// Canvas mousedown for dragging objects or drawing partitions
canvas.addEventListener('mousedown', (e) => {
  // Only handle dragging in edit mode
  if (!isEditingObjects) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const worldPos = screenToWorld(x, y);

  if (worldPos.x >= 0 && worldPos.x <= WORLD_WIDTH &&
      worldPos.y >= 0 && worldPos.y <= WORLD_HEIGHT) {

    // Check if we're placing a partition - start drawing mode
    if (selectedObject && selectedObject.isPartition) {
      isDrawingPartition = true;
      partitionStartX = worldPos.x;
      partitionStartY = worldPos.y;
      canvas.style.cursor = 'crosshair';
      console.log('🧱 Started drawing partition from:', worldPos.x, worldPos.y);
      e.preventDefault();
      return;
    }

    // Otherwise, check if clicking on existing object to drag it
    const clickedObject = getTempObjectAtPosition(worldPos.x, worldPos.y);
    if (clickedObject) {
      // Start dragging this object
      draggingObject = clickedObject;
      dragOffsetX = worldPos.x - clickedObject.x;
      dragOffsetY = worldPos.y - clickedObject.y;
      canvas.style.cursor = 'grabbing';
      console.log('🖱️ Started dragging object:', clickedObject.name);
      e.preventDefault();
    }
  }
});

// Canvas click detection
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  console.log('🖱️ Click at:', x, y); // Debug log

  // Check if clicked on respawn button (TOP PRIORITY)
  if (canvas.respawnBtnBounds && currentPlayer) {
    const btn = canvas.respawnBtnBounds;
    console.log('🏠 Respawn button bounds:', btn);
    if (x >= btn.x && x <= btn.x + btn.width &&
        y >= btn.y && y <= btn.y + btn.height) {
      currentPlayer.respawn();
      console.log('🏠 Respawn button clicked!');
      return;
    }
  }

  // Check if clicked on room list button
  if (canvas.roomListBtnBounds) {
    const btn = canvas.roomListBtnBounds;
    console.log('🚪 Room list button bounds:', btn);
    if (x >= btn.x && x <= btn.x + btn.width &&
        y >= btn.y && y <= btn.y + btn.height) {
      console.log('🚪 Room list button clicked!');
      showRoomSelector();
      return;
    }
  }

  // Check if clicked on object button
  if (canvas.objectBtnBounds) {
    const btn = canvas.objectBtnBounds;
    console.log('🛋️ Object button bounds:', btn);
    if (x >= btn.x && x <= btn.x + btn.width &&
        y >= btn.y && y <= btn.y + btn.height) {
      console.log('🛋️ Object button clicked!');
      showObjectSelector();
      return;
    }
  }

  // Check if clicked on settings button
  if (canvas.settingsIconBounds) {
    const btn = canvas.settingsIconBounds;
    console.log('⚙️ Settings button bounds:', btn);
    if (x >= btn.x && x <= btn.x + btn.width &&
        y >= btn.y && y <= btn.y + btn.height) {
      console.log('⚙️ Settings button clicked!');
      const settingsModal = document.getElementById('settings-modal');
      if (settingsModal) {
        settingsModal.classList.add('active');
      }
      return;
    }
  }

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

  // Floor color painting mode
  if (isEditingObjects && selectedFloorColor && !clickedOnGrayArea) {
    const worldPos = screenToWorld(x, y);

    // Find which room was clicked
    const clickedRoom = detectRoom(worldPos.x, worldPos.y);
    if (clickedRoom && clickedRoom.id !== 'unknown') {
      tempCustomRoomColors[clickedRoom.id] = selectedFloorColor;
      console.log('🎨 Changed', clickedRoom.name, 'floor to', selectedFloorColor);
    }
    return;
  }

  // Floor type painting mode
  if (isEditingObjects && selectedFloorType && !clickedOnGrayArea) {
    const worldPos = screenToWorld(x, y);

    if (floorMode === 'room') {
      // Room mode: paint entire room
      const clickedRoom = detectRoom(worldPos.x, worldPos.y);
      if (clickedRoom && clickedRoom.id !== 'unknown') {
        tempCustomRoomFloorTypes[clickedRoom.id] = selectedFloorType;
        console.log('🟫 Changed', clickedRoom.name, 'floor type to', selectedFloorType);
      }
    } else {
      // Tile mode: paint individual tile
      const tileX = Math.floor(worldPos.x / TILE_SIZE);
      const tileY = Math.floor(worldPos.y / TILE_SIZE);
      const tileId = `${tileX}_${tileY}`;
      tempCustomTileFloors[tileId] = selectedFloorType;
      console.log('🔲 Changed tile', tileId, 'to', selectedFloorType);
    }
    return;
  }

  // Edit mode - place new objects (dragging is handled in mousedown)
  if (isEditingObjects && selectedObject && !clickedOnGrayArea && !justFinishedPartition) {
    const worldPos = screenToWorld(x, y);

    // Only place if clicked within game world bounds
    if (worldPos.x >= 0 && worldPos.x <= WORLD_WIDTH &&
        worldPos.y >= 0 && worldPos.y <= WORLD_HEIGHT) {

      const newFurniture = {
        x: Math.max(selectedObject.width / 2, Math.min(WORLD_WIDTH - selectedObject.width / 2, worldPos.x - selectedObject.width / 2)),
        y: Math.max(selectedObject.height / 2, Math.min(WORLD_HEIGHT - selectedObject.height / 2, worldPos.y - selectedObject.height / 2)),
        width: selectedObject.width,
        height: selectedObject.height,
        type: selectedObject.id,
        color: selectedObject.color,
        emoji: selectedObject.emoji,
        name: selectedObject.name,
        isTemp: true,
        // Partitions/walls are always blocking, others default to background mode
        isBlocking: selectedObject.isPartition ? true : (selectedObject.isBlocking !== undefined ? selectedObject.isBlocking : false)
      };

      // Copy custom image properties if this is a custom image
      if (selectedObject.isCustomImage) {
        newFurniture.isCustomImage = true;
        newFurniture.imageData = selectedObject.imageData;
        newFurniture.customId = selectedObject.customId;
      }

      // Check if placing on top of current player
      if (currentPlayer) {
        const playerRadius = 12;
        const objCenterX = newFurniture.x + newFurniture.width / 2;
        const objCenterY = newFurniture.y + newFurniture.height / 2;
        const distance = Math.sqrt(
          Math.pow(currentPlayer.x - objCenterX, 2) +
          Math.pow(currentPlayer.y - objCenterY, 2)
        );

        // If too close to player, don't place
        if (distance < playerRadius + Math.max(newFurniture.width, newFurniture.height) / 2) {
          console.warn('⚠️ Cannot place object on player! Move away first.');
          alert('⚠️ ไม่สามารถวางของทับตัวละครได้\nกรุณาเดินออกไปก่อน');
          return;
        }
      }

      // Add to temporary furniture array
      tempFurniture.push(newFurniture);

      console.log('🛋️ Placed object:', selectedObject.name, 'at', newFurniture.x, newFurniture.y, '(temp)');

      // DON'T clear selected object - keep it selected for continuous placement
      return;
    }
  }

  // Click-to-move (only if clicked on game world, not gray area, and NOT in edit mode)
  if (currentPlayer && !clickedOnGrayArea && !isEditingObjects) {
    const worldPos = screenToWorld(x, y);

    // Only move if clicked within game world bounds
    if (worldPos.x >= 0 && worldPos.x <= WORLD_WIDTH &&
        worldPos.y >= 0 && worldPos.y <= WORLD_HEIGHT) {
      targetPosition = {
        x: Math.max(30, Math.min(WORLD_WIDTH - 30, worldPos.x)),
        y: Math.max(30, Math.min(WORLD_HEIGHT - 30, worldPos.y))
      };
      console.log('🎯 Moving to:', targetPosition);
    }
  }
});

// Mouse up to stop dragging or finish drawing partition
canvas.addEventListener('mouseup', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const worldPos = screenToWorld(x, y);

  // Finish drawing partition
  if (isDrawingPartition && selectedObject) {
    const endX = worldPos.x;
    const endY = worldPos.y;

    // Calculate partition dimensions from start to end point
    const dx = endX - partitionStartX;
    const dy = endY - partitionStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only create if drag distance is significant (at least 20 pixels)
    if (distance > 20) {
      const angle = Math.atan2(dy, dx);
      const isHorizontal = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle));

      const newPartition = {
        x: Math.min(partitionStartX, endX),
        y: Math.min(partitionStartY, endY),
        width: isHorizontal ? Math.abs(dx) : selectedObject.width,
        height: isHorizontal ? selectedObject.width : Math.abs(dy), // width becomes thickness
        type: selectedObject.id,
        color: selectedObject.color,
        name: selectedObject.name,
        isTemp: true,
        isPartition: true
        // No emoji for partitions
      };

      tempFurniture.push(newPartition);
      console.log('🧱 Created partition:', newPartition);
    }

    isDrawingPartition = false;
    justFinishedPartition = true; // Prevent click event from firing
    canvas.style.cursor = 'crosshair';

    // Reset flag after a short delay
    setTimeout(() => {
      justFinishedPartition = false;
    }, 100);

    return;
  }

  // Stop dragging object
  if (draggingObject) {
    console.log('🖱️ Stopped dragging object');
    draggingObject = null;

    // Update cursor based on what's under the mouse
    if (isEditingObjects) {
      const objUnderMouse = getTempObjectAtPosition(worldPos.x, worldPos.y);
      if (objUnderMouse) {
        canvas.style.cursor = 'grab';
      } else if (selectedObject) {
        canvas.style.cursor = 'crosshair';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  }
});

// Mouse move for hover detection
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;

  // Convert to world coordinates for hover detection
  const worldPos = screenToWorld(mouseX, mouseY);

  // Handle object dragging
  if (draggingObject && isEditingObjects) {
    draggingObject.x = Math.max(0, Math.min(WORLD_WIDTH - draggingObject.width, worldPos.x - dragOffsetX));
    draggingObject.y = Math.max(0, Math.min(WORLD_HEIGHT - draggingObject.height, worldPos.y - dragOffsetY));
    canvas.style.cursor = 'grabbing'; // Keep grabbing cursor while dragging
    return;
  }

  // Check if hovering over objects in edit mode
  if (isEditingObjects) {
    hoveredObject = getTempObjectAtPosition(worldPos.x, worldPos.y);
    if (hoveredObject) {
      canvas.style.cursor = 'grab'; // Show grab cursor when hovering
      hoveredFloor = null; // Clear floor hover when over object
      return;
    }

    // Check if hovering over floor tiles for deletion
    hoveredFloor = null;

    // Check tile floors first (more specific)
    const tileX = Math.floor(worldPos.x / TILE_SIZE);
    const tileY = Math.floor(worldPos.y / TILE_SIZE);
    const tileId = `${tileX}_${tileY}`;
    if (tempCustomTileFloors[tileId]) {
      hoveredFloor = { type: 'tile', id: tileId };
    } else {
      // Check room floors
      const room = detectRoom(worldPos.x, worldPos.y);
      if (room && room.id !== 'unknown' && (tempCustomRoomFloorTypes[room.id] || tempCustomRoomColors[room.id])) {
        hoveredFloor = { type: 'room', id: room.id };
      }
    }

    if (selectedObject) {
      canvas.style.cursor = 'crosshair'; // Crosshair for placing new objects
    } else {
      canvas.style.cursor = 'default';
    }
  }

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

// Mouse wheel for zoom (scroll to zoom in/out)
canvas.addEventListener('wheel', (e) => {
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

  // Update zoom level (adjusted delta for faster zoom)
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

  // Clamp to prevent showing gray areas
  clampCameraOffset();

  console.log('🔍 Zoom level:', zoomLevel.toFixed(2), 'at cursor position');
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

// Room definitions with boundaries (3x3 grid)
// World size: 4800x3600 (3 rooms x 3 rooms, each 1600x1200)
const ROOMS = {
  // Top row (Y: 0-1200)
  'lobby': {
    name: 'Lobby',
    emoji: '🏠',
    x: 0, y: 0, width: 1600, height: 1200
  },
  'workspace-1': {
    name: 'Workspace 1',
    emoji: '💼',
    x: 1600, y: 0, width: 1600, height: 1200
  },
  'workspace-2': {
    name: 'Workspace 2',
    emoji: '💼',
    x: 3200, y: 0, width: 1600, height: 1200
  },

  // Middle row (Y: 1200-2400)
  'meeting-room-1': {
    name: 'Meeting Room 1',
    emoji: '🎯',
    x: 0, y: 1200, width: 1600, height: 1200
  },
  'meeting-room-2': {
    name: 'Meeting Room 2',
    emoji: '📊',
    x: 1600, y: 1200, width: 1600, height: 1200
  },
  'huddle-room': {
    name: 'Huddle Room',
    emoji: '🤝',
    x: 3200, y: 1200, width: 1600, height: 1200
  },

  // Bottom row (Y: 2400-3600)
  'lounge': {
    name: 'Lounge',
    emoji: '☕',
    x: 0, y: 2400, width: 1600, height: 1200
  },
  'kitchen': {
    name: 'Kitchen',
    emoji: '🍕',
    x: 1600, y: 2400, width: 1600, height: 1200
  },
  'game-room': {
    name: 'Game Room',
    emoji: '🎮',
    x: 3200, y: 2400, width: 1600, height: 1200
  }
};

// Detect which room the player is in based on position
function detectRoom(x, y) {
  for (const [roomId, room] of Object.entries(ROOMS)) {
    if (x >= room.x && x < room.x + room.width &&
        y >= room.y && y < room.y + room.height) {
      return { id: roomId, ...room };
    }
  }
  return { id: 'unknown', name: 'Unknown Area', emoji: '❓' };
}

// Show room selector modal with all 9 rooms in 3x3 grid
function showRoomSelector() {
  const roomModal = document.getElementById('room-modal');
  const roomsList = document.getElementById('rooms-list');

  if (!roomModal || !roomsList) return;

  // Clear existing rooms
  roomsList.innerHTML = '';

  // Define room order to match 3x3 layout (top to bottom, left to right)
  const roomOrder = [
    // Top row
    'lobby', 'workspace-1', 'workspace-2',
    // Middle row
    'meeting-room-1', 'meeting-room-2', 'huddle-room',
    // Bottom row
    'lounge', 'kitchen', 'game-room'
  ];

  // Add rooms in correct order
  roomOrder.forEach(roomId => {
    const room = ROOMS[roomId];
    if (!room) return;

    const roomEl = document.createElement('div');
    roomEl.className = 'room-item';
    roomEl.innerHTML = `
      <span class="room-emoji">${room.emoji}</span>
      <span class="room-name">${room.name}</span>
    `;

    roomEl.addEventListener('click', () => {
      teleportToRoom(roomId);
      roomModal.classList.remove('active');
    });

    roomsList.appendChild(roomEl);
  });

  roomModal.classList.add('active');
  console.log('🚪 Room selector opened - 3x3 grid layout');
}

// Teleport player to center of selected room
function teleportToRoom(roomId) {
  const room = ROOMS[roomId];
  if (!room || !currentPlayer) return;

  // Calculate center of room
  const centerX = room.x + room.width / 2;
  const centerY = room.y + room.height / 2;

  console.log(`🚀 Teleporting to ${room.name} at (${centerX}, ${centerY})`);

  // Reset states
  currentPlayer.isJumping = false;
  currentPlayer.jumpProgress = 0;
  currentPlayer.isMoving = false;
  targetPosition = null;
  keys = {};

  // Set position
  currentPlayer.x = centerX;
  currentPlayer.y = centerY;

  // Center camera on player
  currentPlayer.centerCameraOnPlayer();

  // Emit position update
  socket.emit('move', {
    x: currentPlayer.x,
    y: currentPlayer.y,
    direction: currentPlayer.direction,
    isMoving: false,
    isJumping: false
  });

  console.log(`✅ Teleported to ${room.name}`);
}

// Object categories with items
const OBJECT_CATEGORIES = {
  furniture: {
    name: 'เฟอร์นิเจอร์',
    emoji: '🪑',
    items: [
      { id: 'desk', name: 'โต๊ะทำงาน', emoji: '🗄️', width: 200, height: 80, color: '#8B4513', isBlocking: true },
      { id: 'chair', name: 'เก้าอี้', emoji: '🪑', width: 40, height: 40, color: '#654321', isBlocking: true },
      { id: 'sofa', name: 'โซฟา', emoji: '🛋️', width: 80, height: 60, color: '#4A4A4A', isBlocking: true },
      { id: 'table', name: 'โต๊ะกาแฟ', emoji: '☕', width: 100, height: 100, color: '#A0522D', isBlocking: true }
    ]
  },
  decoration: {
    name: 'ของตกแต่ง',
    emoji: '🌿',
    items: [
      { id: 'plant', name: 'ต้นไม้', emoji: '🌿', width: 60, height: 60, color: '#228B22', isBlocking: false },
      { id: 'painting', name: 'รูปภาพ', emoji: '🖼️', width: 80, height: 60, color: '#DAA520', isBlocking: false },
      { id: 'lamp', name: 'โคมไฟ', emoji: '💡', width: 40, height: 60, color: '#FFD700', isBlocking: false },
      { id: 'rug', name: 'พรม', emoji: '🟫', width: 150, height: 100, color: '#8B7355', isBlocking: false }
    ]
  },
  electronics: {
    name: 'อุปกรณ์อิเล็กทรอนิกส์',
    emoji: '💻',
    items: [
      { id: 'computer', name: 'คอมพิวเตอร์', emoji: '💻', width: 50, height: 40, color: '#2F4F4F', isBlocking: true },
      { id: 'printer', name: 'เครื่องพิมพ์', emoji: '🖨️', width: 60, height: 50, color: '#696969', isBlocking: true },
      { id: 'tv', name: 'ทีวี', emoji: '📺', width: 100, height: 60, color: '#000000', isBlocking: true },
      { id: 'phone', name: 'โทรศัพท์', emoji: '☎️', width: 30, height: 30, color: '#DC143C', isBlocking: false }
    ]
  },
  storage: {
    name: 'ที่เก็บของ',
    emoji: '📦',
    items: [
      { id: 'cabinet', name: 'ตู้เก็บของ', emoji: '🗄️', width: 80, height: 120, color: '#8B4513', isBlocking: true },
      { id: 'shelf', name: 'ชั้นวาง', emoji: '📚', width: 120, height: 80, color: '#A0522D', isBlocking: true },
      { id: 'drawer', name: 'ลิ้นชัก', emoji: '🗃️', width: 60, height: 50, color: '#654321', isBlocking: true },
      { id: 'locker', name: 'ล็อคเกอร์', emoji: '🔒', width: 60, height: 100, color: '#708090', isBlocking: true }
    ]
  },
  meeting: {
    name: 'อุปกรณ์ประชุม',
    emoji: '📊',
    items: [
      { id: 'whiteboard', name: 'ไวท์บอร์ด', emoji: '📋', width: 150, height: 100, color: '#FFFFFF', isBlocking: true },
      { id: 'projector', name: 'โปรเจคเตอร์', emoji: '📽️', width: 50, height: 40, color: '#2F4F4F', isBlocking: true },
      { id: 'conference-table', name: 'โต๊ะประชุม', emoji: '🪑', width: 200, height: 150, color: '#8B4513', isBlocking: true },
      { id: 'presentation-board', name: 'บอร์ดนำเสนอ', emoji: '📊', width: 100, height: 120, color: '#4682B4', isBlocking: true }
    ]
  },
  structure: {
    name: 'โครงสร้างห้อง',
    emoji: '🚪',
    items: [
      { id: 'partition', name: 'ฉากกั้นห้อง', width: 20, height: 200, color: '#A9A9A9', isPartition: true },
      { id: 'door', name: 'ประตู', emoji: '🚪', width: 80, height: 20, color: '#8B4513', isBlocking: false },
      { id: 'window', name: 'หน้าต่าง', emoji: '🪟', width: 100, height: 20, color: '#87CEEB', isBlocking: false }
    ]
  },
  floor: {
    name: 'พื้น',
    emoji: '🟫',
    items: [
      { id: 'floor-color', name: 'สีพื้นห้อง', emoji: '🎨', isFloorColor: true },
      { id: 'grass', name: 'สนามหญ้า', emoji: '🌱', isFloorType: true, floorPattern: 'grass' },
      { id: 'river', name: 'แม่น้ำ', emoji: '💧', isFloorType: true, floorPattern: 'river' },
      { id: 'sand', name: 'ทราย', emoji: '🏖️', isFloorType: true, floorPattern: 'sand' },
      { id: 'dirt', name: 'ดิน', emoji: '🟤', isFloorType: true, floorPattern: 'dirt' },
      { id: 'road', name: 'พื้นถนน', emoji: '🛣️', isFloorType: true, floorPattern: 'road' },
      { id: 'artificial-grass', name: 'หญ้าเทียม', emoji: '🟢', isFloorType: true, floorPattern: 'artificial-grass' },
      { id: 'wood', name: 'ไม้', emoji: '🪵', isFloorType: true, floorPattern: 'wood' },
      { id: 'tile', name: 'กระเบื้อง', emoji: '⬜', isFloorType: true, floorPattern: 'tile' },
      { id: 'carpet', name: 'พรม', emoji: '🟥', isFloorType: true, floorPattern: 'carpet' }
    ]
  }
};

let selectedObject = null;

// Show object selector sidebar
function showObjectSelector() {
  const objectSidebar = document.getElementById('object-sidebar');
  const categoriesDiv = document.getElementById('object-categories');
  const itemsDiv = document.getElementById('object-items');

  if (!objectSidebar || !categoriesDiv || !itemsDiv) return;

  // Enter editing mode
  isEditingObjects = true;
  // Copy current furniture to temp for editing
  tempFurniture = JSON.parse(JSON.stringify(furniture));
  // Copy current room colors to temp for editing
  tempCustomRoomColors = JSON.parse(JSON.stringify(customRoomColors));
  // Copy current floor types to temp for editing
  tempCustomRoomFloorTypes = JSON.parse(JSON.stringify(customRoomFloorTypes));
  // Copy current tile floors to temp for editing
  tempCustomTileFloors = JSON.parse(JSON.stringify(customTileFloors));

  // Clear existing content
  categoriesDiv.innerHTML = '';
  itemsDiv.innerHTML = '';

  // Add categories as tabs
  Object.entries(OBJECT_CATEGORIES).forEach(([categoryId, category]) => {
    const categoryBtn = document.createElement('button');
    categoryBtn.className = 'category-tab';
    categoryBtn.innerHTML = `${category.emoji} ${category.name}`;
    categoryBtn.addEventListener('click', () => {
      // Remove active from all tabs
      document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
      categoryBtn.classList.add('active');
      // Show items for this category
      showCategoryItems(categoryId);
    });
    categoriesDiv.appendChild(categoryBtn);
  });

  // Show first category by default
  const firstCategory = Object.keys(OBJECT_CATEGORIES)[0];
  categoriesDiv.firstChild.classList.add('active');
  showCategoryItems(firstCategory);

  objectSidebar.classList.add('active');
  console.log('🛋️ Object sidebar opened - Edit mode active');
}

// Handle image upload for custom objects
function handleImageUpload(categoryId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('ไฟล์รูปภาพใหญ่เกินไป (สูงสุด 2MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target.result;

      // Create an image to get dimensions
      const img = new Image();
      img.onload = () => {
        // Prompt for name
        const customName = prompt('ตั้งชื่อวัตถุนี้:', file.name.replace(/\.[^/.]+$/, ''));
        if (!customName) return;

        // Prompt for size
        const widthStr = prompt('ความกว้าง (px):', '100');
        const heightStr = prompt('ความสูง (px):', '100');

        const width = parseInt(widthStr) || 100;
        const height = parseInt(heightStr) || 100;

        // Create custom object
        const customId = `custom_${categoryId}_${Date.now()}`;
        const customItem = {
          customId: customId,
          id: customId,
          name: customName,
          imageData: imageData,
          width: width,
          height: height,
          isCustomImage: true
        };

        // Add to customObjects
        if (!customObjects[categoryId]) {
          customObjects[categoryId] = [];
        }
        customObjects[categoryId].push(customItem);

        // Save immediately
        saveDecorations();

        // Refresh the category items
        showCategoryItems(categoryId);

        console.log('✅ Added custom image:', customName);
      };
      img.src = imageData;
    };

    reader.readAsDataURL(file);
  });

  input.click();
}

// Show items for selected category
function showCategoryItems(categoryId) {
  const category = OBJECT_CATEGORIES[categoryId];
  const itemsDiv = document.getElementById('object-items');

  if (!category || !itemsDiv) return;

  itemsDiv.innerHTML = '';

  // Add upload image button at the top
  const uploadBtn = document.createElement('button');
  uploadBtn.className = 'upload-image-btn';
  uploadBtn.innerHTML = '📸 อัพโหลดรูปภาพ';
  uploadBtn.style.cssText = `
    width: 100%;
    padding: 12px;
    margin-bottom: 15px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.2s;
  `;
  uploadBtn.addEventListener('mouseenter', () => {
    uploadBtn.style.transform = 'scale(1.02)';
  });
  uploadBtn.addEventListener('mouseleave', () => {
    uploadBtn.style.transform = 'scale(1)';
  });
  uploadBtn.addEventListener('click', () => {
    handleImageUpload(categoryId);
  });
  itemsDiv.appendChild(uploadBtn);

  // Show custom uploaded images for this category first
  if (customObjects[categoryId]) {
    customObjects[categoryId].forEach((customItem, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'object-item custom-object';
      itemEl.innerHTML = `
        <img src="${customItem.imageData}" alt="${customItem.name}" style="width: 40px; height: 40px; object-fit: contain;">
        <span class="object-name">${customItem.name}</span>
        <button class="delete-custom-btn" title="ลบ">🗑️</button>
      `;

      // Check if this item is currently selected
      if (selectedObject && selectedObject.customId === customItem.customId) {
        itemEl.classList.add('selected');
      }

      // Delete button handler
      const deleteBtn = itemEl.querySelector('.delete-custom-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('ต้องการลบรูปภาพนี้?')) {
          customObjects[categoryId].splice(index, 1);
          if (customObjects[categoryId].length === 0) {
            delete customObjects[categoryId];
          }
          showCategoryItems(categoryId); // Refresh the list
          saveDecorations(); // Save immediately
        }
      });

      itemEl.addEventListener('click', () => {
        selectedObject = { ...customItem, categoryId, isCustomImage: true };
        selectedFloorColor = null;
        console.log('🖼️ Selected custom image:', customItem.name);

        // Remove selected class from all items
        document.querySelectorAll('.object-item').forEach(el => el.classList.remove('selected'));
        itemEl.classList.add('selected');

        canvas.style.cursor = 'copy';
      });

      itemsDiv.appendChild(itemEl);
    });
  }

  // Show default category items
  category.items.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'object-item';
    itemEl.innerHTML = `
      ${item.emoji ? `<span class="object-emoji">${item.emoji}</span>` : '<span class="object-emoji">━</span>'}
      <span class="object-name">${item.name}</span>
    `;

    // Check if this item is currently selected
    if (selectedObject && selectedObject.id === item.id) {
      itemEl.classList.add('selected');
    }

    itemEl.addEventListener('click', () => {
      // Special handling for floor color item
      if (item.isFloorColor) {
        selectedObject = { ...item, categoryId };
        selectedFloorColor = null;
        selectedFloorType = null;
        console.log('🎨 Selected floor color mode');

        // Remove selected class from all items
        document.querySelectorAll('.object-item').forEach(el => el.classList.remove('selected'));
        itemEl.classList.add('selected');

        // Show color palette
        showColorPalette();
        return;
      }

      // Special handling for floor type item
      if (item.isFloorType) {
        selectedObject = { ...item, categoryId };
        selectedFloorColor = null;
        selectedFloorType = item.floorPattern;
        console.log('🟫 Selected floor type:', item.name);

        // Remove selected class from all items
        document.querySelectorAll('.object-item').forEach(el => el.classList.remove('selected'));
        itemEl.classList.add('selected');

        // Clear items div and show mode toggle
        const itemsDiv = document.getElementById('object-items');
        itemsDiv.innerHTML = '';

        // Add mode toggle buttons
        const modeToggleDiv = document.createElement('div');
        modeToggleDiv.style.cssText = `
          display: flex;
          gap: 10px;
          padding: 15px;
          background: #f5f5f5;
          border-radius: 8px;
          margin-bottom: 15px;
        `;

        const roomModeBtn = document.createElement('button');
        roomModeBtn.className = 'floor-mode-btn' + (floorMode === 'room' ? ' active' : '');
        roomModeBtn.innerHTML = '🏠 ทั้งห้อง';
        roomModeBtn.style.cssText = `
          flex: 1;
          padding: 10px;
          border: 2px solid #ddd;
          border-radius: 6px;
          background: ${floorMode === 'room' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white'};
          color: ${floorMode === 'room' ? 'white' : '#333'};
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
        `;
        roomModeBtn.addEventListener('click', () => {
          floorMode = 'room';
          showCategoryItems(categoryId);
        });

        const tileModeBtn = document.createElement('button');
        tileModeBtn.className = 'floor-mode-btn' + (floorMode === 'tile' ? ' active' : '');
        tileModeBtn.innerHTML = '🔲 ช่อง';
        tileModeBtn.style.cssText = `
          flex: 1;
          padding: 10px;
          border: 2px solid #ddd;
          border-radius: 6px;
          background: ${floorMode === 'tile' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white'};
          color: ${floorMode === 'tile' ? 'white' : '#333'};
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
        `;
        tileModeBtn.addEventListener('click', () => {
          floorMode = 'tile';
          showCategoryItems(categoryId);
        });

        modeToggleDiv.appendChild(roomModeBtn);
        modeToggleDiv.appendChild(tileModeBtn);
        itemsDiv.appendChild(modeToggleDiv);

        // Add instruction text
        const instructionText = floorMode === 'room'
          ? 'คลิกที่ห้องเพื่อใส่พื้นทั้งห้อง' + item.emoji
          : 'คลิกที่ช่องเพื่อใส่พื้นช่องนั้น' + item.emoji;
        const instructionDiv = document.createElement('div');
        instructionDiv.style.cssText = 'padding: 10px; text-align: center; color: #666; font-size: 14px;';
        instructionDiv.textContent = instructionText;
        itemsDiv.appendChild(instructionDiv);

        // Re-add the selected floor type item
        const selectedItemEl = document.createElement('div');
        selectedItemEl.className = 'object-item selected';
        selectedItemEl.innerHTML = `
          ${item.emoji ? `<span class="object-emoji">${item.emoji}</span>` : ''}
          <span class="object-name">${item.name}</span>
        `;
        itemsDiv.appendChild(selectedItemEl);

        canvas.style.cursor = 'crosshair';
        return;
      }

      selectedObject = { ...item, categoryId };
      selectedFloorColor = null; // Clear floor color mode
      selectedFloorType = null; // Clear floor type mode
      console.log('🛋️ Selected object:', item.name, '- Click on map to place');

      // Remove selected class from all items
      document.querySelectorAll('.object-item').forEach(el => el.classList.remove('selected'));
      // Add selected class to clicked item
      itemEl.classList.add('selected');

      // Change cursor to indicate placement mode
      canvas.style.cursor = 'copy';

      // Sidebar stays open - no closing!
    });

    itemsDiv.appendChild(itemEl);
  });
}

// Show color palette for floor painting
function showColorPalette() {
  const itemsDiv = document.getElementById('object-items');
  itemsDiv.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;">คลิกที่ห้องเพื่อเปลี่ยนสี</div>';

  const colors = [
    { name: 'ฟ้าอ่อน', color: '#e8f4f8' },
    { name: 'เขียวอ่อน', color: '#e8f4e8' },
    { name: 'ครีม', color: '#f5eedb' },
    { name: 'ชมพูอ่อน', color: '#ffe8e8' },
    { name: 'ม่วงอ่อน', color: '#f0e8f5' },
    { name: 'เหลืองอ่อน', color: '#fffbe8' },
    { name: 'ส้มอ่อน', color: '#fff5e8' },
    { name: 'เทา', color: '#f5f5f5' },
    { name: 'ขาว', color: '#ffffff' }
  ];

  colors.forEach(colorOption => {
    const colorEl = document.createElement('div');
    colorEl.className = 'color-option';
    colorEl.style.cssText = `
      background: ${colorOption.color};
      border: 3px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.3s;
      text-align: center;
      font-size: 12px;
      font-weight: bold;
    `;
    colorEl.textContent = colorOption.name;

    colorEl.addEventListener('mouseenter', () => {
      colorEl.style.transform = 'scale(1.05)';
      colorEl.style.borderColor = '#667eea';
    });

    colorEl.addEventListener('mouseleave', () => {
      colorEl.style.transform = 'scale(1)';
      colorEl.style.borderColor = selectedFloorColor === colorOption.color ? '#667eea' : '#ddd';
    });

    colorEl.addEventListener('click', () => {
      selectedFloorColor = colorOption.color;
      document.querySelectorAll('.color-option').forEach(el => {
        el.style.borderColor = '#ddd';
      });
      colorEl.style.borderColor = '#667eea';
      canvas.style.cursor = 'copy';
      console.log('🎨 Selected floor color:', colorOption.name);
    });

    itemsDiv.appendChild(colorEl);
  });
}

// Close object sidebar button
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
if (closeSidebarBtn) {
  closeSidebarBtn.addEventListener('click', () => {
    document.getElementById('object-sidebar').classList.remove('active');
    // Exit edit mode without saving (same as cancel)
    isEditingObjects = false;
    tempFurniture = [];
    tempCustomRoomColors = {};
    tempCustomRoomFloorTypes = {};
    tempCustomTileFloors = {};
    selectedObject = null;
    selectedFloorColor = null;
    selectedFloorType = null;
    floorMode = 'room';
    hoveredObject = null;
    draggingObject = null;
    canvas.style.cursor = 'crosshair';
    console.log('🛋️ Object sidebar closed (changes discarded)');
  });
}

// Save objects button
const saveObjectsBtn = document.getElementById('save-objects-btn');
if (saveObjectsBtn) {
  saveObjectsBtn.addEventListener('click', () => {
    // Apply temp furniture to permanent furniture
    furniture = JSON.parse(JSON.stringify(tempFurniture));
    // Apply temp room colors to permanent room colors
    customRoomColors = JSON.parse(JSON.stringify(tempCustomRoomColors));
    // Apply temp floor types to permanent floor types
    customRoomFloorTypes = JSON.parse(JSON.stringify(tempCustomRoomFloorTypes));
    // Apply temp tile floors to permanent tile floors
    customTileFloors = JSON.parse(JSON.stringify(tempCustomTileFloors));
    console.log('💾 Saved', furniture.length, 'objects');

    // Save to localStorage
    saveDecorations();

    // Close sidebar and exit edit mode
    document.getElementById('object-sidebar').classList.remove('active');
    isEditingObjects = false;
    tempFurniture = [];
    tempCustomRoomColors = {};
    tempCustomRoomFloorTypes = {};
    tempCustomTileFloors = {};
    selectedObject = null;
    selectedFloorColor = null;
    selectedFloorType = null;
    floorMode = 'room';
    hoveredObject = null;
    draggingObject = null;
    canvas.style.cursor = 'crosshair';

    // TODO: Emit to server for multiplayer sync
    // socket.emit('updateFurniture', furniture);
  });
}

// Cancel objects button
const cancelObjectsBtn = document.getElementById('cancel-objects-btn');
if (cancelObjectsBtn) {
  cancelObjectsBtn.addEventListener('click', () => {
    // Discard changes
    console.log('❌ Cancelled object editing');

    // Close sidebar and exit edit mode
    document.getElementById('object-sidebar').classList.remove('active');
    isEditingObjects = false;
    tempFurniture = [];
    tempCustomRoomColors = {};
    tempCustomRoomFloorTypes = {};
    tempCustomTileFloors = {};
    selectedObject = null;
    selectedFloorColor = null;
    selectedFloorType = null;
    floorMode = 'room';
    hoveredObject = null;
    draggingObject = null;
    canvas.style.cursor = 'crosshair';
  });
}

function getRoomEmoji(roomName) {
  const room = ROOMS[roomName];
  return room ? room.emoji : '🚪';
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

// Helper function to get temp object at position
function getTempObjectAtPosition(worldX, worldY) {
  // Check in reverse order (top object first)
  for (let i = tempFurniture.length - 1; i >= 0; i--) {
    const obj = tempFurniture[i];
    if (worldX >= obj.x && worldX <= obj.x + obj.width &&
        worldY >= obj.y && worldY <= obj.y + obj.height) {
      return obj;
    }
  }
  return null;
}

// Draw furniture
function drawFurniture() {
  // Draw permanent or temp furniture based on edit mode
  const furnitureToDraw = isEditingObjects ? tempFurniture : furniture;

  furnitureToDraw.forEach(obj => {
    ctx.save();

    // Check if this object is being dragged
    const isBeingDragged = (draggingObject === obj);

    // Convert world coordinates to screen coordinates
    const screen = worldToScreen(obj.x, obj.y);
    let screenX = screen.x;
    let screenY = screen.y;
    const scale = Math.max(0.01, screen.scale);
    const screenWidth = Math.max(1, obj.width * scale);
    const screenHeight = Math.max(1, obj.height * scale);

    // Apply "lift up" effect when dragging
    if (isBeingDragged) {
      screenY -= 10 * scale; // Lift up by 10 pixels

      // Add shadow underneath to show it's lifted
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 15 * scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8 * scale;
    }

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
    } else if (obj.isPartition) {
      // Render partitions/walls as simple thick lines
      ctx.fillStyle = obj.color || '#A9A9A9';
      ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
      // No border, no emoji - just a solid line
    } else {
      // Check if this is a custom image object
      if (obj.isCustomImage && obj.imageData) {
        // Use cached image or create new one
        let img = imageCache[obj.customId];
        if (!img) {
          img = new Image();
          img.onload = () => {
            // Force re-render when image loads
            console.log('🖼️ Custom image loaded:', obj.name);
          };
          img.onerror = () => {
            console.error('❌ Failed to load custom image:', obj.name);
          };
          img.src = obj.imageData;
          imageCache[obj.customId] = img;
        }

        // If image is loaded, draw it
        if (img.complete && img.naturalHeight !== 0) {
          ctx.drawImage(img, screenX, screenY, screenWidth, screenHeight);
        } else {
          // Placeholder while loading - smaller and more visible
          ctx.fillStyle = '#e0e0e0';
          ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
          ctx.strokeStyle = '#999';
          ctx.lineWidth = 2 * scale;
          ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);

          // Add loading text
          ctx.fillStyle = '#666';
          ctx.font = `${12 * scale}px Arial`;
          ctx.textAlign = 'center';
          ctx.fillText('Loading...', screenX + screenWidth / 2, screenY + screenHeight / 2);
        }

        // Add border to custom images
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
      } else {
        // Generic object rendering with emoji support
        // Draw background rectangle
        ctx.fillStyle = obj.color || '#999';
        ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);

        // Draw emoji if available
        if (obj.emoji) {
          ctx.font = `${Math.max(20, screenHeight * 0.6)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#000';
          ctx.fillText(obj.emoji, screenX + screenWidth / 2, screenY + screenHeight / 2);
        }
      }
    }

    // Reset shadow from dragging effect
    if (isBeingDragged) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Highlight hovered object in edit mode (but not if being dragged)
    if (isEditingObjects && hoveredObject === obj && !isBeingDragged) {
      // Draw pink glowing shadow
      ctx.shadowColor = 'rgba(255, 105, 180, 0.8)'; // Hot pink glow
      ctx.shadowBlur = 25 * scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Draw thick pink border
      ctx.strokeStyle = '#FF69B4'; // Hot pink
      ctx.lineWidth = 12 * scale; // Very thick border
      ctx.strokeRect(screenX - 6 * scale, screenY - 6 * scale, screenWidth + 12 * scale, screenHeight + 12 * scale);

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  });
}

// Draw object placement preview
function drawObjectPreview() {
  // Draw partition line preview while drawing
  if (isDrawingPartition) {
    const worldPos = screenToWorld(mouseX, mouseY);
    const startScreen = worldToScreen(partitionStartX, partitionStartY);
    const endScreen = worldToScreen(worldPos.x, worldPos.y);
    const scale = Math.max(0.01, startScreen.scale);

    ctx.save();
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 8 * scale;
    ctx.setLineDash([10 * scale, 5 * scale]);
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(startScreen.x, startScreen.y);
    ctx.lineTo(endScreen.x, endScreen.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }

  if (!selectedObject) return;

  // Don't show preview for partitions (they use line drawing mode)
  if (selectedObject.isPartition) return;

  // Get mouse position in world coordinates
  const worldPos = screenToWorld(mouseX, mouseY);

  // Check if mouse is within game world bounds
  if (worldPos.x < 0 || worldPos.x > WORLD_WIDTH ||
      worldPos.y < 0 || worldPos.y > WORLD_HEIGHT) {
    return;
  }

  // Calculate object position (centered on cursor)
  const objX = worldPos.x - selectedObject.width / 2;
  const objY = worldPos.y - selectedObject.height / 2;

  // Convert to screen coordinates
  const screen = worldToScreen(objX, objY);
  const scale = Math.max(0.01, screen.scale);
  const screenWidth = Math.max(1, selectedObject.width * scale);
  const screenHeight = Math.max(1, selectedObject.height * scale);

  ctx.save();

  // Draw semi-transparent preview
  ctx.globalAlpha = 0.6;

  // If custom image, try to draw the image
  if (selectedObject.isCustomImage && selectedObject.imageData) {
    let img = imageCache[selectedObject.customId];
    if (!img) {
      img = new Image();
      img.src = selectedObject.imageData;
      imageCache[selectedObject.customId] = img;
    }

    // If image is loaded, draw it
    if (img.complete && img.naturalHeight !== 0) {
      ctx.drawImage(img, screen.x, screen.y, screenWidth, screenHeight);
    } else {
      // Placeholder while loading
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(screen.x, screen.y, screenWidth, screenHeight);
    }
  } else {
    // Default colored rectangle
    ctx.fillStyle = selectedObject.color || '#999';
    ctx.fillRect(screen.x, screen.y, screenWidth, screenHeight);

    // Draw emoji if available
    if (selectedObject.emoji) {
      ctx.globalAlpha = 0.8;
      ctx.font = `${Math.max(20, screenHeight * 0.6)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000';
      ctx.fillText(selectedObject.emoji, screen.x + screenWidth / 2, screen.y + screenHeight / 2);
    }
  }

  // Draw border (color indicates blocking mode)
  ctx.globalAlpha = 1.0;

  // Different colors for different modes
  if (selectedObject.isPartition) {
    ctx.strokeStyle = '#ff4444'; // Red for walls (always blocking)
  } else if (selectedObject.isBlocking) {
    ctx.strokeStyle = '#ff9800'; // Orange for blocking objects
  } else {
    ctx.strokeStyle = '#4caf50'; // Green for background (walkable)
  }

  ctx.lineWidth = 3 * scale;
  ctx.strokeRect(screen.x, screen.y, screenWidth, screenHeight);

  // Add mode indicator text
  ctx.globalAlpha = 0.9;
  ctx.font = `bold ${12 * scale}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2 * scale;

  const modeText = selectedObject.isPartition ? '🧱 WALL' :
                   (selectedObject.isBlocking ? '🔴 BLOCKING' : '🟢 BG');

  ctx.strokeText(modeText, screen.x + screenWidth / 2, screen.y - 10 * scale);
  ctx.fillText(modeText, screen.x + screenWidth / 2, screen.y - 10 * scale);

  ctx.restore();
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
  const infoHeight = 130; // Increased height for more controls

  // Semi-transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(infoX, infoY, infoWidth, infoHeight);
  ctx.strokeStyle = '#667eea';
  ctx.lineWidth = 2;
  ctx.strokeRect(infoX, infoY, infoWidth, infoHeight);

  // Detect current room based on player position
  let currentAreaName = currentRoom;
  let currentAreaEmoji = getRoomEmoji(currentRoom);
  if (currentPlayer) {
    const detectedRoom = detectRoom(currentPlayer.x, currentPlayer.y);
    currentAreaName = detectedRoom.name;
    currentAreaEmoji = detectedRoom.emoji;
  }

  // Room name (current area based on position)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`${currentAreaEmoji} ${currentAreaName}`, infoX + infoPadding, infoY + infoPadding);

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
  ctx.fillText(`🦘 Space  🏠 H`, infoX + infoPadding, infoY + infoPadding + 85);
  ctx.fillText(`🚪 R  🆘 ESC`, infoX + infoPadding, infoY + infoPadding + 102);

  // Top-right floating buttons
  const buttonSize = 50;
  const buttonSpacing = 10;

  // Respawn button (Home)
  const respawnBtnX = canvas.width - buttonSize - 15;
  const respawnBtnY = 15;
  ctx.fillStyle = 'rgba(76, 175, 80, 0.95)';
  ctx.fillRect(respawnBtnX, respawnBtnY, buttonSize, buttonSize);
  ctx.strokeStyle = '#388E3C';
  ctx.lineWidth = 3;
  ctx.strokeRect(respawnBtnX, respawnBtnY, buttonSize, buttonSize);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏠', respawnBtnX + buttonSize / 2, respawnBtnY + buttonSize / 2);
  canvas.respawnBtnBounds = { x: respawnBtnX, y: respawnBtnY, width: buttonSize, height: buttonSize };

  // Room List button (below respawn)
  const roomListBtnX = canvas.width - buttonSize - 15;
  const roomListBtnY = respawnBtnY + buttonSize + buttonSpacing;
  ctx.fillStyle = 'rgba(103, 58, 183, 0.95)';
  ctx.fillRect(roomListBtnX, roomListBtnY, buttonSize, buttonSize);
  ctx.strokeStyle = '#7B1FA2';
  ctx.lineWidth = 3;
  ctx.strokeRect(roomListBtnX, roomListBtnY, buttonSize, buttonSize);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🚪', roomListBtnX + buttonSize / 2, roomListBtnY + buttonSize / 2);
  canvas.roomListBtnBounds = { x: roomListBtnX, y: roomListBtnY, width: buttonSize, height: buttonSize };

  // Object button (below room list) - Admin only
  const objectBtnX = canvas.width - buttonSize - 15;
  const objectBtnY = roomListBtnY + buttonSize + buttonSpacing;
  ctx.fillStyle = 'rgba(255, 87, 34, 0.95)';
  ctx.fillRect(objectBtnX, objectBtnY, buttonSize, buttonSize);
  ctx.strokeStyle = '#E64A19';
  ctx.lineWidth = 3;
  ctx.strokeRect(objectBtnX, objectBtnY, buttonSize, buttonSize);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🛋️', objectBtnX + buttonSize / 2, objectBtnY + buttonSize / 2);
  canvas.objectBtnBounds = { x: objectBtnX, y: objectBtnY, width: buttonSize, height: buttonSize };

  // Settings button (below object)
  const settingsBtnX = canvas.width - buttonSize - 15;
  const settingsBtnY = objectBtnY + buttonSize + buttonSpacing;
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

  // Bottom menu removed - use sidebar button instead
  canvas.gestureBounds = null;
  canvas.roomButtonBounds = null;
  canvas.logoutButtonBounds = null;
}

// Update online players list in chat panel
function updateOnlinePlayersList() {
  const playersList = document.getElementById('online-players-list');
  const guestList = document.getElementById('favorite-players-list');
  if (!playersList) return;

  playersList.innerHTML = '';
  if (guestList) guestList.innerHTML = '';

  let guestCount = 0;
  let regularCount = 0;

  if (otherPlayers.size === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.style.padding = '20px 16px';
    emptyMsg.style.textAlign = 'center';
    emptyMsg.style.color = '#616161';
    emptyMsg.style.fontSize = '12px';
    emptyMsg.textContent = 'No other players online';
    playersList.appendChild(emptyMsg);
    return;
  }

  otherPlayers.forEach((player) => {
    // Check if player is a guest
    const isGuestPlayer = player.id && player.id.startsWith('guest_');
    const targetList = (isGuestPlayer && guestList) ? guestList : playersList;

    if (isGuestPlayer) guestCount++;
    else regularCount++;
    const item = document.createElement('div');
    item.className = 'chat-list-item';

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.textContent = player.username.charAt(0).toUpperCase();
    avatar.style.background = player.color;

    // Info
    const info = document.createElement('div');
    info.className = 'chat-info';

    const name = document.createElement('div');
    name.className = 'chat-name';
    name.textContent = player.username;

    const status = document.createElement('div');
    status.className = 'chat-status';
    // Show custom status if available, otherwise empty
    status.textContent = player.status || '';

    info.appendChild(name);
    if (player.status) {
      info.appendChild(status);
    }

    // Poke button
    const pokeBtn = document.createElement('button');
    pokeBtn.className = 'poke-btn';
    pokeBtn.textContent = '👉';
    pokeBtn.title = 'Poke';
    pokeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sendPoke(player.id, player.username);
    });

    item.appendChild(avatar);
    item.appendChild(info);
    item.appendChild(pokeBtn);
    targetList.appendChild(item);
  });

  // Show/hide and expand guest section if there are guests
  if (guestList) {
    const guestSection = guestList.closest('.chat-section');
    if (guestSection) {
      if (guestCount > 0) {
        guestSection.style.display = 'block';
        // Auto-expand guest section
        const guestHeader = guestSection.querySelector('.section-header');
        if (guestHeader && guestHeader.classList.contains('collapsed')) {
          guestHeader.classList.remove('collapsed');
          guestHeader.querySelector('.expand-icon').textContent = '▼';
          guestList.style.display = 'block';
        }
      } else {
        guestSection.style.display = 'none';
      }
    }
  }

  console.log('📋 Updated players list:', regularCount, 'regular,', guestCount, 'guests');
}

// Activity feed for pokes
let activityFeed = [];

// Send poke to a player
function sendPoke(playerId, username) {
  if (socket && socket.connected) {
    socket.emit('sendPoke', { targetId: playerId });
    console.log(`👉 Poked ${username}`);

    // Visual feedback
    alert(`คุณ Poke ${username} แล้ว!`);
  }
}

// Receive poke
socket.on('receivePoke', (data) => {
  console.log('👉 Received poke from:', data.fromUsername);

  // Add to activity feed
  const activity = {
    id: Date.now(),
    type: 'poke',
    from: data.fromUsername,
    fromId: data.fromId,
    timestamp: new Date(),
    read: false
  };

  activityFeed.unshift(activity);

  // Keep only last 50 activities
  if (activityFeed.length > 50) {
    activityFeed.pop();
  }

  // Update activity tab
  updateActivityTab();

  // Show notification
  showPokeNotification(data.fromUsername);
});

// Show poke notification
function showPokeNotification(fromUsername) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px 30px;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
    z-index: 99999;
    animation: slideIn 0.3s ease;
    font-weight: 600;
    font-size: 18px;
    min-width: 250px;
    text-align: center;
    cursor: pointer;
  `;
  notification.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 8px;">👉</div>
    <div><strong>${fromUsername}</strong> poked you!</div>
  `;

  // Click to dismiss
  notification.addEventListener('click', () => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  });

  document.body.appendChild(notification);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

// Update calendar panel
function updateCalendarPanel() {
  const calendarList = document.getElementById('calendar-list');
  if (!calendarList) return;

  calendarList.innerHTML = '';

  const emptyMsg = document.createElement('div');
  emptyMsg.style.cssText = 'padding: 40px 20px; text-align: center; color: #999; font-size: 14px;';
  emptyMsg.textContent = 'ยังไม่มีกิจกรรม';
  calendarList.appendChild(emptyMsg);
}

// Update activity tab
function updateActivityTab() {
  const activityList = document.getElementById('activity-list');
  if (!activityList) return;

  activityList.innerHTML = '';

  if (activityFeed.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.style.cssText = 'padding: 40px 20px; text-align: center; color: #999; font-size: 14px;';
    emptyMsg.textContent = 'ยังไม่มีกิจกรรม';
    activityList.appendChild(emptyMsg);
    return;
  }

  activityFeed.forEach(activity => {
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.style.cssText = `
      padding: 12px 16px;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: background 0.2s;
      ${!activity.read ? 'background: rgba(102, 126, 234, 0.05);' : ''}
    `;

    const timeAgo = getTimeAgo(activity.timestamp);

    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="font-size: 24px;">👉</div>
        <div style="flex: 1;">
          <div style="font-weight: 500; color: #333; margin-bottom: 4px;">
            ${activity.from} poked you
          </div>
          <div style="font-size: 12px; color: #999;">
            ${timeAgo}
          </div>
        </div>
      </div>
    `;

    item.addEventListener('click', () => {
      activity.read = true;
      updateActivityTab();
    });

    activityList.appendChild(item);
  });
}

// Helper function to get time ago
function getTimeAgo(timestamp) {
  const now = new Date();
  const diff = now - new Date(timestamp);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} วันที่แล้ว`;
  if (hours > 0) return `${hours} ชั่วโมงที่แล้ว`;
  if (minutes > 0) return `${minutes} นาทีที่แล้ว`;
  return `เมื่อสักครู่`;
}

// Tab switching for sidebar
document.querySelectorAll('.sidebar-item[data-tab]').forEach(item => {
  item.addEventListener('click', () => {
    const tab = item.dataset.tab;

    // Remove active from all sidebar items
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));

    // Add active to clicked item
    item.classList.add('active');

    // Hide all panels
    document.getElementById('chat-panel').style.display = 'none';
    document.getElementById('activity-panel').style.display = 'none';
    document.getElementById('calendar-panel').style.display = 'none';
    document.getElementById('bookmark-panel').style.display = 'none';

    // Show selected panel
    if (tab === 'chat') {
      document.getElementById('chat-panel').style.display = 'flex';
    } else if (tab === 'activity') {
      document.getElementById('activity-panel').style.display = 'flex';
      updateActivityTab();
    } else if (tab === 'calendar') {
      document.getElementById('calendar-panel').style.display = 'flex';
      updateCalendarPanel();
    } else if (tab === 'files') {
      document.getElementById('bookmark-panel').style.display = 'flex';
      loadBookmarks();
    }
  });
});

// Chat section collapse/expand functionality
document.querySelectorAll('.section-header').forEach(header => {
  header.addEventListener('click', () => {
    const section = header.parentElement;
    const chatList = section.querySelector('.chat-list');
    const expandIcon = header.querySelector('.expand-icon');

    if (!chatList) return;

    if (header.classList.contains('collapsed')) {
      // Expand
      header.classList.remove('collapsed');
      chatList.style.display = 'block';
      expandIcon.textContent = '▼';
    } else {
      // Collapse
      header.classList.add('collapsed');
      chatList.style.display = 'none';
      expandIcon.textContent = '▶';
    }
  });
});

// Toggle chat panel visibility
const toggleChatPanelBtn = document.getElementById('toggle-chat-panel-btn');
const chatPanel = document.getElementById('chat-panel');
const chatSidebarItem = document.querySelector('.sidebar-item[data-tab="chat"]');

if (toggleChatPanelBtn && chatPanel && chatSidebarItem) {
  toggleChatPanelBtn.addEventListener('click', () => {
    // Hide panel when clicking the close button
    chatPanel.style.display = 'none';
    chatSidebarItem.classList.remove('active');
    console.log('💬 Chat panel hidden');
  });
}

// Toggle activity panel visibility
const toggleActivityPanelBtn = document.getElementById('toggle-activity-panel-btn');
const activityPanel = document.getElementById('activity-panel');
const activitySidebarItem = document.querySelector('.sidebar-item[data-tab="activity"]');

if (toggleActivityPanelBtn && activityPanel && activitySidebarItem) {
  toggleActivityPanelBtn.addEventListener('click', () => {
    activityPanel.style.display = 'none';
    activitySidebarItem.classList.remove('active');
    console.log('🔔 Activity panel hidden');
  });
}

// Toggle calendar panel visibility
const toggleCalendarPanelBtn = document.getElementById('toggle-calendar-panel-btn');
const calendarPanel = document.getElementById('calendar-panel');
const calendarSidebarItem = document.querySelector('.sidebar-item[data-tab="calendar"]');

if (toggleCalendarPanelBtn && calendarPanel && calendarSidebarItem) {
  toggleCalendarPanelBtn.addEventListener('click', () => {
    calendarPanel.style.display = 'none';
    calendarSidebarItem.classList.remove('active');
    console.log('📅 Calendar panel hidden');
  });
}

// Toggle bookmark panel visibility
const toggleBookmarkPanelBtn = document.getElementById('toggle-bookmark-panel-btn');
const bookmarkPanel = document.getElementById('bookmark-panel');
const bookmarkSidebarItem = document.querySelector('.sidebar-item[data-tab="files"]');

if (toggleBookmarkPanelBtn && bookmarkPanel && bookmarkSidebarItem) {
  toggleBookmarkPanelBtn.addEventListener('click', () => {
    bookmarkPanel.style.display = 'none';
    bookmarkSidebarItem.classList.remove('active');
    console.log('🔖 Bookmark panel hidden');
  });
}

// Refresh bookmarks button
const refreshBookmarksBtn = document.getElementById('refresh-bookmarks-btn');
if (refreshBookmarksBtn) {
  refreshBookmarksBtn.addEventListener('click', () => {
    loadBookmarks();
  });
}

// Load bookmarks from Planning Tool API
async function loadBookmarks() {
  const bookmarkList = document.getElementById('bookmark-list');
  if (!bookmarkList) return;

  // Show loading
  bookmarkList.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: #999; font-size: 14px;">⏳ กำลังโหลด...</div>';

  try {
    // Fetch bookmarks from local proxy (which forwards to Planning Tool Backend)
    const response = await fetch('/api/bookmarks');

    if (!response.ok) {
      throw new Error('Failed to fetch bookmarks');
    }

    const data = await response.json();
    const bookmarks = data.bookmarks || [];

    bookmarkList.innerHTML = '';

    if (bookmarks.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.cssText = 'padding: 40px 20px; text-align: center; color: #999; font-size: 14px;';
      emptyMsg.textContent = 'ยังไม่มี Bookmark';
      bookmarkList.appendChild(emptyMsg);
      return;
    }

    // Display bookmarks
    bookmarks.forEach(bookmark => {
      const item = document.createElement('div');
      item.className = 'bookmark-item';
      item.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        background: white;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid #e0e0e0;
      `;

      // Favicon
      const favicon = document.createElement('img');
      favicon.style.cssText = 'width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px;';
      favicon.src = bookmark.favicon || `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=32`;
      favicon.onerror = () => {
        favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text y="14" font-size="14">🔖</text></svg>';
      };

      // Content
      const content = document.createElement('div');
      content.style.cssText = 'flex: 1; min-width: 0;';

      const title = document.createElement('div');
      title.style.cssText = 'font-weight: 600; color: #333; font-size: 13px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      title.textContent = bookmark.title || 'Untitled';

      const url = document.createElement('div');
      url.style.cssText = 'font-size: 11px; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      url.textContent = bookmark.url;

      content.appendChild(title);
      content.appendChild(url);

      item.appendChild(favicon);
      item.appendChild(content);

      // Click to open
      item.addEventListener('click', () => {
        window.open(bookmark.url, '_blank');
      });

      // Hover effect
      item.addEventListener('mouseenter', () => {
        item.style.background = '#f5f5ff';
        item.style.borderColor = '#667eea';
        item.style.transform = 'translateX(4px)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'white';
        item.style.borderColor = '#e0e0e0';
        item.style.transform = 'translateX(0)';
      });

      bookmarkList.appendChild(item);
    });

    console.log('🔖 Loaded', bookmarks.length, 'bookmarks');

  } catch (error) {
    console.error('❌ Error loading bookmarks:', error);
    bookmarkList.innerHTML = `
      <div style="padding: 40px 20px; text-align: center; color: #ff5252; font-size: 14px;">
        <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
        <div>ไม่สามารถโหลด Bookmarks ได้</div>
        <div style="font-size: 12px; margin-top: 8px; color: #999;">กรุณาตรวจสอบว่า Planning Tool API ทำงานอยู่</div>
      </div>
    `;
  }
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

    // Camera follows player only when moving (smooth lerp)
    if (!isPanning && currentPlayer.isMoving) { // Only follow when player is moving
      const gameWidth = canvas.width;
      const gameHeight = canvas.height;
      const scaleX = gameWidth / WORLD_WIDTH;
      const scaleY = gameHeight / WORLD_HEIGHT;
      const baseScale = Math.min(scaleX, scaleY);
      const currentScale = baseScale * zoomLevel;

      // Calculate where player should be on screen (center)
      const targetScreenX = gameWidth / 2;
      const targetScreenY = gameHeight / 2;

      // Calculate current player screen position without camera offset
      const scaledWorldWidth = WORLD_WIDTH * currentScale;
      const scaledWorldHeight = WORLD_HEIGHT * currentScale;
      const baseOffsetX = (gameWidth - scaledWorldWidth) / 2;
      const baseOffsetY = (gameHeight - scaledWorldHeight) / 2;

      const currentScreenX = currentPlayer.x * currentScale + baseOffsetX + cameraOffsetX;
      const currentScreenY = currentPlayer.y * currentScale + baseOffsetY + cameraOffsetY;

      // Calculate how much to adjust camera to center player
      const deltaX = targetScreenX - currentScreenX;
      const deltaY = targetScreenY - currentScreenY;

      // Smooth camera follow (lerp)
      const smoothness = 0.1; // 0.1 = smooth, 1.0 = instant
      cameraOffsetX += deltaX * smoothness;
      cameraOffsetY += deltaY * smoothness;

      // Clamp to prevent showing gray areas
      clampCameraOffset();
    }

    // Never show current player's own name
    currentPlayer.draw(true, false);
  }

  // Draw other players
  otherPlayers.forEach(player => {
    // Update smoke particles for other players
    player.updateSmokeParticles();

    // Spawn smoke particles when other player is running
    if (player.isMoving && player.runningLevel > 0) {
      player.spawnSmokeParticle();
    }

    // Show name if: hovered OR showNames setting is enabled
    const showName = (hoveredPlayer && hoveredPlayer.id === player.id) || chatSettings.showNames;
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

  // Draw object placement preview
  if (selectedObject) {
    drawObjectPreview();
  }

  // Draw UI overlay on top
  drawUI();

  // Update WebRTC proximity connections (every 30 frames = ~500ms at 60fps)
  // Always check proximity, even if mic is off (to receive audio from others)
  if (frameCount % 30 === 0) {
    updateProximityConnections();
  }

  frameCount++;
  requestAnimationFrame(gameLoop);
}

// Draw floor pattern based on type
function drawFloorPattern(pattern, x, y, w, h, ctx) {
  switch (pattern) {
    case 'grass':
      // Green grass with darker green patches
      ctx.fillStyle = '#4a7c2e';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#5a9c3e';
      for (let i = 0; i < 50; i++) {
        const px = x + Math.random() * w;
        const py = y + Math.random() * h;
        ctx.fillRect(px, py, 3, 3);
      }
      break;

    case 'river':
      // Blue water with wavy pattern
      ctx.fillStyle = '#3b8fd8';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#2a6fa8';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x, y + (h / 5) * i);
        for (let j = 0; j < w; j += 20) {
          ctx.lineTo(x + j, y + (h / 5) * i + Math.sin(j / 30) * 5);
        }
        ctx.stroke();
      }
      break;

    case 'sand':
      // Beige sand with speckles
      ctx.fillStyle = '#e8d4a2';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#d4c090';
      for (let i = 0; i < 80; i++) {
        const px = x + Math.random() * w;
        const py = y + Math.random() * h;
        ctx.fillRect(px, py, 2, 2);
      }
      break;

    case 'dirt':
      // Brown dirt
      ctx.fillStyle = '#8b6f47';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#7a5f3a';
      for (let i = 0; i < 60; i++) {
        const px = x + Math.random() * w;
        const py = y + Math.random() * h;
        ctx.fillRect(px, py, 4, 4);
      }
      break;

    case 'road':
      // Gray asphalt with dashed white line
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 15]);
      ctx.beginPath();
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      break;

    case 'artificial-grass':
      // Bright green artificial grass
      ctx.fillStyle = '#3cb371';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#2e8b57';
      for (let i = 0; i < 40; i++) {
        const px = x + Math.random() * w;
        const py = y + Math.random() * h;
        ctx.fillRect(px, py, 3, 3);
      }
      break;

    case 'wood':
      // Wood planks
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 2;
      for (let i = 0; i < h; i += 40) {
        ctx.beginPath();
        ctx.moveTo(x, y + i);
        ctx.lineTo(x + w, y + i);
        ctx.stroke();
      }
      break;

    case 'tile':
      // White tiles with grid
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      const tileSize = 50;
      for (let i = 0; i < w; i += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i, y + h);
        ctx.stroke();
      }
      for (let i = 0; i < h; i += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, y + i);
        ctx.lineTo(x + w, y + i);
        ctx.stroke();
      }
      break;

    case 'carpet':
      // Red carpet with pattern
      ctx.fillStyle = '#b22222';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#8b0000';
      for (let i = 0; i < w; i += 30) {
        for (let j = 0; j < h; j += 30) {
          ctx.fillRect(x + i, y + j, 3, 3);
        }
      }
      break;

    default:
      // Default solid color
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(x, y, w, h);
  }
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
    // Row 1 (y=0): Lobby, Workspace-1, Workspace-2
    { x: 0, y: 0, w: 1600, h: 1200, color: '#e8f4f8', roomId: 'lobby' },
    { x: 1600, y: 0, w: 1600, h: 1200, color: '#f5eedb', roomId: 'workspace-1' },
    { x: 3200, y: 0, w: 1600, h: 1200, color: '#f5eedb', roomId: 'workspace-2' },

    // Row 2 (y=1200): Meeting-1, Meeting-2, Huddle
    { x: 0, y: 1200, w: 1600, h: 1200, color: '#e8f4e8', roomId: 'meeting-room-1' },
    { x: 1600, y: 1200, w: 1600, h: 1200, color: '#e8f4e8', roomId: 'meeting-room-2' },
    { x: 3200, y: 1200, w: 1600, h: 1200, color: '#fff5e8', roomId: 'huddle-room' },

    // Row 3 (y=2400): Lounge, Kitchen, Game Room
    { x: 0, y: 2400, w: 1600, h: 1200, color: '#f0e8f5', roomId: 'lounge' },
    { x: 1600, y: 2400, w: 1600, h: 1200, color: '#fffbe8', roomId: 'kitchen' },
    { x: 3200, y: 2400, w: 1600, h: 1200, color: '#ffe8e8', roomId: 'game-room' }
  ];

  // Draw each zone with custom floor type or color
  zones.forEach(zone => {
    const screenX = zone.x * scale + offsetX;
    const screenY = zone.y * scale + offsetY;
    const screenW = zone.w * scale;
    const screenH = zone.h * scale;

    // Check for floor type first (takes precedence over color)
    const floorTypeSource = isEditingObjects ? tempCustomRoomFloorTypes : customRoomFloorTypes;
    const floorType = floorTypeSource[zone.roomId];

    if (floorType) {
      // Draw floor pattern
      drawFloorPattern(floorType, screenX, screenY, screenW, screenH, ctx);
    } else {
      // Use custom color if available, otherwise use default
      const colorSource = isEditingObjects ? tempCustomRoomColors : customRoomColors;
      const fillColor = colorSource[zone.roomId] || zone.color;
      ctx.fillStyle = fillColor;
      ctx.fillRect(screenX, screenY, screenW, screenH);
    }

    // Highlight hovered room floor in edit mode
    if (isEditingObjects && hoveredFloor && hoveredFloor.type === 'room' && hoveredFloor.id === zone.roomId) {
      ctx.fillStyle = 'rgba(255, 69, 0, 0.3)'; // Orange overlay for deletion
      ctx.fillRect(screenX, screenY, screenW, screenH);
      ctx.strokeStyle = 'rgba(255, 69, 0, 0.8)';
      ctx.lineWidth = 4;
      ctx.strokeRect(screenX, screenY, screenW, screenH);
    } else {
      // Optional: Add subtle border between zones
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, screenY, screenW, screenH);
    }
  });

  // Draw individual tile floors on top of room floors
  const tileFloorSource = isEditingObjects ? tempCustomTileFloors : customTileFloors;
  Object.entries(tileFloorSource).forEach(([tileId, pattern]) => {
    const [tileX, tileY] = tileId.split('_').map(Number);
    const worldX = tileX * TILE_SIZE;
    const worldY = tileY * TILE_SIZE;

    const screenX = worldX * scale + offsetX;
    const screenY = worldY * scale + offsetY;
    const screenW = TILE_SIZE * scale;
    const screenH = TILE_SIZE * scale;

    // Draw tile pattern
    drawFloorPattern(pattern, screenX, screenY, screenW, screenH, ctx);

    // Highlight hovered tile floor in edit mode
    if (isEditingObjects && hoveredFloor && hoveredFloor.type === 'tile' && hoveredFloor.id === tileId) {
      ctx.fillStyle = 'rgba(255, 69, 0, 0.3)'; // Orange overlay for deletion
      ctx.fillRect(screenX, screenY, screenW, screenH);
      ctx.strokeStyle = 'rgba(255, 69, 0, 0.8)';
      ctx.lineWidth = 4;
      ctx.strokeRect(screenX, screenY, screenW, screenH);
    } else if (isEditingObjects) {
      // Add border to show tile boundary (only in edit mode)
      ctx.strokeStyle = 'rgba(102, 126, 234, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, screenY, screenW, screenH);
    }
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
