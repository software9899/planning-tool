const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  color: {
    type: String,
    default: () => `hsl(${Math.random() * 360}, 70%, 60%)`
  },
  lastPosition: {
    x: { type: Number, default: 400 },
    y: { type: Number, default: 300 },
    room: { type: String, default: 'lobby' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
});

const ChatMessage = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  room: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['global', 'proximity'],
    default: 'global'
  },
  position: {
    x: Number,
    y: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', ChatMessage);

module.exports = { User, Message };
