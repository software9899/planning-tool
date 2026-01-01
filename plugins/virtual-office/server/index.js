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
  socket.on('join', ({ username, room = 'lobby', userId }) => {
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
              room: oldPlayer.room
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
      color: savedState ? savedState.color : `hsl(${Math.random() * 360}, 70%, 60%)`
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

  // Voice chat
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
          username: player.username
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

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Virtual Office server running on http://localhost:${PORT}`);
});
