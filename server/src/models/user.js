import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // We'll hash this later with bcrypt
  bikeModel: { type: String, default: '' },
  
  // For push notifications later
  fcmToken: { type: String, default: '' },
  
  // Settings
  shareLocation: { type: Boolean, default: true },
  
}, { timestamps: true });

export default mongoose.model('User', userSchema);