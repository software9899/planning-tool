const mongoose = require('mongoose');

const ChatHistorySchema = new mongoose.Schema({
  messageId: {
    type: Number,
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    default: null
  },
  message: {
    type: String,
    required: true
  },
  translation: {
    type: String,
    default: null
  },
  room: {
    type: String,
    required: true,
    default: 'lobby'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isNewTranslation: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
ChatHistorySchema.index({ room: 1, timestamp: -1 });
ChatHistorySchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('ChatHistory', ChatHistorySchema);
