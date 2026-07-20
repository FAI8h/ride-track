import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, Button, FlatList, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

// --- CONFIG ---
const API_URL = 'https://unscandalized-sean-undistractingly.ngrok-free.dev'; 
const WS_URL = 'wss://unscandalized-sean-undistractingly.ngrok-free.dev/ws';

export default function App() {
  const [token, setToken] = useState(null);
  const [currentRide, setCurrentRide] = useState(null);
  
  // Function to leave the ride and go back to dashboard
  const leaveRide = () => setCurrentRide(null);

  if (currentRide && token) {
    return <MapScreen token={token} rideId={currentRide._id} inviteCode={currentRide.inviteCode} leaveRide={leaveRide} />;
  } else if (token) {
    return <RideDashboard token={token} setRide={setCurrentRide} />;
  } else {
    return <AuthScreen onLogin={setToken} />;
  }
}

// ==========================================
// 1. AUTH SCREEN
// ==========================================
function AuthScreen({ onLogin }) {
  const [email, setEmail] = useState('test@test.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Arjun');
  const [isRegister, setIsRegister] = useState(false);

  const handleAuth = async () => {
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister ? { name, email, password } : { email, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}?ngrok-skip-browser-warning=true`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/json' 
        },
        body: JSON.stringify(body),
        cache: 'no-store'
      });
      
      const data = await res.json();
      if (data.token) {
        onLogin(data.token);
      } else {
        alert(data.message || 'Something went wrong');
      }
    } catch (err) {
      console.error("Auth Error:", err);
      alert('Network error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏍️ RideTrack</Text>
      {isRegister && (
        <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      )}
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none"/>
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title={isRegister ? "Register" : "Login"} onPress={handleAuth} />
      <Text style={{ marginTop: 20, color: 'blue' }} onPress={() => setIsRegister(!isRegister)}>
        {isRegister ? "Already have an account? Login" : "Need an account? Register"}
      </Text>
    </View>
  );
}

// ==========================================
// 2. RIDE DASHBOARD
// ==========================================
function RideDashboard({ token, setRide }) {
  const [rides, setRides] = useState([]);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/rides?ngrok-skip-browser-warning=true`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      }
    })
    .then(res => res.json())
    .then(data => setRides(data))
    .catch(err => console.error(err));
  }, []);

  const createRide = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rides?ngrok-skip-browser-warning=true`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ name: 'New Ride', destination: 'Road Trip' })
      });
      const data = await res.json();
      setRide(data);
    } catch (err) { alert('Error creating ride'); }
  };

  const joinRide = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rides/join?ngrok-skip-browser-warning=true`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ inviteCode })
      });
      const data = await res.json();
      if (data._id) {
        setRide(data);
      } else {
        alert(data.message || 'Error joining ride');
      }
    } catch (err) { alert('Error joining ride'); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Rides</Text>
      
      <Button title="Create New Ride" onPress={createRide} />

      <View style={{ flexDirection: 'row', marginTop: 20, width: '100%' }}>
        <TextInput 
          style={[styles.input, { flex: 1 }]} 
          placeholder="Enter Invite Code" 
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
        />
        <Button title="Join" onPress={joinRide} />
      </View>

      <Text style={{ marginTop: 30 }}>Previous Rides:</Text>
      <FlatList
        data={rides}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.rideItem}>
            <Text>{item.name} (Code: {item.inviteCode})</Text>
            <Button title="Open" onPress={() => setRide(item)} />
          </View>
        )}
      />
    </View>
  );
}

// ==========================================
// 3. MAP SCREEN
// ==========================================
function MapScreen({ token, rideId, inviteCode, leaveRide }) {
  const [friendLocations, setFriendLocations] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const wsUrl = `${WS_URL}?token=${token}&ngrok-skip-browser-warning=true`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
      ws.current.send(JSON.stringify({ type: 'JOIN_RIDE', payload: { rideId } }));
    };

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'MEMBER_LOCATION') {
        setFriendLocations(prev => ({ ...prev, [data.payload.userId]: data.payload }));
      }
    };

    ws.current.onerror = () => setIsConnected(false);
    ws.current.onclose = () => setIsConnected(false);

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.HighForNavigation, timeInterval: 5000, distanceInterval: 10 },
        (location) => {
          const { latitude, longitude, speed, heading } = location.coords;
          if (mapRef.current) mapRef.current.animateCamera({ center: { latitude, longitude } });
          
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
              type: 'LOCATION_UPDATE',
              payload: { lat: latitude, lng: longitude, speed: speed || 0, heading: heading || 0 }
            }));
          }
        }
      );
    })();

    return () => { if (ws.current) ws.current.close(); };
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ latitude: 12.9716, longitude: 77.5946, latitudeDelta: 0.0922, longitudeDelta: 0.0421 }}
        showsUserLocation={true}
      >
        {Object.keys(friendLocations).map((userId) => {
          const friend = friendLocations[userId];
          return (
            <Marker
              key={userId}
              coordinate={{ latitude: friend.lat, longitude: friend.lng }}
              title="Friend"
              description={`Speed: ${Math.round((friend.speed || 0) * 3.6)} km/h`}
              pinColor="blue"
            />
          );
        })}
      </MapView>
      
      {/* Top Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'} | 
          👥 Friends: {Object.keys(friendLocations).length}
        </Text>
      </View>

      {/* Bottom Action Bar with Invite Code & Leave Button */}
      <View style={styles.bottomBar}>
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Invite Code:</Text>
          <Text style={styles.codeText}>{inviteCode}</Text>
        </View>
        <TouchableOpacity style={styles.leaveButton} onPress={leaveRide}>
          <Text style={styles.leaveButtonText}>Leave Ride</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 5, width: '100%', borderRadius: 5 },
  map: { width: '100%', height: '100%' },
  statusBar: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 10 },
  statusText: { color: 'white', fontWeight: 'bold' },
  rideItem: { padding: 10, marginVertical: 5, backgroundColor: '#f0f0f0', width: '100%', borderRadius: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  // New Styles for Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // For Android shadow
  },
  codeBox: {
    flexDirection: 'column',
  },
  codeLabel: {
    fontSize: 12,
    color: 'gray',
  },
  codeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 2,
  },
  leaveButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  leaveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  }
});