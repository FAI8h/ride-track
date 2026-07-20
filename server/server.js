import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { connectRedis } from './src/config/redis.js';
import { setupWebSocket } from './src/websockets/wsManager.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to databases
  await connectDB();
  await connectRedis();

  // Create HTTP server
  const server = http.createServer(app);
  
  // Attach WebSocket server to the HTTP server
  setupWebSocket(server);
  
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔌 WebSocket available at ws://localhost:${PORT}/ws`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});