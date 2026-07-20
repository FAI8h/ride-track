import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

// --- CONFIG ---
const WS_URL = 'wss://unscandalized-sean-undistractingly.ngrok-free.dev/ws'; // e.g., ws://192.168.1.5:5000/ws
const RIDE_ID = '6a5da05ce3f39c027a90f68c'; // Replace with a real MongoDB Ride _id later
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNWQ5ZWM3YjdiYmU3NmU2ODBkYTk5MiIsImlhdCI6MTc4NDUyMDM5NH0.BzHoa5YDQD3M_M929HNzo_tg7DXDl1B4hIHRk6PdqkA'; // We will generate this below

export default function App() {
  const [myLocation, setMyLocation] = useState(null);
  const [friendLocations, setFriendLocations] = useState({});
  const ws = useRef(null);
  const mapRef = useRef(null);

  // 1. Setup WebSocket
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  // 2. Setup Location Tracking
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      // Watch location continuously
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.HighForNavigation,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Or every 10 meters moved
        },
        (location) => {
          const { latitude, longitude, speed, heading } = location.coords;
          setMyLocation({ latitude, longitude });

          // Move map camera to follow user
          if (mapRef.current) {
            mapRef.current.animateCamera({
              center: { latitude, longitude },
            });
          }

          // Send location to server via WebSocket
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
              type: 'LOCATION_UPDATE',
              payload: {
                lat: latitude,
                lng: longitude,
                speed: speed || 0,
                heading: heading || 0
              }
            }));
          }
        }
      );
    })();
  }, []);

  const connectWebSocket = () => {
    ws.current = new WebSocket(`${WS_URL}?token=${TEST_TOKEN}`);

    ws.current.onopen = () => {
      console.log('Connected to WS server');
      // Join the ride room immediately
      ws.current.send(JSON.stringify({
        type: 'JOIN_RIDE',
        payload: { rideId: RIDE_ID }
      }));
    };

        ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      
      // ADD THIS LINE TO SEE WHAT THE APP RECEIVES:
      console.log('📩 App Received:', data.type, JSON.stringify(data.payload));

      switch(data.type) {
        case 'MEMBER_LOCATION':
          setFriendLocations(prev => ({
            ...prev,
            [data.payload.userId]: data.payload
          }));
          break;
        case 'MEMBER_JOINED':
          console.log('A friend joined:', data.payload.userId);
          break;
      }
    };

    ws.current.onerror = (e) => console.error('WS Error:', e.message);
    ws.current.onclose = (e) => console.log('WS Closed:', e.code, e.reason);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 12.9716, // Default: Bangalore
          longitude: 77.5946,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true} // Shows native blue dot
      >
        {/* Render Friends Markers */}
        {Object.keys(friendLocations).map((userId) => {
          const friend = friendLocations[userId];
          return (
            <Marker
              key={userId}
              coordinate={{ latitude: friend.lat, longitude: friend.lng }}
              title={userId} // Later replace with actual name
              description={`Speed: ${Math.round(friend.speed * 3.6)} km/h`} // m/s to km/h
              pinColor="blue"
            />
          );
        })}
      </MapView>
      
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {ws.current?.readyState === WebSocket.OPEN ? '🟢 Connected' : '🔴 Disconnected'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  statusBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 10,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
  }
});