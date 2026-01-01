const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️  MongoDB not connected: ${error.message}`);
    console.log('📝 Game will work without database (no data persistence)');
    // Don't exit, let the game run without database
  }
};

module.exports = connectDB;
