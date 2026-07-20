import { WebSocket } from "ws";

// --- CONFIG ---
const NGROK_URL = 'wss://unscandalized-sean-undistractingly.ngrok-free.dev/ws'; // Your ngrok wss URL
const GHOST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNWRhOTQwMmQxOWYwZTI1NjQ3Y2I2NSIsImlhdCI6MTc4NDUyMzA3Mn0.MfpoWnFOWv74mQD02APlAvPySSul82z5H2jwBfEcHiA';
const RIDE_ID = '6a5dc99147f15310407732a4';
// --------------

console.log('👻 Starting Ghost Rider...');

const ws = new WebSocket(`${NGROK_URL}?token=${GHOST_TOKEN}`);

ws.on('open', () => {
  console.log('👻 Ghost Connected!');
  
  // Join the ride
  ws.send(JSON.stringify({
    type: 'JOIN_RIDE',
    payload: { rideId: RIDE_ID }
  }));

  // Simulate driving in a square around Bangalore
  let lat = 24.6;  // e.g., 40.7128
  let lng = 87.25; // e.g., -74.0060
  let direction = 'north';

  setInterval(() => {
    if (direction === 'north') {
      lat += 0.0005;
      if (lat > 12.9750) direction = 'east';
    } else if (direction === 'east') {
      lng += 0.0005;
      if (lng > 77.5980) direction = 'south';
    } else if (direction === 'south') {
      lat -= 0.0005;
      if (lat < 12.9716) direction = 'west';
    } else if (direction === 'west') {
      lng -= 0.0005;
      if (lng < 77.5946) direction = 'north';
    }

    // Send location to server
    ws.send(JSON.stringify({
      type: 'LOCATION_UPDATE',
      payload: {
        lat: lat,
        lng: lng,
        speed: 140,
        heading: 0
      }
    }));
    console.log(`👻 Sending location: ${lat}, ${lng}`);
  }, 3000); // Every 3 seconds
});

ws.on('error', (err) => console.error('👻 WS Error:', err.message));
ws.on('close', () => console.log('👻 Ghost Disconnected'));