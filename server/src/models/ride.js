import mongoose from 'mongoose';

const rideSchema = new mongoose.Schema({
    name: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['planning', 'active', 'completed'], default: 'planning' },
    members: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['admin', 'rider'], default: 'rider' },
        status: { type: String, enum: ['invited', 'accepted'], default: 'invited' }
    }],
    inviteCode: { type: String, unique: true },
}, { timestamps: true });

export default mongoose.model('Ride', rideSchema);