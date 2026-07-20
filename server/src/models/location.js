import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  speed: { type: Number },       // km/h
  heading: { type: Number },     // 0-360 degrees
  isOffline: { type: Boolean, default: false }
}, { timestamps: true });

// TTL index: auto-delete location history after 30 days to save space
locationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model('Location', locationSchema);