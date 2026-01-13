require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// MongoDB Connection
const connectDB = require('./database');
connectDB();

// Models
const RoomDecoration = require('./models/RoomDecoration');
const ChatHistory = require('./models/ChatHistory');

// Game state
const rooms = new Map();
const players = new Map();
const playerStates = new Map(); // Store player states by userId for reconnection

// Initialize default rooms
const defaultRooms = ['lobby', 'meeting-room', 'lounge'];
defaultRooms.forEach(roomName => {
  rooms.set(roomName, {
    name: roomName,
    players: new Map()
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Player joins with username
  socket.on('join', ({ username, room = 'lobby', userId, status = '' }) => {
    // Force everyone to lobby since we now have unified map
    room = 'lobby';

    // Check if player with this userId already exists (reconnection case)
    let existingPlayerId = null;
    let savedState = null;

    if (userId) {
      // Check for saved player state
      savedState = playerStates.get(userId);

      // Check for active player with same userId and remove ALL duplicates
      const duplicateIds = [];
      players.forEach((player, id) => {
        if (player.userId === userId && id !== socket.id) {
          duplicateIds.push(id);
        }
      });

      // Remove all duplicates
      duplicateIds.forEach(id => {
        const oldPlayer = players.get(id);
        if (oldPlayer) {
          console.log(`🗑️ Removing duplicate player ${id} for userId ${userId}`);

          // Save state before removing
          if (!savedState) {
            savedState = {
              x: oldPlayer.x,
              y: oldPlayer.y,
              color: oldPlayer.color,
              room: oldPlayer.room,
              status: oldPlayer.status
            };
            playerStates.set(userId, savedState);
          }

          // Notify room that old player left
          socket.to(oldPlayer.room).emit('playerLeft', id);

          // Remove from room
          const oldRoomData = rooms.get(oldPlayer.room);
          if (oldRoomData) {
            oldRoomData.players.delete(id);
          }

          // Remove from players map
          players.delete(id);
        }
      });
    }

    // NOW check if username is already taken by another active player
    // (after removing reconnection duplicates)
    let usernameTaken = false;
    players.forEach((player, id) => {
      if (player.username === username && id !== socket.id) {
        usernameTaken = true;
      }
    });

    if (usernameTaken) {
      socket.emit('joinError', { message: 'ชื่อนี้มีคนใช้แล้ว กรุณาเลือกชื่ออื่น' });
      console.log(`❌ Username "${username}" already taken`);
      return;
    }

    // World coordinates - 3x3 grid of rooms (4800x3600 total)
    const WORLD_WIDTH = 4800;
    const WORLD_HEIGHT = 3600;

    // Lobby spawn area (center room: 1600-3200, 1200-2400)
    const LOBBY_X_MIN = 1700;
    const LOBBY_X_MAX = 3100;
    const LOBBY_Y_MIN = 1300;
    const LOBBY_Y_MAX = 2300;

    const player = {
      id: socket.id,
      userId: userId,
      username: username || `Player_${socket.id.substring(0, 4)}`,
      x: savedState ? savedState.x : Math.random() * (LOBBY_X_MAX - LOBBY_X_MIN) + LOBBY_X_MIN,
      y: savedState ? savedState.y : Math.random() * (LOBBY_Y_MAX - LOBBY_Y_MIN) + LOBBY_Y_MIN,
      room: savedState ? savedState.room : room,
      color: savedState ? savedState.color : `hsl(${Math.random() * 360}, 70%, 60%)`,
      status: savedState ? savedState.status : status
    };

    players.set(socket.id, player);
    socket.join(room);

    // Add player to room
    const roomData = rooms.get(room);
    if (roomData) {
      roomData.players.set(socket.id, player);
    }

    // Send current player info
    socket.emit('init', {
      player,
      players: Array.from(roomData.players.values())
    });

    // Notify others in the room
    socket.to(room).emit('playerJoined', player);

    console.log(`${player.username} joined ${room}${userId ? ` (userId: ${userId})` : ''}`);
  });

  // Player movement
  socket.on('move', (position) => {
    const player = players.get(socket.id);
    if (player) {
      player.x = position.x;
      player.y = position.y;
      if (position.direction) player.direction = position.direction;
      if (position.isMoving !== undefined) player.isMoving = position.isMoving;

      const roomData = rooms.get(player.room);
      if (roomData) {
        roomData.players.set(socket.id, player);
      }

      // Update saved state for reconnection
      if (player.userId && playerStates.has(player.userId)) {
        const state = playerStates.get(player.userId);
        state.x = position.x;
        state.y = position.y;
      }

      // Broadcast to others in the same room
      socket.to(player.room).emit('playerMoved', {
        id: socket.id,
        x: position.x,
        y: position.y,
        direction: position.direction,
        isMoving: position.isMoving
      });
    }
  });

  // Global chat
  socket.on('globalChat', (message) => {
    const player = players.get(socket.id);
    if (player) {
      const chatMessage = {
        id: Date.now(),
        playerId: socket.id,
        username: player.username,
        message: message,
        timestamp: new Date(),
        type: 'global'
      };

      // Broadcast to all players in the same room
      io.to(player.room).emit('globalChat', chatMessage);
    }
  });

  // Proximity chat
  socket.on('proximityChat', (message) => {
    const player = players.get(socket.id);
    if (player) {
      const roomData = rooms.get(player.room);
      if (roomData) {
        const chatMessage = {
          id: Date.now(),
          playerId: socket.id,
          username: player.username,
          message: message,
          timestamp: new Date(),
          type: 'proximity',
          position: { x: player.x, y: player.y }
        };

        // Send to nearby players (within 200 pixels)
        const proximityRange = 200;
        roomData.players.forEach((otherPlayer, playerId) => {
          const distance = Math.sqrt(
            Math.pow(player.x - otherPlayer.x, 2) +
            Math.pow(player.y - otherPlayer.y, 2)
          );

          if (distance <= proximityRange) {
            io.to(playerId).emit('proximityChat', chatMessage);
          }
        });
      }
    }
  });

  // Voice chat (legacy - recorded messages)
  socket.on('voiceChat', (data) => {
    const player = players.get(socket.id);
    if (player) {
      const voiceMessage = {
        id: Date.now(),
        username: player.username,
        audio: data.audio,
        duration: data.duration,
        timestamp: new Date()
      };

      // Broadcast to all players in the same room (excluding sender)
      socket.to(player.room).emit('voiceChat', voiceMessage);

      console.log(`🎤 Voice message from ${player.username}`);
    }
  });

  // WebRTC Signaling for real-time voice chat
  socket.on('webrtc-offer', ({ targetId, offer }) => {
    const player = players.get(socket.id);
    if (player) {
      console.log(`📞 WebRTC offer from ${player.username} to ${targetId}`);
      io.to(targetId).emit('webrtc-offer', {
        fromId: socket.id,
        fromUsername: player.username,
        offer: offer
      });
    }
  });

  socket.on('webrtc-answer', ({ targetId, answer }) => {
    const player = players.get(socket.id);
    if (player) {
      console.log(`📞 WebRTC answer from ${player.username} to ${targetId}`);
      io.to(targetId).emit('webrtc-answer', {
        fromId: socket.id,
        answer: answer
      });
    }
  });

  socket.on('webrtc-ice-candidate', ({ targetId, candidate }) => {
    const player = players.get(socket.id);
    if (player) {
      io.to(targetId).emit('webrtc-ice-candidate', {
        fromId: socket.id,
        candidate: candidate
      });
    }
  });

  // Screen Share Signaling
  socket.on('start-screen-share', () => {
    const player = players.get(socket.id);
    if (player) {
      console.log(`🖥️ ${player.username} started screen sharing`);
      // Notify all players in the same room
      socket.to(player.room).emit('user-started-screen-share', {
        userId: socket.id,
        username: player.username
      });
    }
  });

  socket.on('stop-screen-share', () => {
    const player = players.get(socket.id);
    if (player) {
      console.log(`🖥️ ${player.username} stopped screen sharing`);
      // Notify all players in the same room
      socket.to(player.room).emit('user-stopped-screen-share', {
        userId: socket.id
      });
    }
  });

  socket.on('screen-share-offer', ({ targetId, offer }) => {
    const player = players.get(socket.id);
    if (player) {
      console.log(`🖥️ Screen share offer from ${player.username} to ${targetId}`);
      io.to(targetId).emit('screen-share-offer', {
        fromId: socket.id,
        fromUsername: player.username,
        offer: offer
      });
    }
  });

  socket.on('screen-share-answer', ({ targetId, answer }) => {
    const player = players.get(socket.id);
    if (player) {
      console.log(`🖥️ Screen share answer from ${player.username} to ${targetId}`);
      io.to(targetId).emit('screen-share-answer', {
        fromId: socket.id,
        answer: answer
      });
    }
  });

  socket.on('screen-share-ice-candidate', ({ targetId, candidate }) => {
    const player = players.get(socket.id);
    if (player) {
      io.to(targetId).emit('screen-share-ice-candidate', {
        fromId: socket.id,
        candidate: candidate
      });
    }
  });

  // Update player status
  socket.on('updateStatus', ({ status }) => {
    const player = players.get(socket.id);
    if (player) {
      player.status = status || '';

      // Update in room data
      const roomData = rooms.get(player.room);
      if (roomData) {
        roomData.players.set(socket.id, player);
      }

      // Broadcast status update to all players in the same room
      socket.to(player.room).emit('playerStatusUpdated', {
        id: socket.id,
        status: player.status
      });

      console.log(`💬 ${player.username} updated status: "${player.status}"`);
    }
  });

  // Update player color
  socket.on('updateColor', ({ color }) => {
    const player = players.get(socket.id);
    if (player) {
      player.color = color;

      // Update in room data
      const roomData = rooms.get(player.room);
      if (roomData) {
        roomData.players.set(socket.id, player);
      }

      // Update saved state for reconnection
      if (player.userId && playerStates.has(player.userId)) {
        const state = playerStates.get(player.userId);
        state.color = color;
      }

      // Broadcast color update to all players in the same room
      socket.to(player.room).emit('playerColorUpdated', {
        id: socket.id,
        color: player.color
      });

      console.log(`🎨 ${player.username} updated color: ${player.color}`);
    }
  });

  // Send poke
  socket.on('sendPoke', ({ targetId }) => {
    const player = players.get(socket.id);
    const targetPlayer = players.get(targetId);

    if (player && targetPlayer) {
      // Send poke to target player
      io.to(targetId).emit('receivePoke', {
        fromId: socket.id,
        fromUsername: player.username
      });

      console.log(`👉 ${player.username} poked ${targetPlayer.username}`);
    }
  });

  // Change room
  socket.on('changeRoom', (newRoom) => {
    const player = players.get(socket.id);
    if (player) {
      const oldRoom = player.room;

      // Leave old room
      socket.leave(oldRoom);
      const oldRoomData = rooms.get(oldRoom);
      if (oldRoomData) {
        oldRoomData.players.delete(socket.id);
        socket.to(oldRoom).emit('playerLeft', socket.id);
      }

      // Join new room (teleport to lobby area on unified map)
      const LOBBY_X_MIN = 1700;
      const LOBBY_X_MAX = 3100;
      const LOBBY_Y_MIN = 1300;
      const LOBBY_Y_MAX = 2300;

      player.room = newRoom;
      player.x = Math.random() * (LOBBY_X_MAX - LOBBY_X_MIN) + LOBBY_X_MIN;
      player.y = Math.random() * (LOBBY_Y_MAX - LOBBY_Y_MIN) + LOBBY_Y_MIN;
      socket.join(newRoom);

      const newRoomData = rooms.get(newRoom);
      if (newRoomData) {
        newRoomData.players.set(socket.id, player);
      }

      // Update player
      socket.emit('roomChanged', {
        player,
        players: Array.from(newRoomData.players.values())
      });

      // Notify others in new room
      socket.to(newRoom).emit('playerJoined', player);

      console.log(`${player.username} moved from ${oldRoom} to ${newRoom}`);
    }
  });

  // Get available rooms
  socket.on('getRooms', () => {
    const roomList = Array.from(rooms.keys()).map(roomName => ({
      name: roomName,
      playerCount: rooms.get(roomName).players.size
    }));
    socket.emit('roomList', roomList);
  });

  // Logout
  socket.on('logout', () => {
    const player = players.get(socket.id);
    if (player) {
      // Remove saved state on explicit logout
      if (player.userId) {
        playerStates.delete(player.userId);
      }

      const roomData = rooms.get(player.room);
      if (roomData) {
        roomData.players.delete(socket.id);
      }

      socket.to(player.room).emit('playerLeft', socket.id);
      players.delete(socket.id);

      console.log(`${player.username} logged out`);

      // Disconnect the socket
      socket.disconnect();
    }
  });

  // Get room decorations
  socket.on('getDecorations', async (roomName) => {
    try {
      let decoration = await RoomDecoration.findOne({ room: roomName || 'lobby' });

      if (!decoration) {
        // Create default decoration if not exists
        decoration = await RoomDecoration.create({
          room: roomName || 'lobby',
          furniture: [],
          customRoomColors: {},
          customRoomFloorTypes: {},
          customTileFloors: {},
          customObjects: {}
        });
      }

      socket.emit('decorationsLoaded', {
        furniture: decoration.furniture,
        customRoomColors: decoration.customRoomColors,
        customRoomFloorTypes: decoration.customRoomFloorTypes,
        customTileFloors: decoration.customTileFloors,
        customObjects: decoration.customObjects
      });

      console.log(`📦 Sent decorations for ${roomName} to ${socket.id}`);
    } catch (error) {
      console.error('❌ Error loading decorations:', error);
      socket.emit('decorationsError', { message: 'Failed to load decorations' });
    }
  });

  // Save room decorations
  socket.on('saveDecorations', async (data) => {
    try {
      const player = players.get(socket.id);
      const roomName = data.room || (player ? player.room : 'lobby');

      const decoration = await RoomDecoration.findOneAndUpdate(
        { room: roomName },
        {
          furniture: data.furniture || [],
          customRoomColors: data.customRoomColors || {},
          customRoomFloorTypes: data.customRoomFloorTypes || {},
          customTileFloors: data.customTileFloors || {},
          customObjects: data.customObjects || {},
          lastUpdatedBy: player ? player.username : 'unknown',
          updatedAt: new Date()
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );

      // Broadcast to all players in the same room
      io.to(roomName).emit('decorationsUpdated', {
        furniture: decoration.furniture,
        customRoomColors: decoration.customRoomColors,
        customRoomFloorTypes: decoration.customRoomFloorTypes,
        customTileFloors: decoration.customTileFloors,
        customObjects: decoration.customObjects,
        updatedBy: player ? player.username : 'unknown'
      });

      console.log(`💾 Saved decorations for ${roomName} by ${player ? player.username : 'unknown'}`);
    } catch (error) {
      console.error('❌ Error saving decorations:', error);
      socket.emit('decorationsError', { message: 'Failed to save decorations' });
    }
  });

  // Save chat message to database
  socket.on('saveChatMessage', async (data) => {
    try {
      const player = players.get(socket.id);

      const chatMessage = new ChatHistory({
        messageId: data.id,
        username: data.username || (player ? player.username : 'Unknown'),
        userId: data.userId || (player ? player.userId : null),
        message: data.message,
        translation: data.translation || null,
        room: data.room || (player ? player.room : 'lobby'),
        timestamp: data.timestamp || new Date(),
        isNewTranslation: data.isNewTranslation || false
      });

      await chatMessage.save();
      console.log(`💾 Saved chat message from ${chatMessage.username}`);
    } catch (error) {
      console.error('❌ Error saving chat message:', error);
    }
  });

  // Get chat history from database
  socket.on('getChatHistory', async (data) => {
    try {
      const { room, limit = 100 } = data || {};
      const player = players.get(socket.id);
      const targetRoom = room || (player ? player.room : 'lobby');

      const history = await ChatHistory.find({ room: targetRoom })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      // Convert to client format
      const clientHistory = history.map(item => ({
        id: item.messageId,
        username: item.username,
        message: item.message,
        translation: item.translation,
        timestamp: item.timestamp,
        room: item.room,
        isNewTranslation: item.isNewTranslation
      }));

      socket.emit('chatHistoryLoaded', clientHistory);
      console.log(`📜 Sent ${clientHistory.length} chat messages to ${player ? player.username : socket.id}`);
    } catch (error) {
      console.error('❌ Error loading chat history:', error);
      socket.emit('chatHistoryError', { message: 'Failed to load chat history' });
    }
  });

  // Update translation for a message
  socket.on('updateTranslation', async (data) => {
    try {
      const { messageId, translation, isNewTranslation } = data;

      const result = await ChatHistory.findOneAndUpdate(
        { messageId: messageId },
        {
          translation: translation,
          isNewTranslation: isNewTranslation !== undefined ? isNewTranslation : true,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (result) {
        console.log(`✅ Updated translation for message ${messageId}`);
        socket.emit('translationUpdated', {
          messageId: messageId,
          translation: translation,
          isNewTranslation: isNewTranslation
        });
      } else {
        console.log(`⚠️ Message ${messageId} not found for translation update`);
      }
    } catch (error) {
      console.error('❌ Error updating translation:', error);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      // Save player state for reconnection (with 5 minute timeout)
      if (player.userId) {
        playerStates.set(player.userId, {
          x: player.x,
          y: player.y,
          color: player.color,
          room: player.room,
          username: player.username,
          status: player.status
        });

        // Auto-cleanup after 5 minutes
        setTimeout(() => {
          playerStates.delete(player.userId);
          console.log(`🗑️  Cleaned up state for ${player.username}`);
        }, 5 * 60 * 1000);
      }

      const roomData = rooms.get(player.room);
      if (roomData) {
        roomData.players.delete(socket.id);
      }

      socket.to(player.room).emit('playerLeft', socket.id);
      players.delete(socket.id);

      console.log(`${player.username} disconnected`);
    }
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.keys()).map(roomName => ({
    name: roomName,
    playerCount: rooms.get(roomName).players.size
  }));
  res.json(roomList);
});

// Proxy to Planning Tool Backend API - GET bookmarks
app.get('/api/bookmarks', async (req, res) => {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8002';
    console.log(`📡 Fetching bookmarks from: ${backendUrl}/api/bookmarks`);

    const response = await fetch(`${backendUrl}/api/bookmarks`, {
      timeout: 5000 // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Successfully fetched ${data.bookmarks?.length || 0} bookmarks`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching bookmarks from backend:', error.message);
    console.error('   Backend URL:', process.env.BACKEND_URL || 'http://localhost:8002');
    console.error('   Make sure the Planning Tool Backend is running and accessible');

    // Return empty bookmarks instead of error (graceful degradation)
    res.json({
      bookmarks: [],
      error: true,
      message: `Cannot connect to Planning Tool Backend: ${error.message}`,
      backendUrl: process.env.BACKEND_URL || 'http://localhost:8002'
    });
  }
});

// Proxy to Planning Tool Backend API - POST bookmark (for Chrome Extension)
app.post('/api/bookmarks', async (req, res) => {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8002';
    console.log(`📝 Creating bookmark via: ${backendUrl}/api/bookmarks`);
    console.log(`📋 Bookmark data:`, req.body);

    const response = await fetch(`${backendUrl}/api/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body),
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Bookmark created successfully:`, data);
    res.json(data);
  } catch (error) {
    console.error('❌ Error creating bookmark:', error.message);
    console.error('   Backend URL:', process.env.BACKEND_URL || 'http://localhost:8002');
    res.status(500).json({
      error: true,
      message: `Cannot connect to Planning Tool Backend: ${error.message}`,
      backendUrl: process.env.BACKEND_URL || 'http://localhost:8002'
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Virtual Office server running on:`);
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Network: http://[YOUR_IP]:${PORT}`);
  console.log(`   (Replace [YOUR_IP] with your computer's IP address)`);
});
