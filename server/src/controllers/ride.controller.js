import Ride from '../models/ride.js';
import crypto from 'crypto'; // Built into Node.js, no install needed

export const createRide = async (req, res) => {
  try {
      const { name, destination } = req.body;
      
    const userId = req.user.id; // Coming from auth middleware later

    // Generate a unique 6-character invite code
    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    const ride = await Ride.create({
      name,
      destination,
      createdBy: userId,
      inviteCode,
      members: [{ userId, role: 'admin', status: 'accepted' }] // Creator auto-joins
    });

    res.status(201).json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const joinRide = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.id;

    const ride = await Ride.findOne({ inviteCode });
    if (!ride) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }

    // Check if already a member
    const isMember = ride.members.some(m => m.userId.toString() === userId);
    if (isMember) {
      return res.status(400).json({ message: 'Already a member of this ride' });
    }

    ride.members.push({ userId, role: 'rider', status: 'accepted' });
    await ride.save();

    res.status(200).json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMyRides = async (req, res) => {
  try {
    const userId = req.user.id;
    // Find rides where the user is in the members array
    const rides = await Ride.find({ 'members.userId': userId }).sort({ createdAt: -1 });
    res.status(200).json(rides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};