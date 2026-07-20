import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { redisClient } from '../config/redis.js';
import Location from '../models/location.js';

// Map to track rooms: { rideId: SetOfWebSocketInstances }
const rooms = new Map();

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Heartbeat: check dead connections every 30s
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // 1. Authenticate on connection via query param: ws://localhost:5000/ws?token=YOUR_JWT
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      ws.userId = decoded.id;
    } catch (err) {
      ws.close(4001, 'Authentication failed');
      return;
    }

    console.log(`⚡ Client connected: ${ws.userId}`);

    // 2. Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const parsed = JSON.parse(message);
        const { type, payload } = parsed;

        switch (type) {
          case 'JOIN_RIDE':
            handleJoinRide(ws, payload.rideId);
            break;
          case 'LOCATION_UPDATE':
            handleLocationUpdate(ws, payload);
            break;
          case 'LEAVE_RIDE':
            handleLeaveRide(ws);
            break;
        }
      } catch (err) {
        console.error('Message handling error:', err);
      }
    });

    // 3. Handle disconnect
    ws.on('close', () => {
      handleLeaveRide(ws);
      console.log(`🔌 Client disconnected: ${ws.userId}`);
    });
  });
}

// --- Helper Functions ---

function handleJoinRide(ws, rideId) {
  // Leave previous room if in one
  if (ws.currentRideId) handleLeaveRide(ws);

  ws.currentRideId = rideId;

  if (!rooms.has(rideId)) {
    rooms.set(rideId, new Set());
  }
  rooms.get(rideId).add(ws);

  console.log(`User ${ws.userId} joined ride ${rideId}`);

  // Notify room someone joined
  broadcastToRoom(rideId, {
    type: 'MEMBER_JOINED',
    payload: { userId: ws.userId }
  }, ws); // exclude sender
}

function handleLeaveRide(ws) {
  const rideId = ws.currentRideId;
  if (!rideId) return;

  const room = rooms.get(rideId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) rooms.delete(rideId); // cleanup empty room
  }

  broadcastToRoom(rideId, {
    type: 'MEMBER_LEFT',
    payload: { userId: ws.userId }
  });

  ws.currentRideId = null;
}

async function handleLocationUpdate(ws, payload) {
  const rideId = ws.currentRideId;
  if (!rideId) return;

  const locationData = {
    userId: ws.userId,
    lat: payload.lat,
    lng: payload.lng,
    speed: payload.speed || 0,
    heading: payload.heading || 0,
    timestamp: Date.now()
  };

  // 1. Save latest to Redis for fast retrieval
  await redisClient.hSet(`ride:${rideId}:locations`, ws.userId, JSON.stringify(locationData));

  // 2. Async write to MongoDB (fire and forget, don't block the loop)
  Location.create({ rideId, ...locationData }).catch(err => console.error('DB Write Err', err));

  // 3. Broadcast to others in the ride
  broadcastToRoom(rideId, {
    type: 'MEMBER_LOCATION',
    payload: locationData
  }, ws); // Exclude sender
}

function broadcastToRoom(rideId, message, excludeWs = null) {
  const room = rooms.get(rideId);
  if (!room) return;

  const data = JSON.stringify(message);

  room.forEach(client => {
    if (client !== excludeWs && client.readyState === 1) { // 1 = OPEN
      client.send(data);
    }
  });
}