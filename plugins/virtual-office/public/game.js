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
let chatPanelOpen = false; // Track if chat panel is open
let chatPanelHeight = 400; // Chat panel height: 400, 600, 800, or 0 (hidden)
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
    // Jump variables
    this.isJumping = false;
    this.jumpProgress = 0;
    this.jumpStartX = 0;
    this.jumpStartY = 0;
    this.jumpTargetX = 0;
    this.jumpTargetY = 0;
    this.jumpHeight = 0;
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

    // Only move forward if currently moving (WASD pressed)
    if (this.isMoving) {
      // Calculate jump distance (2 cells = 64 pixels, like a mini-boost)
      const jumpDistance = 100;

      // Calculate target position based on current direction
      switch(this.direction) {
        case 'up':
          targetY -= jumpDistance;
          break;
        case 'down':
          targetY += jumpDistance;
          break;
        case 'left':
          targetX -= jumpDistance;
          break;
        case 'right':
          targetX += jumpDistance;
          break;
      }

      // Keep target within bounds
      targetX = Math.max(30, Math.min(WORLD_WIDTH - 30, targetX));
      targetY = Math.max(30, Math.min(WORLD_HEIGHT - 30, targetY));
    }
    // If not moving, jump in place (targetX and targetY stay the same as current position)

    this.jumpTargetX = targetX;
    this.jumpTargetY = targetY;
    this.jumpHeight = 40; // Maximum height of jump arc

    const jumpType = this.isMoving ? 'forward' : 'in place';
    console.log(`🦘 Jump started! (${jumpType})`, this.direction, 'from', this.jumpStartX, this.jumpStartY, 'to', targetX, targetY);
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
    const headSize = 14 * scale;

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

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + bodyHeight + 5 * scale, bodyWidth * 0.7, 6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (full width - like version 6.6)
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

    // Hair/Hat - different for back view
    ctx.fillStyle = this.getHairColor(color);
    ctx.beginPath();
    if (direction === 'up') {
      // Full hair visible from behind
      ctx.arc(x, y - 5 * scale, headSize * 0.95, 0, Math.PI * 2);
    } else {
      // Hair on top
      ctx.arc(x, y - 8 * scale, headSize * 0.9, Math.PI, 2 * Math.PI);
    }
    ctx.fill();

    // Face - improved side profile (like version 6.7)
    const faceY = y - 5 * scale;
    ctx.fillStyle = '#333';

    if (direction !== 'up') {
      if (direction === 'down') {
        // Front view - two eyes
        ctx.fillRect(x - 5 * scale, faceY - 2 * scale, 3 * scale, 2 * scale);
        ctx.fillRect(x + 2 * scale, faceY - 2 * scale, 3 * scale, 2 * scale);
      } else if (direction === 'left') {
        // Side profile - left
        // One eye
        ctx.fillRect(x - 6 * scale, faceY - 2 * scale, 3 * scale, 2 * scale);

        // Nose (profile pointing left)
        ctx.beginPath();
        ctx.moveTo(x - 8 * scale, faceY);
        ctx.lineTo(x - 11 * scale, faceY + 2 * scale);
        ctx.lineTo(x - 8 * scale, faceY + 3 * scale);
        ctx.fillStyle = '#ffdbac';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5 * scale;
        ctx.stroke();

        // Mouth (side)
        ctx.fillStyle = '#333';
        ctx.fillRect(x - 9 * scale, faceY + 5 * scale, 3 * scale, 1 * scale);
      } else if (direction === 'right') {
        // Side profile - right
        // One eye
        ctx.fillRect(x + 3 * scale, faceY - 2 * scale, 3 * scale, 2 * scale);

        // Nose (profile pointing right)
        ctx.beginPath();
        ctx.moveTo(x + 8 * scale, faceY);
        ctx.lineTo(x + 11 * scale, faceY + 2 * scale);
        ctx.lineTo(x + 8 * scale, faceY + 3 * scale);
        ctx.fillStyle = '#ffdbac';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5 * scale;
        ctx.stroke();

        // Mouth (side)
        ctx.fillStyle = '#333';
        ctx.fillRect(x + 6 * scale, faceY + 5 * scale, 3 * scale, 1 * scale);
      }

      // Mouth for front view only
      if (direction === 'down') {
        ctx.fillRect(x - 2 * scale, faceY + 3 * scale, 4 * scale, 1 * scale);
      }
    }

    // Arms (like version 6.6)
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

    // Legs (like version 6.6)
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

    // Draw character shadow when jumping
    if (this.isJumping) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(screenX, screenY, 15 * scale, 8 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw jump sparkles/motion effect
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

    // Draw selection indicator for current player
    if (isCurrentPlayer) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 25 * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

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
    // Debug: log update calls every 60 frames
    if (frameCount % 60 === 0) {
      console.log('🔄 Update called! isJumping:', this.isJumping, 'position:', this.x.toFixed(2), this.y.toFixed(2));
    }

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
          jumpProgress: this.jumpProgress
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

    // Debug: Log movement attempts
    const isPressingMovementKey = keys['w'] || keys['s'] || keys['a'] || keys['d'] ||
                                   keys['arrowup'] || keys['arrowdown'] || keys['arrowleft'] || keys['arrowright'];
    if (isPressingMovementKey && frameCount % 60 === 0) { // Log every 60 frames
      console.log('🎮 Movement keys pressed, isJumping:', this.isJumping, 'keys:', keys);
    }

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
    const collisionX = this.checkCollision(newX, this.y);
    const collisionY = this.checkCollision(this.x, newY);

    if (collisionX || collisionY) {
      console.log('⚠️ COLLISION DETECTED! X:', collisionX, 'Y:', collisionY, 'at', newX.toFixed(2), newY.toFixed(2));
    }

    if (!collisionX) {
      this.x = newX;
    } else if (targetPosition) {
      // If collision while moving to target, cancel target
      console.log('❌ Collision X - canceling target');
      targetPosition = null;
    }

    if (!collisionY) {
      this.y = newY;
    } else if (targetPosition) {
      // If collision while moving to target, cancel target
      console.log('❌ Collision Y - canceling target');
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

// Load saved furniture and room colors from localStorage
function loadSavedDecorations() {
  try {
    const savedFurniture = localStorage.getItem('virtualOfficeFurniture');
    const savedColors = localStorage.getItem('virtualOfficeRoomColors');
    const savedCustomObjects = localStorage.getItem('virtualOfficeCustomObjects');
    const savedFloorTypes = localStorage.getItem('virtualOfficeFloorTypes');
    const savedTileFloors = localStorage.getItem('virtualOfficeTileFloors');

    if (savedFurniture) {
      furniture = JSON.parse(savedFurniture);
      console.log('🛋️ Loaded', furniture.length, 'saved objects');
    }

    if (savedColors) {
      customRoomColors = JSON.parse(savedColors);
      console.log('🎨 Loaded saved room colors');
    }

    if (savedCustomObjects) {
      customObjects = JSON.parse(savedCustomObjects);
      console.log('📸 Loaded saved custom images');
    }

    if (savedFloorTypes) {
      customRoomFloorTypes = JSON.parse(savedFloorTypes);
      console.log('🟫 Loaded saved floor types');
    }

    if (savedTileFloors) {
      customTileFloors = JSON.parse(savedTileFloors);
      console.log('🔲 Loaded saved tile floors');
    }
  } catch (error) {
    console.error('❌ Error loading saved decorations:', error);
  }
}

// Save furniture and room colors to localStorage
function saveDecorations() {
  try {
    localStorage.setItem('virtualOfficeFurniture', JSON.stringify(furniture));
    localStorage.setItem('virtualOfficeRoomColors', JSON.stringify(customRoomColors));
    localStorage.setItem('virtualOfficeCustomObjects', JSON.stringify(customObjects));
    localStorage.setItem('virtualOfficeFloorTypes', JSON.stringify(customRoomFloorTypes));
    localStorage.setItem('virtualOfficeTileFloors', JSON.stringify(customTileFloors));
    console.log('💾 Saved decorations to localStorage');
  } catch (error) {
    console.error('❌ Error saving decorations:', error);
  }
}

// Check for saved login on page load
window.addEventListener('DOMContentLoaded', () => {
  // Load saved decorations first
  loadSavedDecorations();

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
  }
});

socket.on('playerMoved', (data) => {
  const player = otherPlayers.get(data.id);
  if (player) {
    player.x = data.x;
    player.y = data.y;
    if (data.direction) player.direction = data.direction;
    if (data.isMoving !== undefined) player.isMoving = data.isMoving;
    if (data.isJumping !== undefined) {
      player.isJumping = data.isJumping;
      if (data.jumpProgress !== undefined) {
        player.jumpProgress = data.jumpProgress;
      }
    }
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

  // Jump on Space bar
  if (e.key === ' ' && currentPlayer && !currentPlayer.isJumping) {
    currentPlayer.startJump();
    e.preventDefault();
  }

  // Respawn on H key (Home)
  if ((e.key === 'h' || e.key === 'H') && currentPlayer) {
    currentPlayer.respawn();
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

  // Remove object/floor on R (in edit mode) OR open room selector
  if (e.key === 'r' || e.key === 'R') {
    // If in edit mode and hovering over an object, remove it
    if (isEditingObjects && hoveredObject) {
      const index = tempFurniture.indexOf(hoveredObject);
      if (index > -1) {
        const removedObj = tempFurniture.splice(index, 1)[0];
        console.log('🗑️ Removed object:', removedObj.name);
        hoveredObject = null;
      }
      e.preventDefault();
    }
    // If in edit mode and hovering over a floor, remove it
    else if (isEditingObjects && hoveredFloor) {
      if (hoveredFloor.type === 'tile') {
        delete tempCustomTileFloors[hoveredFloor.id];
        console.log('🗑️ Removed tile floor:', hoveredFloor.id);
      } else if (hoveredFloor.type === 'room') {
        delete tempCustomRoomFloorTypes[hoveredFloor.id];
        delete tempCustomRoomColors[hoveredFloor.id];
        console.log('🗑️ Removed room floor:', hoveredFloor.id);
      }
      hoveredFloor = null;
      e.preventDefault();
    }
    else if (!isEditingObjects) {
      // Otherwise, open room selector
      showRoomSelector();
      e.preventDefault();
    }
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

  // Save to history (save corrected version)
  saveChatHistory(finalMessage);

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

  // Always send as global chat (visible to everyone in room)
  socket.emit('globalChat', finalMessage);

  // Show on own character immediately
  if (currentPlayer) {
    currentPlayer.showChatBubble(finalMessage);
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
        isTemp: true
      };

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
    isMoving: false
  });

  console.log(`✅ Teleported to ${room.name}`);
}

// Object categories with items
const OBJECT_CATEGORIES = {
  furniture: {
    name: 'เฟอร์นิเจอร์',
    emoji: '🪑',
    items: [
      { id: 'desk', name: 'โต๊ะทำงาน', emoji: '🗄️', width: 200, height: 80, color: '#8B4513' },
      { id: 'chair', name: 'เก้าอี้', emoji: '🪑', width: 40, height: 40, color: '#654321' },
      { id: 'sofa', name: 'โซฟา', emoji: '🛋️', width: 80, height: 60, color: '#4A4A4A' },
      { id: 'table', name: 'โต๊ะกาแฟ', emoji: '☕', width: 100, height: 100, color: '#A0522D' }
    ]
  },
  decoration: {
    name: 'ของตกแต่ง',
    emoji: '🌿',
    items: [
      { id: 'plant', name: 'ต้นไม้', emoji: '🌿', width: 60, height: 60, color: '#228B22' },
      { id: 'painting', name: 'รูปภาพ', emoji: '🖼️', width: 80, height: 60, color: '#DAA520' },
      { id: 'lamp', name: 'โคมไฟ', emoji: '💡', width: 40, height: 60, color: '#FFD700' },
      { id: 'rug', name: 'พรม', emoji: '🟫', width: 150, height: 100, color: '#8B7355' }
    ]
  },
  electronics: {
    name: 'อุปกรณ์อิเล็กทรอนิกส์',
    emoji: '💻',
    items: [
      { id: 'computer', name: 'คอมพิวเตอร์', emoji: '💻', width: 50, height: 40, color: '#2F4F4F' },
      { id: 'printer', name: 'เครื่องพิมพ์', emoji: '🖨️', width: 60, height: 50, color: '#696969' },
      { id: 'tv', name: 'ทีวี', emoji: '📺', width: 100, height: 60, color: '#000000' },
      { id: 'phone', name: 'โทรศัพท์', emoji: '☎️', width: 30, height: 30, color: '#DC143C' }
    ]
  },
  storage: {
    name: 'ที่เก็บของ',
    emoji: '📦',
    items: [
      { id: 'cabinet', name: 'ตู้เก็บของ', emoji: '🗄️', width: 80, height: 120, color: '#8B4513' },
      { id: 'shelf', name: 'ชั้นวาง', emoji: '📚', width: 120, height: 80, color: '#A0522D' },
      { id: 'drawer', name: 'ลิ้นชัก', emoji: '🗃️', width: 60, height: 50, color: '#654321' },
      { id: 'locker', name: 'ล็อคเกอร์', emoji: '🔒', width: 60, height: 100, color: '#708090' }
    ]
  },
  meeting: {
    name: 'อุปกรณ์ประชุม',
    emoji: '📊',
    items: [
      { id: 'whiteboard', name: 'ไวท์บอร์ด', emoji: '📋', width: 150, height: 100, color: '#FFFFFF' },
      { id: 'projector', name: 'โปรเจคเตอร์', emoji: '📽️', width: 50, height: 40, color: '#2F4F4F' },
      { id: 'conference-table', name: 'โต๊ะประชุม', emoji: '🪑', width: 200, height: 150, color: '#8B4513' },
      { id: 'presentation-board', name: 'บอร์ดนำเสนอ', emoji: '📊', width: 100, height: 120, color: '#4682B4' }
    ]
  },
  structure: {
    name: 'โครงสร้างห้อง',
    emoji: '🚪',
    items: [
      { id: 'partition', name: 'ฉากกั้นห้อง', width: 20, height: 200, color: '#A9A9A9', isPartition: true },
      { id: 'door', name: 'ประตู', emoji: '🚪', width: 80, height: 20, color: '#8B4513' },
      { id: 'window', name: 'หน้าต่าง', emoji: '🪟', width: 100, height: 20, color: '#87CEEB' }
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
          img.src = obj.imageData;
          imageCache[obj.customId] = img;
        }

        // If image is loaded, draw it
        if (img.complete && img.naturalHeight !== 0) {
          ctx.drawImage(img, screenX, screenY, screenWidth, screenHeight);
        } else {
          // Placeholder while loading
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
          ctx.strokeStyle = '#999';
          ctx.lineWidth = 2 * scale;
          ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
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
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = selectedObject.color || '#999';
  ctx.fillRect(screen.x, screen.y, screenWidth, screenHeight);

  // Draw border
  ctx.strokeStyle = '#667eea';
  ctx.lineWidth = 3 * scale;
  ctx.strokeRect(screen.x, screen.y, screenWidth, screenHeight);

  // Draw emoji if available
  if (selectedObject.emoji) {
    ctx.globalAlpha = 0.7;
    ctx.font = `${Math.max(20, screenHeight * 0.6)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(selectedObject.emoji, screen.x + screenWidth / 2, screen.y + screenHeight / 2);
  }

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

  // Draw object placement preview
  if (selectedObject) {
    drawObjectPreview();
  }

  // Draw UI overlay on top
  drawUI();

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
