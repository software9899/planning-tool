const mongoose = require('mongoose');

const RoomDecorationSchema = new mongoose.Schema({
  room: {
    type: String,
    required: true,
    default: 'lobby'
  },
  furniture: {
    type: Array,
    default: []
  },
  customRoomColors: {
    type: Object,
    default: {}
  },
  customRoomFloorTypes: {
    type: Object,
    default: {}
  },
  customTileFloors: {
    type: Object,
    default: {}
  },
  customObjects: {
    type: Object,
    default: {}
  },
  lastUpdatedBy: {
    type: String,
    default: 'system'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
RoomDecorationSchema.index({ room: 1 });

module.exports = mongoose.model('RoomDecoration', RoomDecorationSchema);
