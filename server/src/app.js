import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import rideRoutes from './routes/ride.routes.js'

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'RideTrack Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);

export default app;